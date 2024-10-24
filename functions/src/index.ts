
import { logger } from "firebase-functions/v2";
import { onCall, onRequest } from "firebase-functions/v2/https";
import { runFlow } from "@genkit-ai/flow";
import admin from 'firebase-admin';
import { activitiesFormNoteFlow, processDocuemntFlow } from "./utils/genAI";
import { genImg } from "./utils/sdxl";
import { checkNoteCreationLimit, getStartOfMonth } from "./utils/guard";
import { FunResponse } from "./types/Response";
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { categoriesNotificationGetPayloadForFirestore, validatePurchase } from "./utils/subscription";
import { notePreviewRender } from "./web";


admin.initializeApp();
const db = admin.firestore();



type ProcessedDocRes = {
    isStudyNote: boolean;
    keyAreas: Array<{ name: string }>;
    markdown: string;
    thumbnailPrompt: string;
    status?: number;
    [key: string]: any;
};

type ActivitiesRes = {
    [key: string]: any;
};

async function updateFirestoreStatus(userId: string,
    noteId: string,
    docUrl: string,
    updateData: object,
    monthlyNoteCount: number = 0): Promise<void> {
    const noteDocRef = db.doc(`users/${userId}/notes/${noteId}`);
    const creditDocRef = db.doc(`users/${userId}/credit/v2`);

    const notePromise = noteDocRef.set({ ...updateData, docUrl: docUrl, try: admin.firestore.FieldValue.increment(1) }, { merge: true });
    const creditPromise = creditDocRef.set({
        credit: {
            noteCount: admin.firestore.FieldValue.increment(1),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            monthlyNoteCount: monthlyNoteCount == 0 ? 1 : admin.firestore.FieldValue.increment(1)
        }
    }, { merge: true })

    await Promise.all([notePromise, creditPromise])
}
async function processNoteCreation(userId: string, noteId: string, docUrl: string, monthlyNoteCount: number): Promise<object> {

    const thumbnailPath = `${userId}/uploads/${noteId}/thumb.webp`;
    const genAIImageRef = admin.storage().bucket().file(thumbnailPath);
    // let finalRes: ProcessedDocRes = {} as ProcessedDocRes;
    let createdImg: Buffer | null = null;
    let status: number = 1;
    let updateData: object = { status };

    try {
        const processedDocRes: ProcessedDocRes = await runFlow(processDocuemntFlow, `gs://learning-partner.appspot.com/${docUrl}`);
        updateData = { ...processedDocRes };

        if (!processedDocRes.isStudyNote) {
            status = -1;
            updateData = { status, ...updateData };
            await updateFirestoreStatus(userId, noteId, docUrl, updateData, monthlyNoteCount);
            return updateData
        }

        status = 2;
        updateData = { status, ...processedDocRes };

        const keyAreas: string[] = processedDocRes.keyAreas.map((item, index) => `${index + 1}. ${item.name.replace(/,/g, ';')}`);
        const keyAreaAsString: string = keyAreas.join(', ');

        const activitiesRes: ActivitiesRes = await runFlow(activitiesFormNoteFlow, {
            markdown: processedDocRes.markdown,
            areaWithId: keyAreaAsString
        });

        status = 3;
        updateData = { ...updateData, ...activitiesRes };

        // await updateFirestoreStatus(userId, noteId, updateData);

        createdImg = await genImg(processedDocRes.thumbnailPrompt);

    } catch (error) {
        logger.error('Error in processing flow', error);
        // status = 'error';
    } finally {
        const createdAt = Date.now()
        updateData = { ...updateData, createdAt: createdAt }
        try {

            if (createdImg) {
                await genAIImageRef.save(createdImg, { contentType: 'image/webp' });
                status = 4;
                updateData = { ...updateData, thumbnail: thumbnailPath, status: status };
            }

            await updateFirestoreStatus(userId, noteId, docUrl, updateData, monthlyNoteCount);
            return updateData
        } catch (error) {
            updateData = { ...updateData, status: status, };
            logger.error('Error in final steps', error);
            await updateFirestoreStatus(userId, noteId, docUrl, updateData, monthlyNoteCount);
            return updateData
        }
    }
}

/* payload {noteId:"",docUrl:""} */

