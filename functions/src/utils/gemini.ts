import { VertexAI } from '@google-cloud/vertexai';


// Initialize Vertex with your Cloud project and location
const vertex_ai = new VertexAI({ project: 'learning-partner', location: 'us-central1' });
const model = 'gemini-1.5-flash-001';

// Instantiate the models
const generativeModel = vertex_ai.preview.getGenerativeModel({
    model: model,
    generationConfig: {
        'maxOutputTokens': 8192,
        'temperature': 1.4,
        'topP': 0.95,
    },
    /* safetySettings: [
        {
        
            'category': 'HARM_CATEGORY_HATE_SPEECH',
            'threshold': 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
            'category': 'HARM_CATEGORY_DANGEROUS_CONTENT',
            'threshold': 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
            'category': 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            'threshold': 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
            'category': 'HARM_CATEGORY_HARASSMENT',
            'threshold': 'BLOCK_MEDIUM_AND_ABOVE'
        }
    ], */
});




/* const questionSchema = {
    title: "catchy title", summary: "summary of the document in simple language ", keyPoints: "key points string array ", questions: [{
        "type": "object",
        "properties": {
            "question": {
                "type": "string"
            },
            "options": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "content": {
                            "type": "string"
                        },
                        "isCorrect": {
                            "type": "boolean"
                        }
                    },
                    "required": ["content", "isCorrect"]
                },
                "itemSCount": 4
            },
            "explanation": {
                "type": "string"
            }
        },
        "required": ["question", "options", "explanation"],
        "additionalProperties": false
    }]
} */



/* const systemGuidlines = `MUST RETURN the RESPONSE without in  JSON SCHEMA ${JSON.stringify(
    questionSchema
)}`; */
export const processDocuemntFlow = async (pdfUri: string) => {

    const document1 = {
        fileData: {
            mimeType: 'application/pdf',
            fileUri: pdfUri
        }
    };
    const req = {
        systemInstruction: "Content of the docuemnt in markdown format",
        contents: [
            { role: 'user', parts: [document1, { text: "full content of the document in markdown " }] }
        ],
    };

    const res = await generativeModel.generateContent(req);

    console.log(JSON.stringify(res.response));
    // @ts-ignore
    return res.response.candidates[0].content.parts[0].text
}

