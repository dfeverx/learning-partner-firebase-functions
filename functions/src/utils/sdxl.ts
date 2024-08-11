import axios from "axios";
import FormData from "form-data";


export const genImg = async (prompt: string = "Lighthouse on a cliff overlooking the ocean") => {

    const payload = {
        prompt: prompt,
        output_format: "webp",
        aspect_ratio: "16:9",
        style_preset: "isometric",
        negative_prompt: ""
    };

    const response = await axios.postForm(
        `https://api.stability.ai/v2beta/stable-image/generate/ultra`,
        axios.toFormData(payload, new FormData()),
        {
            validateStatus: undefined,
            responseType: "arraybuffer",
            headers: {
                Authorization: `Bearer ${process.env.SDXL_DREAM}`,
                Accept: "image/*"
            },
        },
    );

    if (response.status === 200) {
        return response.data
    } else {
        throw new Error(`${response.status}: ${response.data.toString()}`);
    }
}