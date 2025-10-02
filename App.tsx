import React, { useState, useCallback, useEffect, useRef } from 'react';
import { transformImage } from './services/geminiService';
import { fileToDataUrl, dataUrlToBlob, svgDataUrlToPngDataUrl } from './utils/fileUtils';
import ImageUploader from './components/ImageUploader';
import ImagePreview from './components/ImagePreview';
import Button from './components/Button';
import { DownloadIcon, ShareIcon, SparklesIcon, RecycleIcon, TrashIcon, MagicWandIcon, CropIcon, XMarkIcon, UndoIcon, RedoIcon, AdjustmentsHorizontalIcon, LoadingSpinnerIcon, QuestionMarkCircleIcon, PhotoIcon } from './components/Icons';
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
  const [editorImageSrc, setEditorImageSrc] = useState<string | null>(null);

  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  
  const [isDraftAvailable, setIsDraftAvailable] = useState(false);
  const autosaveTimeoutRef = useRef<number | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [isPromptHelpVisible, setIsPromptHelpVisible] = useState(false);
  const promptHelpRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    try {
      const savedPresets = localStorage.getItem('nanoFigPresets');
      const sortFn = (a: Preset, b: Preset) => a.name.localeCompare(b.name);
      
      if (savedPresets) {
        const parsedPresets = JSON.parse(savedPresets);
        if (Array.isArray(parsedPresets) && parsedPresets.length > 0) {
          setPresets(parsedPresets.sort(sortFn));
        } else {
          setPresets(defaultPresets.sort(sortFn));
        }
      } else {
        setPresets(defaultPresets.sort(sortFn));
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

  useEffect(() => {
    try {
      localStorage.setItem('nanoFigPresets', JSON.stringify(presets));
    } catch (e) {
      console.error("Failed to save presets to local storage", e);
    }
  }, [presets]);

  useEffect(() => {
    if (isLoading) return;
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    autosaveTimeoutRef.current = window.setTimeout(() => {
      const isDefaultState = JSON.stringify(settings) === JSON.stringify(initialSettings);
      if (!isDefaultState) {
        localStorage.setItem('nanoFigDraft', JSON.stringify(settings));
        setIsDraftAvailable(true);
      }
    }, 1500);
    return () => { if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current); };
  }, [settings, isLoading]);

  const handleClearDraft = useCallback(() => {
    localStorage.removeItem('nanoFigDraft');
    setIsDraftAvailable(false);
  }, []);

  const handleLoadDraft = useCallback(() => {
    const savedDraft = localStorage.getItem('nanoFigDraft');
    if (savedDraft) {
      try {
        setSettings(JSON.parse(savedDraft));
        setIsDraftAvailable(false);
      } catch (e) {
        setError("Could not load the saved draft.");
        handleClearDraft();
      }
    }
  }, [setSettings, handleClearDraft]);

  const handleFileSelect = async (file: File) => {
    setError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      setOriginalImage(dataUrl);
      setTransformedImage(null);
    } catch (e) {
      setError('Could not read the selected file.');
    }
  };
  
  const handlePlaceholderSelect = async (placeholder: Placeholder) => {
    setError(null);
    setIsLoading(true);
    try {
      const pngDataUrl = await svgDataUrlToPngDataUrl(placeholder.src);
      setOriginalImage(pngDataUrl);
      setTransformedImage(null);
      if (placeholder.settings) {
        setSettings(s => ({...initialSettings, ...s, ...placeholder.settings}));
      }
    } catch (e) {
      setError('Could not process the placeholder image.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const constructPrompt = (): string => {
    const { mode, prompt, scale, environment, pose, lighting, negativePrompt, artStyle, modifier, enhancementLevel } = settings;
    let finalPrompt = '';
    const mainSubject = `"${prompt}"`;

    if (mode === 'figurine') {
        const qualityMap: Record<EnhancementLevel, string> = {
            Standard: 'high quality product photography',
            High: 'ultra high quality, professional product photography, sharp focus',
            Ultra: 'masterpiece, hyper-realistic, 8k, detailed textures, cinematic product shot',
        };
        finalPrompt = `A ${qualityMap[enhancementLevel]} of a ${scale} scale collectible figurine of ${mainSubject}.`;
        if (artStyle) finalPrompt += ` The figurine is in a ${artStyle} style.`;
        if (modifier) finalPrompt += ` It has special features like a ${modifier}.`;
        if (pose) finalPrompt += ` The figurine is posed in a ${pose}.`;
        if (environment) finalPrompt += ` The background setting is ${environment}.`;
        if (lighting) finalPrompt += ` The scene uses ${lighting}.`;
        finalPrompt += ` Focus on making it look like a real, physical object.`;
    } else { // mode === 'boxArt'
        const qualityMap: Record<EnhancementLevel, string> = {
            Standard: 'dynamic illustration',
            High: 'highly detailed, professional illustration',
            Ultra: 'masterpiece, 8k, cinematic illustration',
        };
        finalPrompt = `A ${qualityMap[enhancementLevel]} of the official box art for a model kit of ${mainSubject}.`;
        if (artStyle) finalPrompt += ` The art style is ${artStyle}.`;
        if (pose) finalPrompt += ` The character is shown in a ${pose}.`;
        if (environment) finalPrompt += ` The background is ${environment}.`;
        if (lighting) finalPrompt += ` The lighting is ${lighting}.`;
        finalPrompt += ` The image should look like a 2D illustration, not a photograph of a toy.`;
    }
    if (negativePrompt) finalPrompt += ` Avoid the following elements or styles: ${negativePrompt}.`;
    finalPrompt += ' The final image should be clean, well-composed, and visually appealing.';
    return finalPrompt;
  };

  const handleTransform = useCallback(async () => {
    if (!originalImage) { setError('Please upload an image first.'); return; }
    if (!settings.prompt.trim()) { setError('Please provide a prompt describing the subject.'); return; }
    setIsLoading(true);
    setError(null);
    try {
      const prompt = constructPrompt();
      const base64Data = await transformImage(originalImage, prompt);
      const newImageSrc = `data:image/png;base64,${base64Data}`;
      setTransformedImage(newImageSrc);
      setHistory(prev => [newImageSrc, ...prev.slice(0, 49)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [originalImage, settings]);

  const handleDownloadImage = () => {
    if (!transformedImage) return;
    const link = document.createElement('a');
    link.href = transformedImage;
    link.download = `nanofig_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleShareImage = async () => {
    if (!transformedImage) return;
    try {
      const blob = await dataUrlToBlob(transformedImage);
      const file = new File([blob], `nanofig_${Date.now()}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My NanoFig Creation!', text: 'Check out this figurine I designed with NanoFig!', });
      } else {
        alert("Web Share API is not supported in your browser.");
      }
    } catch (err) {
      setError('Could not share the image.');
    }
  };

  const handleReset = () => {
    setOriginalImage(null);
    setTransformedImage(null);
    setSettings(initialSettings);
    setError(null);
  };

  const handleHistorySelect = (imageSrc: string) => { setTransformedImage(imageSrc); setIsHistoryModalOpen(false); };
  const handleHistoryUseAsInput = (imageSrc: string) => { setOriginalImage(imageSrc); setTransformedImage(null); setIsHistoryModalOpen(false); };
  const handleHistoryDelete = (imageSrc: string) => { setHistory(prev => prev.filter(src => src !== imageSrc)); };
  const handleCropComplete = (croppedDataUrl: string) => { setOriginalImage(croppedDataUrl); setCropImageSrc(null); };
  const handleEditComplete = (editedDataUrl: string) => { setTransformedImage(editedDataUrl); setEditorImageSrc(null); };

  const handleLoadPreset = (preset: Preset) => {
    setSettings(s => ({ ...s, ...preset, prompt: s.prompt || preset.prompt, negativePrompt: s.negativePrompt }));
  };
  
  const handleSavePreset = () => {
    if (!presetName.trim()) { setError("Please enter a name for your preset."); return; }
    const newPreset: Preset = { name: presetName, ...settings };
    setPresets(prev => [...prev.filter(p => p.name !== presetName), newPreset].sort((a, b) => a.name.localeCompare(b.name)));
    setPresetName('');

    setSaveConfirmation(`Preset "${newPreset.name}" saved!`);
    if (saveConfirmTimeoutRef.current) {
        clearTimeout(saveConfirmTimeoutRef.current);
    }
    saveConfirmTimeoutRef.current = window.setTimeout(() => {
        setSaveConfirmation(null);
    }, 3000);
  };
  
  const handleDeletePreset = (name: string) => {
    if (window.confirm(`Are you sure you want to delete the preset "${name}"? This action cannot be undone.`)) {
        setPresets(prev => prev.filter(p => p.name !== name));
    }
  };

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(s => ({ ...s, [key]: value }));
  };

  const currentArtStyles = settings.mode === 'figurine' ? FIGURINE_STYLES : BOX_ART_STYLES;
  const currentPromptExamples = settings.mode === 'figurine' ? figurinePromptExamples : boxArtPromptExamples;

  const renderSidebar = () => (
    <aside className="w-full md:w-96 bg-gray-800/50 md:bg-gray-800/30 border-r border-gray-700/50 p-6 flex flex-col space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <Logo />
        <button onClick={() => setIsHelpModalOpen(true)} className="text-gray-400 hover:text-yellow-400 transition">
            <QuestionMarkCircleIcon className="w-7 h-7" />
        </button>
      </div>

      <div className="flex items-center space-x-2">
        <button onClick={undo} disabled={!canUndo} className="p-2 rounded-md disabled:opacity-50 text-gray-400 hover:bg-gray-700 hover:text-white transition"><UndoIcon className="w-5 h-5" /></button>
        <button onClick={redo} disabled={!canRedo} className="p-2 rounded-md disabled:opacity-50 text-gray-400 hover:bg-gray-700 hover:text-white transition"><RedoIcon className="w-5 h-5" /></button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Mode</label>
        <div className="flex bg-gray-900/50 p-1 rounded-lg border border-gray-700">
            {['figurine', 'boxArt'].map((mode) => (
                <button key={mode} onClick={() => updateSetting('mode', mode as Mode)} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition ${settings.mode === mode ? 'bg-yellow-400 text-gray-900' : 'text-gray-300 hover:bg-gray-700/50'}`}>
                    {mode === 'figurine' ? 'Figurine' : 'Box Art'}
                </button>
            ))}
        </div>
      </div>
      
      <div className="relative">
        <label htmlFor="prompt" className="flex items-center justify-between text-sm font-medium text-gray-300 mb-1">
          <span>Subject Prompt</span>
          <button onClick={() => setIsPromptHelpVisible(v => !v)} className="text-xs text-yellow-400 hover:underline">Examples</button>
        </label>
        <textarea id="prompt" value={settings.prompt} onChange={(e) => updateSetting('prompt', e.target.value)} rows={3} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-2 text-white focus:ring-yellow-500 focus:border-yellow-500 transition" placeholder={`e.g., ${currentPromptExamples[0]}`}></textarea>
        {isPromptHelpVisible && (
            <div ref={promptHelpRef} className="absolute z-10 w-full bg-gray-700 border border-gray-600 rounded-lg mt-1 p-2 space-y-1 animate-fade-in-scale">
                {currentPromptExamples.map(ex => (
                    <button key={ex} onClick={() => { updateSetting('prompt', ex); setIsPromptHelpVisible(false); }} className="w-full text-left text-xs p-2 rounded hover:bg-gray-600 text-gray-300">
                      {ex}
                    </button>
                ))}
            </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SelectControl label="Art Style" value={settings.artStyle} onChange={v => updateSetting('artStyle', v)} options={currentArtStyles} />
        <SelectControl label="Pose" value={settings.pose} onChange={v => updateSetting('pose', v)} options={POSES} />
        <SelectControl label="Environment" value={settings.environment} onChange={v => updateSetting('environment', v)} options={ENVIRONMENTS} />
        <SelectControl label="Lighting" value={settings.lighting} onChange={v => updateSetting('lighting', v)} options={LIGHTING_OPTIONS} />
      </div>

      {settings.mode === 'figurine' && (
        <div className="grid grid-cols-2 gap-4">
          <SelectControl label="Modifier" value={settings.modifier} onChange={v => updateSetting('modifier', v)} options={FIGURINE_MODIFIERS} />
          <SelectControl label="Scale" value={settings.scale} onChange={v => updateSetting('scale', v as FigurineScale)} options={FIGURINE_SCALES} />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Enhancement Level</label>
        <div className="flex bg-gray-900/50 p-1 rounded-lg border border-gray-700">
            {ENHANCEMENT_LEVELS.map((level) => (
                <button key={level} onClick={() => updateSetting('enhancementLevel', level)} className={`w-1/3 py-2 text-sm font-semibold rounded-md transition ${settings.enhancementLevel === level ? 'bg-yellow-400 text-gray-900' : 'text-gray-300 hover:bg-gray-700/50'}`}>
                    {level}
                </button>
            ))}
        </div>
      </div>
      
      <div className="border-t border-gray-700/50 mt-6 pt-6">
        <h3 className="text-base font-semibold text-gray-200 mb-3">Presets</h3>
        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-2">
            {presets.map(preset => (
            <div key={preset.name} className="flex items-center justify-between bg-gray-900/50 p-2 rounded-lg group transition-colors hover:bg-gray-900">
                <button
                    onClick={() => handleLoadPreset(preset)}
                    className="flex-grow text-left text-sm text-gray-300 group-hover:text-yellow-400 transition"
                    title={`Load "${preset.name}"`}
                >
                {preset.name}
                </button>
                <button
                    onClick={() => handleDeletePreset(preset.name)}
                    className="ml-2 p-1 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                    title={`Delete "${preset.name}"`}
                    aria-label={`Delete preset ${preset.name}`}
                >
                <TrashIcon className="w-4 h-4" />
                </button>
            </div>
            ))}
            {presets.length === 0 && <p className="text-sm text-gray-500 text-center py-2">No custom presets saved.</p>}
        </div>
        <div className="space-y-2">
            <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="New preset name"
                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-2 text-white focus:ring-yellow-500 focus:border-yellow-500 transition text-sm"
                aria-label="New preset name"
            />
            <Button onClick={handleSavePreset} variant="secondary" className="w-full !py-2 !text-sm">
                Save Current Settings
            </Button>
            {saveConfirmation && (
            <p className="text-xs text-green-400 text-center mt-2 animate-fade-in-scale" role="status">
                {saveConfirmation}
            </p>
            )}
        </div>
      </div>

    </aside>
  );

  const SelectControl: React.FC<{label: string, value: string, onChange: (v: string) => void, options: readonly string[]}> = ({label, value, onChange, options}) => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-yellow-500 focus:border-yellow-500 transition text-sm">
        <option value="">Default</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen font-sans bg-gray-900 text-white">
        <div className="md:hidden p-4 flex justify-between items-center bg-gray-800 border-b border-gray-700">
            <Logo className="!text-2xl" />
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                <AdjustmentsHorizontalIcon className="w-6 h-6" />
            </button>
        </div>

        <div className={`fixed inset-0 z-30 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:flex`}>
            {renderSidebar()}
            {isSidebarOpen && <button onClick={() => setIsSidebarOpen(false)} className="md:hidden absolute top-6 right-4 p-2 bg-gray-800 rounded-full z-40"><XMarkIcon className="w-6 h-6"/></button>}
        </div>

        <main className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto">
            {error && (
                <div className="bg-red-800/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-4" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                    <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
            )}
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-4">
                    <h2 className="text-xl font-bold text-center text-gray-400">INPUT</h2>
                    {originalImage ? (
                        <div className="w-full relative group">
                            <ImagePreview imageSrc={originalImage} altText="Original" aspectRatio={settings.aspectRatio} />
                            <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setCropImageSrc(originalImage)} className="p-2 bg-gray-900/60 backdrop-blur-sm rounded-lg border border-gray-700 hover:bg-gray-700/80 transition" title="Crop Image"><CropIcon className="w-5 h-5" /></button>
                                <button onClick={() => setOriginalImage(null)} className="p-2 bg-red-800/60 backdrop-blur-sm rounded-lg border border-red-700 hover:bg-red-700/80 transition" title="Remove Image"><TrashIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <ImageUploader onImageUpload={handleFileSelect} onError={setError} />
                            <PlaceholderGallery placeholders={placeholders} onSelect={handlePlaceholderSelect} />
                        </>
                    )}
                </div>
                <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-4">
                    <h2 className="text-xl font-bold text-center text-gray-400">OUTPUT</h2>
                    <ImagePreview imageSrc={transformedImage} altText="Transformed" isLoading={isLoading} aspectRatio={settings.aspectRatio}/>
                </div>
            </div>
            
            <div className="flex-shrink-0 mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button onClick={handleTransform} disabled={isLoading || !originalImage} className="w-full sm:w-auto">
                    {isLoading ? <LoadingSpinnerIcon className="w-6 h-6 mr-2" /> : <SparklesIcon className="w-6 h-6 mr-2" />}
                    {isLoading ? 'Generating...' : 'Generate NanoFig'}
                </Button>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setIsHistoryModalOpen(true)} variant="secondary" title="History"><PhotoIcon className="w-6 h-6" /></Button>
                    <Button onClick={handleDownloadImage} disabled={!transformedImage || isLoading} variant="secondary" title="Download"><DownloadIcon className="w-6 h-6" /></Button>
                    <Button onClick={handleShareImage} disabled={!transformedImage || isLoading} variant="secondary" title="Share"><ShareIcon className="w-6 h-6" /></Button>
                    <Button onClick={() => setEditorImageSrc(transformedImage)} disabled={!transformedImage || isLoading} variant="secondary" title="Adjust Image"><MagicWandIcon className="w-6 h-6" /></Button>
                    <Button onClick={handleReset} variant="secondary" title="Reset All"><RecycleIcon className="w-6 h-6" /></Button>
                </div>
            </div>
        </main>

        <HistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} history={history} onSelect={handleHistorySelect} onUseAsInput={handleHistoryUseAsInput} onDelete={handleHistoryDelete} />
        <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
        {cropImageSrc && <ImageCropper imageSrc={cropImageSrc} aspectRatioValue={1} onClose={() => setCropImageSrc(null)} onSave={handleCropComplete} />}
        {editorImageSrc && <ImageEditorModal imageSrc={editorImageSrc} onClose={() => setEditorImageSrc(null)} onSave={handleEditComplete} />}
    </div>
  );
};

export default App;