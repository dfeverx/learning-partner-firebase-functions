import { generate } from '@genkit-ai/ai';
import { configureGenkit } from '@genkit-ai/core';
import { defineFlow } from '@genkit-ai/flow';
import { vertexAI } from '@genkit-ai/vertexai';
import { gemini15FlashPreview } from '@genkit-ai/vertexai';
import { z } from 'zod';

configureGenkit({
    plugins: [
        vertexAI({
            projectId: process.env.PROJECT_ID || "",
            location: process.env.LOCATIONS || ""
        })],
    logLevel: 'debug',
    enableTracingAndMetrics: true,

});

const noteSchema = z.object({
    title: z.string(),
    subject: z.string(),
    keyAreas: z.array(z.object({
        name: z.string(),
        info: z.string()
    })),
    summary: z.string(),
    markdown: z.string(),
    isStudyNote: z.boolean(),
    thumbnailPrompt: z.string()

})
const noteSampleJson = {
    title: "",
    subject: "",
    keyAreas: [
        { emoji: "related emoji", name: "short name", info: "explain it in short and consise and simple way ,without lossing any info from the  note,in markdow use table and Latex if necessary" }
    ],
    summary: "",
    markdown: "",
    isStudyNote: true /* accoding to the content */,
    thumbnailPrompt: "detailed prompt for creative doodle illustration for the note"
}



export const processDocuemntFlow = defineFlow(
    {

        name: 'processDocuemntFlow',
        inputSchema: z.string(),
        outputSchema: noteSchema,
    },
    // convert given document  to the given json schema for educational purpose,and make 25 questions with statement 4 options(content,isCorrect),explanation,area(topic),difficulty that conver the whole docuemnt
    //  also parse this full document into  markdown (use table and latex if necessory) start to finish,
    // @ts-ignore
    async (docuemntUrl) => {
        const llmResponse = await generate({

            model: gemini15FlashPreview,
            prompt: [{ text: `Convert the scanned study notes into this  ${JSON.stringify(noteSampleJson)} JSON Schema structure in easy to understandable way, explain if there is any images or charts what is the idea it convey,do not include image link in markdow, and use  LaTeX if there is any  complex equations .The markdown field contains all the full details of the note in markdown format in english, add external content only if nesessary.thumbnailPrompt contain detailed prompt for a creative doodle cover for this content  , accoding to this doc, if it is not a study note, return isStudyNote = false and give placeholder value for other fields including title, subject, summary, keyAreas, and markdown.keyAreas  must contain all all important areas and complete info in this doc  ` },
            {
                media: {
                    url: docuemntUrl,
                    contentType: 'application/pdf'
                }
            }], output: { format: "json", schema: noteSchema },
            config: {
                temperature: 1.4,
            },

        });
        console.log(JSON.stringify(llmResponse));

        return llmResponse.output();
    }
);

const activitiesSchema = z.object({
    questions: z.array(z.object({
        sm: z.string(),
        ops: z.array(z.object({ txt: z.string(), isAns: z.boolean() })),
        ex: z.string(),
        areaId: z.number()
    })),
    flashCards: z.array(z.object({
        emoji: z.string(),
        prompt: z.string(),
        info: z.string(),
        areaId: z.number()
    }))
})

const activitiesSampleJson = {
    questions: [{
        sm: " statement",
        ops: [{
            txt: "option statement",
            isAns: true /*or false  */
        }]/* with four options */
        , ex: "explanation",
        areaId: 1/*form which area number  */
    }],
    flashCards: [{
        emoji: "related emoji",
        prompt: "short prompt",
        info: "full infomation",
        areaId: 2/*form which area number  */
    }]
}
const activitiesInupt = z.object({
    markdown: z.string(),
    areaWithId: z.string()
})

export const activitiesFormNoteFlow = defineFlow(
    {

        name: 'activitiesFormNoteFlow',
        inputSchema: activitiesInupt,
        outputSchema: activitiesSchema,
    },

    // @ts-ignore
    async (input) => {
        const consPrompt = " Make  questions with four options and flashCards  based on the provided content .Return response in this " + JSON.stringify(activitiesSampleJson) + "JSON schema structure . Ensure that each flashcard and question covers the entire content comprehensively for effective learning. The generated flashcard and question must include the specified areas id identified by " + input.areaWithId + ", areaId must be number given.Flash card prompt must be short.Min questions:10 ,Max questions:20,Question must cover the whole area ------------------- " + input.markdown
        const llmResponse = await generate({

            model: gemini15FlashPreview,

            prompt: [/* {
                text: input.markdown
            }, */
                {
                    text: consPrompt
                }], output: { format: "json", schema: activitiesSchema },
            config: {
                temperature: 1.2,
            },

        });
        console.log(JSON.stringify(llmResponse));
        return llmResponse.output();
    }
)