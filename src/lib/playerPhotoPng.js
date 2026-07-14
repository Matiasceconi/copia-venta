const cache = new Map();

function shouldClearPixel(r, g, b, threshold = 242) {
  return r >= threshold && g >= threshold && b >= threshold && Math.max(r, g, b) - Math.min(r, g, b) <= 18;
}

async function imageToCanvas(source) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.decoding = "async";
  image.src = source;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  return canvas;
}

export async function transparentPngFromUrl(url) {
  if (!url || typeof window === "undefined") return url;
  if (cache.has(url)) return cache.get(url);
  try {
    const canvas = await imageToCanvas(url);
    const ctx = canvas.getContext("2d");
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < data.data.length; i += 4) {
      if (shouldClearPixel(data.data[i], data.data[i + 1], data.data[i + 2])) data.data[i + 3] = 0;
    }
    ctx.putImageData(data, 0, 0);
    const result = canvas.toDataURL("image/png");
    cache.set(url, result);
    return result;
  } catch {
    cache.set(url, url);
    return url;
  }
}

export async function fileToTransparentPng(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const dataUrl = await transparentPngFromUrl(objectUrl);
    const blob = await (await fetch(dataUrl)).blob();
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".png", { type: "image/png" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}