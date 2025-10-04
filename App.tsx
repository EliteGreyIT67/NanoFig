
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generate3dModel, ModelDetailLevel } from './services/geminiService';
import { transformImage } from './services/geminiService';
import { fileToDataUrl, dataUrlToBlob, svgDataUrlToPngDataUrl } from './utils/fileUtils';
import ImageUploader from './components/ImageUploader';
import ImagePreview from './components/ImagePreview';
import Button from './components/Button';
import { DownloadIcon, SparklesIcon, RecycleIcon, TrashIcon, CropIcon, XMarkIcon, UndoIcon, RedoIcon, AdjustmentsHorizontalIcon, LoadingSpinnerIcon, QuestionMarkCircleIcon, PhotoIcon, CubeIcon } from './components/Icons';
import HistoryModal from './components/HistoryModal';
import Logo from './components/Logo';
import ImageCropper from './components/ImageCropper';
import { useHistoryState } from './hooks/useHistoryState';
import HelpModal from './components/HelpModal';
import ImageEditorModal from './components/ImageEditorModal';
import PlaceholderGallery from './components/PlaceholderGallery';

type FigurineScale = '1/12' | '1/10' | '1/8' | '1/7' | '1/6' | '1/4';
type Mode = 'figurine' | 'boxArt';
type EnhancementLevel = 'Standard' | 'High' | 'Ultra';

type Preset = {
  name: string;
  mode: Mode;
  prompt: string;
  artStyle: string;
  environment: string;
  pose: string;
  lighting: string;
  modifier: string;
  aspectRatio: '1:1' | '4:3' | '16:9';
  scale: FigurineScale;
  enhancementLevel: EnhancementLevel;
  highFaceFidelity?: boolean;
};

type Settings = {
  mode: Mode;
  prompt: string;
  environment: string;
  pose: string;
  lighting: string;
  negativePrompt: string;
  artStyle: string;
  modifier: string;
  aspectRatio: '1:1' | '4:3' | '16:9';
  scale: FigurineScale;
  enhancementLevel: EnhancementLevel;
  highFaceFidelity: boolean;
};

export type Placeholder = {
  src: string;
  title: string;
  description: string;
  settings: Partial<Settings>;
};

const FIGURINE_SCALES: FigurineScale[] = ['1/12', '1/10', '1/8', '1/7', '1/6', '1/4'];
const ENHANCEMENT_LEVELS: EnhancementLevel[] = ['Standard', 'High', 'Ultra'];
const MODEL_DETAIL_LEVELS: ModelDetailLevel[] = ['Low', 'Medium', 'High'];

const initialSettings: Settings = {
  mode: 'figurine',
  prompt: '',
  scale: '1/7',
  environment: '',
  pose: '',
  lighting: '',
  negativePrompt: '',
  artStyle: '',
  modifier: '',
  aspectRatio: '1:1',
  enhancementLevel: 'Standard',
  highFaceFidelity: false,
};

const defaultPresets: Preset[] = [
    {
      name: "Designer's Desk",
      mode: 'figurine',
      prompt: "It has a round transparent acrylic base. A nearby computer screen shows the 3D modeling process of this figurine. Next to the computer is its packaging box, featuring 2D flat illustrations.",
      artStyle: "Realistic",
      environment: "On a computer desk",
      pose: "Stoic museum stance",
      lighting: "Bright studio lighting",
      modifier: "Glossy finish",
      aspectRatio: '4:3',
      scale: '1/7',
      enhancementLevel: 'High',
      highFaceFidelity: true,
    },
    {
      name: "90s Retro Box",
      mode: 'boxArt',
      prompt: "Dynamic 90s-style anime box art for a mecha model kit of the subject. Bold lines, vibrant colors, and a sense of action.",
      artStyle: "90s Retro",
      environment: "Floating in space",
      pose: "Dynamic action pose",
      lighting: "Dramatic cinematic lighting",
      modifier: "",
      aspectRatio: '4:3',
      scale: '1/7', // Not used in box art mode, but required by type
      enhancementLevel: 'Standard',
    },
    {
      name: "Chibi Forest",
      mode: 'figurine',
      prompt: "A cute Chibi-style figurine of the subject, exploring a magical, oversized world.",
      artStyle: "Chibi",
      environment: "On a forest floor",
      pose: "Casual and relaxed",
      lighting: "Soft natural daylight",
      modifier: "Matte finish",
      aspectRatio: '1:1',
      scale: '1/10',
      enhancementLevel: 'Standard',
    }
  ];