export const processNote = onCall({
    // enforceAppCheck: true, // Reject requests with missing or invalid App Check tokens.
    // consumeAppCheckToken: true  // Consume the token after verification.
    timeoutSeconds: 300
}, async (req): Promise<FunResponse> => {
    logger.info("processNote Call.............")
    const userId = req.auth?.uid
    const token = req.auth?.token
    const { noteId, docUrl } = req.data

    logger.info(userId, noteId, docUrl, token)

    if (userId == undefined ||
        noteId == undefined ||
        docUrl == undefined ||
        token == undefined) {
        return {
            statusCode: 401,
            error: "Bad request.",
        }
    }

    const creditDoc = await db.doc(`users/${userId}/credit/v2`)
        .get();

    const creditData = creditDoc.data();
    const isAnonymous = token.firebase.sign_in_provider === 'anonymous'

    console.log("credit info", creditData);

    // const noteCount = userData?.noteCount || 0;
    // const lastUpdated = userData?.lastUpdated ? userData.lastUpdated.toDate() : new Date(0);

    // let monthlyNoteCount: number = userData?.monthlyNoteCount || 0;
    const credit: { noteCount: number, monthlyNoteCount: number, lastUpdated: any } = creditData?.credit || { noteCount: 0, monthlyNoteCount: 0, lastUpdated: new Date(0) }
    const subscription: { start: number, end: number, id: string } = creditData?.subscription || { start: 0, end: 0 }

    // Reset monthly note count if the month has changed
    const startOfMonth = getStartOfMonth();
    if ((creditData?.credit?.lastUpdated instanceof admin.firestore.Timestamp
        ? creditData.credit.lastUpdated.toDate() // Convert Firestore Timestamp to JavaScript Date
        : new Date(0) // Default to Unix epoch if lastUpdated is not present
    ) < startOfMonth) {
        credit.monthlyNoteCount = 0;
    }

    const limitRes = await checkNoteCreationLimit(isAnonymous,
        credit.noteCount, credit.monthlyNoteCount, subscription.end
    )

    console.log(limitRes);

    if (limitRes.statusCode != 200) {

        console.log("Request not valid for note creation");
        // create firestore doc 
        const noteDocRef = db.doc(`users/${userId}/notes/${noteId}`);
        await noteDocRef.set({ status: 0, docUrl: docUrl }, { merge: true });
        return {
            ...limitRes, credit: {
                monthlyNoteCount: credit.monthlyNoteCount,
                noteCount: credit.noteCount,

            },
            subscription: subscription
        }
    }
    const result = await processNoteCreation(userId, noteId, docUrl, credit.monthlyNoteCount)
    return {
        statusCode: 200,
        data: result,
        credit: {
            monthlyNoteCount: credit.monthlyNoteCount + 1,
            noteCount: credit.noteCount + 1,

        }, subscription: subscription
    }
})

