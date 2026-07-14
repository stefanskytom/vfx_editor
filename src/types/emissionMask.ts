export type EmissionMaskMode = 'point' | 'outline' | 'fill' | 'hotspots';

export interface MaskPoint {
  x: number;
  y: number;
}

export interface EmissionMaskData {
  mode: EmissionMaskMode;
  /** Spawn points in symbol-local space (relative to emitter center). */
  polygon: MaskPoint[];
  /** Normalized 0–1 preview coords for UI overlay. */
  previewPoints: MaskPoint[];
  hotspotCount: number;
}
