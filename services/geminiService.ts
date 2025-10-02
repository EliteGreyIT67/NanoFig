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

export const transformImage = async (dataUrl: string, prompt: string): Promise<string> => {
    try {
        const [header, data] = dataUrl.split(',');
        if (!header || !data) {
            throw new Error("Invalid image data URL format.");
        }
        
        const mimeTypeMatch = header.match(/:(.*?);/);
        if (!mimeTypeMatch || !mimeTypeMatch[1]) {
            throw new Error("Could not determine MIME type from data URL.");
        }
        const mimeType = mimeTypeMatch[1];
        
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: data,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: prompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
            safetySettings: safetySettings,
        });

        // First, check for a valid generated image.
        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);

        if (imagePart && imagePart.inlineData?.data) {
            return imagePart.inlineData.data;
        }

        // If no image is found, analyze the response to provide a clear error.
        
        // Check if the prompt was blocked.
        const blockReason = response.promptFeedback?.blockReason;
        if (blockReason) {
            const blockReasonMessage = response.promptFeedback?.blockReasonMessage;
            const fullReason = blockReasonMessage ? `${blockReason}: ${blockReasonMessage}` : blockReason;
            throw new Error(`Request was blocked. Reason: ${fullReason}`);
        }

        // Check the candidate's finish reason for a more specific error.
        const finishReason = response.candidates?.[0]?.finishReason;
        if (finishReason && finishReason !== 'STOP') {
            let errorMessage = `Image generation failed. Reason: ${finishReason}.`;
            switch (finishReason) {
                case 'SAFETY':
                case 'IMAGE_SAFETY':
                    errorMessage = 'Image generation was blocked due to safety policies. Please modify your prompt or image and try again.';
                    break;
                case 'IMAGE_OTHER':
                case 'OTHER':
                    errorMessage = 'The model could not generate an image for this request. This can happen with unusual prompts or images. Please try modifying your settings or using a different photo.';
                    break;
                case 'MAX_TOKENS':
                    errorMessage = 'The request was too long and exceeded the maximum token limit.';
                    break;
                case 'RECITATION':
                    errorMessage = 'The response was blocked due to potential recitation of copyrighted material.';
                    break;
            }
            console.error("Image Generation Failed with finishReason:", JSON.stringify(response, null, 2));
            throw new Error(errorMessage);
        }

        // If not blocked, check if the model provided a text explanation for the failure.
        const textPart = response.candidates?.[0]?.content?.parts?.find(part => part.text);
        if (textPart && textPart.text) {
            throw new Error(`Image generation failed: ${textPart.text.trim()}`);
        }
        
        // If no image, block reason, or text explanation is found, throw a generic error.
        console.error("Unhandled Gemini Response:", JSON.stringify(response, null, 2));
        throw new Error("No image was generated. The model may have refused the request due to content policies or an internal error.");

    } catch (error) {
        console.error("Error transforming image:", error);
        if (error instanceof Error) {
            // Pass our specific, user-facing errors through.
            const knownErrors = [
                'Image generation failed:',
                'Request was blocked.',
                'The model could not generate',
                'Image generation was blocked',
                'The request was too long',
                'The response was blocked'
            ];
            if (knownErrors.some(e => error.message.startsWith(e))) {
                throw error;
            }
            
            // Wrap other errors (e.g., network issues) in a consistent message.
            throw new Error(`Failed to communicate with the AI model: ${error.message}`);
        }
        throw new Error("An unknown error occurred during image transformation.");
    }
};