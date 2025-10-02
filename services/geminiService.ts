
import { GoogleGenAI, Modality, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai";

// Ensure the API key is available. In a real app, you might want to handle this more gracefully.
if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

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
             if (rejectionReason === 'SAFETY') {
                 message = 'The request was blocked due to safety settings. Please modify your prompt or image and try again.';
             } else if (rejectionReason) {
                 message = `Image generation failed. Reason: ${rejectionReason}`;
             }
             throw new Error(message);
        }

        return { text: generatedText, image: generatedImage };

    } catch (error: any) {
        console.error("Gemini API call failed:", error);

        // Default error message
        let userFriendlyMessage = "An unexpected error occurred while communicating with the AI model.";

        if (error && typeof error.message === 'string') {
            // Check for quota error keywords first, as it's the most common user-facing issue
            if (error.message.includes('429') || /quota|RESOURCE_EXHAUSTED/i.test(error.message)) {
                userFriendlyMessage = "The service is currently busy due to high demand. Please wait a moment and try again.";
            } else {
                 // Try to parse for a more specific API error message
                try {
                    const jsonMatch = error.message.match(/{.*}/s);
                    if (jsonMatch) {
                        const apiError = JSON.parse(jsonMatch[0]);
                        if (apiError.error && apiError.error.message) {
                            userFriendlyMessage = apiError.error.message;
                        } else {
                             userFriendlyMessage = error.message; // Fallback to raw message if parsing works but format is unexpected
                        }
                    } else {
                        userFriendlyMessage = error.message; // No JSON found, use raw message
                    }
                } catch (e) {
                    // Parsing failed, the message is not JSON or contains broken JSON. Use the raw string.
                    userFriendlyMessage = error.message;
                }
            }
        }
        
        throw new Error(userFriendlyMessage);
    }
};