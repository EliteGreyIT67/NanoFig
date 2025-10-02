export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const response = await fetch(dataUrl);
    if (!response.ok) {
        throw new Error('Failed to fetch data URL');
    }
    return await response.blob();
};

/**
 * Converts an SVG data URL to a PNG data URL using a canvas.
 * This is necessary because the Gemini API does not support SVG as an input format.
 * @param svgDataUrl The `data:image/svg+xml` URL of the SVG.
 * @param width The target width for the output PNG.
 * @param height The target height for the output PNG.
 * @returns A promise that resolves to a `data:image/png` URL.
 */
export const svgDataUrlToPngDataUrl = (svgDataUrl: string, width = 600, height = 600): Promise<string> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(image, 0, 0, width, height);
                resolve(canvas.toDataURL('image/png'));
            } else {
                reject(new Error('Could not get canvas 2D context.'));
            }
        };
        image.onerror = (err) => {
            console.error('SVG to PNG conversion error:', err);
            reject(new Error('Failed to load SVG image for conversion.'));
        };
        image.src = svgDataUrl;
    });
};
