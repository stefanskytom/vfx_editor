import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  UploadCloud,
  Download,
  Copy,
  Cpu,
  Sliders,
  Code2,
  Check,
  Archive
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
import { downloadVfxPackageZip } from './utils/zipExporter';
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

// Pre-loaded/default symbols
const DEFAULT_SYMBOLS = [
  { id: 'coin', name: 'Golden Coin', url: coinSymbolUrl },
  { id: 'wild', name: 'Fire Wild', url: wildSymbolUrl }
];

export default function App() {
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
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  // References for terminal scrolls
  const visualTerminalRef = useRef<HTMLDivElement>(null);
  const workflowTimersRef = useRef<{
    logInterval: ReturnType<typeof setInterval> | null;
    timeouts: ReturnType<typeof setTimeout>[];
  }>({ logInterval: null, timeouts: [] });
  const maskBuildIdRef = useRef(0);
  const workflowRunIdRef = useRef(0);

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
      setIsBuildingMask(false);
      return;
    }

    const buildId = ++maskBuildIdRef.current;
    setIsBuildingMask(true);
    try {
      const mask = await buildEmissionMask(imageSrc, mode);
      if (buildId !== maskBuildIdRef.current) return;

      setEmissionMask(mask);
      setVisualAgentLogs(prev => [
        ...prev,
        `[VisualAgent] Emission mask built: ${mode} (${mask.polygon.length} spawn points).`
      ]);
    } catch (e: unknown) {
      if (buildId !== maskBuildIdRef.current) return;
      console.error(e);
      setEmissionMask(null);
    } finally {
      if (buildId === maskBuildIdRef.current) {
        setIsBuildingMask(false);
      }
    }
  };

  useEffect(() => {
    const url =
      selectedSymbolId === 'custom'
        ? customImageUrl
        : DEFAULT_SYMBOLS.find((s) => s.id === selectedSymbolId)?.url ?? null;
    if (url) {
      rebuildEmissionMask(url, emissionMaskMode);
    } else if (emissionMaskMode === 'point') {
      setEmissionMask(null);
    }
  }, [emissionMaskMode, selectedSymbolId, customImageUrl]);

  // Run initial analysis on first load (default Coin symbol)
  useEffect(() => {
    runAIWorkflow(coinSymbolUrl, 'coin_symbol', 'gold');
    return () => {
      workflowRunIdRef.current += 1;
      clearWorkflowTimers();
    };
  }, []);

  // Scroll terminals to bottom when logs update
  useEffect(() => {
    if (visualTerminalRef.current) {
      visualTerminalRef.current.scrollTop = visualTerminalRef.current.scrollHeight;
    }
  }, [visualAgentLogs]);

  // AI Agent analysis and generator sequence
  const runAIWorkflow = async (imageSrc: string | File, name: string, forcedType?: 'gold' | 'fire' | 'magic' | 'standard') => {
    const runId = ++workflowRunIdRef.current;
    clearWorkflowTimers();
    setIsAnalyzing(true);
    setVisualAgentLogs(['[VisualAgent] Initializing image channels...', '[VisualAgent] Scanning transparent canvas borders...']);
    setAnalysisResult(null);

    try {
      // 1. Run visual analysis
      const result = await analyzeImage(imageSrc);
      
      // Simulate real-time logs parsing
      let currentLogIndex = 0;
      const logInterval = setInterval(() => {
        if (runId !== workflowRunIdRef.current) {
          clearInterval(logInterval);
          return;
        }

        if (currentLogIndex < result.logs.length) {
          setVisualAgentLogs(prev => [...prev, `[VisualAgent] ${result.logs[currentLogIndex]}`]);
          currentLogIndex++;
        } else {
          clearInterval(logInterval);
          workflowTimersRef.current.logInterval = null;

          if (runId !== workflowRunIdRef.current) return;

          setVisualAgentLogs(prev => [...prev, `[VisualAgent] Analysis complete. Bounding box & dominant colors dispatched.`]);
          setAnalysisResult(result);

          const t1 = setTimeout(() => {
            if (runId !== workflowRunIdRef.current) return;

            const t2 = setTimeout(() => {
              if (runId !== workflowRunIdRef.current) return;

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

              setVisualAgentLogs(prev => [
                ...prev,
                `[VisualAgent] Emitter config ready: ${recommended.preset.toUpperCase()} preset, 5 win states generated.`
              ]);
              setIsAnalyzing(false);
            }, 600);
            workflowTimersRef.current.timeouts.push(t2);
          }, 300);
          workflowTimersRef.current.timeouts.push(t1);
        }
      }, 150);
      workflowTimersRef.current.logInterval = logInterval;

    } catch (e: unknown) {
      if (runId !== workflowRunIdRef.current) return;
      console.error(e);
      const message = e instanceof Error ? e.message : 'Unknown error';
      setVisualAgentLogs(prev => [...prev, `[VisualAgent] [ERROR] Failed to read image channels: ${message}`]);
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
    e.target.value = '';
  };

  // Preset switch triggers a fresh code agent parameter map without visual re-scan
  const handlePresetManualChange = (newParams: EmitterParams) => {
    let nextParams = newParams;

    if (newParams.preset !== params.preset) {
      const spriteType = getSpriteTypeForPreset(newParams.preset);
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
  };

  const handleMaskModeChange = (mode: EmissionMaskMode) => {
    setEmissionMaskMode(mode);
  };

  const handleCustomSpriteUpload = (url: string | null) => {
    setCustomParticleSpriteUrl(url);
    if (url) {
      setTextureSource('custom');
    } else {
      setTextureSource('procedural');
    }
  };

  const handleParticleTextureSelect = (id: string) => {
    setSelectedParticleTextureId(id);
    setTextureSource('library');
  };

  const handleCustomBackgroundUpload = (url: string | null, naturalWidth: number, naturalHeight: number) => {
    if (!url) return;
    setCustomBackgroundUrl(url);
    setBackgroundNaturalSize({ w: naturalWidth, h: naturalHeight });
    setBackgroundTransform(createDefaultBackgroundTransform(naturalWidth, naturalHeight, 600, 500));
    setBgColor('custom');
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

  const emitterConfig = useMemo(
    () => generateEmitterConfig({ ...params, textureName: particleName }, emissionMask),
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getExportContent());
      setCopyStatus(true);
      setTimeout(() => setCopyStatus(false), 2000);
    } catch {
      setCopyStatus(false);
    }
  };

  const handleDownloadZip = async () => {
    setIsDownloadingZip(true);

    try {
      await downloadVfxPackageZip({
        particleName,
        params,
        textureSource,
        particleSpriteType: params.particleSpriteType,
        selectedParticleTextureId,
        customParticleSpriteUrl,
        libraryParticleTextureUrl,
        symbolImageUrl: getActiveImageUrl(),
        emitterConfig,
        winStatesExport,
        timelineExport,
        emissionMask
      });

      setVisualAgentLogs(prev => [
        ...prev,
        `[VisualAgent] ZIP downloaded: ${particleName}-vfx-package.zip`
      ]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      console.error(e);
      setVisualAgentLogs(prev => [
        ...prev,
        `[VisualAgent] [ERROR] ZIP export failed: ${message}`
      ]);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleDownload = () => {
    const content = getExportContent();
    const filename = getExportFilename();
    const mime = activeTab === 'js' ? 'application/javascript' : 'application/json';
    const blob = new Blob([content], { type: mime });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  };

  const handleExportWinStates = () => {
    if (!winStatesExport) return;
    setActiveTab('states');
    const blob = new Blob([JSON.stringify(winStatesExport, null, 2)], { type: 'application/json' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `${particleName}-vfx-states.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
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

          {/* Export & Download */}
          <div className="export-panel export-panel-left">
            <div className="export-panel-title">
              <Download size={16} className="text-purple-400" />
              <div>
                <h3>Export &amp; Download</h3>
                <p>Pobierz pełny pakiet .zip ze sprite&apos;em, configiem i kodem JS</p>
              </div>
            </div>

            <div className="export-download-row">
              <button
                type="button"
                className="export-zip-btn"
                onClick={handleDownloadZip}
                disabled={isDownloadingZip}
              >
                <Archive size={16} />
                {isDownloadingZip ? 'Pakowanie…' : 'Pobierz ZIP Package'}
              </button>
              <button type="button" className="icon-btn" onClick={handleCopy}>
                {copyStatus ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                {copyStatus ? 'Skopiowano!' : 'Kopiuj kod'}
              </button>
              <button type="button" className="icon-btn" onClick={handleDownload}>
                <Download size={12} />
                Pobierz plik
              </button>
            </div>

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
            </div>

            <pre className="code-container">
              <code>{getExportContent()}</code>
            </pre>
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
