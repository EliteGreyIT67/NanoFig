import React, { useState, useRef, useCallback, useEffect } from 'react';
import { XMarkIcon, UndoIcon } from './Icons';
import Button from './Button';

interface ImageEditorModalProps {
  imageSrc: string;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ imageSrc, onClose, onSave }) => {
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [brightness, setBrightness] = useState(100);
  const imageRef = useRef<HTMLImageElement>(null);

  const filterStyle = {
    filter: `hue-rotate(${hue}deg) saturate(${saturation}%) brightness(${brightness}%)`,
  };

  const resetAdjustments = useCallback(() => {
    setHue(0);
    setSaturation(100);
    setBrightness(100);
  }, []);

  const handleSave = useCallback(() => {
    const img = imageRef.current;
    if (!img) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use a temporary image object to avoid CORS issues with the displayed one
    const sourceImage = new Image();
    sourceImage.crossOrigin = "anonymous";
    sourceImage.src = imageSrc;

    sourceImage.onload = () => {
        canvas.width = sourceImage.naturalWidth;
        canvas.height = sourceImage.naturalHeight;

        ctx.filter = `hue-rotate(${hue}deg) saturate(${saturation}%) brightness(${brightness}%)`;
        ctx.drawImage(sourceImage, 0, 0);

        onSave(canvas.toDataURL('image/png'));
    };
    sourceImage.onerror = () => {
        console.error("Failed to load image onto canvas for editing.");
    }
  }, [imageSrc, hue, saturation, brightness, onSave]);
  
  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            onClose();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);


  const Slider: React.FC<{label: string, value: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, min: number, max: number, unit: string}> = ({label, value, onChange, min, max, unit}) => (
    <div>
        <label className="flex justify-between items-center text-sm font-medium text-gray-400 mb-2">
            <span>{label}</span>
            <span className="px-2 py-1 text-xs font-semibold text-yellow-300 bg-gray-900/70 border border-gray-600 rounded-md">{value}{unit}</span>
        </label>
        <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={onChange}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-lg [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-yellow-400 [&::-webkit-slider-thumb]:rounded-full"
        />
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="editor-modal-title"
    >
      <div
        className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col md:flex-row"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-grow flex items-center justify-center p-6 md:w-2/3">
            <img
                ref={imageRef}
                src={imageSrc}
                alt="Image to edit"
                className="max-w-full max-h-full object-contain transition-all duration-100"
                style={filterStyle}
            />
        </div>

        <div className="flex-shrink-0 md:w-1/3 p-6 border-t md:border-t-0 md:border-l border-gray-700 flex flex-col justify-between bg-gray-900/30 rounded-r-2xl">
            <div>
                <header className="flex items-center justify-between mb-6">
                    <h2 id="editor-modal-title" className="text-xl font-bold text-gray-200">Adjust Image</h2>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition"
                        aria-label="Close editor"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>
                <div className="space-y-6">
                    <Slider label="Hue" value={hue} onChange={(e) => setHue(parseInt(e.target.value, 10))} min={-180} max={180} unit="°" />
                    <Slider label="Saturation" value={saturation} onChange={(e) => setSaturation(parseInt(e.target.value, 10))} min={0} max={200} unit="%" />
                    <Slider label="Brightness" value={brightness} onChange={(e) => setBrightness(parseInt(e.target.value, 10))} min={0} max={200} unit="%" />
                </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
                <Button onClick={resetAdjustments} variant="secondary">
                    <UndoIcon className="w-5 h-5 mr-2" /> Reset Adjustments
                </Button>
                <Button onClick={handleSave} variant="primary">Apply Changes</Button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditorModal;