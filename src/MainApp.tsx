
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid, Environment, ContactShadows } from '@react-three/drei';
import {
  Copy, RefreshCw, Film, Camera as CameraIcon,
  Download, Settings, Check, Video, Image as ImageIcon
} from 'lucide-react';
import { marked } from 'marked';
import { ApiKeyModal } from './components/ApiKeyModal';
import { Subject, Gizmos, CameraController } from './components/SceneComponents';
import { CameraMetadata, PromptState, CameraMotion } from './types';
import { mapMetadataToTerms } from './utils/cinematography';
import { generateEducationalBrief, generateFinalPromptFromBrief } from './services/geminiService';
import { MOTION_DESCRIPTIONS } from './constants';

const MOTION_GROUPS: { name: string; motions: CameraMotion[] }[] = [
  {
    name: 'Standard Shots',
    motions: ['POV', 'OTS', 'Dutch Angle', 'Handheld', 'Rack Focus']
  },
  {
    name: 'Pan / Tilt / Zoom',
    motions: ['Tilt Up', 'Tilt Down', 'Pan Right', 'Pan Left', 'Zoom In', 'Zoom Out', 'Whip Pan']
  },
  {
    name: 'Dolly / Crane / Tracking',
    motions: ['Dolly In', 'Dolly Out', 'Crane In', 'Crane Out', 'Tracking', 'Following', 'Arc Shot', 'Push In + Reveal', 'Boom Up', 'Reverse Follow', 'Orbit', 'Drone Shot']
  }
];