const FIGURINE_STYLES = ["Realistic", "Anime/Cel-Shaded", "Chibi", "Hand-Painted", "Claymation"];
const BOX_ART_STYLES = ["Modern Anime", "90s Retro", "Comic Book", "Minimalist", "Airbrushed"];

const ENVIRONMENTS = ["On a computer desk", "Cluttered workshop bench", "Glass museum display case", "Floating in space", "On a forest floor", "In a futuristic city", "Underwater reef", "Volcanic landscape", "Cyberpunk alleyway", "Majestic throne room", "On top of a snowy mountain peak"];
const POSES = ["Dynamic action pose", "Stoic museum stance", "Casual and relaxed", "Heroic landing", "Crouching", "Hands on hips", "Mid-air jump", "Defensive shield block", "Summoning a magical spell", "Leaning against a wall", "Meditating cross-legged"];
const LIGHTING_OPTIONS = ["Dramatic cinematic lighting", "Bright studio lighting", "Soft natural daylight", "Neon glow", "Volumetric haze", "Golden hour", "Harsh interrogation spotlight", "Mystical moonlight", "Warm fireplace glow", "Eerie bioluminescence", "God rays through clouds"];
const FIGURINE_MODIFIERS = ["Glossy finish", "Matte finish", "Metallic accents", "Translucent parts", "Weathered/battle-damaged", "Glow-in-the-dark details", "Crystal clear parts", "Flocked (velvet) texture", "Pearlescent coating", "Chrome finish", "Wood grain texture"];

const figurinePromptExamples = [
    "A dark knight with glowing red eyes, ornate gothic armor.",
    "Cute magical girl with a starry wand, pink and blue pastel colors.",
    "Cyborg ninja with a high-frequency blade, futuristic city backdrop.",
    "Stoic wizard with a long beard, holding a crystal staff.",
    "Gundam-style mecha with heavy cannons and intricate panel lines."
];
  
const boxArtPromptExamples = [
    "A hero leaping towards the viewer, explosions in the background.",
    "Two rival mechs clashing with energy swords, sparks flying.",
    "A team of heroes posing together against a cosmic backdrop.",
    "A villain commanding an army of minions, seen from a low angle.",
    "Close-up on the character's face with a determined expression."
];

