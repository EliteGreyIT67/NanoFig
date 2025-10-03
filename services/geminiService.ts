import { GoogleGenAI, Modality, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
];

/**
 * Transforms an image using the Gemini API based on a provided prompt.
 * @param base64ImageData The base64 encoded image data URL.
 * @param prompt The text prompt to guide the image transformation.
 * @param enhancementLevel A string representing the desired enhancement level.
 * @param aspectRatio The desired aspect ratio.
 * @returns A promise that resolves to an object containing the generated text and image data URL.
 */
export const transformImage = async (
    base64ImageData: string,
    prompt: string,
    enhancementLevel: string,
    aspectRatio: string,
): Promise<{ text: string, image: string }> => {
    try {
        const mimeTypeMatch = base64ImageData.match(/^data:(image\/[a-zA-Z]+);base64,/);
        if (!mimeTypeMatch) {
            throw new Error('Invalid image data URL format.');
        }
        const mimeType = mimeTypeMatch[1];
        const data = base64ImageData.substring(mimeTypeMatch[0].length);

        const model = 'gemini-2.5-flash-image';

        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    {
                        inlineData: {
                            data,
                            mimeType,
                        },
                    },
                    {
                        text: prompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
                safetySettings,
            },
        });

        let generatedText = '';
        let generatedImage = '';

        if (response.candidates && response.candidates.length > 0 && response.candidates[0].content && response.candidates[0].content.parts) {
             for (const part of response.candidates[0].content.parts) {
                if (part.text) {
                    generatedText = part.text;
                } else if (part.inlineData) {
                    generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
       
        if (!generatedImage) {
            const rejectionReason = response.candidates?.[0]?.finishReason;
            const safetyRatings = response.candidates?.[0]?.safetyRatings;
            console.error('Image generation failed.', { rejectionReason, safetyRatings });
            let message = 'The AI model did not return an image.';

            if (rejectionReason && String(rejectionReason).toUpperCase().includes('SAFETY')) {
                message = 'The request was blocked for safety reasons. Please adjust your prompt or image and try again.';
            } else if (typeof rejectionReason === 'string' && rejectionReason) {
                message = `Image generation failed. Reason: ${rejectionReason}`;
            } else if (rejectionReason) {
               message = `Image generation failed for an unknown reason. Check the console for details.`;
            }
            throw new Error(message);
       }

        return { text: generatedText, image: generatedImage };

    } catch (error: unknown) {
        console.error("Gemini API call failed:", error);
        
        let errorMessage = "An unexpected error occurred.";

        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        } else if (error && typeof error === 'object' && error !== null) {
            if ('message' in error && typeof (error as any).message === 'string' && (error as any).message) {
                errorMessage = (error as any).message;
            } else {
                const errorStr = error.toString();
                if (errorStr && errorStr !== '[object Object]') {
                    errorMessage = errorStr;
                } else {
                    errorMessage = 'An unknown error occurred. Check the console for details.';
                }
            }
        }

        // Standardize common API errors into user-friendly messages
        if (errorMessage.includes('429') || /quota|RESOURCE_EXHAUSTED/i.test(errorMessage)) {
            throw new Error("The service is currently busy due to high demand. Please wait a moment and try again.");
        }
        
        // Re-throw a clean error for the UI to display
        throw new Error(errorMessage);
    }
};