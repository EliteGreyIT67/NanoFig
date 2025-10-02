import React from 'react';
import { Placeholder } from '../App';
import { SparklesIcon } from './Icons';

interface PlaceholderGalleryProps {
  placeholders: Placeholder[];
  onSelect: (placeholder: Placeholder) => void;
}

const PlaceholderGallery: React.FC<PlaceholderGalleryProps> = ({ placeholders, onSelect }) => {
  return (
    <div className="mt-2">
      <h3 className="text-center text-base font-semibold text-gray-400 mb-4">Or, start with an example</h3>
      <div className="grid grid-cols-2 gap-4">
        {placeholders.map((placeholder) => (
          <button
            key={placeholder.title}
            onClick={() => onSelect(placeholder)}
            className="group relative aspect-square rounded-xl overflow-hidden border-2 border-gray-700/80 hover:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-300 transform hover:-translate-y-[6px] hover:scale-105"
          >
            <img
              src={placeholder.src}
              alt={placeholder.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-3 flex flex-col justify-end">
              <h4 className="font-bold text-white text-md">{placeholder.title}</h4>
              <p className="text-gray-300 text-xs leading-tight">{placeholder.description}</p>
              <div className="flex items-center gap-1 mt-1 text-yellow-400 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                <SparklesIcon className="w-4 h-4" />
                <span className="font-semibold text-xs">Apply & Use</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PlaceholderGallery;