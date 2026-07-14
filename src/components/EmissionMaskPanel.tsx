import { Scan } from 'lucide-react';
import type { EmissionMaskData, EmissionMaskMode } from '../types/emissionMask';

interface EmissionMaskPanelProps {
  mode: EmissionMaskMode;
  maskData: EmissionMaskData | null;
  showOverlay: boolean;
  isBuilding: boolean;
  onModeChange: (mode: EmissionMaskMode) => void;
  onToggleOverlay: (show: boolean) => void;
}

const MODES: { id: EmissionMaskMode; label: string; desc: string }[] = [
  { id: 'point', label: 'Point', desc: 'Classic center emitter' },
  { id: 'outline', label: 'Outline', desc: 'Spawn from symbol edges' },
  { id: 'fill', label: 'Fill', desc: 'Spawn inside symbol body' },
  { id: 'hotspots', label: 'Hotspots', desc: 'Bright accent regions' }
];

export function EmissionMaskPanel({
  mode,
  maskData,
  showOverlay,
  isBuilding,
  onModeChange,
  onToggleOverlay
}: EmissionMaskPanelProps) {
  return (
    <div className="panel-section emission-mask-section">
      <h3 className="section-title">
        <Scan size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
        Emission Mask
      </h3>

      <div className="mask-mode-grid">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`mask-mode-btn ${mode === m.id ? 'active' : ''}`}
            onClick={() => onModeChange(m.id)}
            title={m.desc}
          >
            {m.label}
          </button>
        ))}
      </div>

      {isBuilding && <p className="feature-hint">Building mask from symbol…</p>}

      {maskData && maskData.mode !== 'point' && (
        <div className="mask-stats">
          <span>{maskData.polygon.length} spawn points</span>
          {maskData.mode === 'hotspots' && <span>{maskData.hotspotCount} hotspots</span>}
          <label className="toggle-container compact">
            <input
              type="checkbox"
              checked={showOverlay}
              onChange={(e) => onToggleOverlay(e.target.checked)}
            />
            <span className="toggle-label">Show mask overlay</span>
          </label>
        </div>
      )}
    </div>
  );
}
