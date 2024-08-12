export interface FunResponse {
    data?: any;
    error?: string;
    credit?: {
        monthlyNoteCount: number,
        noteCount: number,
        // subscriptionLevel: string,
    }, subscription?: {
        start: number, end: number, id: string
    }
    statusCode: number;

}