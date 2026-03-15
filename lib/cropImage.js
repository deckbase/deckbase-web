/**
 * Returns a Promise that resolves to a Blob of the cropped image.
 * @param {string} imageSrc - Data URL or object URL of the image
 * @param {{ x: number, y: number, width: number, height: number }} pixelCrop - Crop area in pixels
 * @param {string} [mimeType] - Output mime type (default image/png)
 * @returns {Promise<Blob>}
 */
export async function getCroppedImg(imageSrc, pixelCrop, mimeType = "image/png") {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d context not available");

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas toBlob failed"));
    }, mimeType, 0.95);
  });
}

function createImage(src) {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
