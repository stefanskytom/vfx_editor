import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  UploadCloud,
  Download,
  Copy,
  Cpu,
  Terminal,
  Sliders,
  Code2,
  Check
} from 'lucide-react';
import './App.css';

// Components & Utils
import { VFXCanvas } from './components/VFXCanvas';
import { ControlPanel } from './components/ControlPanel';
import { WinStateComposer } from './components/WinStateComposer';
import { TimelineEditor } from './components/TimelineEditor';
import { analyzeImage } from './utils/imageAnalyser';
import type { AnalysisResult } from './utils/imageAnalyser';
import {
  generateEmitterConfig,
  getRecommendedParams,
  getSpriteTypeForPreset
} from './utils/configGenerator';
import type { EmitterParams, TextureSource, PreviewBackground } from './utils/configGenerator';
import {
  createCoverBackgroundTransform,
  createDefaultBackgroundTransform
} from './types/backgroundTransform';
import type { BackgroundTransform } from './types/backgroundTransform';
import { getSpriteTypeLabel } from './utils/spriteGenerator';
import {
  DEFAULT_PARTICLE_TEXTURE_ID,
  getParticleTextureUrl
} from './utils/particleTextures';
import { generateBoilerplateJS } from './utils/exporter';
import { buildEmissionMask } from './utils/emissionMask';
import type { EmissionMaskData, EmissionMaskMode } from './types/emissionMask';
import {
  generateWinStatePack,
  exportWinStatePackage,
  type WinStateId,
  type WinStatePack
} from './utils/winStates';
import {
  createDefaultTimeline,
  exportTimelinePatches,
  type SceneTimeline
} from './utils/timeline';
import {
  createDefaultAlphaCurve,
  createDefaultColorCurve,
  createDefaultScaleCurve
} from './types/curves';

// Asset imports (Vite maps these to absolute helper paths)
import coinSymbolUrl from './assets/coin_symbol.jpg';
import wildSymbolUrl from './assets/wild_symbol.jpg';

