import { api } from "./Api.js";

// Notifications on this phone or computer (Web Push): the browser asks for permission, subscribes with the server's
// public key and the server sends alerts and reminders even when the app is closed.

const toBytes = (b64url) => {
  const b64 = (b64url + "===".slice((b64url.length + 3) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};

/** The browser's own messages are in English and technical: say what happened and what to do. */
function subscribeError(error) {
  const text = `${error?.name || ""} ${error?.message || ""}`;
  if (/permission/i.test(text)) return pushClient.blockedHelp();
  if (/incognito|private/i.test(text)) return "En una ventana privada o de incógnito el navegador no permite avisos. Abre la app en una ventana normal.";
  // Chrome in incognito, and the browsers built into other apps (WhatsApp, Instagram, Facebook), refuse with AbortError.
  if (/AbortError|registration failed/i.test(text)) return "Este navegador no pudo registrar los avisos. Si abriste el enlace desde WhatsApp u otra app, o estás en una pestaña de incógnito, ábrelo en Chrome normal y vuelve a intentarlo.";
  if (/push service|not available|network/i.test(text)) return "El servicio de avisos del navegador no respondió. Revisa tu conexión e inténtalo de nuevo; si sigue igual, prueba con Chrome, Edge o Firefox.";
  return "No se pudieron activar los avisos en este navegador. Inténtalo de nuevo o prueba con otro navegador.";
}

export const pushClient = {
  supported() {
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && window.isSecureContext;
  },

  /** Why it cannot work here, or null. */
  unsupportedReason() {
    if (!window.isSecureContext) return "Los avisos solo funcionan en la página segura (https).";
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return /iPhone|iPad/.test(navigator.userAgent)
        ? "En iPhone primero agrega la app a la pantalla de inicio (Compartir → Agregar a inicio) y ábrela desde ahí."
        : "Este navegador no permite avisos. Prueba con Chrome, Edge o Firefox.";
    }
    return null;
  },

  /** What to do when the browser blocked the notices of this page, with the steps of this kind of phone. */
  blockedHelp() {
    const ua = navigator.userAgent;
    if (/iPhone|iPad/.test(ua)) {
      return "Bloqueados en este iPhone. Ve a Ajustes → Notificaciones → Aqua Assistant AI y activa «Permitir notificaciones»; luego vuelve a encender el interruptor.";
    }
    if (/Android/.test(ua)) {
      return "Bloqueados en Chrome. Toca el ícono a la izquierda de la dirección (o ⋮ → Configuración → Configuración de sitios → Notificaciones), permite las notificaciones de aquaassistantai.vercel.app y vuelve a encender el interruptor.";
    }
    return "Bloqueados en el navegador. Actívalos desde el candado junto a la dirección de la página y vuelve a encender el interruptor.";
  },

  async registration() {
    return navigator.serviceWorker.register("/sw.js", { scope: "/" });
  },

  async current() {
    if (!this.supported()) return null;
    const reg = await navigator.serviceWorker.getRegistration("/");
    return reg ? reg.pushManager.getSubscription() : null;
  },

  async enable() {
    if (!this.supported()) throw new Error(this.unsupportedReason());
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error(permission === "denied" ? this.blockedHelp()
        : "No diste permiso para los avisos: cuando el navegador pregunte, toca «Permitir».");
    }
    const reg = await this.registration();
    await navigator.serviceWorker.ready;
    const { publicKey } = await api.get("/push/key");
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      try {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(publicKey) });
      } catch (error) {
        throw new Error(subscribeError(error));
      }
    }
    const json = sub.toJSON();
    await api.post("/push/subscriptions", { endpoint: json.endpoint, keys: json.keys, label: deviceLabel() });
    return sub;
  },

  async disable() {
    const sub = await this.current();
    if (!sub) return;
    try { await api.delete("/push/subscriptions", { endpoint: sub.endpoint }); } catch { /* removed locally anyway */ }
    await sub.unsubscribe();
  },
};

function deviceLabel() {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  const system = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iPhone" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
  return `${browser}${system ? ` en ${system}` : ""}`;
}
