export interface BackgroundTransform {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BackgroundImageMeta {
  url: string;
  naturalWidth: number;
  naturalHeight: number;
}

export function createDefaultBackgroundTransform(
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number
): BackgroundTransform {
  const scale = Math.min(canvasWidth / imageWidth, canvasHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;

  return {
    x: (canvasWidth - width) / 2,
    y: (canvasHeight - height) / 2,
    width,
    height
  };
}

export function createCoverBackgroundTransform(
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number
): BackgroundTransform {
  const scale = Math.max(canvasWidth / imageWidth, canvasHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;

  return {
    x: (canvasWidth - width) / 2,
    y: (canvasHeight - height) / 2,
    width,
    height
  };
}