export const retryFromFailed = onCall({
    // enforceAppCheck: true, // Reject requests with missing or invalid App Check tokens.
    // consumeAppCheckToken: true  // Consume the token after verification.
}, async (req): Promise<FunResponse> => {
    const { noteId, docUrl } = req.data;
    const userId = req.auth?.uid
    const token = req.auth?.token


    if (userId == undefined ||
        noteId == undefined ||
        token == undefined) {
        return {
            statusCode: 401,
            error: "Bad request.",
        }
    }
    const noteDoc = await db.doc(`users/${userId}/notes/${noteId}`).get();
    const creditDoc = await db.doc(`users/${userId}/credit/v2`)
        .get();

    const creditData = creditDoc.data();
    const isAnonymous = token.firebase.sign_in_provider === 'anonymous'


    console.log("credit info", creditData);

    // const noteCount = userData?.noteCount || 0;
    // let monthlyNoteCount: number = userData?.monthlyNoteCount || 0;
    // const subscription: { start: number, end: number, id: string } = userData?.subscription || { start: 0, end: 0 }
    // const lastUpdated = userData?.lastUpdated ? userData.lastUpdated.toDate() : new Date(0);

    const credit: { noteCount: number, monthlyNoteCount: number, lastUpdated: any } = creditData?.credit || { noteCount: 0, monthlyNoteCount: 0, lastUpdated: new Date(0) }
    const subscription: { start: number, end: number, id: string } = creditData?.subscription || { start: 0, end: 0 }

    // Reset monthly note count if the month has changed
    const startOfMonth = getStartOfMonth();
    if ((creditData?.credit?.lastUpdated instanceof admin.firestore.Timestamp
        ? creditData.credit.lastUpdated.toDate() // Convert Firestore Timestamp to JavaScript Date
        : new Date(0) // Default to Unix epoch if lastUpdated is not present
    ) < startOfMonth) {
        credit.monthlyNoteCount = 0;
    }


    const limitRes = await checkNoteCreationLimit(
        isAnonymous, credit.noteCount, credit.monthlyNoteCount, subscription.end
    )

    console.log(limitRes);

    if (limitRes.statusCode != 200) {
        console.log("note creation limit exceed");
        return {
            ...limitRes,
            credit: {
                monthlyNoteCount: credit.monthlyNoteCount,
                noteCount: credit.noteCount,
            },
            subscription: subscription
        }
    }




    let noteData = noteDoc.data() as ProcessedDocRes;
    if (!noteDoc.exists) {
        /*  return {
             statusCode: 400,
             error: "document not uploaded yet",
             credit: {
                 monthlyNoteCount: credit.monthlyNoteCount,
                 noteCount: credit.noteCount,
 
             },
             subscription: subscription
         } */
        // @ts-ignore
        noteData = { status: 1, docUrl: docUrl }
    }
    // -1= suspended document,4= finished docuemnt
    if (noteData.status == -1 || noteData.status == 4) {
        return {
            statusCode: 200,
            data: noteData,
            credit: {
                monthlyNoteCount: credit.monthlyNoteCount,
                noteCount: credit.noteCount,

            },
            subscription: subscription
        }
    }


    console.log("noteData", noteData);

    // const docURL = noteData.docUrl
    // let finalRes: ProcessedDocRes = {} as ProcessedDocRes;
    let createImg: Buffer | null = null;
    const thumbnailPath = `${userId}/uploads/${noteId}/thumb.webp`;
    const genAIImageRef = admin.storage().bucket().file(thumbnailPath);
    let status: number = noteData.status || 1;
    let updateData: object = { status };

    try {

        if (noteData.status === 2 || noteData.status === 3) {
            updateData = noteData;
        } else {
            const processedDocRes: ProcessedDocRes = await runFlow(processDocuemntFlow, `gs://learning-partner.appspot.com/${noteData.docUrl}`);
            status = 2
            updateData = { ...processedDocRes, status: status };

            if (!processedDocRes.isStudyNote) {
                status = -1;
                // await updateFirestoreStatus(userId, noteId, docUrl, updateData, monthlyNoteCount);
                // return { statusCode: 200, data: updateData }
            }

            const keyAreas: string[] = processedDocRes.keyAreas.map((item, index) => `${index + 1}. ${item.name.replace(/,/g, ';')}`);
            const keyAreaAsString: string = keyAreas.join(', ');

            const activitiesRes: ActivitiesRes = await runFlow(activitiesFormNoteFlow, {
                markdown: processedDocRes.markdown,
                areaWithId: keyAreaAsString
            });

            status = 3;
            updateData = { ...updateData, ...activitiesRes, status: status };

        }

        // createImg = await genImg(noteData.thumbnailPrompt);
        // @ts-ignore
        createImg = await genImg(updateData.thumbnailPrompt);

    } catch (error) {
        logger.error('Error in retry process', error);
        // status = 'retry_error';
    } finally {
        const createdAt = Date.now()
        updateData = { ...updateData, status: status, createdAt: createdAt }
        try {
            if (createImg) {
                await genAIImageRef.save(createImg, { contentType: 'image/webp' });
                status = 4;
                updateData = { ...updateData, thumbnail: thumbnailPath, status: status, };
            }

            await updateFirestoreStatus(userId, noteId, docUrl, updateData, credit.monthlyNoteCount);
            return {
                statusCode: 200, data: { ...updateData, docUrl: docUrl }, credit: {
                    monthlyNoteCount: credit.monthlyNoteCount + 1,
                    noteCount: credit.noteCount + 1,

                }, subscription: subscription
            }
        } catch (error) {
            logger.error('Error in final retry steps', error);
            await updateFirestoreStatus(userId, noteId, docUrl, updateData, credit.monthlyNoteCount);
            return {
                statusCode: 200, data: { ...updateData, docUrl: docUrl },
                credit: {
                    monthlyNoteCount: credit.monthlyNoteCount + 1,
                    noteCount: credit.noteCount + 1,

                },
                subscription: subscription
            }
        }
    }
});

function selectFields<T extends object, K extends keyof T>(obj: T, fieldsToSelect: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;

    for (const field of fieldsToSelect) {
        if (field in obj) {
            result[field] = obj[field];  // Copy only selected fields
        }
    }

    return result;
}

