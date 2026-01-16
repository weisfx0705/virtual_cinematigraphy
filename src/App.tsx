
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
import { generateMasterPrompt } from './services/geminiService';
import { MOTION_DESCRIPTIONS } from './constants';

const MOTION_GROUPS: { name: string; motions: CameraMotion[] }[] = [
  {
    name: 'Standard Shots',
    motions: ['POV', 'OTS', 'Dutch Angle', 'Handheld', 'Rack Focus', 'Locked-off']
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

  const [apiKey, setApiKey] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewfinderRef = useRef<HTMLDivElement>(null);

  const handleMotionEnter = (e: React.MouseEvent, motion: string) => {
    const desc = MOTION_DESCRIPTIONS[motion];
    if (!desc) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({
      text: desc,
      x: rect.left + rect.width / 2,
      y: rect.top - 8
    });
  };

  const handleMotionLeave = () => {
    setTooltip(null);
  };

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

  const handleGenerate = async () => {
    setIsGenerating(true);
    const prompt = await generateMasterPrompt(state, apiKey);
    setState(prev => ({ ...prev, finalPrompt: prompt }));
    setIsGenerating(false);
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

  const viewfinderHeight = "85vh";
  const viewfinderWidth = "calc(85vh * 1.777)";

  // 將 Markdown 轉換為 HTML 的安全處理
  const renderedPrompt = useMemo(() => {
    return marked.parse(state.finalPrompt) as string;
  }, [state.finalPrompt]);

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-[#0a0a0a] text-gray-100 overflow-hidden">
      {/* 左側面板: 3D 預覽視窗 */}
      <div className="relative flex-1 bg-white overflow-hidden border-b lg:border-b-0 lg:border-r border-gray-800 flex items-center justify-center">

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
        </div>

        {/* 16:9 攝影機參考框 */}
        <div
          ref={viewfinderRef}
          className="relative border-[1.5px] border-black/20 pointer-events-none z-10 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] flex items-center justify-center transition-all duration-500"
          style={{ height: viewfinderHeight, width: viewfinderWidth }}
        >
          <div className="absolute top-0 left-0 border-t-2 border-l-2 border-white/95 w-16 h-16"></div>
          <div className="absolute top-0 right-0 border-t-2 border-r-2 border-white/95 w-16 h-16"></div>
          <div className="absolute bottom-0 left-0 border-b-2 border-l-2 border-white/95 w-16 h-16"></div>
          <div className="absolute bottom-0 right-0 border-b-2 border-r-2 border-white/95 w-16 h-16"></div>
          <div className="absolute w-12 h-[1px] bg-white/40"></div>
          <div className="absolute h-12 w-[1px] bg-white/40"></div>
        </div>

        <div className="absolute top-12 right-12 z-20 flex flex-col items-end gap-6 h-full pointer-events-none">
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

          <div className="bg-black/90 backdrop-blur-xl p-5 rounded-3xl border border-gray-800 shadow-[0_20px_40px_rgba(0,0,0,0.5)] w-[240px] space-y-5 animate-in slide-in-from-right-10 duration-700 pointer-events-auto">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-4 w-1 bg-teal-500 rounded-full shadow-[0_0_10px_rgba(20,184,166,0.8)]"></div>
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
                  className={`px-3 py-2 text-[10px] rounded-lg border transition-all font-bold uppercase tracking-wider text-center ${state.characterPose === pose ? 'bg-teal-500/20 border-teal-500/50 text-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.2)]' : 'bg-gray-800/50 border-gray-700/50 text-gray-500 hover:bg-gray-800 hover:text-gray-300'}`}
                >
                  {pose}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute top-12 left-12 flex flex-col gap-3 pointer-events-none z-20">
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

        <div className="absolute bottom-16 inset-x-0 flex justify-center pointer-events-none z-20">
          <div className="bg-black/95 backdrop-blur-3xl px-16 py-5 rounded-full border border-gray-800 flex items-center gap-12 shadow-[0_30px_70px_rgba(0,0,0,0.6)]">
            <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.5em]">Optical Profile</span>
            <div className="flex gap-12 text-sm font-black tracking-[0.3em] uppercase">
              <span className="text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">{state.terms.direction}</span>
              <span className="text-pink-400 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]">{state.terms.angle}</span>
              <span className="text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">{state.terms.size}</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 w-full z-20 flex justify-center pointer-events-auto">
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

      {/* 右側面板: 控制系統 */}
      <div className="w-full lg:w-[500px] flex flex-col bg-[#0d0d0d] border-l border-gray-800 shadow-2xl z-30 overflow-y-auto scrollbar-hide">
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
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`group w-full py-6 bg-white text-black hover:bg-gray-50 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-[2rem] font-black text-xs uppercase tracking-[0.5em] flex items-center justify-center gap-4 shadow-[0_25px_60px_rgba(255,255,255,0.05)]`}
            >
              {isGenerating ? <RefreshCw className="animate-spin" size={20} /> : (state.promptMode === 'video' ? <Film size={20} className="group-hover:rotate-12 transition-transform" /> : <ImageIcon size={20} className="group-hover:scale-110 transition-transform" />)}
              {isGenerating ? 'Compiling...' : (state.promptMode === 'video' ? 'Compile Video Patch' : 'Generate Image Prompt')}
            </button>

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
      {tooltip && (
        <div
          className="fixed z-[100] px-4 py-3 bg-black/90 backdrop-blur-xl border border-gray-700 text-gray-100 text-[11px] rounded-xl shadow-2xl pointer-events-none max-w-[240px] leading-relaxed tracking-wide transform -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-black/90 border-r border-b border-gray-700 transform rotate-45"></div>
          {tooltip.text}
        </div>
      )}
    </div>
  );
};

export default App;
