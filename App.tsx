import React, { useState, useCallback, useEffect, useRef } from 'react';
import { transformImage } from './services/geminiService';
import { fileToDataUrl, dataUrlToBlob, svgDataUrlToPngDataUrl } from './utils/fileUtils';
import ImageUploader from './components/ImageUploader';
import ImagePreview from './components/ImagePreview';
import Button from './components/Button';
import { DownloadIcon, ShareIcon, SparklesIcon, RecycleIcon, TrashIcon, MagicWandIcon, CropIcon, XMarkIcon, UndoIcon, RedoIcon, AdjustmentsHorizontalIcon, LoadingSpinnerIcon, QuestionMarkCircleIcon } from './components/Icons';
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
};

export type Placeholder = {
  src: string;
  title: string;
  description: string;
  settings: Partial<Settings>;
};

const FIGURINE_SCALES: FigurineScale[] = ['1/12', '1/10', '1/8', '1/7', '1/6', '1/4'];
const ENHANCEMENT_LEVELS: EnhancementLevel[] = ['Standard', 'High', 'Ultra'];

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

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [transformedImage, setTransformedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for settings with undo/redo history
  const { 
    state: settings, 
    setState: setSettings, 
    undo, 
    redo, 
    canUndo, 
    canRedo 
  } = useHistoryState<Settings>(initialSettings);
  
  const [history, setHistory] = useState<string[]>([]);
  
  // State for presets
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetName, setPresetName] = useState<string>('');

  // State for modals
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);

  // State for image cropper
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  
  // State for auto-saved draft
  const [isDraftAvailable, setIsDraftAvailable] = useState(false);
  const autosaveTimeoutRef = useRef<number | null>(null);

  // State for mobile sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // State for prompt examples popover
  const [isPromptHelpVisible, setIsPromptHelpVisible] = useState(false);
  const promptHelpRef = useRef<HTMLDivElement>(null);

  // Close prompt help popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
        if (promptHelpRef.current && !promptHelpRef.current.contains(event.target as Node)) {
            setIsPromptHelpVisible(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [promptHelpRef]);


  // Load data from local storage on initial render
  useEffect(() => {
    try {
      const savedPresets = localStorage.getItem('nanoFigPresets');
      if (savedPresets) {
        const parsedPresets = JSON.parse(savedPresets);
        if (Array.isArray(parsedPresets) && parsedPresets.length > 0) {
          setPresets(parsedPresets);
        } else {
          setPresets(defaultPresets);
        }
      } else {
        setPresets(defaultPresets);
      }

      const savedDraft = localStorage.getItem('nanoFigDraft');
      if (savedDraft) {
        setIsDraftAvailable(true);
      }
    } catch (e) {
      console.error("Failed to load data from local storage", e);
      setPresets(defaultPresets);
    }
  }, []);

  // Save presets to local storage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('nanoFigPresets', JSON.stringify(presets));
    } catch (e) {
      console.error("Failed to save presets to local storage", e);
    }
  }, [presets]);

  // Auto-save generation settings to a draft
  useEffect(() => {
    if (isLoading) return;

    if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
    }
    
    autosaveTimeoutRef.current = window.setTimeout(() => {
      // Avoid saving default/empty state as a draft
      const isDefaultState = 
          settings.prompt === '' &&
          settings.scale === '1/7' &&
          settings.environment === '' &&
          settings.pose === '' &&
          settings.lighting === '' &&
          settings.negativePrompt === '' &&
          settings.artStyle === '' &&
          settings.modifier === '' &&
          settings.enhancementLevel === 'Standard';

      if (!isDefaultState) {
        localStorage.setItem('nanoFigDraft', JSON.stringify(settings));
        setIsDraftAvailable(true);
      }
    }, 1500);

    return () => {
        if (autosaveTimeoutRef.current) {
            clearTimeout(autosaveTimeoutRef.current);
        }
    };
  }, [settings, isLoading]);

  const handleClearDraft = useCallback(() => {
    localStorage.removeItem('nanoFigDraft');
    setIsDraftAvailable(false);
  }, []);

  const handleImageUpload = useCallback(async (file: File) => {
    setError(null);
    setTransformedImage(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      setOriginalImage(dataUrl);
    } catch (err) {
      setError('Failed to read the image file. Please try another one.');
      console.error(err);
    }
  }, []);

  const handleSelectPlaceholder = useCallback(async (placeholder: Placeholder) => {
    setError(null);
    setTransformedImage(null);
    try {
      // The Gemini API doesn't support SVG, so we convert it to PNG on the fly.
      const pngDataUrl = await svgDataUrlToPngDataUrl(placeholder.src);
      setOriginalImage(pngDataUrl);
      const newSettings = { ...initialSettings, ...placeholder.settings };
      setSettings(newSettings);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      console.error('Failed to convert placeholder image:', errorMessage);
      setError('Could not load the selected example.');
    }
  }, [setSettings]);

  const handleTransform = useCallback(async () => {
    if (!originalImage) {
      setError('Please upload an image first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setTransformedImage(null);

    const buildPrompt = () => {
        const { mode, aspectRatio, prompt, artStyle, modifier, environment, pose, lighting, negativePrompt, scale, enhancementLevel } = settings;
    
        const enhancementKeywords: Record<EnhancementLevel, string> = {
            'Standard': 'clear, good quality',
            'High': 'high detail, sharp focus, professional photography',
            'Ultra': 'ultra-detailed masterpiece, 8k resolution, photorealistic, hyperrealistic, intricate details'
        };
        const qualityPrompt = enhancementKeywords[enhancementLevel];
    
        if (mode === 'boxArt') {
            const parts = [
                `Create a dynamic 2D box art illustration for a collectible toy of the subject.`,
                `The art style is '${artStyle || 'Modern Anime'}'.`,
            ];
            if (pose) parts.push(`The subject is in a '${pose}'.`);
            if (environment) parts.push(`The background is a '${environment}' scene.`);
            if (lighting) parts.push(`The lighting is '${lighting}'.`);
            if (prompt) parts.push(prompt);
    
            parts.push(`The illustration must be of exceptional quality, incorporating these characteristics: ${qualityPrompt}.`);
            parts.push(`The final image's aspect ratio must be ${aspectRatio}.`);
            
            if (negativePrompt) {
                parts.push(`Do NOT include the following elements: ${negativePrompt}.`);
            }
            
            return parts.join(' ');
        }
        
        // --- Figurine Mode ---
        const scaleDescriptions: Record<FigurineScale, string> = {
            '1/12': 'a small 1/12 scale model',
            '1/10': 'a 1/10 scale model',
            '1/8': 'a standard 1/8 scale model',
            '1/7': 'a standard, high-quality 1/7 scale model',
            '1/6': 'a large, premium 1/6 scale model',
            '1/4': 'a large, premium-format 1/4 scale model with intricate textures'
        };
        
        const parts = [
            `A professional product photograph of a collectible figurine of the subject.`,
            `The figurine is ${scaleDescriptions[scale]}.`
        ];
    
        if (artStyle) parts.push(`Its art style is '${artStyle}'.`);
        if (modifier) parts.push(`It has a special '${modifier}'.`);
        if (pose) parts.push(`The figurine is in a '${pose}'.`);
        if (environment) parts.push(`The setting is a '${environment}'.`);
        if (lighting) parts.push(`The scene is lit with '${lighting}'.`);
        if (prompt) parts.push(prompt);
    
        parts.push(`The photograph must be of exceptional quality, featuring ${qualityPrompt}.`);
        parts.push(`The final image's aspect ratio must be ${aspectRatio}.`);
    
        if (negativePrompt) {
            parts.push(`Avoid the following: ${negativePrompt}.`);
        }
    
        return parts.join(' ');
    };

    const finalPrompt = buildPrompt();

    try {
      const resultBase64 = await transformImage(originalImage, finalPrompt);
      const imageUrl = `data:image/png;base64,${resultBase64}`;
      setTransformedImage(imageUrl);
      setHistory(prev => [imageUrl, ...prev].slice(0, 10));
      handleClearDraft();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [originalImage, settings, handleClearDraft]);

  const handleSave = useCallback(() => {
    if (!transformedImage) return;
    const link = document.createElement('a');
    link.href = transformedImage;
    link.download = 'nanofig.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [transformedImage]);
  
  const handleShare = useCallback(async () => {
    if (!transformedImage || !navigator.share) {
        alert("Web Share API is not available on your browser.");
        return;
    }
    try {
        const blob = await dataUrlToBlob(transformedImage);
        const file = new File([blob], 'nanofig.png', { type: 'image/png' });
        await navigator.share({
            title: 'My NanoFig Creation',
            text: 'Check out this cool image I generated with NanoFig!',
            files: [file],
        });
    } catch (error) {
        console.error('Error sharing:', error);
        setError('Could not share the image.');
    }
  }, [transformedImage]);

  const handleVariation = useCallback(() => {
    if (!transformedImage) return;
    setOriginalImage(transformedImage);
    setTransformedImage(null);
  }, [transformedImage]);

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) {
      alert("Please enter a name for the preset.");
      return;
    }

    const { mode, prompt, artStyle, environment, pose, lighting, modifier, aspectRatio, scale, enhancementLevel } = settings;
    const newPreset: Preset = { name: presetName.trim(), mode, prompt, artStyle, environment, pose, lighting, modifier, aspectRatio, scale, enhancementLevel };
    
    setPresets(prevPresets => {
      const existingIndex = prevPresets.findIndex(p => p.name === newPreset.name);
      if (existingIndex !== -1) {
        const updatedPresets = [...prevPresets];
        updatedPresets[existingIndex] = newPreset;
        return updatedPresets;
      } else {
        return [...prevPresets, newPreset];
      }
    });
    
    setPresetName('');
  }, [presetName, settings]);
  
  const handleLoadPreset = useCallback((preset: Preset) => {
    setSettings(s => ({
      ...s,
      mode: preset.mode,
      prompt: preset.prompt,
      artStyle: preset.artStyle,
      environment: preset.environment,
      pose: preset.pose,
      lighting: preset.lighting,
      modifier: preset.modifier,
      aspectRatio: preset.aspectRatio,
      scale: preset.scale,
      enhancementLevel: preset.enhancementLevel,
    }));
  }, [setSettings]);

  const handleDeletePreset = useCallback((name: string) => {
    if (window.confirm(`Are you sure you want to delete the preset "${name}"?`)) {
      setPresets(prevPresets => prevPresets.filter(p => p.name !== name));
    }
  }, []);

  const handleRandomize = useCallback(() => {
    const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const aspectRatios: Array<'1:1' | '4:3' | '16:9'> = ['1:1', '4:3', '16:9'];
    const currentStyles = settings.mode === 'figurine' ? FIGURINE_STYLES : BOX_ART_STYLES;
    
    setSettings(s => ({
        ...s,
        artStyle: getRandomItem(currentStyles),
        environment: getRandomItem(ENVIRONMENTS),
        pose: getRandomItem(POSES),
        lighting: getRandomItem(LIGHTING_OPTIONS),
        aspectRatio: getRandomItem(aspectRatios),
        scale: s.mode === 'figurine' ? getRandomItem(FIGURINE_SCALES) : s.scale,
        modifier: s.mode === 'figurine' ? getRandomItem(FIGURINE_MODIFIERS) : '',
        enhancementLevel: getRandomItem(ENHANCEMENT_LEVELS),
    }));
  }, [settings.mode, setSettings]);

  const handleSelectFromHistory = useCallback((imageSrc: string) => {
    setTransformedImage(imageSrc);
    setIsHistoryModalOpen(false);
  }, []);

  const handleUseAsInputFromHistory = useCallback((imageSrc: string) => {
    setOriginalImage(imageSrc);
    setTransformedImage(null);
    setIsHistoryModalOpen(false);
  }, []);

  const handleDeleteFromHistory = useCallback((imageSrc: string) => {
    setHistory(prev => prev.filter(img => img !== imageSrc));
  }, []);

  const handleCropSave = useCallback((croppedDataUrl: string) => {
    setOriginalImage(croppedDataUrl);
    setTransformedImage(null);
    setCropImageSrc(null);
  }, []);

  const handleCropCancel = useCallback(() => {
      setCropImageSrc(null);
  }, []);

  const handleRestoreDraft = useCallback(() => {
    const savedDraft = localStorage.getItem('nanoFigDraft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setSettings({
            mode: draft.mode ?? 'figurine',
            artStyle: draft.artStyle ?? '',
            environment: draft.environment ?? '',
            pose: draft.pose ?? '',
            lighting: draft.lighting ?? '',
            modifier: draft.modifier ?? '',
            aspectRatio: draft.aspectRatio ?? '1:1',
            prompt: draft.prompt ?? '',
            negativePrompt: draft.negativePrompt ?? '',
            scale: draft.scale ?? '1/7',
            enhancementLevel: draft.enhancementLevel ?? 'Standard',
        });
      } catch (e) {
        console.error("Failed to restore draft:", e);
        setError("Could not restore draft. It may be corrupted.");
        localStorage.removeItem('nanoFigDraft');
        setIsDraftAvailable(false);
      }
    }
  }, [setSettings]);
  
  const currentStyles = settings.mode === 'figurine' ? FIGURINE_STYLES : BOX_ART_STYLES;
  const selectStyles = "w-full bg-gray-900/70 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition appearance-none";

  return (
    <div className="h-screen min-h-screen bg-gray-900 text-gray-100 flex flex-col md:flex-row font-sans">
      
      {isSidebarOpen && (
        <div 
            className="fixed inset-0 bg-black/60 z-30 md:hidden" 
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
        />
      )}
      
      <aside className={`fixed inset-y-0 left-0 z-40 w-[420px] max-w-[90vw] transform transition-transform duration-300 ease-in-out bg-gray-800/80 backdrop-blur-xl border-r border-gray-700/50 flex flex-col md:relative md:translate-x-0 md:w-[420px] md:max-w-none md:flex-shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-700/50 flex justify-between items-center">
          <Logo className="h-10" />
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 rounded-full text-gray-400 hover:bg-gray-700 md:hidden"
            aria-label="Close settings"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-grow p-6 w-full flex flex-col gap-6 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Generation Mode</label>
              <div className="flex gap-2 rounded-lg bg-gray-900/70 p-1 border border-gray-600">
                <button onClick={() => setSettings(s => ({ ...s, mode: 'figurine', artStyle: '' }))} className={`w-full py-2 rounded-md transition ${settings.mode === 'figurine' ? 'bg-yellow-400 text-gray-900 font-semibold' : 'hover:bg-gray-700'}`}>Figurine</button>
                <button onClick={() => setSettings(s => ({ ...s, mode: 'boxArt', artStyle: '' }))} className={`w-full py-2 rounded-md transition ${settings.mode === 'boxArt' ? 'bg-yellow-400 text-gray-900 font-semibold' : 'hover:bg-gray-700'}`}>Box Art</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Aspect Ratio</label>
              <div className="flex gap-2 rounded-lg bg-gray-900/70 p-1 border border-gray-600">
                {(['1:1', '4:3', '16:9'] as const).map(ratio => (
                    <button key={ratio} onClick={() => setSettings(s => ({...s, aspectRatio: ratio}))} className={`w-full py-2 rounded-md transition ${settings.aspectRatio === ratio ? 'bg-yellow-400 text-gray-900 font-semibold' : 'hover:bg-gray-700'}`}>{ratio}</button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Enhancement Level</label>
            <div className="flex gap-2 rounded-lg bg-gray-900/70 p-1 border border-gray-600">
              {(ENHANCEMENT_LEVELS).map(level => (
                  <button key={level} onClick={() => setSettings(s => ({...s, enhancementLevel: level}))} className={`w-full py-2 rounded-md transition ${settings.enhancementLevel === level ? 'bg-yellow-400 text-gray-900 font-semibold' : 'hover:bg-gray-700'}`}>{level}</button>
              ))}
            </div>
          </div>
          
          {settings.mode === 'figurine' && (
            <div>
                <label htmlFor="scale-slider" className="flex justify-between items-center text-sm font-medium text-gray-400 mb-2">
                    <span>Figurine Scale</span>
                    <span className="px-2 py-1 text-xs font-semibold text-yellow-300 bg-gray-900/70 border border-gray-600 rounded-md">{settings.scale}</span>
                </label>
                <input
                    id="scale-slider"
                    type="range"
                    min="0"
                    max={FIGURINE_SCALES.length - 1}
                    step="1"
                    value={FIGURINE_SCALES.indexOf(settings.scale)}
                    onChange={(e) => {
                        const newScale = FIGURINE_SCALES[parseInt(e.target.value, 10)];
                        setSettings(s => ({ ...s, scale: newScale }));
                    }}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-lg [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-yellow-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-150 [&::-webkit-slider-thumb]:ease-in-out [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:hover:bg-yellow-300"
                />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Art Style</label>
            <div className="flex flex-wrap gap-2">
              {currentStyles.map(style => (
                  <button key={style} onClick={() => setSettings(s => ({...s, artStyle: style}))} className={`px-3 py-1 text-sm rounded-full transition border ${settings.artStyle === style ? 'bg-yellow-400 text-gray-900 border-yellow-400 font-semibold' : 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500'}`}>{style}</button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-between gap-4">
             <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-300">Settings</h3>
                <button onClick={() => setIsHelpModalOpen(true)} className="text-gray-400 hover:text-yellow-400 transition" title="Help">
                    <QuestionMarkCircleIcon className="w-6 h-6" />
                </button>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={undo} disabled={!canUndo} className="p-2 rounded-lg text-gray-300 bg-gray-900/70 border border-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition" title="Undo change (Ctrl+Z)">
                  <UndoIcon className="w-5 h-5" />
                </button>
                <button onClick={redo} disabled={!canRedo} className="p-2 rounded-lg text-gray-300 bg-gray-900/70 border border-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition" title="Redo change (Ctrl+Y)">
                  <RedoIcon className="w-5 h-5" />
                </button>
            </div>
          </div>

          <div className="relative" ref={promptHelpRef}>
            <label htmlFor="prompt" className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2">
                <span>Main Prompt / Description</span>
                <button
                    onClick={() => setIsPromptHelpVisible(prev => !prev)}
                    type="button"
                    className="text-gray-400 hover:text-yellow-400 transition"
                    title="Show prompt examples"
                >
                    <QuestionMarkCircleIcon className="w-5 h-5" />
                </button>
            </label>
            <input id="prompt" type="text" value={settings.prompt} onChange={(e) => setSettings(s => ({...s, prompt: e.target.value}))} className="w-full bg-gray-900/70 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition" placeholder="e.g., A powerful hero, dark fantasy theme" />
            {isPromptHelpVisible && (
                <div className="absolute top-full mt-2 w-full bg-gray-700 border border-gray-600 rounded-lg p-4 z-20 shadow-lg">
                    <h4 className="font-semibold text-white mb-2">Prompt Examples ({settings.mode === 'figurine' ? 'Figurine' : 'Box Art'})</h4>
                    <ul className="text-gray-300 text-sm space-y-2">
                        {(settings.mode === 'figurine' ? figurinePromptExamples : boxArtPromptExamples).map((example, index) => (
                            <li key={index}>
                                <button
                                    onClick={() => {
                                        setSettings(s => ({ ...s, prompt: example }));
                                        setIsPromptHelpVisible(false);
                                    }}
                                    className="text-left hover:text-yellow-300 transition w-full"
                                >
                                    - {example}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="environment" className="block text-sm font-medium text-gray-400 mb-1">Environment</label>
              <select id="environment" value={settings.environment} onChange={(e) => setSettings(s => ({...s, environment: e.target.value}))} className={selectStyles}>
                <option value="">Select Environment...</option>
                {ENVIRONMENTS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="pose" className="block text-sm font-medium text-gray-400 mb-1">Pose</label>
              <select id="pose" value={settings.pose} onChange={(e) => setSettings(s => ({...s, pose: e.target.value}))} className={selectStyles}>
                <option value="">Select Pose...</option>
                {POSES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="lighting" className="block text-sm font-medium text-gray-400 mb-1">Lighting</label>
              <select id="lighting" value={settings.lighting} onChange={(e) => setSettings(s => ({...s, lighting: e.target.value}))} className={selectStyles}>
                <option value="">Select Lighting...</option>
                {LIGHTING_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            {settings.mode === 'figurine' && (
              <div>
                <label htmlFor="modifier" className="block text-sm font-medium text-gray-400 mb-1">Figurine Modifier</label>
                <select id="modifier" value={settings.modifier} onChange={(e) => setSettings(s => ({...s, modifier: e.target.value}))} className={selectStyles}>
                  <option value="">Select Modifier...</option>
                  {FIGURINE_MODIFIERS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="negative-prompt" className="block text-sm font-medium text-gray-400 mb-2">Negative Prompt (what to avoid)</label>
            <input id="negative-prompt" type="text" value={settings.negativePrompt} onChange={(e) => setSettings(s => ({...s, negativePrompt: e.target.value}))} className="w-full bg-gray-900/70 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition" placeholder="e.g., blurry background, text, watermarks" />
          </div>
          
          <div className="pt-6 border-t border-gray-700">
            <h3 className="text-lg font-semibold text-gray-300 mb-3">Generation Presets</h3>
            <div className="flex flex-col gap-2 mb-4">
              <input 
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="w-full bg-gray-900/70 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"
                placeholder="Enter preset name..."
              />
              <Button onClick={handleSavePreset} variant="secondary" className="w-full">Save Current Settings</Button>
            </div>
            {presets.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {presets.map(preset => (
                  <div key={preset.name} className="flex items-center bg-gray-700 rounded-full">
                    <button
                        onClick={() => handleLoadPreset(preset)}
                        className="px-4 py-1.5 text-sm rounded-l-full bg-gray-700 hover:bg-gray-600 transition"
                    >
                        {preset.name}
                    </button>
                    <button onClick={() => handleDeletePreset(preset.name)} className="p-2 text-gray-400 hover:text-white hover:bg-red-500/50 rounded-r-full transition" title={`Delete "${preset.name}"`}><TrashIcon className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 min-h-0">
        <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          <div className="w-full lg:w-1/2 flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-300">Input Image</h2>
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 rounded-lg text-gray-300 bg-gray-800 border border-gray-700 hover:bg-gray-700 md:hidden"
                  aria-label="Open settings"
                >
                  <AdjustmentsHorizontalIcon className="w-5 h-5" />
                </button>
            </div>
            <div key={originalImage ? 'image-present' : 'image-absent'} className="animate-fade-in-scale">
                {originalImage ? (
                <div className="relative group">
                    <ImagePreview imageSrc={originalImage} altText="Original image" aspectRatio="1:1" />
                    <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <button onClick={() => setCropImageSrc(originalImage)} className="p-2 rounded-lg text-gray-300 bg-gray-800/60 backdrop-blur-sm border border-gray-700 hover:bg-gray-700" title="Crop image">
                            <CropIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => { setOriginalImage(null); setTransformedImage(null); }} className="p-2 rounded-lg text-gray-300 bg-red-800/60 backdrop-blur-sm border border-red-700 hover:bg-red-700" title="Remove image">
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                ) : (
                <div className="flex flex-col gap-6">
                    <ImageUploader onImageUpload={handleImageUpload} onError={setError} />
                    <PlaceholderGallery placeholders={placeholders} onSelect={handleSelectPlaceholder} />
                </div>
                )}
            </div>
          </div>

          <div className="w-full lg:w-1/2 flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-gray-300">Generated Image</h2>
            <div className="relative group">
                <ImagePreview 
                    imageSrc={transformedImage} 
                    isLoading={isLoading} 
                    altText="Transformed image" 
                    aspectRatio={settings.aspectRatio} 
                />
                {transformedImage && !isLoading && (
                    <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <button onClick={() => setEditorImageSrc(transformedImage)} className="p-2 rounded-lg text-gray-300 bg-gray-800/60 backdrop-blur-sm border border-gray-700 hover:bg-gray-700" title="Adjust image">
                            <AdjustmentsHorizontalIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
          </div>
        </div>
        
        {isDraftAvailable && (
          <div className="mt-4 p-4 bg-gray-800/80 border border-yellow-400/30 rounded-lg flex items-center justify-between gap-4">
            <p className="text-yellow-200">You have an unsaved draft. Would you like to restore it?</p>
            <div>
              <button onClick={handleRestoreDraft} className="font-semibold text-yellow-300 hover:text-yellow-200 mr-4">Restore</button>
              <button onClick={handleClearDraft} className="font-semibold text-gray-400 hover:text-gray-300">Dismiss</button>
            </div>
          </div>
        )}
        
        {error && <p className="mt-4 text-center text-red-400 bg-red-900/50 p-3 rounded-lg">{error}</p>}
        
        <div className={`mt-6 flex flex-col sm:flex-row gap-4 justify-center items-center flex-wrap transition-all duration-500 ease-out ${originalImage ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <Button onClick={handleTransform} disabled={!originalImage || isLoading} className="w-full sm:w-auto">
            {isLoading ? <LoadingSpinnerIcon className="w-6 h-6 mr-3" /> : <SparklesIcon className="w-6 h-6 mr-3" />}
            {isLoading ? 'Generating...' : 'Generate Image'}
          </Button>
          <Button onClick={handleRandomize} variant="secondary" disabled={isLoading} title="Randomize settings">
            <MagicWandIcon className="w-6 h-6" />
          </Button>
          <div className="w-px h-8 bg-gray-700 hidden sm:block"></div>
          <Button onClick={handleSave} disabled={!transformedImage || isLoading} variant="secondary">
            <DownloadIcon className="w-6 h-6 mr-3" /> Save
          </Button>
          {navigator.share && (
            <Button onClick={handleShare} disabled={!transformedImage || isLoading} variant="secondary">
              <ShareIcon className="w-6 h-6 mr-3" /> Share
            </Button>
          )}
          <Button onClick={handleVariation} disabled={!transformedImage || isLoading} variant="secondary">
            <RecycleIcon className="w-6 h-6 mr-3" /> Create Variation
          </Button>
        </div>
        
        <div className="mt-auto pt-6 flex justify-between items-center text-gray-500">
          <button onClick={() => setIsHistoryModalOpen(true)} className="hover:text-yellow-400 transition">View History ({history.length})</button>
          <span>v1.0.0</span>
        </div>
      </main>
      
      {isHistoryModalOpen && (
        <HistoryModal 
          isOpen={isHistoryModalOpen} 
          onClose={() => setIsHistoryModalOpen(false)}
          history={history}
          onSelect={handleSelectFromHistory}
          onUseAsInput={handleUseAsInputFromHistory}
          onDelete={handleDeleteFromHistory}
        />
      )}
      {isHelpModalOpen && (
        <HelpModal 
          isOpen={isHelpModalOpen} 
          onClose={() => setIsHelpModalOpen(false)}
        />
      )}
      {cropImageSrc && originalImage && (
        <ImageCropper
            imageSrc={cropImageSrc}
            aspectRatioValue={
                settings.aspectRatio === '1:1' ? 1 :
                settings.aspectRatio === '4:3' ? 4/3 : 16/9
            }
            onClose={handleCropCancel}
            onSave={handleCropSave}
        />
      )}
      {editorImageSrc && (
        <ImageEditorModal
            imageSrc={editorImageSrc}
            onClose={() => setEditorImageSrc(null)}
            onSave={(newImageSrc) => {
              setTransformedImage(newImageSrc);
              setHistory(prev => [newImageSrc, ...prev].slice(0, 10));
              setEditorImageSrc(null);
            }}
        />
      )}
    </div>
  );
};

export default App;