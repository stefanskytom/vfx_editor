import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import {
  PARTICLE_TEXTURES,
  PARTICLE_TEXTURE_CATEGORIES,
  getParticleTexture,
  type ParticleTextureItem
} from '../utils/particleTextures';

interface ParticleTexturePickerProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

export const ParticleTexturePicker: React.FC<ParticleTexturePickerProps> = ({
  selectedId,
  onSelect
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = getParticleTexture(selectedId) ?? PARTICLE_TEXTURES[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PARTICLE_TEXTURES;
    return PARTICLE_TEXTURES.filter(
      (item) =>
        item.id.includes(q) ||
        item.label.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q)
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, ParticleTextureItem[]>();
    for (const category of PARTICLE_TEXTURE_CATEGORIES) {
      map.set(category.id, []);
    }
    for (const item of filtered) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return PARTICLE_TEXTURE_CATEGORIES
      .map((cat) => ({ ...cat, items: map.get(cat.id) ?? [] }))
      .filter((cat) => cat.items.length > 0);
  }, [filtered]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleSelect = (id: string) => {
    onSelect(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="particle-texture-picker" ref={rootRef}>
      <button
        type="button"
        className="particle-texture-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {selected && (
          <>
            <img src={selected.url} alt="" className="particle-texture-trigger-thumb" />
            <span className="particle-texture-trigger-label">
              <span className="particle-texture-trigger-name">{selected.label}</span>
              <span className="particle-texture-trigger-id">{selected.id}</span>
            </span>
          </>
        )}
        <ChevronDown size={14} className={`particle-texture-chevron ${open ? 'open' : ''}`} />
      </button>

      {open && (
        <div className="particle-texture-dropdown" role="listbox">
          <div className="particle-texture-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search textures..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="particle-texture-list">
            {grouped.length === 0 && (
              <div className="particle-texture-empty">No textures found.</div>
            )}

            {grouped.map((group) => (
              <div key={group.id} className="particle-texture-group">
                <div className="particle-texture-group-title">{group.label}</div>
                <div className="particle-texture-grid">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={item.id === selectedId}
                      className={`particle-texture-option ${item.id === selectedId ? 'active' : ''}`}
                      onClick={() => handleSelect(item.id)}
                      title={item.id}
                    >
                      <img src={item.url} alt={item.label} />
                      <span>{item.id.replace(`${group.id}_`, '')}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
