/* Redimensionne une photo dans le navigateur avant envoi (JPEG). */

async function decode(file) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { /* repli ci-dessous */ }
  }
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Cette image n'a pas pu être lue. Essayez un JPEG ou un PNG.")); };
    img.src = url;
  });
}

function toBlob(src, max, quality) {
  const w = src.width, h = src.height;
  const sc = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * sc);
  c.height = Math.round(h * sc);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res({ blob: b, width: c.width, height: c.height }) : rej(new Error('Conversion impossible'))), 'image/jpeg', quality));
}

/* Renvoie la photo (1600 px) et sa miniature (480 px) */
export async function preparePhoto(file) {
  const src = await decode(file);
  const full = await toBlob(src, 1600, 0.82);
  const thumb = await toBlob(src, 480, 0.75);
  if (src.close) src.close();
  return { full, thumb };
}
