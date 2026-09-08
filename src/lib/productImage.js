const MAX_DIMENSION = 1600;
const MAX_BYTES = 3 * 1024 * 1024;

function canvasBlob(canvas, type, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

function loadHtmlImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => resolve({
      width: image.naturalWidth,
      height: image.naturalHeight,
      draw: context => context.drawImage(image, 0, 0),
      close: () => URL.revokeObjectURL(url),
    });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No pudimos leer esa imagen. Elige otra.'));
    };
    image.src = url;
  });
}

async function loadImage(blob) {
  if (globalThis.createImageBitmap) {
    try {
      const bitmap = await createImageBitmap(blob);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: context => context.drawImage(bitmap, 0, 0),
        close: () => bitmap.close(),
      };
    } catch {
      // Safari can decode some camera formats through Image but not ImageBitmap.
    }
  }
  return loadHtmlImage(blob);
}

export async function compressProductImage(input) {
  if (!(input instanceof Blob) || !String(input.type).startsWith('image/')) {
    throw new Error('Elige un archivo de imagen.');
  }
  const source = await loadImage(input);
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(source.width, source.height));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No pudimos preparar la imagen.');
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, width, height);
    context.save();
    context.scale(scale, scale);
    source.draw(context);
    context.restore();

    for (const quality of [0.82, 0.7, 0.58]) {
      const output = await canvasBlob(canvas, 'image/webp', quality)
        || await canvasBlob(canvas, 'image/jpeg', quality);
      if (output && output.size <= MAX_BYTES) return output;
    }
    throw new Error('La imagen sigue siendo demasiado grande. Elige una de menor tamaño.');
  } finally {
    source.close();
  }
}
