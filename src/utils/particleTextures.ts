const textureModules = import.meta.glob<string>('../assets/particles/*.png', {
  eager: true,
  import: 'default'
});

export interface ParticleTextureItem {
  id: string;
  label: string;
  category: string;
  categoryLabel: string;
  url: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  circle: 'Circle / Halo',
  dirt: 'Dirt / Debris',
  fire: 'Fire',
  flame: 'Flame',
  flare: 'Flare',
  light: 'Light / Glow',
  magic: 'Magic',
  muzzle: 'Muzzle',
  scorch: 'Scorch',
  scratch: 'Scratch',
  slash: 'Slash',
  smoke: 'Smoke',
  spark: 'Spark',
  star: 'Star',
  symbol: 'Symbol',
  trace: 'Trace',
  twirl: 'Twirl',
  window: 'Window'
};

function parseTextureId(path: string): string {
  const filename = path.split('/').pop() ?? path;
  return filename.replace(/\.png$/i, '');
}

function formatLabel(id: string): string {
  const [category, num] = id.split('_');
  const categoryLabel = CATEGORY_LABELS[category] ?? category;
  return `${categoryLabel.split(' / ')[0]} ${num ?? ''}`.trim();
}

export const PARTICLE_TEXTURES: ParticleTextureItem[] = Object.entries(textureModules)
  .map(([path, url]) => {
    const id = parseTextureId(path);
    const category = id.split('_')[0] ?? 'other';
    return {
      id,
      label: formatLabel(id),
      category,
      categoryLabel: CATEGORY_LABELS[category] ?? category,
      url
    };
  })
  .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

export const PARTICLE_TEXTURE_CATEGORIES = Array.from(
  new Set(PARTICLE_TEXTURES.map((t) => t.category))
).map((category) => ({
  id: category,
  label: CATEGORY_LABELS[category] ?? category
}));

export function getParticleTextureUrl(id: string): string | null {
  return PARTICLE_TEXTURES.find((t) => t.id === id)?.url ?? null;
}

export function getParticleTexture(id: string): ParticleTextureItem | null {
  return PARTICLE_TEXTURES.find((t) => t.id === id) ?? null;
}

export const DEFAULT_PARTICLE_TEXTURE_ID = 'spark_01';
