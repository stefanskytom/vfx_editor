import { Download, Layers } from 'lucide-react';
import type { WinStateId, WinStatePack } from '../utils/winStates';
import { WIN_STATE_LABELS } from '../utils/winStates';

interface WinStateComposerProps {
  activeState: WinStateId;
  winStatePack: WinStatePack | null;
  onSelectState: (state: WinStateId) => void;
  onExport: () => void;
}

const STATE_ORDER: WinStateId[] = ['idle', 'winSmall', 'winBig', 'jackpot', 'nearMiss'];

export function WinStateComposer({
  activeState,
  winStatePack,
  onSelectState,
  onExport
}: WinStateComposerProps) {
  return (
    <div className="vfx-card win-state-card">
      <div className="section-header-row">
        <h2 className="panel-title" style={{ margin: 0 }}>
          <Layers size={18} className="text-purple-400" />
          Win State Composer
        </h2>
        {winStatePack && (
          <button type="button" className="icon-btn compact" onClick={onExport}>
            <Download size={12} />
            Export
          </button>
        )}
      </div>

      {!winStatePack ? (
        <p className="feature-hint">Analyze a symbol to auto-generate win state pack.</p>
      ) : (
        <>
          <div className="win-state-grid">
            {STATE_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                className={`win-state-btn ${activeState === id ? 'active' : ''}`}
                onClick={() => onSelectState(id)}
              >
                <span className="win-state-label">{WIN_STATE_LABELS[id]}</span>
                <span className="win-state-preset">{winStatePack[id].preset}</span>
              </button>
            ))}
          </div>
          {winStatePack[activeState] && (
            <div className="win-state-summary">
              <span>Particles: {winStatePack[activeState].maxParticles}</span>
              <span>{winStatePack[activeState].loopPreview ? 'Loop' : 'Burst'}</span>
              <span>{winStatePack[activeState].blendMode}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