export const genSharableLink = onCall({
    // enforceAppCheck: true, // Reject requests with missing or invalid App Check tokens.
    // consumeAppCheckToken: true  // Consume the token after verification.
}, async (req): Promise<FunResponse> => {
    const { noteId } = req.data;
    const userId = req.auth?.uid
    const token = req.auth?.token


    if (userId == undefined ||
        noteId == undefined ||
        token == undefined) {
        return {
            statusCode: 401,
            error: "Bad request.",
        }
    }
    try {
        const refPath = `public/${userId}/notes/${noteId}`
        const sharableLink = `user/${userId}/note/${noteId}`
        const rdb = admin.database()
        const noteRDBRef = rdb.ref(refPath)
        const sharableNote = await noteRDBRef.get()
        if (sharableNote.exists()) {
            // poll share count to db
            console.log("exists");

            return { data: { link: sharableLink }, statusCode: 200 }
        }

        const noteDoc = await db.doc(`users/${userId}/notes/${noteId}`).get();
        // noteDoc exist check error
        let noteData = noteDoc.data() as ProcessedDocRes;

        var note = selectFields(noteData, [
            'title',
            'docUrl',
            'thumbnailPrompt',
            'thumbnail',
            'markdown',
            'subject',
            'summary',
            'keyAreas',
            'flashCards',
            'questions',
            'author',
            'createdAt',
            'status'
        ])
        console.log("created");
        note.author = userId
        // @ts-ignore
        note.sharableLink = sharableLink
        console.log("selected note", note);
        await noteRDBRef.set(note)
        return { data: { link: sharableLink }, statusCode: 200 }
    } catch (e) {
        return { error: "failed to create sharable link", statusCode: 400 }

    }

})


export const getSharedNote = onCall({
    // enforceAppCheck: true, // Reject requests with missing or invalid App Check tokens.
    // consumeAppCheckToken: true  // Consume the token after verification.
}, async (req): Promise<FunResponse> => {
    const { authorId, noteId } = req.data;
    console.log("author", authorId);
    console.log("noteId", noteId);

    const userId = req.auth?.uid
    const token = req.auth?.token


    if (userId == undefined ||
        noteId == undefined ||
        token == undefined) {
        return {
            statusCode: 401,
            error: "Bad request.",
        }
    }


    try {
        const sharableLink = `public/${authorId}/notes/${noteId}`
        const rdb = admin.database()
        const noteRDBRef = rdb.ref(sharableLink)
        const sharableNote = await noteRDBRef.get()
        if (sharableNote.exists()) {
            var noteInfo = sharableNote.val()
            // save to firestore
            const noteDocRef = db.doc(`users/${userId}/notes/${noteId}`);
            noteInfo.createdAt = Date.now()
            await noteDocRef.set(noteInfo)
            // poll share count to db
            return { data: sharableNote.val(), statusCode: 200 }
        }
        console.log("note not exists");

        return { error: "invalid link", statusCode: 404 }
    } catch (e) {
        console.log("Error", e);
        return { error: "failed to get shared note", statusCode: 400 }

    }

})


export const noteWebPreview = onRequest(async (req, res) => {
    const pathParts = req.path.split('/');
    const userId = pathParts[2]; // Assuming the URL is structured as "/user/{userId}/note/{noteId}"
    const noteId = pathParts[4];


    if (!userId || !noteId) {
        res.status(400).send('User ID and Note ID are required.');
        return
    }

    const sharableLink = `public/${userId}/notes/${noteId}`
    const rdb = admin.database()
    const noteRDBRef = rdb.ref(sharableLink)
    const sharableNote = await noteRDBRef.get()

    const encodedFilePath = encodeURIComponent(sharableNote.val().thumbnail);

    // Construct the public URL
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/learning-partner.appspot.com/o/${encodedFilePath}?alt=media`;



    const htmlContent = notePreviewRender({ ...sharableNote.val(), thumbnail: publicUrl })
    res.set("Content-Type", "text/html");
    res.status(200).send(htmlContent);
})




/* error codes
200 ok
400 - note document not exits
401 - Unauthorized // has no credit in response
500 credit related*/

export const heyNinaiva = onMessagePublished("heyNinaiva", async (event) => {
    const data = event.data;
    console.log("heyNinaiva", JSON.stringify(data));
    const purchaseData = JSON.parse(Buffer.from(data.message.data, 'base64').toString('utf8'))
    // skip if it is not subscription realted notification
    if (!purchaseData.subscriptionNotification) {
        console.log("Not Sub Notifi Skipping .... ");

        return null
    }
    const subscriptionDetails = await validatePurchase(
        purchaseData.packageName,
        purchaseData.subscriptionNotification.subscriptionId,
        purchaseData.subscriptionNotification.purchaseToken)
        .then(result => result)
        .catch(e => {
            console.log("error", e);
        })

    console.log("SubscriptionDetails", subscriptionDetails);

    if (!subscriptionDetails) {
        return null
    }
    const firestoreSubInfo = categoriesNotificationGetPayloadForFirestore(purchaseData, subscriptionDetails)
    console.log("firestoreSubInfo", firestoreSubInfo);

    if (!firestoreSubInfo?.subscription) {
        return null
    }

    const creditDocRef = db.doc(`users/${firestoreSubInfo.uid}/credit/v2`);

    await creditDocRef.set({ subscription: { ...firestoreSubInfo.subscription } }, { merge: true })
    return null

})

