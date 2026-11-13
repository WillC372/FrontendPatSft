import { api } from "./Api.js";
import { esc } from "./Format.js";

// Profile photo of the signed-in user. It is not public: it is downloaded with the session token and shown through a
// local blob: address. The version (avatarVersion) says when it changed, so it is downloaded again only then.
let cached = { version: null, url: null };

export async function avatarUrl(user) {
  if (!user?.avatarVersion) return null;
  if (cached.version === user.avatarVersion) return cached.url;
  try {
    const response = await api.request("GET", "/users/me/avatar", { query: { v: user.avatarVersion }, raw: true });
    const url = URL.createObjectURL(await response.blob());
    if (cached.url) URL.revokeObjectURL(cached.url);
    cached = { version: user.avatarVersion, url };
    return url;
  } catch {
    return null;
  }
}

export function forgetAvatar() {
  if (cached.url) URL.revokeObjectURL(cached.url);
  cached = { version: null, url: null };
}

/** The photo if there is one, otherwise the initial of the name. */
export function avatarMarkup(user, url, extraClass = "") {
  const cls = `avatar ${extraClass}`.trim();
  if (url) return `<img class="${cls}" src="${esc(url)}" alt="">`;
  return `<span class="${cls}" aria-hidden="true">${esc((user?.fullName || "?").charAt(0).toUpperCase())}</span>`;
}

const SIDE = 512;

/**
 * Prepares the chosen file in the browser: the photo is turned upright (phones store it rotated with an EXIF tag),
 * the center square is cut and reduced to 512 px JPEG. The upload is small and the server checks it again.
 */
export async function prepareAvatar(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("No se pudo leer esa imagen. Usa una foto JPEG o PNG.");
  }
  const crop = Math.min(bitmap.width, bitmap.height);
  if (crop < 64) throw new Error("La foto es demasiado pequeña; usa una de al menos 64 px.");
  const side = Math.min(SIDE, crop);
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const g = canvas.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, side, side);
  g.drawImage(bitmap, (bitmap.width - crop) / 2, (bitmap.height - crop) / 2, crop, crop, 0, 0, side, side);
  bitmap.close?.();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo preparar la foto."))), "image/jpeg", 0.9));
}