export default function App() {
  // Pre-loaded/default symbols
  const DEFAULT_SYMBOLS = [
    { id: 'coin', name: 'Golden Coin', url: coinSymbolUrl },
    { id: 'wild', name: 'Fire Wild', url: wildSymbolUrl }
  ];

  // Active texture states
  const [selectedSymbolId, setSelectedSymbolId] = useState<string>('coin');
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const [particleName, setParticleName] = useState<string>('coin_symbol');

  // Preview settings
  const [textureSource, setTextureSource] = useState<TextureSource>('procedural');
  const [selectedParticleTextureId, setSelectedParticleTextureId] = useState<string>(
    DEFAULT_PARTICLE_TEXTURE_ID
  );
  const [customParticleSpriteUrl, setCustomParticleSpriteUrl] = useState<string | null>(null);
  const [showSymbol, setShowSymbol] = useState<boolean>(true);
  const [bgColor, setBgColor] = useState<PreviewBackground>('dark');
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState<string | null>(null);
  const [backgroundTransform, setBackgroundTransform] = useState<BackgroundTransform | null>(null);
  const [backgroundNaturalSize, setBackgroundNaturalSize] = useState<{ w: number; h: number } | null>(null);

  // Emitter parameter states
  const [params, setParams] = useState<EmitterParams>({
    preset: 'sparkle',
    spawnSpeed: 0.05,
    lifetimeMin: 0.4,
    lifetimeMax: 0.8,
    startColor: '#ffe066',
    endColor: '#d4af37',
    colorMode: 'solid',
    blendMode: 'add',
    speedMin: 50,
    speedMax: 150,
    accelX: 0,
    accelY: 50,
    scaleStart: 0.3,
    scaleEnd: 0.05,
    alphaStart: 1.0,
    alphaEnd: 0.0,
    maxParticles: 100,
    textureName: 'coin_symbol',
    particleSpriteType: 'gold_sparkle',
    loopPreview: true,
    burstDuration: 1.0,
    globalEase: 'linear',
    alphaEase: 'easeOut',
    scaleEase: 'easeInOut',
    colorEase: 'linear',
    alphaCurve: createDefaultAlphaCurve(1.0, 0.0),
    scaleCurve: createDefaultScaleCurve(0.3, 0.05),
    colorCurve: createDefaultColorCurve('#ffe066', '#d4af37')
  });

  // Agent feedback & logs
  const [visualAgentLogs, setVisualAgentLogs] = useState<string[]>([]);
  const [codeAgentLogs, setCodeAgentLogs] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Win State Composer
  const [activeWinState, setActiveWinState] = useState<WinStateId>('idle');
  const [winStatePack, setWinStatePack] = useState<WinStatePack | null>(null);

  // Emission mask
  const [emissionMaskMode, setEmissionMaskMode] = useState<EmissionMaskMode>('point');
  const [emissionMask, setEmissionMask] = useState<EmissionMaskData | null>(null);
  const [showMaskOverlay, setShowMaskOverlay] = useState(true);
  const [isBuildingMask, setIsBuildingMask] = useState(false);

  // Timeline
  const [timeline, setTimeline] = useState<SceneTimeline>(createDefaultTimeline);
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  const [sceneTime, setSceneTime] = useState(0);

  // Tabs for exporting panel
  const [activeTab, setActiveTab] = useState<'json' | 'js' | 'states' | 'timeline'>('json');
  const [copyStatus, setCopyStatus] = useState<boolean>(false);

  // References for terminal scrolls
  const visualTerminalRef = useRef<HTMLDivElement>(null);
  const codeTerminalRef = useRef<HTMLDivElement>(null);
  const workflowTimersRef = useRef<{
    logInterval: ReturnType<typeof setInterval> | null;
    timeouts: ReturnType<typeof setTimeout>[];
  }>({ logInterval: null, timeouts: [] });

  const clearWorkflowTimers = () => {
    const timers = workflowTimersRef.current;
    if (timers.logInterval) {
      clearInterval(timers.logInterval);
      timers.logInterval = null;
    }
    timers.timeouts.forEach(clearTimeout);
    timers.timeouts = [];
  };

  useEffect(() => () => clearWorkflowTimers(), []);

  const getActiveImageUrl = () => {
    if (selectedSymbolId === 'custom') return customImageUrl;
    const found = DEFAULT_SYMBOLS.find(s => s.id === selectedSymbolId);
    return found ? found.url : null;
  };

  const rebuildEmissionMask = async (imageSrc: string | File | null, mode: EmissionMaskMode) => {
    if (!imageSrc || mode === 'point') {
      setEmissionMask(null);
      return;
    }
    setIsBuildingMask(true);
    try {
      const mask = await buildEmissionMask(imageSrc, mode);
      setEmissionMask(mask);
      setVisualAgentLogs(prev => [
        ...prev,
        `[VisualAgent] Emission mask built: ${mode} (${mask.polygon.length} spawn points).`
      ]);
    } catch (e: any) {
      console.error(e);
      setEmissionMask(null);
    } finally {
      setIsBuildingMask(false);
    }
  };

  useEffect(() => {
    const url = getActiveImageUrl();
    if (url) {
      rebuildEmissionMask(url, emissionMaskMode);
    }
  }, [emissionMaskMode, selectedSymbolId, customImageUrl]);

  // Run initial analysis on first load (default Coin symbol)
  useEffect(() => {
    runAIWorkflow(coinSymbolUrl, 'coin_symbol', 'gold');
  }, []);

  // Scroll terminals to bottom when logs update
  useEffect(() => {
    if (visualTerminalRef.current) {
      visualTerminalRef.current.scrollTop = visualTerminalRef.current.scrollHeight;
    }
  }, [visualAgentLogs]);

  useEffect(() => {
    if (codeTerminalRef.current) {
      codeTerminalRef.current.scrollTop = codeTerminalRef.current.scrollHeight;
    }
  }, [codeAgentLogs]);

  // AI Agent analysis and generator sequence
  const runAIWorkflow = async (imageSrc: string | File, name: string, forcedType?: 'gold' | 'fire' | 'magic' | 'standard') => {
    clearWorkflowTimers();
    setIsAnalyzing(true);
    setVisualAgentLogs(['[VisualAgent] Initializing image channels...', '[VisualAgent] Scanning transparent canvas borders...']);
    setCodeAgentLogs(['[CodeAgent] Awaiting VisualAgent report...']);
    setAnalysisResult(null);

    try {
      // 1. Run visual analysis
      const result = await analyzeImage(imageSrc);
      
      // Simulate real-time logs parsing
      let currentLogIndex = 0;
      const logInterval = setInterval(() => {
        if (currentLogIndex < result.logs.length) {
          setVisualAgentLogs(prev => [...prev, `[VisualAgent] ${result.logs[currentLogIndex]}`]);
          currentLogIndex++;
        } else {
          clearInterval(logInterval);
          workflowTimersRef.current.logInterval = null;

          setVisualAgentLogs(prev => [...prev, `[VisualAgent] Analysis complete. Bounding box & dominant colors dispatched.`]);
          setAnalysisResult(result);

          const t1 = setTimeout(() => {
            setCodeAgentLogs(prev => [
              ...prev,
              `[CodeAgent] Report received. Type: '${forcedType || result.symbolType}', dominant color: ${result.dominantColor}.`,
              `[CodeAgent] Generating PixiJS emitter configuration...`,
            ]);

            const t2 = setTimeout(() => {
              const recommended = getRecommendedParams(
                forcedType || result.symbolType,
                result.dominantColor,
                result.secondaryColor,
                name,
                result.particleSpriteType
              );
              const pack = generateWinStatePack(recommended, result);
              setWinStatePack(pack);
              setActiveWinState('idle');
              setParams(pack.idle);

              setCodeAgentLogs(prev => [
                ...prev,
                `[CodeAgent] Particle preset mapped to: '${recommended.preset.toUpperCase()}'`,
                `[CodeAgent] Procedural sprite generated: '${getSpriteTypeLabel(recommended.particleSpriteType)}'`,
                `[CodeAgent] Win State Composer: 5 states generated (idle → jackpot).`,
                `[CodeAgent] Speed limits adjusted: ${recommended.speedMin}-${recommended.speedMax} px/s.`,
                `[CodeAgent] Gravity acceleration vector set: [X: ${recommended.accelX}, Y: ${recommended.accelY}].`,
                `[CodeAgent] Alpha transitions applied. Emitter config injected to preview canvas successfully.`,
                `[CodeAgent] READY: Developer can fine-tune values in Review Mode.`
              ]);
              setIsAnalyzing(false);
            }, 600);
            workflowTimersRef.current.timeouts.push(t2);
          }, 300);
          workflowTimersRef.current.timeouts.push(t1);
        }
      }, 150);
      workflowTimersRef.current.logInterval = logInterval;

    } catch (e: any) {
      console.error(e);
      setVisualAgentLogs(prev => [...prev, `[VisualAgent] [ERROR] Failed to read image channels: ${e.message}`]);
      setIsAnalyzing(false);
    }
  };

  // Handle uploaded files
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      setCustomImageUrl(url);
      setSelectedSymbolId('custom');
      
      const cleanName = file.name.split('.')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
      setParticleName(cleanName);
      runAIWorkflow(file, cleanName);
    };
    reader.readAsDataURL(file);
  };

  // Preset switch triggers a fresh code agent parameter map without visual re-scan
  const handlePresetManualChange = (newParams: EmitterParams) => {
    let nextParams = newParams;

    if (newParams.preset !== params.preset) {
      const spriteType = getSpriteTypeForPreset(newParams.preset);
      setCodeAgentLogs(prev => [
        ...prev,
        `[CodeAgent] Preset updated to '${newParams.preset.toUpperCase()}'.`,
        `[CodeAgent] Sprite asset switched to: '${getSpriteTypeLabel(spriteType)}'.`,
        `[CodeAgent] Injecting parameters: spawnSpeed: ${newParams.spawnSpeed}, blendMode: ${newParams.blendMode}.`
      ]);
      nextParams = { ...newParams, particleSpriteType: spriteType };
    }

    setParams(nextParams);
    if (winStatePack) {
      setWinStatePack({ ...winStatePack, [activeWinState]: nextParams });
    }
  };

  const handleSelectWinState = (state: WinStateId) => {
    if (!winStatePack) return;
    const updated = { ...winStatePack, [activeWinState]: params };
    setWinStatePack(updated);
    setActiveWinState(state);
    setParams(updated[state]);
    setCodeAgentLogs(prev => [
      ...prev,
      `[CodeAgent] Win state switched to '${state}'. Loading ${updated[state].preset} preset.`
    ]);
  };

  const handleMaskModeChange = (mode: EmissionMaskMode) => {
    setEmissionMaskMode(mode);
    const url = getActiveImageUrl();
    if (url) rebuildEmissionMask(url, mode);
  };

  const handleCustomSpriteUpload = (url: string | null) => {
    setCustomParticleSpriteUrl(url);
    if (url) {
      setTextureSource('custom');
      setCodeAgentLogs(prev => [
        ...prev,
        `[CodeAgent] Custom particle sprite loaded. Texture source: CUSTOM.`
      ]);
    }
  };

  const handleParticleTextureSelect = (id: string) => {
    setSelectedParticleTextureId(id);
    setTextureSource('library');
    setCodeAgentLogs(prev => [
      ...prev,
      `[CodeAgent] Particle texture selected: '${id}'. Texture source: LIBRARY.`
    ]);
  };

  const handleCustomBackgroundUpload = (url: string | null, naturalWidth: number, naturalHeight: number) => {
    if (!url) return;
    setCustomBackgroundUrl(url);
    setBackgroundNaturalSize({ w: naturalWidth, h: naturalHeight });
    setBackgroundTransform(createDefaultBackgroundTransform(naturalWidth, naturalHeight, 600, 500));
    setBgColor('custom');
    setCodeAgentLogs(prev => [
      ...prev,
      `[CodeAgent] Custom background loaded (${naturalWidth}x${naturalHeight}). Use transform box to pan/scale.`
    ]);
  };

  const handleBackgroundFit = () => {
    if (!backgroundNaturalSize) return;
    setBackgroundTransform(
      createDefaultBackgroundTransform(backgroundNaturalSize.w, backgroundNaturalSize.h, 600, 500)
    );
  };

  const handleBackgroundCover = () => {
    if (!backgroundNaturalSize) return;
    setBackgroundTransform(
      createCoverBackgroundTransform(backgroundNaturalSize.w, backgroundNaturalSize.h, 600, 500)
    );
  };

  const handleBackgroundClear = () => {
    setCustomBackgroundUrl(null);
    setBackgroundTransform(null);
    setBackgroundNaturalSize(null);
    setBgColor('dark');
  };

  const libraryParticleTextureUrl = getParticleTextureUrl(selectedParticleTextureId);

  const makeEmitterConfig = (p: EmitterParams) =>
    generateEmitterConfig({ ...p, textureName: particleName }, emissionMask);

  const emitterConfig = useMemo(
    () => makeEmitterConfig(params),
    [params, particleName, emissionMask]
  );

  const winStatesExport = useMemo(
    () =>
      winStatePack
        ? exportWinStatePackage(winStatePack, particleName, (p) =>
            generateEmitterConfig({ ...p, textureName: particleName }, emissionMask)
          )
        : null,
    [winStatePack, particleName, emissionMask]
  );

  const timelineExport = useMemo(
    () =>
      exportTimelinePatches(timeline, params, (p) =>
        generateEmitterConfig({ ...p, textureName: particleName }, emissionMask),
        particleName
      ),
    [timeline, params, particleName, emissionMask]
  );

  const jsBoilerplate = useMemo(
    () =>
      generateBoilerplateJS(
        { ...params, textureName: particleName },
        emitterConfig
      ),
    [params, particleName, emitterConfig]
  );

  const getExportContent = () => {
    switch (activeTab) {
      case 'js':
        return jsBoilerplate;
      case 'states':
        return winStatesExport ? JSON.stringify(winStatesExport, null, 2) : '// Analyze a symbol first';
      case 'timeline':
        return JSON.stringify(timelineExport, null, 2);
      default:
        return JSON.stringify(emitterConfig, null, 2);
    }
  };

  const getExportFilename = () => {
    switch (activeTab) {
      case 'js':
        return `${particleName}-vfx.js`;
      case 'states':
        return `${particleName}-vfx-states.json`;
      case 'timeline':
        return `${particleName}-timeline.json`;
      default:
        return `${particleName}-emitter.json`;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getExportContent());
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  const handleDownload = () => {
    const content = getExportContent();
    const filename = getExportFilename();
    const mime = activeTab === 'js' ? 'application/javascript' : 'application/json';
    const blob = new Blob([content], { type: mime });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportWinStates = () => {
    if (!winStatesExport) return;
    setActiveTab('states');
    const blob = new Blob([JSON.stringify(winStatesExport, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${particleName}-vfx-states.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="app-container">
      {/* 1. Header Area */}
      <header className="app-header">
        <div className="logo-section">
          <Sparkles className="logo-icon animate-pulse" size={24} />
          <h1 className="logo-title">PixiVFX_Weaver</h1>
          <span className="logo-badge">VFX Agents v1.0</span>
        </div>
        <div className="header-links">
          <a href="https://pixijs.com" target="_blank" rel="noopener noreferrer">PixiJS v7 Ecosystem</a>
        </div>
      </header>

      {/* 2. Workspace Body */}
      <main className="app-main">
        {/* Left Column: Texture upload & AI Agents logs */}
        <section className="left-panel">
          
          {/* Symbol Upload & Select Card */}
          <div className="vfx-card">
            <h2 className="panel-title">
              <UploadCloud size={18} className="text-purple-400" />
              Slot Symbol Input
            </h2>
            
            {/* Drag drop zone */}
            <label className="dropzone">
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <UploadCloud size={32} className="dropzone-icon" />
              <span className="dropzone-text">Upload symbol image</span>
              <span className="dropzone-sub">PNG / JPG up to 2MB</span>
            </label>

            {/* Default picker grids */}
            <div className="symbol-picker-grid">
              {DEFAULT_SYMBOLS.map((symbol) => (
                <button
                  key={symbol.id}
                  type="button"
                  className={`symbol-picker-btn ${selectedSymbolId === symbol.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedSymbolId(symbol.id);
                    setParticleName(`${symbol.id}_symbol`);
                    runAIWorkflow(symbol.url, `${symbol.id}_symbol`, symbol.id === 'coin' ? 'gold' : 'fire');
                  }}
                >
                  <img src={symbol.url} alt={symbol.name} className="symbol-thumb-img" />
                  <span className="symbol-thumb-text">{symbol.name}</span>
                </button>
              ))}
            </div>
          </div>

          <WinStateComposer
            activeState={activeWinState}
            winStatePack={winStatePack}
            onSelectState={handleSelectWinState}
            onExport={handleExportWinStates}
          />

          {/* Visual Agent Panel */}
          <div className="vfx-card">
            <div className="agent-header">
              <div className="agent-avatar agent-visual-avatar">
                <Cpu size={14} />
              </div>
              <span className="agent-name" style={{ color: 'var(--terminal-green)' }}>Visual Agent</span>
              {isAnalyzing && <span className="animate-ping h-2 w-2 rounded-full bg-emerald-500"></span>}
            </div>
            
            <div className="console-output" ref={visualTerminalRef}>
              {visualAgentLogs.map((log, index) => (
                <div key={index} className={`console-line ${log.includes('complete') ? 'success' : ''}`}>
                  {log}
                </div>
              ))}
            </div>

            {analysisResult && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Extracted Palette:
                </div>
                <div className="palette-display">
                  <div className="palette-swatch" style={{ backgroundColor: analysisResult.dominantColor }}>
                    Dom
                  </div>
                  <div className="palette-swatch" style={{ backgroundColor: analysisResult.secondaryColor }}>
                    Sec
                  </div>
                  <div className="palette-swatch" style={{ backgroundColor: analysisResult.accentColor }}>
                    Acc
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '8px', color: 'var(--text-secondary)' }}>
                  <span>Shape: <strong className="text-white capitalize">{analysisResult.shape}</strong></span>
                  <span>Type: <strong className="text-white capitalize">{analysisResult.symbolType}</strong></span>
                </div>
                <div style={{ fontSize: '11px', marginTop: '6px', color: 'var(--text-secondary)' }}>
                  Sprite: <strong className="text-white">{getSpriteTypeLabel(analysisResult.particleSpriteType)}</strong>
                  <span style={{ marginLeft: '8px', opacity: 0.7 }}>({analysisResult.vfxTheme})</span>
                </div>
              </div>
            )}
          </div>

          {/* Code Agent Generator Panel */}
          <div className="vfx-card">
            <div className="agent-header">
              <div className="agent-avatar agent-code-avatar">
                <Terminal size={14} />
              </div>
              <span className="agent-name" style={{ color: 'var(--accent-purple)' }}>Code Agent</span>
            </div>
            <div className="console-output" ref={codeTerminalRef}>
              {codeAgentLogs.map((log, index) => (
                <div key={index} className={`console-line ${log.includes('READY') ? 'accent' : ''}`}>
                  {log}
                </div>
              ))}
            </div>
          </div>

        </section>

        {/* Center Column: Pixi Canvas & Export Code Editor */}
        <section className="center-panel">
          
          <div className="vfx-canvas-panel">
            <VFXCanvas
              emitterConfig={emitterConfig}
              particleImageUrl={getActiveImageUrl()}
              textureSource={textureSource}
              customParticleSpriteUrl={customParticleSpriteUrl}
              libraryParticleTextureUrl={libraryParticleTextureUrl}
              particleSpriteType={params.particleSpriteType}
              blendMode={params.blendMode}
              loopPreview={params.loopPreview}
              bgColor={bgColor}
              customBackgroundUrl={customBackgroundUrl}
              backgroundTransform={backgroundTransform}
              onBackgroundTransformChange={setBackgroundTransform}
              showSymbol={showSymbol}
              emissionMask={emissionMask}
              showMaskOverlay={showMaskOverlay}
              timeline={timeline}
              timelinePlaying={timelinePlaying}
              sceneTime={sceneTime}
              baseSpawnSpeed={params.spawnSpeed}
              baseMaxParticles={params.maxParticles}
              onSceneTimeChange={setSceneTime}
            />
          </div>

          <TimelineEditor
            timeline={timeline}
            sceneTime={sceneTime}
            isPlaying={timelinePlaying}
            onChange={setTimeline}
            onPlayToggle={() => setTimelinePlaying((p) => !p)}
            onSceneTimeChange={setSceneTime}
          />

          {/* Export Code Editor Drawer */}
          <div className="export-panel">
            <div className="export-header">
              <div className="tabs-group">
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'json' ? 'active' : ''}`}
                  onClick={() => setActiveTab('json')}
                >
                  <Code2 size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
                  config.json
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'js' ? 'active' : ''}`}
                  onClick={() => setActiveTab('js')}
                >
                  <Code2 size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
                  vfx-emitter.js
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'states' ? 'active' : ''}`}
                  onClick={() => setActiveTab('states')}
                >
                  <Code2 size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
                  vfx-states.json
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
                  onClick={() => setActiveTab('timeline')}
                >
                  <Code2 size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
                  timeline.json
                </button>
              </div>

              <div className="export-actions">
                <button type="button" className="icon-btn" onClick={handleCopy}>
                  {copyStatus ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  {copyStatus ? 'Copied!' : 'Copy'}
                </button>
                <button type="button" className="icon-btn" onClick={handleDownload}>
                  <Download size={12} />
                  Download
                </button>
              </div>
            </div>

            <pre className="code-container">
              <code>{getExportContent()}</code>
            </pre>
          </div>

        </section>

        {/* Right Column: Review Parameters Sliders Panel */}
        <section className="right-panel">
          <h2 className="panel-title">
            <Sliders size={18} className="text-purple-400" />
            Review Mode Parameters
          </h2>
          <ControlPanel
            params={params}
            onChange={handlePresetManualChange}
            textureSource={textureSource}
            setTextureSource={setTextureSource}
            customParticleSpriteUrl={customParticleSpriteUrl}
            onCustomSpriteUpload={handleCustomSpriteUpload}
            selectedParticleTextureId={selectedParticleTextureId}
            onParticleTextureSelect={handleParticleTextureSelect}
            showSymbol={showSymbol}
            setShowSymbol={setShowSymbol}
            bgColor={bgColor}
            setBgColor={setBgColor}
            customBackgroundUrl={customBackgroundUrl}
            onCustomBackgroundUpload={handleCustomBackgroundUpload}
            onBackgroundFit={handleBackgroundFit}
            onBackgroundCover={handleBackgroundCover}
            onBackgroundClear={handleBackgroundClear}
            emissionMaskMode={emissionMaskMode}
            emissionMask={emissionMask}
            isBuildingMask={isBuildingMask}
            showMaskOverlay={showMaskOverlay}
            onMaskModeChange={handleMaskModeChange}
            onToggleMaskOverlay={setShowMaskOverlay}
            activeWinState={activeWinState}
          />
        </section>
      </main>
    </div>
  );
}
