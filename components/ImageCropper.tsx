import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CheckIcon, XMarkIcon } from './Icons';
import Button from './Button';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropperProps {
  imageSrc: string;
  aspectRatioValue: number;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

type DragHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'move';

const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, aspectRatioValue, onClose, onSave }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const dragInfo = useRef<{ active: boolean; type: DragHandle | null }>({ active: false, type: null });

  const [imageSize, setImageSize] = useState({ width: 0, height: 0, left: 0, top: 0 });
  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0 });

  const initCrop = useCallback(() => {
    if (!imageSize.width || !imageSize.height) return;

    const { width: imgWidth, height: imgHeight } = imageSize;
    const imgRatio = imgWidth / imgHeight;

    let newWidth, newHeight;
    if (aspectRatioValue > imgRatio) {
      newWidth = imgWidth * 0.8;
      newHeight = newWidth / aspectRatioValue;
    } else {
      newHeight = imgHeight * 0.8;
      newWidth = newHeight * aspectRatioValue;
    }

    const newX = imageSize.left + (imgWidth - newWidth) / 2;
    const newY = imageSize.top + (imgHeight - newHeight) / 2;

    setCrop({ x: newX, y: newY, width: newWidth, height: newHeight });
  }, [imageSize, aspectRatioValue]);

  const onImageLoad = useCallback(() => {
    const container = containerRef.current;
    const img = imageRef.current;
    if (!container || !img) return;

    const containerRatio = container.clientWidth / container.clientHeight;
    const imgRatio = img.naturalWidth / img.naturalHeight;

    let width, height, left, top;

    if (imgRatio > containerRatio) {
      width = container.clientWidth;
      height = width / imgRatio;
      left = 0;
      top = (container.clientHeight - height) / 2;
    } else {
      height = container.clientHeight;
      width = height * imgRatio;
      top = 0;
      left = (container.clientWidth - width) / 2;
    }
    setImageSize({ width, height, left, top });
  }, []);

  useEffect(() => {
    initCrop();
  }, [initCrop]);

  useEffect(() => {
    window.addEventListener('resize', onImageLoad);
    return () => window.removeEventListener('resize', onImageLoad);
  }, [onImageLoad]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, type: DragHandle) => {
    e.preventDefault();
    e.stopPropagation();
    dragInfo.current = { active: true, type };
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragInfo.current.active) return;
    
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    setCrop(prevCrop => {
      let newCrop = { ...prevCrop };
      const type = dragInfo.current.type;

      // Calculate new dimensions/positions
      if (type?.includes('e')) newCrop.width += dx;
      if (type?.includes('w')) {
        newCrop.x += dx;
        newCrop.width -= dx;
      }
      if (type?.includes('s')) newCrop.height += dy;
      if (type?.includes('n')) {
        newCrop.y += dy;
        newCrop.height -= dy;
      }

      // Maintain aspect ratio
      if (type?.startsWith('n') || type?.startsWith('s')) {
        newCrop.width = newCrop.height * aspectRatioValue;
      } else {
        newCrop.height = newCrop.width / aspectRatioValue;
      }
      if (type === 'nw') { newCrop.x = prevCrop.x + prevCrop.width - newCrop.width; newCrop.y = prevCrop.y + prevCrop.height - newCrop.height; }
      if (type === 'ne') { newCrop.y = prevCrop.y + prevCrop.height - newCrop.height; }
      if (type === 'sw') { newCrop.x = prevCrop.x + prevCrop.width - newCrop.width; }
      
      if (type === 'move') {
        newCrop.x += dx;
        newCrop.y += dy;
      }
      
      // Clamp to image boundaries
      newCrop.x = Math.max(imageSize.left, newCrop.x);
      newCrop.y = Math.max(imageSize.top, newCrop.y);
      if (newCrop.x + newCrop.width > imageSize.left + imageSize.width) {
        newCrop.width = imageSize.left + imageSize.width - newCrop.x;
        newCrop.height = newCrop.width / aspectRatioValue;
      }
      if (newCrop.y + newCrop.height > imageSize.top + imageSize.height) {
        newCrop.height = imageSize.top + imageSize.height - newCrop.y;
        newCrop.width = newCrop.height * aspectRatioValue;
      }
      if (newCrop.width < 20 || newCrop.height < 20) return prevCrop; // Prevent inversion

      return newCrop;
    });
  }, [aspectRatioValue, imageSize]);

  const handleMouseUp = useCallback(() => {
    dragInfo.current = { active: false, type: null };
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleSave = () => {
    const img = imageRef.current;
    if (!img) return;

    const scaleX = img.naturalWidth / imageSize.width;
    const scaleY = img.naturalHeight / imageSize.height;

    const canvas = document.createElement('canvas');
    canvas.width = (crop.width - (dragInfo.current.type === 'w' || dragInfo.current.type === 'e' ? 2 : 0)) * scaleX;
    canvas.height = (crop.height - (dragInfo.current.type === 'n' || dragInfo.current.type === 's' ? 2 : 0)) * scaleY;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;
    ctx.drawImage(
      img,
      (crop.x - imageSize.left) * scaleX,
      (crop.y - imageSize.top) * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0, 0,
      canvas.width, canvas.height
    );

    onSave(canvas.toDataURL('image/png'));
  };

  const handles: DragHandle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
    >
      <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
        <h2 className="text-2xl font-bold text-white">Crop Image</h2>
        <div className="flex gap-4">
          <Button onClick={onClose} variant="secondary" className="!px-4 !py-2">
            <XMarkIcon className="w-6 h-6" />
            <span className="sr-only">Cancel</span>
          </Button>
          <Button onClick={handleSave} variant="primary" className="!px-4 !py-2">
            <CheckIcon className="w-6 h-6" />
            <span className="sr-only">Confirm Crop</span>
          </Button>
        </div>
      </header>
      <div ref={containerRef} className="w-full h-full flex items-center justify-center p-16">
        <img
          ref={imageRef}
          src={imageSrc}
          alt="Image to crop"
          className="max-w-full max-h-full object-contain select-none"
          onLoad={onImageLoad}
          style={{ opacity: 0.5 }}
        />
        {imageSize.width > 0 && (
          <div
            className="absolute border-2 border-yellow-400"
            style={{
              top: crop.y,
              left: crop.x,
              width: crop.width,
              height: crop.height,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
            }}
          >
            <div
              className="absolute inset-0 cursor-move"
              onMouseDown={(e) => handleMouseDown(e, 'move')}
            />
            {handles.map(handle => (
              <div
                key={handle}
                className={`absolute bg-yellow-400 w-3 h-3 border-2 border-gray-900 rounded-full
                  ${handle.includes('n') ? '-top-1.5' : ''}
                  ${handle.includes('s') ? '-bottom-1.5' : ''}
                  ${handle.includes('e') ? '-right-1.5' : ''}
                  ${handle.includes('w') ? '-left-1.5' : ''}
                  ${!handle.includes('n') && !handle.includes('s') ? 'top-1/2 -translate-y-1/2' : ''}
                  ${!handle.includes('e') && !handle.includes('w') ? 'left-1/2 -translate-x-1/2' : ''}
                `}
                style={{ cursor: `${handle}-resize` }}
                onMouseDown={(e) => handleMouseDown(e, handle)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageCropper;