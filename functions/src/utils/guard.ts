
import { FunResponse } from '../types/Response';

// Helper function to get the start of the current month
export const getStartOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
};




export const checkNoteCreationLimit = async (
    isAnonymous: boolean,
    noteCount: number,
    monthlyNoteCount: number,
    end: number
):
    Promise<FunResponse> => {

    const isPremium = end > Date.now()
    console.log("end", end);
    console.log("notecount", noteCount);
    console.log("monthlyNoteCount", monthlyNoteCount);
    console.log("end", Date.now());


    // Define note limits
    const noteLimits: { [key: string]: number } = {
        anonymous: 3,
        free: 5,
        premium: 50,
    };

    // Determine user note limit
    let noteLimit = noteLimits.free;
    if (isAnonymous) {
        noteLimit = noteLimits.anonymous;
    } else if (isPremium) {
        noteLimit = noteLimits.premium;
    }
    console.log("subscriptionLevel", isAnonymous, isPremium);
    console.log("note Limit", noteLimit);


    // Use monthly limit for free users
    if (isPremium && monthlyNoteCount >= noteLimit) {
        return {
            error: "Monthly note creation limit reached.",
            statusCode: 500
        }
    } else if ((!isAnonymous) && monthlyNoteCount >= noteLimit) {
        return {
            error: "Monthly note creation limit reached.",
            statusCode: 500
        }
    } else if (noteCount >= noteLimit) {
        return {
            error: "Monthly note creation limit reached.",
            statusCode: 500
        }
    }
    return {
        data: { message: "ok" },
        statusCode: 200
    }


}

