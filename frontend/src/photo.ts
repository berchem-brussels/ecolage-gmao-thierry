/**
 * Préparation d'une photo dans le navigateur avant l'envoi (cahier des charges RGPD-01, DEM-09) :
 * réduction à 1 600 pixels de côté au plus, orientation appliquée, réencodage en JPEG par un canevas.
 * Le réencodage ne garde aucune métadonnée : ni EXIF, ni position GPS, ni appareil. Le serveur contrôle à nouveau.
 * L'image se lit par createImageBitmap, ou à défaut par une adresse data: que la politique de sécurité autorise.
 */
export const PHOTO_MAX_PX = 1600;
export const PHOTO_MAX_OCTETS = 900 * 1024;

async function decode(file: Blob): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* repli ci-dessous */ }
  }
  const url = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('lecture'));
    r.readAsDataURL(file);
  });
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode'));
    img.src = url;
  });
}

const toBlob = (canvas: HTMLCanvasElement, quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

/** Rend un JPEG réduit et sans métadonnées ; lève une erreur si l'image ne se lit pas ou reste trop lourde. */
export async function reduirePhoto(file: Blob): Promise<Blob> {
  const img = await decode(file);
  const scale = Math.min(1, PHOTO_MAX_PX / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  for (const q of [0.85, 0.75, 0.65, 0.55]) {
    const blob = await toBlob(canvas, q);
    if (blob && blob.size <= PHOTO_MAX_OCTETS) return blob;
  }
  throw new Error('trop_lourde');
}
