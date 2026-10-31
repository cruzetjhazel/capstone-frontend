export interface PreparedImage {
  file: File;
  originalWidth: number;
  originalHeight: number;
  resized: boolean;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Unreadable image")); };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Keeps the original file whenever it already fits `maxBytes` (no re-encode, no quality loss).
 * Only oversized files are scaled down (never up) to `maxWidth` and re-encoded at high JPEG quality.
 */
export async function prepareImageForUpload(
  file: File,
  { maxWidth = 2400, maxBytes = 2 * 1024 * 1024 }: { maxWidth?: number; maxBytes?: number } = {}
): Promise<PreparedImage> {
  const img = await loadImage(file);
  const originalWidth = img.naturalWidth;
  const originalHeight = img.naturalHeight;

  if (file.size <= maxBytes) {
    return { file, originalWidth, originalHeight, resized: false };
  }

  let width = Math.min(originalWidth, maxWidth);
  const qualities = [0.92, 0.88, 0.84, 0.8, 0.75];

  for (let attempt = 0; attempt < 6; attempt++) {
    const height = Math.round((originalHeight * width) / originalWidth);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.fillStyle = "#ffffff"; // flatten PNG transparency
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);

    for (const q of qualities) {
      const blob = await toBlob(canvas, q);
      if (blob && blob.size <= maxBytes) {
        const name = file.name.replace(/\.\w+$/, "") + ".jpg";
        return { file: new File([blob], name, { type: "image/jpeg" }), originalWidth, originalHeight, resized: true };
      }
    }
    width = Math.round(width * 0.85); // still too heavy: use fewer pixels instead of worse compression
  }
  throw new Error("Could not fit the image under the size limit");
}