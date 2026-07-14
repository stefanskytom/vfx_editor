import { ImagePlus } from 'lucide-react';
import { buildPresetParams } from '../utils/configGenerator';
import type { EmitterParams, TextureSource, PreviewBackground } from '../utils/configGenerator';
import type { EmissionMaskData, EmissionMaskMode } from '../types/emissionMask';
import type { WinStateId } from '../utils/winStates';
import { WIN_STATE_LABELS } from '../utils/winStates';
import { EASING_OPTIONS } from '../utils/easing';
import type { EasingType } from '../utils/easing';
import {
  updateColorCurveEndpoint,
  updateCurveEndpoint,
  sortCurveKeyframes
} from '../types/curves';
import { CurveEditor } from './CurveEditor';
import { ColorGradientEditor } from './ColorGradientEditor';
import { EmissionMaskPanel } from './EmissionMaskPanel';
import { ParticleTexturePicker } from './ParticleTexturePicker';

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel-section">
      <h3 className="section-title">{title}</h3>
      {children}
    </section>
  );
}

interface ControlPanelProps {
  params: EmitterParams;
  onChange: (newParams: EmitterParams) => void;
  textureSource: TextureSource;
  setTextureSource: (val: TextureSource) => void;
  customParticleSpriteUrl: string | null;
  onCustomSpriteUpload: (url: string | null) => void;
  selectedParticleTextureId: string;
  onParticleTextureSelect: (id: string) => void;
  showSymbol: boolean;
  setShowSymbol: (val: boolean) => void;
  bgColor: PreviewBackground;
  setBgColor: (color: PreviewBackground) => void;
  customBackgroundUrl: string | null;
  onCustomBackgroundUpload: (url: string | null, naturalWidth: number, naturalHeight: number) => void;
  onBackgroundFit: () => void;
  onBackgroundCover: () => void;
  onBackgroundClear: () => void;
  emissionMaskMode: EmissionMaskMode;
  emissionMask: EmissionMaskData | null;
  isBuildingMask: boolean;
  showMaskOverlay: boolean;
  onMaskModeChange: (mode: EmissionMaskMode) => void;
  onToggleMaskOverlay: (show: boolean) => void;
  activeWinState: WinStateId;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  params,
  onChange,
  textureSource,
  setTextureSource,
  customParticleSpriteUrl,
  onCustomSpriteUpload,
  selectedParticleTextureId,
  onParticleTextureSelect,
  showSymbol,
  setShowSymbol,
  bgColor,
  setBgColor,
  customBackgroundUrl,
  onCustomBackgroundUpload,
  onBackgroundFit,
  onBackgroundCover,
  onBackgroundClear,
  emissionMaskMode,
  emissionMask,
  isBuildingMask,
  showMaskOverlay,
  onMaskModeChange,
  onToggleMaskOverlay,
  activeWinState
}) => {
  const updateParam = <K extends keyof EmitterParams>(key: K, value: EmitterParams[K]) => {
    onChange({ ...params, [key]: value });
  };

  const handlePresetChange = (preset: EmitterParams['preset']) => {
    onChange(buildPresetParams(params, preset));
  };

  const handleSpriteUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      onCustomSpriteUpload(url);
      setTextureSource('custom');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        onCustomBackgroundUpload(url, img.naturalWidth, img.naturalHeight);
        setBgColor('custom');
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const EaseSelect = ({
    label,
    value,
    onSelect
  }: {
    label: string;
    value: EasingType;
    onSelect: (ease: EasingType) => void;
  }) => (
    <div className="ease-select-item">
      <span className="label-text">{label}</span>
      <select
        className="ease-select"
        value={value}
        onChange={(e) => onSelect(e.target.value as EasingType)}
      >
        {EASING_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );

  const syncColorCurve = (colorCurve: typeof params.colorCurve, patch: Partial<typeof params> = {}) => {
    const sorted = sortCurveKeyframes(colorCurve);
    return {
      ...params,
      ...patch,
      colorCurve: sorted,
      startColor: sorted[0]?.value ?? params.startColor,
      endColor: sorted[sorted.length - 1]?.value ?? params.endColor
    };
  };

  return (
    <div className="control-panel">
      <div className="win-state-badge">
        Editing: <strong>{WIN_STATE_LABELS[activeWinState]}</strong>
      </div>

      <EmissionMaskPanel
        mode={emissionMaskMode}
        maskData={emissionMask}
        showOverlay={showMaskOverlay}
        isBuilding={isBuildingMask}
        onModeChange={onMaskModeChange}
        onToggleOverlay={onToggleMaskOverlay}
      />

      <PanelSection title="Effect Preset">
        <div className="preset-selector">
          {(['sparkle', 'explosion', 'fire', 'orbit', 'rain'] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              className={`preset-btn ${params.preset === preset ? 'active' : ''}`}
              onClick={() => handlePresetChange(preset)}
            >
              {preset.toUpperCase()}
            </button>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Preview Settings">
        <div className="settings-grid">
          <label className="toggle-container">
            <input
              type="checkbox"
              checked={showSymbol}
              onChange={(e) => setShowSymbol(e.target.checked)}
            />
            <span className="toggle-label">Render Central Symbol</span>
          </label>

          <label className="toggle-container">
            <input
              type="checkbox"
              checked={params.loopPreview}
              onChange={(e) => updateParam('loopPreview', e.target.checked)}
            />
            <span className="toggle-label">Loop Preview (infinite)</span>
          </label>

          {!params.loopPreview && (
            <div className="control-item">
              <div className="control-header">
                <span className="control-label">Burst Duration</span>
                <span className="control-value">{params.burstDuration.toFixed(2)}s</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="5"
                step="0.1"
                value={params.burstDuration}
                onChange={(e) => updateParam('burstDuration', parseFloat(e.target.value))}
              />
            </div>
          )}

          <div className="texture-source-block">
            <span className="label-text">Particle Texture:</span>
            <div className="texture-source-btns">
              {([
                { id: 'procedural', label: 'Auto' },
                { id: 'library', label: 'Library' },
                { id: 'symbol', label: 'Symbol' },
                { id: 'custom', label: 'Custom' }
              ] as const).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`texture-source-btn ${textureSource === opt.id ? 'active' : ''}`}
                  onClick={() => setTextureSource(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {textureSource === 'library' && (
              <ParticleTexturePicker
                selectedId={selectedParticleTextureId}
                onSelect={onParticleTextureSelect}
              />
            )}

            {textureSource === 'custom' && (
              <div className="custom-sprite-upload">
                <label className="sprite-upload-btn">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleSpriteUpload}
                    style={{ display: 'none' }}
                  />
                  <ImagePlus size={14} />
                  Upload Sprite
                </label>
                {customParticleSpriteUrl && (
                  <div className="sprite-preview-row">
                    <img src={customParticleSpriteUrl} alt="Particle sprite" className="sprite-preview-thumb" />
                    <button
                      type="button"
                      className="sprite-clear-btn"
                      onClick={() => onCustomSpriteUpload(null)}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-select-container">
            <span className="label-text">Background:</span>
            <div className="bg-btn-group">
              {(['dark', 'light', 'transparent', 'reel', 'custom'] as const).map((bg) => (
                <button
                  key={bg}
                  type="button"
                  className={`bg-btn ${bgColor === bg ? 'active' : ''}`}
                  onClick={() => setBgColor(bg)}
                  title={bg === 'custom' ? 'Upload your own background image' : undefined}
                >
                  {bg === 'custom' ? 'Custom Image' : bg}
                </button>
              ))}
            </div>

            {bgColor === 'custom' && (
              <div className="custom-bg-upload">
                <label className="sprite-upload-btn">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleBackgroundUpload}
                    style={{ display: 'none' }}
                  />
                  <ImagePlus size={14} />
                  Upload Background
                </label>

                {customBackgroundUrl && (
                  <div className="custom-bg-actions">
                    <div className="sprite-preview-row">
                      <img src={customBackgroundUrl} alt="Background preview" className="sprite-preview-thumb wide" />
                      <button type="button" className="sprite-clear-btn" onClick={onBackgroundClear}>
                        Clear
                      </button>
                    </div>
                    <div className="custom-bg-fit-btns">
                      <button type="button" className="texture-source-btn" onClick={onBackgroundFit}>
                        Fit
                      </button>
                      <button type="button" className="texture-source-btn" onClick={onBackgroundCover}>
                        Cover
                      </button>
                    </div>
                    <p className="custom-bg-hint">Drag box to move · corners to scale</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </PanelSection>

      <PanelSection title="Color & Tinting">
        <div className="color-mode-toggle">
          <button
            type="button"
            className={`texture-source-btn ${params.colorMode === 'solid' ? 'active' : ''}`}
            onClick={() => updateParam('colorMode', 'solid')}
          >
            Solid
          </button>
          <button
            type="button"
            className={`texture-source-btn ${params.colorMode === 'gradient' ? 'active' : ''}`}
            onClick={() => updateParam('colorMode', 'gradient')}
          >
            Gradient
          </button>
        </div>

        {params.colorMode === 'solid' ? (
          <div className="color-selectors">
            <div className="color-picker-item">
              <span className="label-text">Start Color</span>
              <div className="color-swatch-wrapper">
                <input
                  type="color"
                  value={params.startColor}
                  onChange={(e) => {
                    const startColor = e.target.value;
                    onChange({
                      ...params,
                      startColor,
                      colorCurve: updateColorCurveEndpoint(params.colorCurve, 'start', startColor)
                    });
                  }}
                />
                <span className="color-hex">{params.startColor.toUpperCase()}</span>
              </div>
            </div>

            <div className="color-picker-item">
              <span className="label-text">End Color</span>
              <div className="color-swatch-wrapper">
                <input
                  type="color"
                  value={params.endColor}
                  onChange={(e) => {
                    const endColor = e.target.value;
                    onChange({
                      ...params,
                      endColor,
                      colorCurve: updateColorCurveEndpoint(params.colorCurve, 'end', endColor)
                    });
                  }}
                />
                <span className="color-hex">{params.endColor.toUpperCase()}</span>
              </div>
            </div>
          </div>
        ) : (
          <ColorGradientEditor
            keyframes={params.colorCurve}
            onChange={(colorCurve) => onChange(syncColorCurve(colorCurve))}
          />
        )}

        <div className="control-item">
          <div className="control-header">
            <span className="control-label">Blend Mode</span>
            <span className="control-value">{params.blendMode.toUpperCase()}</span>
          </div>
          <div className="blend-selectors">
            {(['normal', 'add', 'multiply', 'screen'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`blend-btn ${params.blendMode === mode ? 'active' : ''}`}
                onClick={() => updateParam('blendMode', mode)}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </PanelSection>

      <PanelSection title="Curves & Easing">

        <EaseSelect
          label="Global Ease"
          value={params.globalEase}
          onSelect={(ease) => updateParam('globalEase', ease)}
        />

        <div className="curve-ease-grid">
          <EaseSelect
            label="Alpha Ease"
            value={params.alphaEase}
            onSelect={(ease) => updateParam('alphaEase', ease)}
          />
          <EaseSelect
            label="Scale Ease"
            value={params.scaleEase}
            onSelect={(ease) => updateParam('scaleEase', ease)}
          />
          <EaseSelect
            label="Color Ease"
            value={params.colorEase}
            onSelect={(ease) => updateParam('colorEase', ease)}
          />
        </div>

        <CurveEditor
          label="Alpha Curve"
          keyframes={params.alphaCurve}
          minValue={0}
          maxValue={1}
          onChange={(alphaCurve) => onChange({ ...params, alphaCurve })}
        />

        <CurveEditor
          label="Scale Curve"
          keyframes={params.scaleCurve}
          minValue={0}
          maxValue={2}
          onChange={(scaleCurve) => onChange({ ...params, scaleCurve })}
        />
      </PanelSection>

      <PanelSection title="Emission Parameters">

        <div className="control-item">
          <div className="control-header">
            <span className="control-label">Spawn Interval (sec)</span>
            <span className="control-value">{params.spawnSpeed.toFixed(3)}s</span>
          </div>
          <input
            type="range"
            min="0.001"
            max="0.5"
            step="0.005"
            value={params.spawnSpeed}
            onChange={(e) => updateParam('spawnSpeed', parseFloat(e.target.value))}
          />
        </div>

        <div className="control-item">
          <div className="control-header">
            <span className="control-label">Max Particles</span>
            <span className="control-value">{params.maxParticles}</span>
          </div>
          <input
            type="range"
            min="10"
            max="1000"
            step="10"
            value={params.maxParticles}
            onChange={(e) => updateParam('maxParticles', parseInt(e.target.value))}
          />
        </div>

        <div className="control-item">
          <div className="control-header">
            <span className="control-label">Lifetime (Min/Max)</span>
            <span className="control-value">
              {params.lifetimeMin.toFixed(2)}s - {params.lifetimeMax.toFixed(2)}s
            </span>
          </div>
          <div className="range-dual">
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.05"
              value={params.lifetimeMin}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                updateParam('lifetimeMin', Math.min(val, params.lifetimeMax));
              }}
            />
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.05"
              value={params.lifetimeMax}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                updateParam('lifetimeMax', Math.max(val, params.lifetimeMin));
              }}
            />
          </div>
        </div>
      </PanelSection>

      <PanelSection title="Motion & Physics">

        <div className="control-item">
          <div className="control-header">
            <span className="control-label">Initial Speed (Min/Max)</span>
            <span className="control-value">
              {params.speedMin} - {params.speedMax} px/s
            </span>
          </div>
          <div className="range-dual">
            <input
              type="range"
              min="0"
              max="600"
              step="10"
              value={params.speedMin}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                updateParam('speedMin', Math.min(val, params.speedMax));
              }}
            />
            <input
              type="range"
              min="0"
              max="600"
              step="10"
              value={params.speedMax}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                updateParam('speedMax', Math.max(val, params.speedMin));
              }}
            />
          </div>
        </div>

        <div className="control-item">
          <div className="control-header">
            <span className="control-label">Gravity/Drift Y</span>
            <span className="control-value">{params.accelY} px/s²</span>
          </div>
          <input
            type="range"
            min="-500"
            max="800"
            step="10"
            value={params.accelY}
            onChange={(e) => updateParam('accelY', parseInt(e.target.value))}
          />
        </div>

        <div className="control-item">
          <div className="control-header">
            <span className="control-label">Wind/Drift X</span>
            <span className="control-value">{params.accelX} px/s²</span>
          </div>
          <input
            type="range"
            min="-500"
            max="500"
            step="10"
            value={params.accelX}
            onChange={(e) => updateParam('accelX', parseInt(e.target.value))}
          />
        </div>
      </PanelSection>

      <PanelSection title="Scale & Opacity">

        <div className="control-item">
          <div className="control-header">
            <span className="control-label">Scale (Start / End)</span>
            <span className="control-value">
              {params.scaleStart.toFixed(2)} → {params.scaleEnd.toFixed(2)}
            </span>
          </div>
          <div className="range-dual">
            <input
              type="range"
              min="0.05"
              max="2.0"
              step="0.05"
              value={params.scaleStart}
              onChange={(e) => {
                const scaleStart = parseFloat(e.target.value);
                onChange({
                  ...params,
                  scaleStart,
                  scaleCurve: updateCurveEndpoint(params.scaleCurve, 'start', scaleStart)
                });
              }}
            />
            <input
              type="range"
              min="0.01"
              max="2.0"
              step="0.05"
              value={params.scaleEnd}
              onChange={(e) => {
                const scaleEnd = parseFloat(e.target.value);
                onChange({
                  ...params,
                  scaleEnd,
                  scaleCurve: updateCurveEndpoint(params.scaleCurve, 'end', scaleEnd)
                });
              }}
            />
          </div>
        </div>

        <div className="control-item">
          <div className="control-header">
            <span className="control-label">Opacity (Start / End)</span>
            <span className="control-value">
              {params.alphaStart.toFixed(2)} → {params.alphaEnd.toFixed(2)}
            </span>
          </div>
          <div className="range-dual">
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={params.alphaStart}
              onChange={(e) => {
                const alphaStart = parseFloat(e.target.value);
                onChange({
                  ...params,
                  alphaStart,
                  alphaCurve: updateCurveEndpoint(params.alphaCurve, 'start', alphaStart)
                });
              }}
            />
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={params.alphaEnd}
              onChange={(e) => {
                const alphaEnd = parseFloat(e.target.value);
                onChange({
                  ...params,
                  alphaEnd,
                  alphaCurve: updateCurveEndpoint(params.alphaCurve, 'end', alphaEnd)
                });
              }}
            />
          </div>
        </div>
      </PanelSection>
    </div>
  );
};
