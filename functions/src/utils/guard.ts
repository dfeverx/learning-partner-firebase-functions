
import { FunResponse } from '../types/Response';

// Helper function to get the start of the current month
export const getStartOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
};


export const checkNoteCreationLimit = async (
    noteCount: number,
    subscriptionLevel: string,
    monthlyNoteCount: number):
    Promise<FunResponse> => {

    /* {
    noteCount:0,
    subscriptionLevel:"free|anonynous|premium",
    lastUpdated:unix,
    monthlyNoteCount:0
    } */


    // Define note limits
    const noteLimits: { [key: string]: number } = {
        anonymous: 3,
        free: 5,
        premium: 50,
    };

    // Determine user note limit
    let noteLimit = noteLimits.free;
    if (subscriptionLevel === 'anonymous') {
        noteLimit = noteLimits.anonymous;
    } else if (subscriptionLevel === 'premium') {
        noteLimit = noteLimits.premium;
    }
    console.log("subscriptionLevel", subscriptionLevel);
    console.log("note Limit", noteLimit);


    // Use monthly limit for free users
    if (subscriptionLevel === 'free' && monthlyNoteCount >= noteLimit) {
        return {
            error: "Monthly note creation limit reached.",
            statusCode: 500
        }
    } else if (subscriptionLevel === 'premium' && monthlyNoteCount >= noteLimit) {
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

