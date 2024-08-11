const GEMINI_SUPPORTED_LANGUAGES = [
    "ar", "bn", "bg", "zh", "hr", "cs", "da", "nl", "en", "et", "fi",
    "fr", "de", "el", "iw", "hi", "hu", "id", "it", "ja", "ko", "lv",
    "lt", "no", "pl", "pt", "ro", "ru", "sr", "sk", "sl", "es", "sw",
    "sv", "th", "tr", "uk", "vi"
];

export const isGeminiSupportedLng = (languageCode: string): boolean => {
    return GEMINI_SUPPORTED_LANGUAGES.includes(languageCode);
}
export const translateTo = async (tLng: string, content: string): Promise<string> => {
    console.log("Translating to", tLng);
    return "..."
}

