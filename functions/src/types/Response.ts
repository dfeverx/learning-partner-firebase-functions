export interface FunResponse {
    data?: any;
    error?: string;
    credit?: {
        monthlyNoteCount: number,
        noteCount: number,
        subscriptionLevel: string,
    }
    statusCode: number;

}