const App: React.FC = () => {
  const [state, setState] = useState<PromptState>({
    metadata: {
      azimuth: 0,
      elevation: 0,
      distance: 8,
    },
    terms: {
      direction: '正面',
      angle: '平視',
      size: '中景 (MLS)',
    },
    description: '',
    style: '',
    selectedMotions: [],
    promptMode: 'image',
    characterPose: 'Standing',
    includePoseInPrompt: false,
    finalPrompt: '',
  });

  const [educationalBrief, setEducationalBrief] = useState('');
  const [isBriefEditable, setIsBriefEditable] = useState(true);

  const [apiKey, setApiKey] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hoveredMotion, setHoveredMotion] = useState<string | null>(null);

  // Load all camera images from src/cameras
  const cameraImages = useMemo(() => {
    return import.meta.glob('./cameras/*.jpeg', { eager: true, import: 'default' }) as Record<string, string>;
  }, []);

  const getMotionImageUrl = (motion: string) => {
    // Normalize motion name to match filename: "Tilt Up" -> "tilt_up"
    const normalized = motion.toLowerCase()
      .replace(/ \+ /g, '_') // "Push In + Reveal" -> "Push In_Reveal" (handle spaces around + first)
      .replace(/ /g, '_')    // "Tilt Up" -> "tilt_up"
      .replace(/[^a-z0-9_]/g, ''); // Remove other chars

    // Look for exact match in keys
    const key = Object.keys(cameraImages).find(k => k.endsWith(`/${normalized}.jpeg`));
    return key ? cameraImages[key] : null;
  };

  const handleMotionEnter = (e: React.MouseEvent, motion: string) => {
    setHoveredMotion(motion);
    // Tooltip logic removed/replaced by Preview
  };

  const handleMotionLeave = () => {
    setHoveredMotion(null);
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewfinderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  useEffect(() => {
    const newTerms = mapMetadataToTerms(state.metadata);
    setState(prev => ({ ...prev, terms: newTerms }));
  }, [state.metadata.azimuth, state.metadata.elevation, state.metadata.distance]);

  const handleMetadataChange = (key: keyof CameraMetadata, value: number) => {
    setState(prev => ({
      ...prev,
      metadata: { ...prev.metadata, [key]: value },
    }));
  };

  const handleMotionToggle = (motion: CameraMotion) => {
    setState(prev => {
      const isSelected = prev.selectedMotions.includes(motion);
      const nextMotions = isSelected
        ? prev.selectedMotions.filter(m => m !== motion)
        : [...prev.selectedMotions, motion];
      return {
        ...prev,
        selectedMotions: nextMotions
      };
    });
  };

  const handleGenerateBrief = async () => {
    setIsGenerating(true);
    setEducationalBrief(''); // Reset
    setState(prev => ({ ...prev, finalPrompt: '' })); // Reset final
    try {
      const brief = await generateEducationalBrief(state, apiKey);
      setEducationalBrief(brief);
    } catch (e) {
      console.error(e);
      alert('生成解析失敗，請檢查 API Key 或稍後再試');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCompileFinal = async () => {
    setIsGenerating(true);
    try {
      const prompt = await generateFinalPromptFromBrief(educationalBrief, state.promptMode, apiKey);
      setState(prev => ({ ...prev, finalPrompt: prompt }));
    } catch (e) {
      console.error(e);
      alert('生成提示詞失敗');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  const handleScreenshot = () => {
    if (!canvasRef.current || !viewfinderRef.current) return;
    const canvas = canvasRef.current;
    const rect = viewfinderRef.current.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;
    const x = (rect.left - canvasRect.left) * scaleX;
    const y = (rect.top - canvasRect.top) * scaleY;
    const width = rect.width * scaleX;
    const height = rect.height * scaleY;
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext('2d');
    if (ctx) {
      ctx.drawImage(canvas, x, y, width, height, 0, 0, width, height);
      const link = document.createElement('a');
      link.download = `cinematic-master-${Date.now()}.png`;
      link.href = offscreen.toDataURL('image/png');
      link.click();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(state.finalPrompt);
    alert('提示詞已複製到剪貼簿！');
  };

  // Viewfinder dimensions are now handled via CSS classes for responsiveness

  const renderedPrompt = useMemo(() => {
    return marked.parse(state.finalPrompt) as string;
  }, [state.finalPrompt]);

  // Brief renderer removed as it is in a textarea now, or we can use another preview if needed.
  // Actually, let's keep it simple: Textarea for editing, but maybe we want to render markdown too?
  // The user asked to "allow user to edit again". A textarea is best for this.

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-[#0a0a0a] text-gray-100 overflow-hidden">
      {/* 左側面板: 3D 預覽視窗 - Mobile: 45vh, Desktop: Flex-1 */}
      <div className="relative w-full h-[45vh] lg:h-auto lg:flex-1 bg-white overflow-hidden border-b lg:border-b-0 lg:border-r border-gray-800 flex items-center justify-center">

        <div className="absolute inset-0 z-0">
          <Canvas
            shadows
            dpr={[1, 2]}
            onCreated={({ gl }) => { (canvasRef as any).current = gl.domElement; }}
            gl={{ preserveDrawingBuffer: true, antialias: true }}
          >
            <color attach="background" args={['#ffffff']} />
            <CameraController
              azimuth={state.metadata.azimuth}
              elevation={state.metadata.elevation}
              distance={state.metadata.distance}
              pose={state.characterPose}
            />
            <ambientLight intensity={1.2} />
            <spotLight position={[5, 15, 5]} intensity={2} castShadow />
            <Subject rotationY={0} pose={state.characterPose} />
            <Gizmos
              azimuth={state.metadata.azimuth}
              elevation={state.metadata.elevation}
              distance={state.metadata.distance}
            />
            <Grid
              position={[0, 0, 0]}
              infiniteGrid
              fadeDistance={100}
              sectionColor="#f5f5f5"
              cellColor="#fafafa"
              sectionSize={10}
              cellSize={1}
            />
            <ContactShadows
              position={[0, 0, 0]}
              opacity={0.2}
              scale={30}
              blur={3}
              far={10}
            />
            <Environment preset="studio" />
          </Canvas>

          {/* Camera Motion Preview Overlay */}
          {hoveredMotion && getMotionImageUrl(hoveredMotion) && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 animate-in fade-in duration-200 pointer-events-none">
              <img
                src={getMotionImageUrl(hoveredMotion) || ''}
                alt={hoveredMotion}
                className="max-w-full max-h-full object-contain shadow-2xl"
              />
              <div className="absolute bottom-10 px-6 py-2 bg-black/80 border border-white/20 rounded-full text-white font-black text-sm uppercase tracking-widest backdrop-blur-md">
                {hoveredMotion} Preview
              </div>
            </div>
          )}
        </div>

        {/* 16:9 攝影機參考框 */}
        <div
          ref={viewfinderRef}
          className="relative pointer-events-none z-10 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] flex items-center justify-center transition-all duration-500
                     w-[94%] aspect-video lg:w-auto lg:h-[85vh] lg:aspect-video"
        >
          <div className="absolute top-0 left-0 border-t-2 border-l-2 border-white/95 w-16 h-16"></div>
          <div className="absolute top-0 right-0 border-t-2 border-r-2 border-white/95 w-16 h-16"></div>
          <div className="absolute bottom-0 left-0 border-b-2 border-l-2 border-white/95 w-16 h-16"></div>
          <div className="absolute bottom-0 right-0 border-b-2 border-r-2 border-white/95 w-16 h-16"></div>
          <div className="absolute w-12 h-[1px] bg-white/40"></div>
          <div className="absolute h-12 w-[1px] bg-white/40"></div>
        </div>


        {/* Pose Control - Bottom Left */}
        <div
          className="absolute bottom-6 left-4 lg:bottom-12 lg:left-12 z-20 flex flex-col gap-4 pointer-events-none scale-75 origin-bottom-left lg:scale-100"
          style={{ bottom: '10rem', left: '1rem' }}
        >
          <div className="bg-black/90 backdrop-blur-xl p-4 rounded-3xl border border-gray-800 shadow-[0_20px_40px_rgba(0,0,0,0.5)] w-[200px] space-y-3 animate-in slide-in-from-left-10 duration-700 pointer-events-auto">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-1 bg-teal-500 rounded-full shadow-[0_0_10px_rgba(20,184,166,0.8)]"></div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pose</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includePoseOverlay"
                  checked={state.includePoseInPrompt}
                  onChange={(e) => setState(prev => ({ ...prev, includePoseInPrompt: e.target.checked }))}
                  className="w-3 h-3 rounded bg-gray-700 border-gray-600 text-teal-500 focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="includePoseOverlay" className="text-[9px] font-bold text-gray-500 uppercase cursor-pointer hover:text-gray-300">寫入指令</label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(['Standing', 'Walking', 'Running'] as const).map((pose) => (
                <button
                  key={pose}
                  onClick={() => setState(prev => ({ ...prev, characterPose: pose }))}
                  onMouseEnter={(e) => handleMotionEnter(e, pose)}
                  onMouseLeave={handleMotionLeave}
                  className={`px-2 py-2 text-[9px] rounded-lg border transition-all font-bold uppercase tracking-wider text-center ${state.characterPose === pose ? 'bg-teal-500/20 border-teal-500/50 text-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.2)]' : 'bg-gray-800/50 border-gray-700/50 text-gray-500 hover:bg-gray-800 hover:text-gray-300'}`}
                >
                  {pose}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute top-4 right-4 lg:top-12 lg:right-12 z-20 flex flex-col items-end gap-4 lg:gap-6 h-full pointer-events-none scale-75 origin-top-right lg:scale-100">
          <div className="flex items-center gap-4 pointer-events-auto">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="group p-4 bg-black/50 hover:bg-black rounded-full text-white border border-gray-700/50 hover:border-gray-600 transition-all backdrop-blur-md shadow-2xl active:scale-95"
              title="API Settings"
            >
              <Settings size={20} className="text-gray-400 group-hover:text-white transition-colors" />
            </button>
            <button
              onClick={handleScreenshot}
              className="group flex items-center gap-3 px-8 py-4 bg-black hover:bg-gray-900 rounded-full transition-all text-white border border-gray-700 shadow-2xl active:scale-95"
            >
              <Download size={20} />
              <span className="text-xs font-black uppercase tracking-[0.2em]">截圖視角</span>
            </button>
          </div>


        </div>

        <div className="absolute top-4 left-4 lg:top-12 lg:left-12 flex flex-col gap-2 lg:gap-3 pointer-events-none z-20 scale-75 origin-top-left lg:scale-100">
          <div className="bg-black/95 backdrop-blur-xl px-5 py-2.5 rounded-2xl border border-gray-800 text-[10px] font-black tracking-widest flex items-center justify-between min-w-[180px] shadow-2xl">
            <span className="text-gray-500">AZIMUTH</span>
            <span className="text-white font-mono text-sm">{state.metadata.azimuth}°</span>
          </div>
          <div className="bg-black/95 backdrop-blur-xl px-5 py-2.5 rounded-2xl border border-gray-800 text-[10px] font-black tracking-widest flex items-center justify-between min-w-[180px] shadow-2xl">
            <span className="text-gray-500">ELEVATION</span>
            <span className="text-white font-mono text-sm">{state.metadata.elevation}°</span>
          </div>
          <div className="bg-black/95 backdrop-blur-xl px-5 py-2.5 rounded-2xl border border-gray-800 text-[10px] font-black tracking-widest flex items-center justify-between min-w-[180px] shadow-2xl">
            <span className="text-gray-500">DISTANCE</span>
            <span className="text-white font-mono text-sm">{state.metadata.distance.toFixed(1)}m</span>
          </div>
        </div>

        <div className="absolute bottom-6 lg:bottom-16 inset-x-0 flex justify-center pointer-events-none z-20 scale-75 origin-bottom lg:scale-100">
          <div className="bg-black/95 backdrop-blur-3xl px-16 py-5 rounded-full border border-gray-800 flex items-center gap-12 shadow-[0_30px_70px_rgba(0,0,0,0.6)]">
            <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.5em]">Optical Profile</span>
            <div className="flex gap-12 text-sm font-black tracking-[0.3em] uppercase">
              <span className="text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">{state.terms.direction}</span>
              <span className="text-pink-400 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]">{state.terms.angle}</span>
              <span className="text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">{state.terms.size}</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-1 w-full z-20 flex justify-center pointer-events-auto lg:bottom-4">
          <a
            href="https://weisfx0705.github.io/chiawei/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-gray-500 font-bold tracking-widest uppercase hover:text-white transition-colors drop-shadow-lg opacity-70 hover:opacity-100"
          >
            義守大學電影與電視學系陳嘉暐老師設計 2026
          </a>
        </div>
      </div>

      {/* 右側面板: 控制系統 - Mobile: Remaining Height (55vh), Desktop: Fixed Width */}
      <div className="w-full h-[55vh] lg:h-auto lg:w-[500px] flex flex-col bg-[#0d0d0d] border-l border-gray-800 shadow-2xl z-30 overflow-y-auto scrollbar-hide">
        <div className="p-8 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-[#0d0d0d]/95 backdrop-blur-xl z-40">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl border shadow-inner transition-colors ${state.promptMode === 'video' ? 'bg-blue-600/10 border-blue-500/20' : 'bg-orange-600/10 border-orange-500/20'}`}>
              {state.promptMode === 'video' ? <Video className="w-6 h-6 text-blue-500" /> : <ImageIcon className="w-6 h-6 text-orange-500" />}
            </div>
            <div>
              <h1 className="font-black text-xl text-white tracking-tighter uppercase">
                {state.promptMode === 'video' ? 'Camera Patch' : 'Cinematic Still'}
                <br /><span className="text-gray-500 text-sm">Compiler</span>
              </h1>
            </div>
          </div>

          <div className="flex bg-gray-900/50 p-1.5 rounded-xl border border-gray-800">
            <button
              onClick={() => setState(prev => ({ ...prev, promptMode: 'video' }))}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${state.promptMode === 'video' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Video size={14} />
              <span>Video</span>
            </button>
            <button
              onClick={() => setState(prev => ({ ...prev, promptMode: 'image' }))}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${state.promptMode === 'image' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <ImageIcon size={14} />
              <span>Image</span>
            </button>
          </div>
        </div>

        <div className="p-10 space-y-12">
          {/* 光學校準 */}
          <section className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>
              <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Optical Axis</h2>
            </div>
            <div className="space-y-10">
              <div className="space-y-4">
                <div className="flex justify-between text-[12px] font-black uppercase tracking-widest"><label className="text-gray-500">Azimuth</label><span className="text-white font-mono">{state.metadata.azimuth}°</span></div>
                <input type="range" min="0" max="360" step="1" value={state.metadata.azimuth} onChange={(e) => handleMetadataChange('azimuth', parseInt(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500" />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-[12px] font-black uppercase tracking-widest"><label className="text-gray-500">Elevation</label><span className="text-white font-mono">{state.metadata.elevation}°</span></div>
                <input type="range" min="-80" max="80" step="1" value={state.metadata.elevation} onChange={(e) => handleMetadataChange('elevation', parseInt(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-pink-500" />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-[12px] font-black uppercase tracking-widest"><label className="text-gray-500">Distance</label><span className="text-white font-mono">{state.metadata.distance.toFixed(1)}m</span></div>
                <input type="range" min="0.2" max="40" step="0.1" value={state.metadata.distance} onChange={(e) => handleMetadataChange('distance', parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-yellow-500" />
              </div>
            </div>
          </section>

          {/* 角色姿態 (Character Pose) */}
          {/* Pose moved to left panel overlay */}

          {/* 鏡頭語言選擇 (Camera Motions) */}
          <section className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1 bg-purple-500 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.8)]"></div>
              <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Camera Language (26)</h2>
            </div>

            <div className="space-y-8">
              {MOTION_GROUPS.map((group) => {
                if (state.promptMode === 'image' && (group.name === 'Pan / Tilt / Zoom' || group.name === 'Dolly / Crane / Tracking')) {
                  return null;
                }
                return (
                  <div key={group.name} className="space-y-3 animate-in fade-in duration-500">
                    <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{group.name}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {group.motions.map((motion) => {
                        const active = state.selectedMotions.includes(motion);
                        return (
                          <button
                            key={motion}
                            onClick={() => handleMotionToggle(motion)}
                            onMouseEnter={(e) => handleMotionEnter(e, motion)}
                            onMouseLeave={handleMotionLeave}
                            className={`px-4 py-3 text-[10px] rounded-xl border transition-all text-left flex items-center justify-between font-bold uppercase tracking-tight shadow-sm ${active ? 'border-purple-500 bg-purple-500/10 text-purple-300 shadow-inner' : 'border-gray-800 bg-gray-900/30 text-gray-500 hover:border-gray-700 hover:text-gray-300'}`}
                          >
                            <span>{motion}</span>
                            {active && <Check size={12} className="text-purple-500" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 敘事脈絡 */}
          <section className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1 bg-gray-600 rounded-full"></div>
              <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Story Intent</h2>
            </div>
            <div className="space-y-4">
              <textarea
                value={state.description}
                onChange={(e) => setState(prev => ({ ...prev, description: e.target.value }))}
                placeholder="請具體敘述角色、環境細節、光影氛圍... (Story & Content)"
                className="w-full h-24 bg-[#141414] border border-gray-800 rounded-[1.5rem] p-5 text-[13px] text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-600/50 transition-all resize-none placeholder:text-gray-700 font-medium leading-relaxed shadow-inner"
              />
              <div className="relative">
                <input
                  type="text"
                  value={state.style}
                  onChange={(e) => setState(prev => ({ ...prev, style: e.target.value }))}
                  placeholder="視覺風格 (e.g., Cyberpunk, Noir, Wes Anderson, Polaroid, 8mm)..."
                  className="w-full h-14 bg-[#141414] border border-gray-800 rounded-[1.5rem] px-5 text-[13px] text-gray-200 focus:outline-none focus:ring-1 focus:ring-pink-600/50 transition-all placeholder:text-gray-700 font-medium shadow-inner"
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-gray-700 tracking-wider pointer-events-none">Style</div>
              </div>
            </div>
          </section>

          {/* 最終生成 */}
          <section className="space-y-8 pb-20">
            {/* Step 1: Generate Analysis */}
            <button
              onClick={handleGenerateBrief}
              disabled={isGenerating}
              className={`group w-full py-6 bg-white text-black hover:bg-gray-50 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-[2rem] font-black text-xs uppercase tracking-[0.5em] flex items-center justify-center gap-4 shadow-[0_25px_60px_rgba(255,255,255,0.05)]`}
            >
              {isGenerating && !educationalBrief ? <RefreshCw className="animate-spin" size={20} /> : <Settings size={20} className="group-hover:rotate-45 transition-transform" />}
              {isGenerating && !educationalBrief ? 'Analyzing...' : 'Generate Analysis (教學解析)'}
            </button>

            {/* Step 1 Result: Editable Brief */}
            {educationalBrief && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-700">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-[10px] font-black text-teal-500 uppercase tracking-widest">Cinematography Design Brief</h3>
                  <span className="text-[10px] text-gray-600">Editable Markdown</span>
                </div>
                <div className="relative group">
                  <textarea
                    value={educationalBrief}
                    onChange={(e) => setEducationalBrief(e.target.value)}
                    className="w-full h-[400px] bg-[#0f0f0f] border border-teal-900/30 rounded-[1.5rem] p-6 text-sm text-gray-300 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-teal-500/50 transition-all resize-y shadow-inner"
                  />
                </div>

                {/* Step 2: Compile Final Prompt */}
                <button
                  onClick={handleCompileFinal}
                  disabled={isGenerating}
                  className={`group w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white active:scale-[0.98] transition-all disabled:opacity-50 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-lg`}
                >
                  {isGenerating ? <RefreshCw className="animate-spin" size={16} /> : (state.promptMode === 'video' ? <Film size={16} /> : <ImageIcon size={16} />)}
                  {isGenerating ? 'Compiling...' : 'Compile Final English Prompt'}
                </button>
              </div>
            )}

            {/* Step 2 Result: Final Prompt */}
            {state.finalPrompt && (
              <div className="relative group animate-in fade-in slide-in-from-bottom-10 duration-1000">
                <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/10 rounded-[2rem] p-8 pr-16 shadow-2xl backdrop-blur-md">
                  <div
                    className="prose-custom text-sm leading-relaxed text-gray-300"
                    dangerouslySetInnerHTML={{ __html: renderedPrompt }}
                  />
                </div>
                <button
                  onClick={handleCopy}
                  className="absolute top-6 right-6 p-3 bg-black/50 hover:bg-black text-white rounded-xl transition-all shadow-xl active:scale-95 border border-white/10"
                >
                  <Copy size={16} />
                </button>
              </div>
            )}
          </section>


        </div>
      </div>
      <ApiKeyModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveApiKey}
        initialKey={apiKey}
      />

    </div >
  );
};

export default App;
