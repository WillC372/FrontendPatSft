import { api } from "../core/Api.js";
import { pushClient } from "../core/PushClient.js";
import { bus } from "../core/EventBus.js";
import { session } from "../core/Session.js";
import { theme } from "../core/Theme.js";
import { esc, fmt, own, quotaText } from "../core/Format.js";
import { icon, logo } from "../ui/Icons.js";
import { bindHelp, helpBox } from "../ui/Help.js";
import { i18n } from "../core/I18n.js";
import { voice } from "../core/Voice.js";
import { avatarMarkup, avatarUrl } from "../core/Avatar.js";
import { openAccountDialog } from "./AccountDialog.js";
import { confirmDialog, emptyState, loading, passwordChecklist, showFieldErrors, toast, withBusy } from "../ui/Components.js";
import { LOCALE_CO } from "../core/Locale.js";

const SECTIONS = [["appearance", "Apariencia", "sun"], ["measurement", "Notificaciones y medición", "bell"], ["account", "Cuenta y plan", "user"], ["activity", "Actividad", "history"], ["about", "Acerca de", "info"]];

/** Email delivery status and test email (administrators only). */
async function loadMail(root) {
  const box = root.querySelector("[data-mail]");
  const badge = root.querySelector("[data-mail-badge]");
  try {
    const m = await api.get("/admin/mail");
    badge.className = `badge ${m.configured ? "badge-ok" : m.developmentLogMode ? "badge-warn" : "badge-crit"}`;
    badge.textContent = m.configured ? "Configurado" : m.developmentLogMode ? "Modo desarrollo" : "Sin configurar";
    box.innerHTML = `
      <dl class="kv"><dt>Canal</dt><dd>${esc(m.channel || "Ninguno")}</dd><dt>Remitente</dt><dd>${esc(m.senderName)} &lt;${esc(m.from)}&gt;</dd></dl>
      ${m.configured ? `<button class="btn btn-ghost" data-mail-test style="margin-top:12px">${icon("send")}Enviarme un correo de prueba</button>`
        : `<div class="banner ${m.developmentLogMode ? "banner-warn" : "banner-crit"}" style="margin-top:12px">${icon("alert")}<p>${m.developmentLogMode
          ? "Modo desarrollo: los enlaces de recuperación se escriben en el log del servidor. No lo uses en producción."
          : "Sin servicio de correo: la recuperación de contraseña no está disponible. Configura MAILJET_API_KEY y MAILJET_SECRET_KEY (o Brevo o SMTP)."}</p></div>`}`;
    box.querySelector("[data-mail-test]")?.addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
      try {
        const r = await api.post("/admin/mail/test");
        toast(`Correo de prueba enviado a ${r.to}.`, "ok");
      } catch (error) {
        toast(error.message, "error", 8000);
      }
    }));
  } catch (error) {
    box.innerHTML = `<p class="muted">${esc(error.message)}</p>`;
  }
}

