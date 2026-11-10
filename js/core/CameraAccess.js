// Opens the device camera and turns each browser failure into a message the user can act on.

/** Clear message for a getUserMedia failure. */
export function cameraErrorMessage(error) {
  if (!window.isSecureContext) return "La cámara solo funciona en una página segura (https). Abre AquaSense desde su dirección https.";
  switch (error?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "El navegador bloqueó la cámara. Pulsa el icono del candado o de la cámara junto a la dirección, permite la cámara y vuelve a intentarlo.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No se encontró ninguna cámara en este equipo. Conecta una cámara web o abre AquaSense en tu celular.";
    case "NotReadableError":
    case "AbortError":
      return "La cámara está en uso por otro programa (videollamada u otra pestaña). Ciérralo y vuelve a intentarlo.";
    default:
      return "No se pudo abrir la cámara" + (error?.message ? `: ${error.message}` : ".");
  }
}

/** Starts the camera (the rear one on phones when available). Throws an Error with a clear message. */
export async function openCamera(deviceId) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(window.isSecureContext
      ? "Este navegador no permite usar la cámara. Usa Chrome, Edge, Firefox o Safari actualizados."
      : cameraErrorMessage(null));
  }
  const video = deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: "environment" }, width: { ideal: 1280 } };
  try {
    return await navigator.mediaDevices.getUserMedia({ video, audio: false });
  } catch (error) {
    if (!deviceId && error?.name === "OverconstrainedError") {
      return navigator.mediaDevices.getUserMedia({ video: true, audio: false }).catch((e) => { throw new Error(cameraErrorMessage(e)); });
    }
    throw new Error(cameraErrorMessage(error));
  }
}
