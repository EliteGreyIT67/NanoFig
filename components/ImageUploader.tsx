import React, { useCallback, useState } from 'react';
import { UploadIcon } from './Icons';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  onError: (message: string) => void;
}

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, onError }) => {
  const [isDragging, setIsDragging] = useState(false);

  const validateAndUpload = useCallback((file: File | null) => {
    if (!file) {
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      onError(`Invalid file type. Please upload a PNG, JPG, or WEBP image.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      onError(`File is too large. Please upload an image smaller than ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    onImageUpload(file);
  }, [onImageUpload, onError]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndUpload(e.target.files?.[0] ?? null);
    // Clear the input value to allow re-uploading the same file after an error
    e.target.value = '';
  };

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    validateAndUpload(e.dataTransfer.files?.[0] ?? null);
  }, [validateAndUpload]);

  const dragClass = isDragging ? 'border-yellow-400 bg-gray-700/50' : 'border-gray-600 hover:border-yellow-500 hover:bg-gray-700/30';

  return (
    <label
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`aspect-square w-full flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${dragClass}`}
    >
      <div className="text-center">
        <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-lg text-gray-300">
          <span className="font-semibold text-yellow-400">Click to upload</span> or drag and drop
        </p>
        <p className="text-sm text-gray-500">PNG, JPG, WEBP up to {MAX_FILE_SIZE_MB}MB</p>
      </div>
      <input
        type="file"
        id="file-upload"
        name="file-upload"
        className="sr-only"
        accept={ALLOWED_MIME_TYPES.join(',')}
        onChange={handleFileChange}
      />
    </label>
  );
};

export default ImageUploader;