export const settingsView = {
  name: "settings",
  title: "Configuración",
  async render(root, ctx) {
    root.innerHTML = loading();
    let settings;
    let me;
    let ai;
    let activity;
    let current;
    try {
      let whoami;
      [settings, whoami, ai, activity] = await Promise.all([api.get("/users/me/settings"), api.get("/auth/me").catch((error) => {
          // A server not yet updated has no /auth/me: the account alone, without the session.
          if (error.status === 404) return api.get("/users/me").then((user) => ({ user, session: null }));
          throw error;
        }),
        api.get("/intelligence/ai-status"), api.get("/users/me/activity")]);
      me = whoami.user;
      current = whoami.session;
      if (ctx.stale()) return null;
    } catch (error) {
      root.innerHTML = emptyState("error", "No se pudo cargar la configuración", error.message);
      return null;
    }
    session.updateUser(me);
    const draft = { ...settings };

    root.innerHTML = `
      <div class="settings-layout">
        <nav class="card ia-menu" aria-label="Secciones">${SECTIONS.map(([id, label, ic]) => `<button data-goto="${id}">${icon(ic)}${label}</button>`).join("")}
          <a class="btn btn-ghost" href="#/profiles" style="justify-content:flex-start">${icon("profiles")}Perfiles de agua</a></nav>
        <div class="stack">
          <section class="card reveal" id="s-appearance">
            <div class="card-head"><div class="card-title">${icon("sun")}Modo de apariencia</div></div>
            <div class="segmented" role="radiogroup" aria-label="Tema">
              ${[["AUTO", "Automático", "monitor"], ["LIGHT", "Claro", "sun"], ["DARK", "Oscuro", "moon"]].map(([v, l, ic]) =>
                `<button role="radio" data-theme-option="${v}" aria-checked="${draft.theme === v}" class="${draft.theme === v ? "active" : ""}">${icon(ic)}${l}</button>`).join("")}
            </div>
            <p class="muted" style="margin-top:10px;font-size:13px">"Automático" sigue la preferencia de tu sistema operativo. La elección se guarda en tu cuenta.</p>
            <div class="setting-row"><div><strong>Idioma</strong><p>Toda la app cambia al idioma que elijas: pantallas, mensajes, respuestas y voz de Aqua, correos, avisos e informes. La primera vez en un idioma puede tardar unos segundos mientras se traduce.</p></div>
              <select class="input lang-select" data-language aria-label="Idioma" translate="no"><option value="${esc(i18n.lang)}" selected>${esc(i18n.lang)}</option></select></div>
          </section>

          <section class="card reveal" id="s-voice">
            <div class="card-head"><div class="card-title">${icon("volume")}Voz de Aqua</div></div>
            <div class="setting-row"><div><strong>Aqua habla</strong><p>Al abrir a Aqua te saluda en voz alta y lee sus respuestas mientras las escribe. Si lo apagas, solo escribe.</p></div>
              <label class="switch"><input type="checkbox" data-voice ${draft.voiceEnabled !== false ? "checked" : ""} aria-label="Aqua habla"><span></span></label></div>
            <div class="setting-row" data-voice-row><div><strong>Voz</strong><p data-voice-note>Se elige la voz más natural de este dispositivo para el idioma de la app.</p></div>
              <select class="input" style="width:auto;max-width:260px" data-voice-name aria-label="Voz" translate="no"></select></div>
            <div class="setting-row" data-voice-row><div><strong>Velocidad</strong><p><span data-voice-rate-text translate="no"></span></p></div>
              <div class="row" style="gap:8px;flex-wrap:nowrap"><input type="range" min="0.7" max="1.4" step="0.05" data-voice-rate aria-label="Velocidad de la voz">
              <button type="button" class="btn btn-sm" data-voice-test>${icon("play")}Probar</button></div></div>
          </section>
          <section class="card reveal" id="s-measurement">
            <div class="card-head"><div class="card-title">${icon("bell")}Notificaciones y medición</div></div>
            ${helpBox("notices", "¿Cómo me llegan los avisos?", [
              ["bell", "Dentro de la app", "La campana de arriba muestra las alertas cuando una medición sale del rango. Siempre está."],
              ["send", "En tu celular o computador, aunque la app esté cerrada", "Activa «Avisos en este celular o computador» en cada dispositivo donde los quieras; el navegador te pedirá permiso. Con «Probar» compruebas que lleguen. En iPhone, primero agrega la app a la pantalla de inicio."],
              ["mail", "Por correo", "Con «Alertas por correo» te escribo cuando el agua sale del rango (como mucho un correo por hora). Los recordatorios también pueden llegar por correo si lo marcas al crearlos."],
            ])}
            <div class="setting-row"><div><strong>Notificaciones de alertas</strong><p>Avisos cuando una medición sale del rango (en la app y en los dispositivos donde actives los avisos).</p></div>
              <label class="switch"><input type="checkbox" data-notifications ${draft.notificationsEnabled ? "checked" : ""} aria-label="Notificaciones de alertas"><span></span></label></div>
            <div class="setting-row"><div><strong>Alertas por correo</strong><p>Te escribo a tu correo cuando una medición sale del rango (como mucho uno por hora).</p></div>
              <label class="switch"><input type="checkbox" data-email-alerts ${draft.emailAlerts !== false ? "checked" : ""} aria-label="Alertas por correo"><span></span></label></div>
            <div class="setting-row push-row"><div><strong>Avisos en este celular o computador</strong><p data-push-status>Revisando...</p></div>
              <div class="row" style="gap:6px;flex-wrap:nowrap"><button type="button" class="btn btn-sm" data-push-test hidden>${icon("send")}Probar</button>
              <label class="switch"><input type="checkbox" data-push aria-label="Avisos en este dispositivo"><span></span></label></div></div>
            <div class="setting-row"><div><strong>Guardar mediciones automáticamente</strong><p>Si está activo, cada medición con el medidor se guarda sin pedir confirmación.</p></div>
              <label class="switch"><input type="checkbox" data-autosave ${draft.autoSave ? "checked" : ""} aria-label="Guardar automáticamente"><span></span></label></div>
          </section>

          <div class="row"><button class="btn btn-primary btn-pill" data-save>${icon("refresh")}Guardar cambios</button></div>

          <section class="card reveal" id="s-account">
            <div class="card-head"><div class="card-title">${icon("user")}Cuenta y plan</div>
              <span class="badge ${me.plan === "PREMIUM" ? "badge-info" : "badge-ok"}">${me.plan === "PREMIUM" ? "Premium" : "Gratuito"}</span></div>
            <div class="account-row"><span data-settings-avatar>${avatarMarkup(me, null, "avatar-lg")}</span>
              <button type="button" class="btn btn-sm" data-change-photo>${icon("camera")}Foto de perfil</button></div>
            <dl class="kv"><dt>Nombre</dt><dd data-name-view><span data-name-text translate="no">${esc(me.fullName)}</span>${me.demo ? "" : ` <button type="button" class="btn btn-ghost btn-sm" data-edit-name aria-label="Cambiar el nombre">${icon("edit")}</button>`}</dd><dt>Correo</dt><dd>${own(me.email)}</dd><dt>Rol</dt><dd>${me.role === "ADMIN" ? "Administrador" : "Usuario"}</dd>
              <dt>Miembro desde</dt><dd>${fmt.dateTime(me.createdAt)}</dd>
              ${current ? `<dt>Sesión actual</dt><dd>Desde ${fmt.dateTime(current.startedAt)} · vence ${fmt.dateTime(current.expiresAt)}${current.rememberMe ? " (recordada)" : ""}</dd>` : ""}
              <dt>Análisis histórico</dt><dd>Hasta ${ai.maxAnalysisDays} días</dd>
              <dt>Consultas IA hoy</dt><dd>${ai.configured ? quotaText(ai.usedToday, ai.dailyQuota) : "IA no configurada en el servidor"}</dd></dl>
            ${me.premiumUntil ? `<p class="muted" style="margin-top:10px">Premium activo hasta el ${new Intl.DateTimeFormat(LOCALE_CO, { dateStyle: "long" }).format(new Date(me.premiumUntil))}.</p>` : ""}
            <div class="banner banner-info" style="margin-top:14px">${icon("star")}<p>Premium amplía el análisis histórico a 365 días, la predicción a 7 días y la cuota diaria de IA a 200 consultas.</p>
              <a class="btn btn-primary btn-pill" href="#/billing" style="margin-left:auto;white-space:nowrap">${icon("card")}${me.plan === "PREMIUM" ? "Ver plan y pagos" : "Mejorar a Premium"}</a></div>
          </section>

          ${me.role === "ADMIN" ? `<section class="card reveal" id="s-mail">
            <div class="card-head"><div class="card-title">${icon("mail")}Correo del sistema</div><span class="badge" data-mail-badge>…</span></div>
            <div data-mail>${loading("Consultando...")}</div>
          </section>` : ""}

          <section class="card reveal" id="s-activity">
            <div class="card-head"><div class="card-title">${icon("history")}Actividad reciente</div><a class="btn btn-ghost btn-sm" href="#/sessions">${icon("clock")}Ver por sesión</a></div>
            <div class="activity" tabindex="0" role="region" aria-label="Actividad reciente de la cuenta">${activity.length ? `<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Acción</th><th>Detalle</th></tr></thead><tbody>
              ${activity.map((a) => `<tr><td class="num">${fmt.dateTime(a.createdAt)}</td><td>${esc(a.label || a.action)}</td><td translate="no">${esc(a.detail)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted">Sin actividad.</p>`}</div>
          </section>

          ${me.demo ? "" : `<section class="card reveal" id="s-security">
            <div class="card-head"><div class="card-title">${icon("lock")}Seguridad</div></div>
            <form class="stack" data-password-form novalidate>
              <p class="muted">Al cambiar la contraseña se cierran tus sesiones en otros equipos; esta sigue abierta.</p>
              <div class="grid grid-3">
                <div class="field"><label for="pw-current">Contraseña actual</label><input class="input" id="pw-current" name="currentPassword" type="password" autocomplete="current-password" required><div class="field-error" data-error-for="currentPassword"></div></div>
                <div class="field"><label for="pw-new">Nueva contraseña</label><input class="input" id="pw-new" name="newPassword" type="password" autocomplete="new-password" minlength="8" required placeholder="Mínimo 8, letras y números"><div class="field-error" data-error-for="newPassword"></div></div>
                <div class="field"><label for="pw-confirm">Repite la nueva</label><input class="input" id="pw-confirm" name="confirm" type="password" autocomplete="new-password" required><div class="field-error" data-error-for="confirm"></div></div>
              </div>
              <div class="row"><button class="btn btn-primary" type="submit">${icon("lock")}Cambiar contraseña</button></div>
            </form>
          </section>`}

          <section class="card reveal danger-card" id="s-delete">
            <div class="card-head"><div class="card-title">${icon("trash")}Eliminar mi cuenta</div></div>
            ${me.demo ? `<p class="muted">Esta es una cuenta de demostración compartida: no se puede eliminar. Crea tu propia cuenta para tener tus datos privados.</p>` : `
            <p class="muted">Se borran para siempre tu cuenta, tus mediciones, perfiles, informes, diagnósticos y conversaciones. No se puede deshacer.</p>
            <div class="row" style="margin-top:12px">
              <div class="input-wrap" style="flex:1 1 240px">${icon("lock")}<input class="input" type="password" data-delete-password placeholder="Tu contraseña" autocomplete="current-password" aria-label="Contraseña para confirmar"></div>
              <button class="btn btn-danger" data-delete-account>${icon("trash")}Eliminar mi cuenta</button>
            </div>`}
          </section>

          <section class="card reveal" id="s-about">
            <div class="row" style="gap:18px">${logo("brand-logo")}<div><h2>Aqua Assistant AI</h2><p class="muted">v1.0.0 · Tecnología al servicio del agua</p></div></div>
            <p style="margin-top:12px">Monitoreo de pH con medidor físico (USB o Bluetooth), lectura por cámara o foto, registro manual y análisis con la IA de Aqua: estadística, reglas de dominio e IA generativa.</p>
            <p class="disclaimer" style="margin-top:12px">${icon("info")}El pH por sí solo no demuestra que el agua sea potable ni que esté libre de contaminantes.</p>
          </section>
        </div>
      </div>`;

    if (me.role === "ADMIN") loadMail(root);

    root.querySelectorAll("[data-goto]").forEach((b) => b.addEventListener("click", () => {
      root.querySelectorAll("[data-goto]").forEach((x) => x.classList.toggle("active", x === b));
      document.getElementById(`s-${b.dataset.goto}`).scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    root.querySelectorAll("[data-theme-option]").forEach((b) => b.addEventListener("click", async () => {
      draft.theme = b.dataset.themeOption;
      root.querySelectorAll("[data-theme-option]").forEach((x) => { x.classList.toggle("active", x === b); x.setAttribute("aria-checked", String(x === b)); });
      theme.apply(draft.theme);
      try {
        const saved = await api.put("/users/me/settings", { ...settings, theme: draft.theme });
        Object.assign(settings, saved);
        bus.emit("settings:changed", saved);
        toast("Tema actualizado.", "ok", 2000);
      } catch (error) {
        toast(error.message, "error");
      }
    }));
    bindHelp(root);
    // Language: it changes at once (the page reloads in the new language) and is kept in the account.
    const langSelect = root.querySelector("[data-language]");
    i18n.languages().then((list) => {
      langSelect.innerHTML = list.map((l) => `<option value="${esc(l.code)}" ${l.code === i18n.lang ? "selected" : ""}>${esc(l.name)}${l.code === "es" ? "" : ` · ${esc(l.englishName || "")}`}</option>`).join("");
    });
    langSelect.addEventListener("change", async () => {
      const lang = langSelect.value;
      langSelect.disabled = true;
      if (!session.user?.demo) {
        try {
          await api.put("/users/me/settings", { ...draft, language: lang });
        } catch (error) {
          toast(error.message, "error");
        }
      }
      i18n.change(lang);
    });
    // Aqua's voice: on/off is kept in the account; the chosen voice and speed only in this device (voices differ).
    const voiceBox = root.querySelector("[data-voice]");
    const voiceName = root.querySelector("[data-voice-name]");
    const voiceRate = root.querySelector("[data-voice-rate]");
    const rateText = root.querySelector("[data-voice-rate-text]");
    const showRate = () => { rateText.textContent = `${Number(voice.rate).toFixed(2).replace(/0$/, "")}×`; };
    voiceRate.value = String(voice.rate);
    showRate();
    if (!voice.supported()) {
      root.querySelectorAll("[data-voice-row]").forEach((r) => { r.hidden = true; });
      voiceBox.disabled = true;
      voiceBox.closest(".setting-row").querySelector("p").textContent = "Este navegador no puede hablar. Prueba con Chrome, Edge o Safari.";
    } else {
      voice.voices().then(async (list) => {
        const current = await voice.chosen();
        if (!list.length) {
          voiceName.hidden = true;
          root.querySelector("[data-voice-note]").textContent = "Este dispositivo no tiene una voz para el idioma de la app. Puedes instalarla en la configuración de voz o de idiomas del sistema.";
          return;
        }
        voiceName.innerHTML = list.map((v, i) => `<option value="${esc(v.name)}" ${current && v.name === current.name ? "selected" : ""}>${esc(v.name)}${i === 0 ? " ★" : ""}</option>`).join("");
      });
    }
    voiceBox.addEventListener("change", async () => {
      voice.setEnabled(voiceBox.checked);
      draft.voiceEnabled = voiceBox.checked;
      try {
        const saved = await api.put("/users/me/settings", { ...draft, language: i18n.lang });
        Object.assign(draft, saved);
        toast(voiceBox.checked ? "Aqua hablará." : "Aqua ya no hablará; solo escribirá.", "ok", 2500);
      } catch (error) { toast(error.message, "error"); }
    });
    voiceName.addEventListener("change", () => { voice.choose(voiceName.value); i18n.tAsync("Hola, así suena mi voz.").then((t) => voice.speak(t, { force: true })); });
    voiceRate.addEventListener("input", () => { voice.rate = Number(voiceRate.value); showRate(); });
    root.querySelector("[data-voice-test]").addEventListener("click", async () => {
      const [hello, ask] = await Promise.all([i18n.tAsync("Hola"), i18n.tAsync("¿En qué te puedo ayudar?")]);
      const first = (session.user?.fullName || "").split(" ")[0];
      voice.speak(`${hello}${first ? `, ${first}` : ""}. ${ask}`, { force: true });
    });
    root.querySelector("[data-notifications]").addEventListener("change", (e) => { draft.notificationsEnabled = e.target.checked; });
    root.querySelector("[data-email-alerts]").addEventListener("change", (e) => { draft.emailAlerts = e.target.checked; });
    // Notifications on this device (Web Push): turned on and off right away, without "Guardar cambios".
    const pushBox = root.querySelector("[data-push]");
    const pushStatus = root.querySelector("[data-push-status]");
    const pushTest = root.querySelector("[data-push-test]");
    const showPush = async () => {
      const reason = pushClient.unsupportedReason();
      if (reason) { pushBox.disabled = true; pushStatus.textContent = reason; return; }
      const sub = await pushClient.current().catch(() => null);
      pushBox.checked = Boolean(sub) && Notification.permission === "granted";
      pushTest.hidden = !pushBox.checked;
      pushStatus.textContent = pushBox.checked
        ? "Activos: aquí te llegan las alertas y los recordatorios aunque la app esté cerrada."
        : Notification.permission === "denied" ? "Bloqueados en el navegador. Actívalos desde el candado junto a la dirección de la página."
          : "Apagados en este dispositivo.";
    };
    showPush();
    pushBox.addEventListener("change", async () => {
      pushBox.disabled = true;
      try {
        if (pushBox.checked) { await pushClient.enable(); toast("Avisos activados en este dispositivo.", "ok"); }
        else { await pushClient.disable(); toast("Avisos desactivados en este dispositivo.", "ok"); }
      } catch (error) {
        toast(error.message, "error", 7000);
      } finally {
        pushBox.disabled = false;
        showPush();
      }
    });
    pushTest.addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
      try {
        const r = await api.post("/push/test");
        toast(r.delivered ? "Aviso enviado: debería aparecer en unos segundos." : "No se pudo entregar el aviso. Desactívalos y vuelve a activarlos.", r.delivered ? "ok" : "warn");
      } catch (error) { toast(error.message, "error"); }
    }));
    root.querySelector("[data-autosave]").addEventListener("change", (e) => { draft.autoSave = e.target.checked; });
    const settingsAvatar = async () => {
      const current = session.user || me;
      const slot = root.querySelector("[data-settings-avatar]");
      if (slot) slot.innerHTML = avatarMarkup(current, await avatarUrl(current), "avatar-lg");
    };
    settingsAvatar();
    root.querySelector("[data-change-photo]").addEventListener("click", async () => {
      await openAccountDialog();
      settingsAvatar();
    });
    const startEditName = () => {
      const view = root.querySelector("[data-name-view]");
      const current = session.user?.fullName || me.fullName;
      view.innerHTML = `<form class="row name-form" data-name-form novalidate>
          <input class="input" name="fullName" maxlength="120" value="${esc(current)}" aria-label="Nombre" required>
          <button class="btn btn-primary btn-sm" type="submit">Guardar</button><button class="btn btn-ghost btn-sm" type="button" data-cancel-name>Cancelar</button></form>`;
      const form = view.querySelector("form");
      const restore = (name) => {
        view.innerHTML = `<span data-name-text>${esc(name)}</span> <button type="button" class="btn btn-ghost btn-sm" data-edit-name aria-label="Cambiar el nombre">${icon("edit")}</button>`;
        view.querySelector("[data-edit-name]").addEventListener("click", startEditName);
      };
      form.querySelector("input").focus();
      form.querySelector("[data-cancel-name]").addEventListener("click", () => restore(current));
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const fullName = form.fullName.value.trim();
        if (!fullName) {
          toast("Escribe tu nombre.", "warn");
          return;
        }
        try {
          const updated = await api.put("/users/me", { fullName });
          session.updateUser(updated);
          toast("Nombre actualizado.", "ok");
          restore(updated.fullName);
        } catch (error) {
          toast(error.message, "error");
        }
      });
    };
    root.querySelector("[data-edit-name]")?.addEventListener("click", startEditName);
    passwordChecklist(root.querySelector("#pw-new"));
    root.querySelector("[data-password-form]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form));
      showFieldErrors(form);
      if (data.newPassword !== data.confirm) {
        showFieldErrors(form, { confirm: "Las contraseñas no coinciden." });
        return;
      }
      const button = form.querySelector("button[type=submit]");
      try {
        await withBusy(button, async () => {
          const auth = await api.post("/users/me/password", { currentPassword: data.currentPassword, newPassword: data.newPassword });
          session.renew(auth);
        });
        form.reset();
        form.querySelector("#pw-new").dispatchEvent(new Event("input"));
        toast("Contraseña cambiada. Se cerraron tus sesiones en otros equipos.", "ok", 6000);
      } catch (error) {
        if (error.fields && Object.keys(error.fields).length) showFieldErrors(form, error.fields);
        else if (/actual/.test(error.message)) showFieldErrors(form, { currentPassword: error.message });
        toast(error.message, "error");
      }
    });
    root.querySelector("[data-delete-account]")?.addEventListener("click", async (e) => {
      const button = e.currentTarget;
      const password = root.querySelector("[data-delete-password]").value;
      if (!password) { toast("Escribe tu contraseña para confirmar.", "warn"); return; }
      const ok = await confirmDialog("Eliminar mi cuenta", "Se borrarán para siempre tu cuenta y todos tus datos. ¿Continuar?", "Eliminar definitivamente", true);
      if (!ok) return;
      await withBusy(button, async () => {
        try {
          await api.delete("/users/me", { password });
          session.clear();
          toast("Tu cuenta fue eliminada.", "ok");
          ctx.router.go("login");
        } catch (error) {
          toast(error.message, "error");
        }
      });
    });

    root.querySelector("[data-save]").addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
      try {
        const saved = await api.put("/users/me/settings", { ...draft, language: i18n.lang });
        Object.assign(draft, saved);
        bus.emit("settings:changed", saved);
        toast("Cambios guardados.", "ok");
      } catch (error) {
        toast(error.message, "error");
      }
    }));
    return null;
  },
};
