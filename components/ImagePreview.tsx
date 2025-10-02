import React, { useState, useRef, useEffect, useCallback } from 'react';
import Spinner from './Spinner';
import { ZoomInIcon, ZoomOutIcon, ArrowsPointingInIcon, RotateClockwiseIcon, RotateCounterClockwiseIcon } from './Icons';

interface ImagePreviewProps {
  imageSrc: string | null;
  altText: string;
  isLoading?: boolean;
  placeholderText?: string;
  aspectRatio?: '1:1' | '4:3' | '16:9';
}

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const SCALE_STEP = 0.5;

const ImagePreview: React.FC<ImagePreviewProps> = ({ imageSrc, altText, isLoading = false, placeholderText = "Your generated image will appear here", aspectRatio = '1:1' }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const pinchDistRef = useRef(0);
  const pinchScaleRef = useRef(1);


  const resetTransform = useCallback(() => {
    setScale(MIN_SCALE);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  }, []);

  // Reset transform when image source changes
  useEffect(() => {
    resetTransform();
  }, [imageSrc, resetTransform]);

  const handleWheel = (e: React.WheelEvent) => {
    if (!imageSrc || isLoading) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta));

    if (newScale === MIN_SCALE) {
        resetTransform();
    } else {
        setScale(newScale);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageSrc || isLoading || scale <= MIN_SCALE) return;
    e.preventDefault();
    setIsDragging(true);
    startPosRef.current = { 
        x: e.clientX, 
        y: e.clientY, 
        posX: position.x, 
        posY: position.y 
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !imageSrc || isLoading) return;
    e.preventDefault();
    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;
    setPosition({
      x: startPosRef.current.posX + dx,
      y: startPosRef.current.posY + dy,
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const getDist = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
      if (!imageSrc || isLoading) return;
      if (e.touches.length > 0) e.preventDefault();
      
      if (e.touches.length === 1 && scale > MIN_SCALE) {
          setIsDragging(true);
          startPosRef.current = {
              x: e.touches[0].clientX,
              y: e.touches[0].clientY,
              posX: position.x,
              posY: position.y,
          };
      } else if (e.touches.length === 2) {
          pinchDistRef.current = getDist(e);
          pinchScaleRef.current = scale;
          setIsDragging(false);
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (!imageSrc || isLoading) return;
      if (e.touches.length > 0) e.preventDefault();

      if (e.touches.length === 1 && isDragging) {
          const dx = e.touches[0].clientX - startPosRef.current.x;
          const dy = e.touches[0].clientY - startPosRef.current.y;
          setPosition({
              x: startPosRef.current.posX + dx,
              y: startPosRef.current.posY + dy,
          });
      } else if (e.touches.length === 2 && pinchDistRef.current > 0) {
          const newDist = getDist(e);
          const scaleChange = newDist / pinchDistRef.current;
          const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, pinchScaleRef.current * scaleChange));

          if (newScale === MIN_SCALE) {
              resetTransform();
          } else {
              setScale(newScale);
          }
      }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      setIsDragging(false);
      pinchDistRef.current = 0;
      if (e.touches.length === 1) {
          setIsDragging(true);
          startPosRef.current = {
              x: e.touches[0].clientX,
              y: e.touches[0].clientY,
              posX: position.x,
              posY: position.y,
          };
      }
  };

  const zoomIn = () => {
    const newScale = Math.min(MAX_SCALE, scale + SCALE_STEP);
    setScale(newScale);
  };

  const zoomOut = () => {
    const newScale = Math.max(MIN_SCALE, scale - SCALE_STEP);
    if (newScale === MIN_SCALE) {
      resetTransform();
    } else {
      setScale(newScale);
    }
  };
  
  const handleRotateClockwise = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleRotateCounterClockwise = () => {
    setRotation(prev => (prev - 90 + 360) % 360);
  };

  const cursorStyle = scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default';
  
  const aspectRatioClasses = {
    '1:1': 'aspect-square',
    '4:3': 'aspect-[4/3]',
    '16:9': 'aspect-[16/9]',
  };

  return (
    <div 
        ref={containerRef}
        className={`w-full bg-gray-800 rounded-2xl flex items-center justify-center p-2 border-2 relative overflow-hidden shadow-inner touch-none ${aspectRatioClasses[aspectRatio]} ${isLoading ? 'animate-pulse-border !border-solid' : 'border-dashed border-gray-700'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'none' }}
    >
      {/* Base content: either the image or the placeholder */}
      {imageSrc ? (
        <img
            src={imageSrc}
            alt={altText}
            className={`object-contain transition-transform duration-100 ease-out ${isLoading ? 'opacity-50' : ''}`}
            style={{ 
                width: '100%',
                height: '100%',
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                cursor: cursorStyle,
                willChange: 'transform'
            }}
            draggable={false}
        />
      ) : (
        <div className="text-center text-gray-500">
          <p>{placeholderText}</p>
        </div>
      )}

      {/* Loading Overlay: shown only when loading */}
      {isLoading && (
         <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-10">
            <Spinner />
        </div>
      )}
      
      {/* Controls: shown only when there's an image AND not loading */}
      {imageSrc && !isLoading && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-gray-900/60 backdrop-blur-sm rounded-lg p-1 border border-gray-700 z-20">
            <button onClick={handleRotateCounterClockwise} className="p-2 rounded-md text-gray-300 hover:bg-gray-700/80 transition" title="Rotate counter-clockwise">
                <RotateCounterClockwiseIcon className="w-5 h-5" />
            </button>
            <button onClick={handleRotateClockwise} className="p-2 rounded-md text-gray-300 hover:bg-gray-700/80 transition" title="Rotate clockwise">
                <RotateClockwiseIcon className="w-5 h-5" />
            </button>
            <div className="w-px h-5 bg-gray-600 mx-1"></div>
            <button onClick={zoomOut} disabled={scale <= MIN_SCALE} className="p-2 rounded-md text-gray-300 hover:bg-gray-700/80 disabled:opacity-50 disabled:cursor-not-allowed transition" title="Zoom out">
                <ZoomOutIcon className="w-5 h-5" />
            </button>
            <button onClick={resetTransform} disabled={scale <= MIN_SCALE && position.x === 0 && position.y === 0 && rotation === 0} className="p-2 rounded-md text-gray-300 hover:bg-gray-700/80 disabled:opacity-50 disabled:cursor-not-allowed transition" title="Reset View">
                <ArrowsPointingInIcon className="w-5 h-5" />
            </button>
            <button onClick={zoomIn} disabled={scale >= MAX_SCALE} className="p-2 rounded-md text-gray-300 hover:bg-gray-700/80 disabled:opacity-50 disabled:cursor-not-allowed transition" title="Zoom in">
                <ZoomInIcon className="w-5 h-5" />
            </button>
        </div>
      )}
    </div>
  );
};

export default ImagePreview;