const placeholderSvg = (title: string, subtitle: string): string => {
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <rect width="100%" height="100%" fill="#1F2937"/>
    <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="60" fill="#FBBF24" font-weight="bold">${title}</text>
    <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="30" fill="#9CA3AF">${subtitle}</text>
</svg>`;
    const cleanedSvg = svg.replace(/\n\s*/g, '');
    return `data:image/svg+xml;base64,${btoa(cleanedSvg)}`;
};

const placeholders: Placeholder[] = [
    {
        src: placeholderSvg('Cyborg Ninja', 'Figurine'),
        title: 'Cyborg Ninja',
        description: 'A futuristic assassin as a high-detail figurine.',
        settings: {
            mode: 'figurine',
            prompt: 'Cyborg ninja with a high-frequency blade, futuristic city backdrop.',
            artStyle: 'Realistic',
            environment: 'Cyberpunk alleyway',
            pose: 'Dynamic action pose',
            lighting: 'Neon glow',
            modifier: 'Metallic accents',
            aspectRatio: '1:1',
            scale: '1/7',
            enhancementLevel: 'High',
        },
    },
    {
        src: placeholderSvg('Magical Girl', 'Box Art'),
        title: 'Magical Girl',
        description: 'Dynamic 90s-style anime box art illustration.',
        settings: {
            mode: 'boxArt',
            prompt: 'Cute magical girl with a starry wand, pink and blue pastel colors.',
            artStyle: '90s Retro',
            environment: 'Floating in space',
            pose: 'Summoning a magical spell',
            lighting: 'Mystical moonlight',
            aspectRatio: '4:3',
            enhancementLevel: 'Standard',
        },
    },
    {
        src: placeholderSvg('Mecha', 'Figurine'),
        title: 'Heavy-Armor Mecha',
        description: 'Gundam-style mecha on a cluttered workshop bench.',
        settings: {
            mode: 'figurine',
            prompt: 'Gundam-style mecha with heavy cannons and intricate panel lines.',
            artStyle: 'Realistic',
            environment: 'Cluttered workshop bench',
            pose: 'Stoic museum stance',
            lighting: 'Bright studio lighting',
            modifier: 'Weathered/battle-damaged',
            aspectRatio: '4:3',
            scale: '1/8',
            enhancementLevel: 'High',
        },
    },
    {
        src: placeholderSvg('Fantasy Knight', 'Figurine'),
        title: 'Fantasy Knight',
        description: 'Ornately armored dark knight in a throne room.',
        settings: {
            mode: 'figurine',
            prompt: 'A dark knight with glowing red eyes, ornate gothic armor.',
            artStyle: 'Hand-Painted',
            environment: 'Majestic throne room',
            pose: 'Hands on hips',
            lighting: 'Warm fireplace glow',
            modifier: 'Metallic accents',
            aspectRatio: '1:1',
            scale: '1/6',
            enhancementLevel: 'Ultra',
        },
    },
];

const Tooltip: React.FC<{ text: string; children: React.ReactNode; widthClass?: string; }> = ({ text, children, widthClass = 'w-64' }) => {
  return (
    <span className="group relative flex items-center cursor-help">
      {children}
      <QuestionMarkCircleIcon className="w-4 h-4 ml-1.5 text-gray-400 shrink-0" />
      <span
        role="tooltip"
        className={`absolute left-0 bottom-full mb-2 p-3 bg-gray-900 text-gray-200 text-xs rounded-lg border border-gray-600 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 ${widthClass}`}
      >
        {text}
      </span>
    </span>
  );
};

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [transformedImage, setTransformedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating3dModel, setIsGenerating3dModel] = useState<boolean>(false);
  const [modelData, setModelData] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelDetailLevel, setModelDetailLevel] = useState<ModelDetailLevel>('Medium');
  
  const { 
    state: settings, 
    setState: setSettings, 
    undo, 
    redo, 
    canUndo, 
    canRedo 
  } = useHistoryState<Settings>(initialSettings);
  
  const [history, setHistory] = useState<string[]>([]);
  
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetName, setPresetName] = useState<string>('');
  const [saveConfirmation, setSaveConfirmation] = useState<string | null>(null);
  const saveConfirmTimeoutRef = useRef<number | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCropperOpen, setIsCropperOpen] = useState(false);

  useEffect(() => {
    try {
      const savedPresets = localStorage.getItem('nanoFigPresets');
      if (savedPresets) {
        setPresets(JSON.parse(savedPresets));
      } else {
        setPresets(defaultPresets);
      }
    } catch (e) {
      console.error("Failed to load presets", e);
      setPresets(defaultPresets);
    }
  }, []);

  const handleImageUpload = useCallback(async (file: File) => {
    setError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      setOriginalImage(dataUrl);
    } catch (e) {
      setError('Failed to read the image file.');
      console.error(e);
    }
  }, []);

  const handleClearOriginalImage = () => {
    setOriginalImage(null);
  };
  
  const buildPrompt = useCallback((): string => {
    const { mode, prompt, scale, environment, pose, lighting, artStyle, modifier, highFaceFidelity } = settings;
    
    const fidelityPrefix = highFaceFidelity ? "Ultra high-fidelity, strongly preserve the exact facial likeness of the person in the image. " : "";

    let finalPrompt = `${fidelityPrefix}A high-quality, detailed image of ${prompt}.`;

    if (mode === 'figurine') {
      finalPrompt += ` As a ${artStyle} style, ${scale} scale collectible figurine.`;
      if (environment) finalPrompt += ` The figurine is placed ${environment}.`;
      if (pose) finalPrompt += ` It is in a ${pose}.`;
      if (lighting) finalPrompt += ` The lighting is ${lighting}.`;
      if (modifier) finalPrompt += ` The figurine has a ${modifier}.`;
    } else { // boxArt
      finalPrompt += ` As a piece of ${artStyle} style box art.`;
      if (environment) finalPrompt += ` The background is ${environment}.`;
      if (pose) finalPrompt += ` The character is in a ${pose}.`;
      if (lighting) finalPrompt += ` The lighting is ${lighting}.`;
    }
    
    return finalPrompt;
  }, [settings]);

  const handleGenerateClick = useCallback(async () => {
    if (!originalImage) {
      setError('Please upload an image first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setModelData(null);
    setModelError(null);
    
    try {
      const fullPrompt = buildPrompt();
      const { image } = await transformImage(
        originalImage, 
        fullPrompt,
        settings.enhancementLevel,
        settings.aspectRatio
      );
      
      setTransformedImage(image);
      setHistory(prev => [image, ...prev].slice(0, 50)); 

    } catch (e: any) {
      setError(e.message || 'An unknown error occurred during image generation.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [originalImage, settings, buildPrompt]);
  
  const handleSelectPlaceholder = useCallback(async (placeholder: Placeholder) => {
    setSettings(s => ({ ...initialSettings, ...placeholder.settings }));
    setError(null);
    setTransformedImage(null);
    try {
      const pngDataUrl = await svgDataUrlToPngDataUrl(placeholder.src);
      setOriginalImage(pngDataUrl);
    } catch (e) {
      setError("Failed to convert placeholder image.");
      console.error(e);
    }
  }, [setSettings]);

  const handleSettingChange = (field: keyof Settings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleDownload = () => {
    if (!transformedImage) return;
    const link = document.createElement('a');
    link.href = transformedImage;
    link.download = `nanofig_result_${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleUseAsInput = () => {
    if (!transformedImage) return;
    setOriginalImage(transformedImage);
    setTransformedImage(null);
    setModelData(null);
    setModelError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleClearAll = () => {
    setOriginalImage(null);
    setTransformedImage(null);
    setSettings(initialSettings);
    setError(null);
    setModelData(null);
    setModelError(null);
  };

  const onCropSave = (dataUrl: string) => {
    setOriginalImage(dataUrl);
    setIsCropperOpen(false);
  };

  const onEditorSave = (dataUrl: string) => {
    setOriginalImage(dataUrl);
    setIsEditorOpen(false);
  };

  const handleSelectFromHistory = (image: string) => {
    setTransformedImage(image);
    setIsHistoryModalOpen(false);
  };
  
  const handleUseFromHistory = (image: string) => {
    setOriginalImage(image);
    setTransformedImage(null);
    setIsHistoryModalOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteFromHistory = (image: string) => {
    setHistory(prev => prev.filter(item => item !== image));
  };
  
  const handleGenerate3dModelClick = useCallback(async () => {
    setIsGenerating3dModel(true);
    setModelData(null);
    setModelError(null);
    
    try {
      const basePrompt = buildPrompt();
      const objData = await generate3dModel(basePrompt, modelDetailLevel);
      setModelData(objData);
    } catch (e: any) {
      setModelError(e.message || 'An unknown error occurred during 3D model generation.');
      console.error(e);
    } finally {
      setIsGenerating3dModel(false);
    }
  }, [buildPrompt, modelDetailLevel]);

  const handleDownloadModel = () => {
    if (!modelData) return;
    const blob = new Blob([modelData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nanofig_model_${new Date().getTime()}.obj`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const currentArtStyles = settings.mode === 'figurine' ? FIGURINE_STYLES : BOX_ART_STYLES;

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans">
      <div className="container mx-auto p-4 lg:p-8">
        <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <Logo />
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setIsHistoryModalOpen(true)}>
              <PhotoIcon className="w-5 h-5 mr-2" /> History
            </Button>
            <Button variant="secondary" onClick={() => setIsHelpModalOpen(true)}>
              <QuestionMarkCircleIcon className="w-5 h-5 mr-2" /> Help
            </Button>
          </div>
        </header>

        {error && (
          <div className="bg-red-800/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-6" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
            <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3" aria-label="Close">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Input Image Panel */}
              <div className="bg-gray-800/70 p-6 rounded-2xl shadow-lg border border-gray-700 flex flex-col">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-3"><span className="bg-yellow-400 text-gray-900 rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg">1</span> Input Image</h2>
                <div className="flex-grow flex flex-col">
                  {originalImage ? (
                    <div>
                      <ImagePreview imageSrc={originalImage} altText="Original Image" aspectRatio="1:1" />
                      <div className="flex flex-wrap gap-2 mt-4">
                        <Button onClick={() => setIsCropperOpen(true)} variant="secondary"><CropIcon className="w-5 h-5 mr-2" /> Crop</Button>
                        <Button onClick={() => setIsEditorOpen(true)} variant="secondary"><AdjustmentsHorizontalIcon className="w-5 h-5 mr-2" /> Adjust</Button>
                        <Button onClick={handleClearOriginalImage} variant="secondary"><TrashIcon className="w-5 h-5 mr-2" />Remove</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-grow flex flex-col">
                      <ImageUploader onImageUpload={handleImageUpload} onError={setError} />
                      <PlaceholderGallery placeholders={placeholders} onSelect={handleSelectPlaceholder} />
                    </div>
                  )}
                </div>
              </div>

              {/* Generated Image Panel */}
              <div className="bg-gray-800/70 p-6 rounded-2xl shadow-lg border border-gray-700">
                <h2 className="text-xl font-bold mb-4">Generated Image</h2>
                <ImagePreview 
                  imageSrc={transformedImage} 
                  altText="Transformed Image" 
                  isLoading={isLoading}
                  aspectRatio={settings.aspectRatio}
                />
                {transformedImage && !isLoading && (
                   <div className="mt-4 flex flex-col gap-4">
                      <div className="flex flex-wrap gap-2">
                          <Button onClick={handleDownload}><DownloadIcon className="w-5 h-5 mr-2" /> Download Image</Button>
                          <Button onClick={handleUseAsInput} variant="secondary"><RecycleIcon className="w-5 h-5 mr-2" /> Use as Input</Button>
                      </div>
  
                      {settings.mode === 'figurine' && (
                          <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600 space-y-4 animate-fade-in-scale">
                              <h4 className="text-md font-semibold text-gray-200">
                                  <Tooltip text="This is an experimental feature that generates a basic 3D mesh. The quality may vary greatly.">
                                      Generate 3D Model (.obj)
                                  </Tooltip>
                              </h4>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  <Tooltip text="Controls the complexity of the generated 3D mesh. 'High' will attempt more vertices and faces, but may fail on complex subjects.">
                                    Model Detail Level
                                  </Tooltip>
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                  {MODEL_DETAIL_LEVELS.map((level) => (
                                    <Button 
                                      key={level} 
                                      onClick={() => setModelDetailLevel(level)} 
                                      variant={modelDetailLevel === level ? 'primary' : 'secondary'} 
                                      className="!py-2 !text-sm"
                                    >
                                      {level}
                                    </Button>
                                  ))}
                                </div>
                              </div>
  
                              <Button onClick={handleGenerate3dModelClick} variant="secondary" disabled={isGenerating3dModel} className="w-full">
                                  <CubeIcon className="w-5 h-5 mr-2" />
                                  {isGenerating3dModel ? 'Generating Model...' : 'Generate 3D Model'}
                              </Button>
  
                              {isGenerating3dModel && <p className="text-xs text-center text-gray-400">Model generation can take up to a minute...</p>}
  
                              {modelError && (
                                  <div className="bg-red-800/50 border border-red-700 text-red-200 px-3 py-2 rounded-lg text-sm" role="alert">
                                      <strong>3D Model Error:</strong> {modelError}
                                  </div>
                              )}
                              
                              {modelData && (
                                  <div className="p-3 bg-gray-900/50 rounded-lg flex items-center justify-between animate-fade-in-scale">
                                      <p className="text-sm text-gray-300">🎉 3D model data generated!</p>
                                      <Button onClick={handleDownloadModel} className="!py-2 !px-4 !text-sm">
                                          <DownloadIcon className="w-4 h-4 mr-2" />
                                          Download .OBJ
                                      </Button>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-2 bg-gray-800/70 p-6 rounded-2xl shadow-lg border border-gray-700 self-start">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-3"><span className="bg-yellow-400 text-gray-900 rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg">2</span> Customize</h2>
            <div className="space-y-6">
                
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Core Concept</h3>
                <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300">
                        <Tooltip text="Choose the fundamental type of image: a 3D 'Figurine' for a product shot look, or a 2D 'Box Art' for a dynamic illustration.">
                          Mode
                        </Tooltip>
                      </label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                          <Button onClick={() => handleSettingChange('mode', 'figurine')} variant={settings.mode === 'figurine' ? 'primary' : 'secondary'}>Figurine</Button>
                          <Button onClick={() => handleSettingChange('mode', 'boxArt')} variant={settings.mode === 'boxArt' ? 'primary' : 'secondary'}>Box Art</Button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="prompt" className="block text-sm font-medium text-gray-300">
                        <Tooltip text="Describe the main character or object. Be specific about appearance, clothing, and key features.">
                          Subject / Prompt
                        </Tooltip>
                      </label>
                      <textarea id="prompt" value={settings.prompt} onChange={e => handleSettingChange('prompt', e.target.value)} rows={3} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 focus:ring-yellow-500 focus:border-yellow-500" placeholder={settings.mode === 'figurine' ? figurinePromptExamples[0] : boxArtPromptExamples[0]} />
                    </div>
                </div>
              </div>

              <hr className="border-gray-700" />
              
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Visual Style</h3>
                <div className="space-y-4">
                    <div>
                      <label htmlFor="artStyle" className="block text-sm font-medium text-gray-300">
                        <Tooltip text="Defines the overall visual aesthetic. 'Realistic' aims for photorealism, while 'Anime' creates a stylized look.">
                          Art Style
                        </Tooltip>
                      </label>
                      <select id="artStyle" value={settings.artStyle} onChange={e => handleSettingChange('artStyle', e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 focus:ring-yellow-500 focus:border-yellow-500">
                        <option value="">Default</option>
                        {currentArtStyles.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                        <label htmlFor="lighting" className="block text-sm font-medium text-gray-300">
                          <Tooltip text="Controls the mood and shadows of the scene. 'Studio' is clean and bright, while 'Cinematic' is dramatic.">
                            Lighting
                          </Tooltip>
                        </label>
                        <select id="lighting" value={settings.lighting} onChange={e => handleSettingChange('lighting', e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 focus:ring-yellow-500 focus:border-yellow-500">
                          <option value="">Default</option>
                          {LIGHTING_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    {settings.mode === 'figurine' && (
                      <div>
                          <label htmlFor="modifier" className="block text-sm font-medium text-gray-300">
                            <Tooltip text="Adds specific material properties to the figurine, like a 'Glossy' shine or 'Weathered' battle damage.">
                              Modifier
                            </Tooltip>
                          </label>
                          <select id="modifier" value={settings.modifier} onChange={e => handleSettingChange('modifier', e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 focus:ring-yellow-500 focus:border-yellow-500">
                              <option value="">None</option>
                              {FIGURINE_MODIFIERS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                      </div>
                    )}
                </div>
              </div>

              <hr className="border-gray-700" />

              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Composition</h3>
                <div className="space-y-4">
                    <div>
                      <label htmlFor="environment" className="block text-sm font-medium text-gray-300">
                        <Tooltip text="Sets the background and location for your subject, adding context and atmosphere.">
                          Environment
                        </Tooltip>
                      </label>
                      <select id="environment" value={settings.environment} onChange={e => handleSettingChange('environment', e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 focus:ring-yellow-500 focus:border-yellow-500">
                        <option value="">None</option>
                        {ENVIRONMENTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="pose" className="block text-sm font-medium text-gray-300">
                        <Tooltip text="Determines the character's posture and action, conveying personality and movement.">
                          Pose
                        </Tooltip>
                      </label>
                      <select id="pose" value={settings.pose} onChange={e => handleSettingChange('pose', e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 focus:ring-yellow-500 focus:border-yellow-500">
                        <option value="">Default</option>
                        {POSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300">
                        <Tooltip text="Sets the shape of the final image. 1:1 is square, 4:3 is standard, and 16:9 is wide.">
                          Aspect Ratio
                        </Tooltip>
                      </label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <Button onClick={() => handleSettingChange('aspectRatio', '1:1')} variant={settings.aspectRatio === '1:1' ? 'primary' : 'secondary'} className="!py-2">1:1</Button>
                        <Button onClick={() => handleSettingChange('aspectRatio', '4:3')} variant={settings.aspectRatio === '4:3' ? 'primary' : 'secondary'} className="!py-2">4:3</Button>
                        <Button onClick={() => handleSettingChange('aspectRatio', '16:9')} variant={settings.aspectRatio === '16:9' ? 'primary' : 'secondary'} className="!py-2">16:9</Button>
                      </div>
                    </div>
                </div>
              </div>

              <hr className="border-gray-700" />

              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Details & Quality</h3>
                <div className="space-y-4">
                  {settings.mode === 'figurine' && (
                    <div>
                      <label htmlFor="scale" className="block text-sm font-medium text-gray-300">
                        <Tooltip text="Simulates the level of detail for different figurine sizes. Larger scales produce more intricate details.">
                          Scale
                        </Tooltip>
                      </label>
                      <select id="scale" value={settings.scale} onChange={e => handleSettingChange('scale', e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 focus:ring-yellow-500 focus:border-yellow-500">
                        {FIGURINE_SCALES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      <Tooltip text="Adjusts the AI's post-processing. 'High' and 'Ultra' can improve detail and clarity but may take longer.">
                        Enhancement Level
                      </Tooltip>
                    </label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {ENHANCEMENT_LEVELS.map(level => (
                        <Button key={level} onClick={() => handleSettingChange('enhancementLevel', level)} variant={settings.enhancementLevel === level ? 'primary' : 'secondary'} className="!py-2 !text-sm">{level}</Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg">
                      <label htmlFor="faceFidelity" className="text-sm font-medium text-gray-200 cursor-pointer">
                        <Tooltip text="Strongly preserves the character's exact facial likeness. Best for realistic portraits.">
                          High Face Fidelity
                        </Tooltip>
                      </label>
                      <div className="relative inline-flex items-center cursor-pointer">
                          <input
                              id="faceFidelity"
                              type="checkbox"
                              checked={settings.highFaceFidelity}
                              onChange={e => handleSettingChange('highFaceFidelity', e.target.checked)}
                              className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-yellow-500/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                      </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 space-y-4">
                <div className="flex gap-2 items-center justify-center">
                    <Button onClick={undo} disabled={!canUndo} variant="secondary" className="!p-3" title="Undo"><UndoIcon className="w-5 h-5"/></Button>
                    <Button onClick={redo} disabled={!canRedo} variant="secondary" className="!p-3" title="Redo"><RedoIcon className="w-5 h-5"/></Button>
                </div>
                <div>
                  <Button onClick={handleGenerateClick} disabled={!originalImage || isLoading || isGenerating3dModel} className="w-full">
                    <SparklesIcon className="w-6 h-6 mr-2"/>
                    {isLoading ? 'Generating...' : 'Generate Image'}
                  </Button>
                </div>
                <div className="text-center">
                    <button onClick={handleClearAll} className="text-sm text-gray-500 hover:text-yellow-400 transition">
                        Reset All Settings & Images
                    </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        {isHistoryModalOpen && <HistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} history={history} onSelect={handleSelectFromHistory} onUseAsInput={handleUseFromHistory} onDelete={handleDeleteFromHistory} />}
        {isHelpModalOpen && <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />}
        {isEditorOpen && originalImage && <ImageEditorModal imageSrc={originalImage} onClose={() => setIsEditorOpen(false)} onSave={onEditorSave} />}
        {isCropperOpen && originalImage && <ImageCropper imageSrc={originalImage} aspectRatioValue={1} onClose={() => setIsCropperOpen(false)} onSave={onCropSave} />}
      </div>
    </div>
  );
};

export default App;
