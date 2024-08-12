import { androidpublisher_v3, google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

const gAuth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    keyFile: './src/pc-api.json'
});

interface PayloadNotificationCategory {
    uid: string,
    subscription?: {
        start: number,
        end: number,
        id: string
    }

}

export const validatePurchase = async (pkg: string, subId: string, token: string) => {
    const client = await gAuth.getClient();
    const auth = client as any; // Typecast to 'any' to satisfy TypeScript

    const play = google.androidpublisher({
        version: 'v3',
        auth: auth
    });

    const playRes = await play.purchases.subscriptions.get({
        packageName: pkg,
        subscriptionId: subId,
        token: token
    });

    return playRes.data;
}

export const categoriesNotificationGetPayloadForFirestore = (
    purchaseData: any,
    subscriptionDetails: androidpublisher_v3.Schema$SubscriptionPurchase): PayloadNotificationCategory | undefined => {
    if (purchaseData.subscriptionNotification) {
        const uid = subscriptionDetails.obfuscatedExternalProfileId
        let response: PayloadNotificationCategory = { uid: uid! }
        console.log("uid", uid);
        console.log("notificationType", purchaseData.subscriptionNotification.notificationType);
        console.log("details", subscriptionDetails);

        switch (purchaseData.subscriptionNotification.notificationType) {
            case 1: // SUBSCRIPTION_RECOVERED

                response.subscription = {
                    start: Number(subscriptionDetails.startTimeMillis)!,
                    end: Number(subscriptionDetails.expiryTimeMillis)!,
                    id: purchaseData.subscriptionNotification.subscriptionId
                }
                break;

            case 2: // SUBSCRIPTION_RENEWED
                response.subscription = {
                    start: Number(subscriptionDetails.startTimeMillis)!,
                    end: Number(subscriptionDetails.expiryTimeMillis)!,
                    id: purchaseData.subscriptionNotification.subscriptionId
                }
                break;

            case 3: // SUBSCRIPTION_CANCELED
                response.subscription = {
                    start: Number(subscriptionDetails.startTimeMillis)!,
                    end: Date.now(),
                    id: purchaseData.subscriptionNotification.subscriptionId
                }


            case 4: // SUBSCRIPTION_PURCHASED
                response.subscription = {
                    start: Number(subscriptionDetails.startTimeMillis)!,
                    end: Number(subscriptionDetails.expiryTimeMillis)!,
                    id: purchaseData.subscriptionNotification.subscriptionId
                }
                break;

            // case 5: // SUBSCRIPTION_ON_HOLD
            // case 6: // SUBSCRIPTION_IN_GRACE_PERIOD
            // case 10: // SUBSCRIPTION_PAUSED
            // case 11: // SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED


            case 7: // SUBSCRIPTION_RESTARTED
                response.subscription = {
                    start: Number(subscriptionDetails.startTimeMillis)!,
                    end: Number(subscriptionDetails.expiryTimeMillis)!,
                    id: purchaseData.subscriptionNotification.subscriptionId
                }
                break;

            // case 8: // SUBSCRIPTION_PRICE_CHANGE_CONFIRMED
            // case 9: // SUBSCRIPTION_DEFERRED
            // Typically, these notifications don't change user level but may need logging or tracking.
            case 12: // SUBSCRIPTION_REVOKED
                response.subscription = {
                    start: Number(subscriptionDetails.startTimeMillis)!,
                    end: Date.now(),
                    id: purchaseData.subscriptionNotification.subscriptionId
                }
                break;
            // case 20: // SUBSCRIPTION_PENDING_PURCHASE_CANCELED
            case 13: // SUBSCRIPTION_EXPIRED
                response.subscription = {
                    start: Number(subscriptionDetails.startTimeMillis)!,
                    end: Number(subscriptionDetails.expiryTimeMillis)!,
                    id: purchaseData.subscriptionNotification.subscriptionId
                }
                break;
            default:
                console.log('Unhandled notification type:');
                response.subscription = undefined
                break;
        }
        if (!response.subscription) {
            return undefined
        }
        return response
    } else {
        // not a subscription notification
        console.log("Not a subscription notification");
        return undefined
    }

}