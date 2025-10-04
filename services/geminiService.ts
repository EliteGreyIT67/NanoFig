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

export type ModelDetailLevel = 'Low' | 'Medium' | 'High';

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
        
        if (response.promptFeedback?.blockReason) {
            throw new Error(`The request was blocked. Reason: ${response.promptFeedback.blockReason}. Please adjust your prompt or image.`);
        }
        
        const candidate = response.candidates?.[0];
        if (!candidate) {
            throw new Error('The AI model did not return a response. Please try again.');
        }

        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
             if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'IMAGE_SAFETY') {
                 let detailedMessage = 'Please adjust your prompt or image and try again.';
                 if (candidate.safetyRatings && candidate.safetyRatings.length > 0) {
                    const highSeverityCategories = candidate.safetyRatings
                        .filter(rating => rating.probability !== 'NEGLIGIBLE' && rating.probability !== 'LOW')
                        .map(rating => rating.category.replace('HARM_CATEGORY_', ''))
                        .join(', ');
                    
                    if (highSeverityCategories) {
                        detailedMessage = `Potential issues detected in the following categories: ${highSeverityCategories}.`;
                    }
                 }
                 throw new Error(`Request blocked by safety filters. ${detailedMessage}`);
             }
             throw new Error(`Image generation failed. Reason: ${candidate.finishReason}.`);
        }
        
        let generatedText = '';
        let generatedImage = '';

        if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
                if (part.text) {
                    generatedText = part.text;
                } else if (part.inlineData) {
                    generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
       
        if (!generatedImage) {
            throw new Error('The AI model returned an unexpected response format (no image found).');
        }

        return { text: generatedText, image: generatedImage };

    } catch (error: unknown) {
        console.error("Gemini API call failed:", error);
        
        let errorMessage = "An unexpected error occurred during image generation.";

        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (error && typeof error === 'object' && 'message' in error) {
            errorMessage = String((error as any).message);
        }

        if (errorMessage.includes('429') || /quota|RESOURCE_EXHAUSTED/i.test(errorMessage)) {
            throw new Error("The service is currently busy due to high demand. Please wait a moment and try again.");
        }
        
        throw new Error(errorMessage);
    }
};

/**
 * Generates a 3D model data string (OBJ format) based on a text prompt.
 * @param basePrompt The text prompt describing the desired model.
 * @param detailLevel The desired level of detail for the model.
 * @returns A promise that resolves to a string containing the raw OBJ file content.
 */
export const generate3dModel = async (
    basePrompt: string,
    detailLevel: ModelDetailLevel,
): Promise<string> => {
    try {
        let detailInstruction: string;
        switch (detailLevel) {
            case 'Low':
                detailInstruction = "a very simplified, low-polygon representation with minimal vertices and faces.";
                break;
            case 'High':
                detailInstruction = "a more intricate and detailed model with a higher polygon count, focusing on capturing key shapes and forms.";
                break;
            case 'Medium':
            default:
                detailInstruction = "a simplified representation suitable for a starting point.";
                break;
        }

        const modelPrompt = `Based on the following description, generate a 3D model in the Wavefront OBJ file format. Provide ONLY the raw text content for the .obj file. The output must start directly with vertex data (e.g., 'v 1.0 1.0 1.0'). Do not include any surrounding text, explanations, or markdown code blocks. The model should be ${detailInstruction} Here is the description: "${basePrompt}"`;

        const model = 'gemini-2.5-flash';

        const response: GenerateContentResponse = await ai.models.generateContent({
            model,
            contents: modelPrompt,
            config: {
                safetySettings,
            },
        });
        
        if (response.promptFeedback?.blockReason) {
            throw new Error(`The request was blocked. Reason: ${response.promptFeedback.blockReason}. Please adjust your prompt.`);
        }
        const candidate = response.candidates?.[0];
        if (!candidate) {
            throw new Error('The AI model did not return a response for the 3D model.');
        }
        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
             if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'IMAGE_SAFETY') {
                 let detailedMessage = 'Please adjust your prompt and try again.';
                 if (candidate.safetyRatings && candidate.safetyRatings.length > 0) {
                    const highSeverityCategories = candidate.safetyRatings
                        .filter(rating => rating.probability !== 'NEGLIGIBLE' && rating.probability !== 'LOW')
                        .map(rating => rating.category.replace('HARM_CATEGORY_', ''))
                        .join(', ');
                    
                    if (highSeverityCategories) {
                        detailedMessage = `Potential issues detected in the following categories: ${highSeverityCategories}.`;
                    }
                 }
                 throw new Error(`3D model request blocked by safety filters. ${detailedMessage}`);
             }
             throw new Error(`3D model generation failed. Reason: ${candidate.finishReason}.`);
        }

        const modelData = response.text;

        if (!modelData || !modelData.trim().startsWith('v')) {
             throw new Error('The AI model did not return valid OBJ data. The concept might be too complex for 3D generation.');
        }

        return modelData;

    } catch (error: unknown) {
        console.error("Gemini API call for 3D model failed:", error);
        
        let errorMessage = "An unexpected error occurred during 3D model generation.";

        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (error && typeof error === 'object' && 'message' in error) {
            errorMessage = String((error as any).message);
        }

        if (errorMessage.includes('429') || /quota|RESOURCE_EXHAUSTED/i.test(errorMessage)) {
            throw new Error("The service is currently busy due to high demand. Please wait a moment and try again.");
        }
        
        throw new Error(errorMessage);
    }
};