import React from 'react';
import { PhotoIcon, RecycleIcon, XMarkIcon, TrashIcon } from './Icons';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: string[];
  onSelect: (imageSrc: string) => void;
  onUseAsInput: (imageSrc:string) => void;
  onDelete: (imageSrc: string) => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, history, onSelect, onUseAsInput, onDelete }) => {
  if (!isOpen) {
    return null;
  }

  const handleDelete = (imageSrc: string) => {
    if (window.confirm('Are you sure you want to permanently delete this image from your history?')) {
      onDelete(imageSrc);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
    >
      <div 
        className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <header className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700 flex-shrink-0">
          <h2 id="history-modal-title" className="text-2xl font-bold text-gray-200">Generation History</h2>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition"
            aria-label="Close history view"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </header>

        <div className="p-4 sm:p-6 overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-gray-400 text-center py-12">Your image generation history is empty.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {history.map((imageSrc, index) => (
                <div key={index} className="group relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-yellow-400 transition">
                  <img
                    src={imageSrc}
                    alt={`History item ${index + 1}`}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                    <button 
                      onClick={() => onSelect(imageSrc)} 
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-yellow-400 text-gray-900 font-semibold rounded-md hover:bg-yellow-500 transition text-sm"
                      title="Set as current generated image"
                    >
                      <PhotoIcon className="w-4 h-4" />
                      View
                    </button>
                    <button 
                      onClick={() => onUseAsInput(imageSrc)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-500 transition text-sm"
                      title="Use this image as the new input"
                    >
                      <RecycleIcon className="w-4 h-4" />
                      Use as Input
                    </button>
                    <button 
                      onClick={() => handleDelete(imageSrc)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-800/80 text-white font-semibold rounded-md hover:bg-red-700 transition text-sm"
                      title="Delete this image from history"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
