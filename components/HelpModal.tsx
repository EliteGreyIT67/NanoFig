import React, { useState } from 'react';
import { XMarkIcon } from './Icons';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type HelpTopic = 'mode' | 'scale' | 'artStyle' | 'environment' | 'pose' | 'lighting' | 'modifier';

const ExampleImage: React.FC<{ title: string, description: string }> = ({ title, description }) => (
    <div className="text-center">
        <div className="aspect-video bg-gray-600 rounded-lg flex items-center justify-center p-2 border border-gray-500">
            <p className="text-sm font-semibold text-gray-200">{title}</p>
        </div>
        <p className="text-xs text-gray-400 mt-1">{description}</p>
    </div>
);


const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<HelpTopic>('mode');

  if (!isOpen) {
    return null;
  }

  const topics: { id: HelpTopic; title: string }[] = [
    { id: 'mode', title: 'Mode' },
    { id: 'scale', title: 'Scale' },
    { id: 'artStyle', title: 'Art Style' },
    { id: 'environment', title: 'Environment' },
    { id: 'pose', title: 'Pose' },
    { id: 'lighting', title: 'Lighting' },
    { id: 'modifier', title: 'Modifier' },
  ];

  const content: Record<HelpTopic, React.ReactNode> = {
    mode: (
        <div>
            <h3 className="text-xl font-bold text-yellow-300 mb-2">Generation Mode</h3>
            <p className="text-gray-300 mb-6">This setting determines the fundamental type of image you want to create.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold text-white mb-2">Figurine Mode</h4>
                    <p className="text-gray-400 text-sm mb-4">Creates a photorealistic image of a physical, 3D collectible figurine based on your input. This is perfect for visualizing a product.</p>
                    <ExampleImage title="3D Figurine" description="Renders a realistic, physical object." />
                </div>
                <div>
                    <h4 className="font-semibold text-white mb-2">Box Art Mode</h4>
                    <p className="text-gray-400 text-sm mb-4">Creates a 2D illustration suitable for the packaging or promotional art of a toy. This is great for a more artistic, dynamic look.</p>
                    <ExampleImage title="2D Box Art" description="Creates a dynamic illustration." />
                </div>
            </div>
        </div>
    ),
    scale: (
        <div>
            <h3 className="text-xl font-bold text-yellow-300 mb-2">Figurine Scale</h3>
            <p className="text-gray-300 mb-4">Available only in <span className="font-semibold text-white">Figurine Mode</span>, this setting simulates the level of detail found on figurines of different sizes.</p>
            <ul className="space-y-3 text-sm text-gray-400">
                <li><strong className="text-white">1/12 to 1/10:</strong> Simulates smaller figures. The AI will generate an image with slightly simplified details, common for this scale.</li>
                <li><strong className="text-white">1/8 to 1/7:</strong> The standard for high-quality collectibles. The AI aims for a professional, crisp "product photography" look.</li>
                <li><strong className="text-white">1/6 to 1/4:</strong> Represents large, premium-format statues. The AI will attempt to generate hyper-detailed textures and intricate features to reflect the high quality of a larger product.</li>
            </ul>
        </div>
    ),
    artStyle: (
        <div>
            <h3 className="text-xl font-bold text-yellow-300 mb-2">Art Style</h3>
            <p className="text-gray-300 mb-6">This is the most impactful setting, defining the overall visual aesthetic of your image.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <ExampleImage title="Realistic" description="A photorealistic style with natural textures." />
                <ExampleImage title="Anime / Cel-Shaded" description="Classic Japanese animation style with sharp lines." />
                <ExampleImage title="Chibi" description="A cute, exaggerated style with large heads and small bodies." />
                <ExampleImage title="Hand-Painted" description="Looks like a detailed, traditionally painted miniature." />
                <ExampleImage title="90s Retro" description="(Box Art) Bold, vibrant, and action-oriented anime style." />
                <ExampleImage title="Comic Book" description="(Box Art) Strong inks and dramatic shading." />
            </div>
        </div>
    ),
    environment: (
        <div>
            <h3 className="text-xl font-bold text-yellow-300 mb-2">Environment</h3>
            <p className="text-gray-300 mb-6">This setting describes the background and location where your subject is placed, adding context and atmosphere.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <ExampleImage title="On a computer desk" description="Clean, modern product shot setting." />
                <ExampleImage title="Floating in space" description="Dramatic and epic, great for sci-fi." />
                <ExampleImage title="Cyberpunk alleyway" description="Neon-lit, gritty, and futuristic." />
            </div>
        </div>
    ),
    pose: (
        <div>
            <h3 className="text-xl font-bold text-yellow-300 mb-2">Pose</h3>
            <p className="text-gray-300 mb-6">This controls the posture and action of your subject, conveying their personality and story.</p>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <ExampleImage title="Stoic museum stance" description="A neutral, standing pose for clear display." />
                <ExampleImage title="Dynamic action pose" description="A mid-action, exciting pose." />
                <ExampleImage title="Heroic landing" description="A powerful, impactful pose after a jump." />
            </div>
        </div>
    ),
    lighting: (
        <div>
            <h3 className="text-xl font-bold text-yellow-300 mb-2">Lighting</h3>
            <p className="text-gray-300 mb-6">Lighting is key to setting the mood. It controls the shadows, highlights, and overall feel of the scene.</p>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <ExampleImage title="Bright studio lighting" description="Even, professional lighting that shows all details." />
                <ExampleImage title="Dramatic cinematic" description="High contrast with deep shadows for a moody feel." />
                <ExampleImage title="Neon glow" description="Colorful, vibrant lighting from neon signs." />
            </div>
        </div>
    ),
    modifier: (
        <div>
            <h3 className="text-xl font-bold text-yellow-300 mb-2">Figurine Modifier</h3>
            <p className="text-gray-300 mb-6">Available only in <span className="font-semibold text-white">Figurine Mode</span>, modifiers add specific material properties or textures to the figurine.</p>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <ExampleImage title="Glossy finish" description="A shiny, reflective surface like polished plastic." />
                <ExampleImage title="Matte finish" description="A non-reflective, flat surface." />
                <ExampleImage title="Metallic accents" description="Parts of the figure appear to be made of metal." />
                <ExampleImage title="Translucent parts" description="Some areas are see-through, like colored glass." />
                <ExampleImage title="Weathered/battle-damaged" description="Adds scratches, dirt, and wear." />
                <ExampleImage title="Glow-in-the-dark" description="Certain details will appear to be glowing." />
            </div>
        </div>
    ),
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      <div
        className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700 flex-shrink-0">
          <h2 id="help-modal-title" className="text-2xl font-bold text-gray-200">Settings Guide</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition"
            aria-label="Close help"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </header>

        <div className="flex flex-col md:flex-row flex-grow min-h-0">
          <nav className="flex-shrink-0 md:w-48 p-4 border-b md:border-b-0 md:border-r border-gray-700 overflow-y-auto">
            <ul className="space-y-1">
              {topics.map(topic => (
                <li key={topic.id}>
                  <button
                    onClick={() => setActiveTab(topic.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition ${
                      activeTab === topic.id
                        ? 'bg-yellow-400 text-gray-900'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {topic.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="p-6 overflow-y-auto flex-grow">
            {content[activeTab]}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;