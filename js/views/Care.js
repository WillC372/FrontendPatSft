import { api } from "../core/Api.js";
import { bus } from "../core/EventBus.js";
import { esc, fmt, own, relativeTime } from "../core/Format.js";
import { icon } from "../ui/Icons.js";
import { bindHelp, helpBox } from "../ui/Help.js";
import { pushClient } from "../core/PushClient.js";
import { confirmDialog, emptyState, loading, modal, showFieldErrors, toast, withBusy } from "../ui/Components.js";
import { GOALS, PRODUCTS, amountText, dose } from "../core/DoseCalc.js";
import { placeForm, volumeText } from "./Places.js";
import { LOCALE } from "../core/Locale.js";

// Products of the treatment log (same codes as the server) and their units.
export const TREATMENTS = [
  ["SODA_ASH", "Carbonato de sodio (sube el pH)", "g"], ["SODIUM_BICARBONATE", "Bicarbonato de sodio (sube la alcalinidad)", "g"],
  ["MURIATIC_ACID", "Ácido muriático (baja el pH)", "mL"], ["SODIUM_BISULFATE", "Bisulfato de sodio (baja el pH)", "g"],
  ["LIQUID_CHLORINE", "Cloro líquido", "mL"], ["CAL_HYPO", "Hipoclorito de calcio (granulado)", "g"], ["DICHLOR", "Dicloro", "g"],
  ["TRICHLOR", "Tricloro (pastillas)", "pastillas"], ["CALCIUM_CHLORIDE", "Cloruro de calcio (sube la dureza)", "g"],
  ["CYANURIC_ACID", "Ácido cianúrico (estabilizador)", "g"], ["WATER_CONDITIONER", "Acondicionador de agua (acuario)", "mL"],
  ["PH_BUFFER", "Regulador de pH (acuario o riego)", "mL"], ["WATER_CHANGE", "Cambio de agua", "%"],
  ["FILTER_CLEANING", "Limpieza del filtro", ""], ["OTHER", "Otro", ""],
];
const UNITS = ["g", "kg", "mL", "L", "pastillas", "%"];

export const REMINDER_KINDS = [
  ["MEASURE", "Mide el pH hoy"], ["CLEAN_FILTER", "Limpia el filtro"], ["CHECK_CHLORINE", "Revisa el cloro"],
  ["WATER_CHANGE", "Cambia parte del agua"], ["CALIBRATE", "Calibra el medidor"], ["CUSTOM", "Otro (escríbelo)"],
];

const isAquarium = (kind) => kind === "AQUARIUM" || kind === "POND";

/** Form of the treatment log, optionally filled from the calculator. */
export function treatmentForm(prefill = {}) {
  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  return modal({
    title: "Registrar tratamiento",
    body: `<form class="stack" data-tr-form novalidate>
      <div class="field"><label for="tr-product">¿Qué aplicaste o hiciste?</label><select class="input" id="tr-product" name="product">
        ${TREATMENTS.map(([k, label]) => `<option value="${k}" ${prefill.product === k ? "selected" : ""}>${label}</option>`).join("")}</select></div>
      <div class="grid grid-2">
        <div class="field"><label for="tr-amount">Cantidad (opcional)</label><input class="input" id="tr-amount" name="amount" type="number" min="0" step="any" inputmode="decimal" value="${prefill.amount ?? ""}"><div class="field-error" data-error-for="amount"></div></div>
        <div class="field"><label for="tr-unit">Unidad</label><select class="input" id="tr-unit" name="unit"><option value="">—</option>
          ${UNITS.map((u) => `<option value="${u}" ${prefill.unit === u ? "selected" : ""}>${u}</option>`).join("")}</select></div>
      </div>
      <div class="field"><label for="tr-at">Fecha y hora</label><input class="input" id="tr-at" name="appliedAt" type="datetime-local" value="${now}" max="${now}"></div>
      <div class="field"><label for="tr-note">Nota (opcional)</label><input class="input" id="tr-note" name="note" maxlength="300" value="${esc(prefill.note || "")}"></div>
    </form>`,
    onMount: (node) => {
      const product = node.querySelector("#tr-product");
      const unit = node.querySelector("#tr-unit");
      product.addEventListener("change", () => { unit.value = TREATMENTS.find(([k]) => k === product.value)?.[2] || ""; });
      if (!prefill.unit) unit.value = TREATMENTS.find(([k]) => k === product.value)?.[2] || "";
    },
    actions: [
      { label: "Cancelar", className: "btn-ghost", value: null },
      { label: "Guardar", className: "btn-primary", icon: "check", handler: async (node) => {
        const form = node.querySelector("[data-tr-form]");
        const d = Object.fromEntries(new FormData(form));
        const amount = d.amount === "" ? null : Number.parseFloat(d.amount);
        if (amount !== null && (Number.isNaN(amount) || amount <= 0)) { showFieldErrors(form, { amount: "Escribe una cantidad mayor que cero." }); return false; }
        if ((amount === null) !== (d.unit === "")) { showFieldErrors(form, { amount: "Escribe la cantidad con su unidad, o deja ambas vacías." }); return false; }
        try {
          const saved = await api.post("/treatments", { product: d.product, amount, unit: d.unit || null,
            appliedAt: d.appliedAt ? new Date(d.appliedAt).toISOString() : null, note: d.note || null });
          toast("Tratamiento registrado.", "ok");
          bus.emit("treatment:saved", saved);
          return saved;
        } catch (error) {
          showFieldErrors(form, error.fields || {});
          toast(error.message, "error");
          return false;
        }
      } },
    ],
  });
}

export function reminderForm(existing = null) {
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const due = existing ? new Date(new Date(existing.nextDue).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : today;
  return modal({
    title: existing ? "Editar recordatorio" : "Nuevo recordatorio",
    body: `<form class="stack" data-rm-form novalidate>
      <div class="field"><label for="rm-kind">¿Qué te recuerdo?</label><select class="input" id="rm-kind" name="kind">
        ${REMINDER_KINDS.map(([k, label]) => `<option value="${k}" ${existing?.kind === k ? "selected" : ""}>${label}</option>`).join("")}</select></div>
      <div class="field" data-custom-title ${existing?.kind === "CUSTOM" ? "" : "hidden"}><label for="rm-title">Texto</label><input class="input" id="rm-title" name="title" maxlength="80" value="${esc(existing?.kind === "CUSTOM" ? existing.title : "")}" placeholder="Revisar la bomba"></div>
      <div class="grid grid-2">
        <div class="field"><label for="rm-every">Cada cuántos días</label><input class="input" id="rm-every" name="everyDays" type="number" min="1" max="365" value="${existing?.everyDays ?? 7}"><div class="field-error" data-error-for="everyDays"></div></div>
        <div class="field"><label for="rm-due">Próxima vez</label><input class="input" id="rm-due" name="nextDue" type="datetime-local" value="${due}"></div>
      </div>
      <fieldset class="checks"><legend>Avisarme también fuera de la app</legend>
        <label><input type="checkbox" name="byPush" ${existing ? (existing.byPush ? "checked" : "") : "checked"}> En este celular o computador (activa los avisos en Configuración)</label>
        <label><input type="checkbox" name="byEmail" ${existing?.byEmail ? "checked" : ""}> Por correo</label>
      </fieldset>
      <p class="push-hint" data-push-hint hidden></p>
    </form>`,
    onMount: (node) => {
      const kind = node.querySelector("#rm-kind");
      kind.addEventListener("change", () => { node.querySelector("[data-custom-title]").hidden = kind.value !== "CUSTOM"; });
      // A reminder "en este celular" only arrives if notifications were turned on in this browser: say so before saving.
      const hint = node.querySelector("[data-push-hint]");
      const push = node.querySelector("[name=byPush]");
      const check = async () => {
        const on = await pushClient.current().catch(() => null);
        hint.hidden = !push.checked || Boolean(on);
        hint.innerHTML = `${icon("alert")}<span>Los avisos de este dispositivo están apagados, así que el recordatorio solo se verá en Inicio. Para que te llegue al celular, actívalos en <a href="#/settings">Configuración → Avisos</a>.</span>`;
      };
      push.addEventListener("change", check);
      check();
    },
    actions: [
      { label: "Cancelar", className: "btn-ghost", value: null },
      { label: "Guardar", className: "btn-primary", icon: "check", handler: async (node) => {
        const form = node.querySelector("[data-rm-form]");
        const d = Object.fromEntries(new FormData(form));
        const every = Number.parseInt(d.everyDays, 10);
        if (!(every >= 1 && every <= 365)) { showFieldErrors(form, { everyDays: "Entre 1 y 365 días." }); return false; }
        const body = { kind: d.kind, title: d.kind === "CUSTOM" ? d.title : null, everyDays: every,
          nextDue: d.nextDue ? new Date(d.nextDue).toISOString() : null, byPush: Boolean(d.byPush), byEmail: Boolean(d.byEmail),
          placeId: existing?.placeId ?? null, active: true };
        try {
          const saved = existing ? await api.put(`/reminders/${existing.id}`, body) : await api.post("/reminders", body);
          toast("Recordatorio guardado.", "ok");
          bus.emit("reminder:saved", saved);
          return saved;
        } catch (error) {
          showFieldErrors(form, error.fields || {});
          toast(error.message, "error");
          return false;
        }
      } },
    ],
  });
}

function calculatorCard(place, latest) {
  const goals = Object.entries(GOALS);
  return `<section class="card reveal calc-card" aria-labelledby="calc-title">
    <div class="card-head"><div class="card-title" id="calc-title">${icon("calc")}Calculadora de dosis</div>
      <span class="muted small">${own(place.name)} · ${volumeText(place.volumeLiters)}</span></div>
    ${isAquarium(place.kind) ? `<div class="banner banner-warn">${icon("alert")}<p>En acuarios y estanques usa productos hechos para peces y cambia el pH como mucho 0,2 por día. Los productos de piscina pueden matarlos.</p></div>` : ""}
    <form class="stack" data-calc novalidate>
      <div class="grid grid-2">
        <div class="field"><label for="calc-goal">¿Qué quieres ajustar?</label><select class="input" id="calc-goal" name="goal">
          ${goals.map(([k, g]) => `<option value="${k}">${g.label}</option>`).join("")}</select></div>
        <div class="field"><label for="calc-product">Producto</label><select class="input" id="calc-product" name="product"></select></div>
        <div class="field"><label for="calc-volume">Volumen del agua (litros)</label><input class="input" id="calc-volume" name="volume" type="number" min="1" step="any" value="${place.volumeLiters ?? ""}" placeholder="Ej.: 40000">
          ${place.volumeLiters || !place.canEdit ? "" : `<button type="button" class="link-btn small" data-save-volume>Guardarlo en el lugar</button>`}</div>
        <div class="field" data-alk-field><label for="calc-alk">Alcalinidad total (mg/L)</label><input class="input" id="calc-alk" name="alk" type="number" min="0" step="any" value="${latest.totalAlkalinity ?? ""}" placeholder="Ej.: 80"></div>
        <div class="field"><label for="calc-current" data-current-label>Valor actual</label><input class="input" id="calc-current" name="current" type="number" step="any"></div>
        <div class="field"><label for="calc-target">Valor deseado</label><input class="input" id="calc-target" name="target" type="number" step="any"></div>
      </div>
      <button class="btn btn-primary btn-pill" type="submit">${icon("calc")}Calcular</button>
    </form>
    <div data-calc-result aria-live="polite"></div>
  </section>`;
}

export const careView = {
  name: "care",
  title: "Cuidado del agua",
  async render(root, ctx) {
    root.innerHTML = loading("Cargando...");
    let place;
    let dashboard;
    try {
      [place, dashboard] = await Promise.all([api.get("/places").then((list) => list.find((p) => p.active)), api.get("/dashboard")]);
      if (ctx.stale()) return null;
    } catch (error) {
      root.innerHTML = emptyState("error", "No se pudo cargar", error.message);
      return null;
    }
    const latest = Object.fromEntries((dashboard.parameters || []).map((p) => [p.key, p.value]));
    latest.ph = dashboard.latest?.ph ?? null;
    latest.cyanuricAcid = latest.cyanuricAcid ?? null;
    root.innerHTML = `
      <div class="reveal"><h1>Cuidado del agua</h1><p class="muted">Calcula cuánto producto usar, anota lo que le haces al agua de <strong>${own(place.name)}</strong> y programa recordatorios.</p></div>
      ${helpBox("care", "¿Para qué sirve esta pantalla?", [
        ["calc", "Calculadora de dosis: cuánto producto echar", "Ejemplo: tu piscina de 40 000 litros está en pH 7,9 y la quieres en 7,5. Eliges «Bajar el pH» y el producto que tienes, y te dice «270 mL de ácido muriático». Así no echas de más ni de menos."],
        ["flask", "Tratamientos: tu cuaderno de lo que le haces al agua", "Anota cada vez que echas cloro, ácido o cambias agua. Así recuerdas qué hiciste y cuándo, y Aqua lo tiene en cuenta al revisar tus mediciones."],
        ["bell", "Recordatorios: tareas que se repiten", "Por ejemplo «medir el pH cada 3 días» o «limpiar el filtro cada semana». Cuando toca, aparece en Inicio en «Para hoy» y, si quieres, te llega un aviso al celular o un correo."],
      ])}
      ${calculatorCard(place, latest)}
      <div class="grid grid-2">
        <section class="card reveal" aria-labelledby="tr-title">
          <div class="card-head"><div class="card-title" id="tr-title">${icon("flask")}Tratamientos</div>
            ${place.canEdit ? `<button class="btn btn-sm btn-pill" data-new-treatment>${icon("plus")}Registrar</button>` : ""}</div>
          <div data-treatments>${loading()}</div>
        </section>
        <section class="card reveal" aria-labelledby="rm-title">
          <div class="card-head"><div class="card-title" id="rm-title">${icon("bell")}Recordatorios</div>
            <button class="btn btn-sm btn-pill" data-new-reminder>${icon("plus")}Nuevo</button></div>
          <div data-reminders>${loading()}</div>
        </section>
      </div>`;

    bindHelp(root);
    // ---------- calculator ----------
    const form = root.querySelector("[data-calc]");
    const goal = form.querySelector("#calc-goal");
    const product = form.querySelector("#calc-product");
    const result = root.querySelector("[data-calc-result]");
    const PARAM_LABEL = { ph: "pH", freeChlorine: "cloro libre (mg/L)", totalAlkalinity: "alcalinidad (mg/L)", calciumHardness: "dureza cálcica (mg/L)", cyanuricAcid: "ácido cianúrico (mg/L)" };
    const syncGoal = () => {
      const g = GOALS[goal.value];
      product.innerHTML = g.products.map((k) => `<option value="${k}">${PRODUCTS[k].label}</option>`).join("");
      form.querySelector("[data-alk-field]").hidden = !g.needsAlkalinity;
      form.querySelector("[data-current-label]").textContent = `Valor actual de ${PARAM_LABEL[g.param]}`;
      const current = latest[g.param];
      form.querySelector("#calc-current").value = current ?? "";
      result.innerHTML = "";
    };
    goal.addEventListener("change", syncGoal);
    syncGoal();
    root.querySelector("[data-save-volume]")?.addEventListener("click", () => placeForm(place));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      const r = dose({ goal: d.goal, productKey: d.product, volumeL: Number.parseFloat(d.volume), current: Number.parseFloat(d.current),
        target: Number.parseFloat(d.target), totalAlkalinity: Number.parseFloat(d.alk), cyanuricAcid: latest.cyanuricAcid || 0 });
      if (r.error) { result.innerHTML = `<div class="banner banner-warn">${icon("info")}<p>${esc(r.error)}</p></div>`; return; }
      const p = PRODUCTS[d.product];
      const half = amountText(r.amount / 2, r.unit);
      result.innerHTML = `<div class="dose-result">
        <div class="dose-amount"><span class="muted small">${esc(p.label)}</span><strong class="num">${amountText(r.amount, r.unit)}</strong>
          <span class="small">Primero agrega la mitad: <strong>${half}</strong></span></div>
        <ul class="list small">
          ${r.notes.map((n) => `<li>${icon("info")}<span>${esc(n)}</span></li>`).join("")}
          <li>${icon("activity")}<span>Disuélvelo en un balde con agua de la piscina y repártelo con la bomba encendida. Espera 4 a 6 horas y vuelve a medir antes de agregar el resto.</span></li>
          <li>${icon("alert")}<span>Nunca mezcles ácido con cloro ni productos entre sí. Echa siempre el producto al agua, nunca agua sobre el producto.</span></li>
        </ul>
        <p class="disclaimer">${icon("info")}Es una estimación con fórmulas químicas; el resultado real depende de la temperatura, la aireación y la pureza del producto. Sigue la etiqueta del fabricante.</p>
        ${place.canEdit ? `<button type="button" class="btn btn-sm btn-pill" data-log-dose>${icon("check")}Registrar en tratamientos</button>` : ""}
      </div>`;
      const unit = r.unit === "mL" && r.amount >= 1000 ? "L" : r.unit === "g" && r.amount >= 1000 ? "kg" : r.unit;
      const amount = unit === "L" || unit === "kg" ? Math.round(r.amount / 10) / 100 : Math.round(r.amount);
      result.querySelector("[data-log-dose]")?.addEventListener("click", async () => {
        const saved = await treatmentForm({ product: p.treatment, amount, unit,
          note: `${GOALS[d.goal].label}: de ${d.current} a ${d.target} (calculadora)` });
        if (saved && !ctx.stale()) drawTreatments();
      });
    });

    // ---------- treatments ----------
    const drawTreatments = async () => {
      const host = root.querySelector("[data-treatments]");
      try {
        const list = await api.get("/treatments", { days: 90 });
        if (ctx.stale()) return;
        host.innerHTML = list.length ? `<ul class="list treatments">${list.map((t) => `<li>
            <span><strong>${esc(t.productLabel)}</strong>${t.amount ? ` · <span class="num">${Number(t.amount).toLocaleString(LOCALE)} ${esc(t.unit)}</span>` : ""}
            <br><small class="muted">${relativeTime(t.appliedAt)}${t.byName ? ` · por <span translate="no">${esc(t.byName)}</span>` : ""}${t.note ? ` · <span translate="no">${esc(t.note)}</span>` : ""}</small></span>
            ${place.canEdit ? `<button type="button" class="icon-btn btn btn-ghost" data-del-tr="${t.id}" aria-label="Borrar tratamiento ${esc(t.productLabel)}">${icon("trash")}</button>` : ""}</li>`).join("")}</ul>`
          : `<p class="muted small">Aún no hay tratamientos en los últimos 90 días. Anota aquí cada producto que agregues: así Aqua y tú verán su efecto en las mediciones.</p>`;
        host.querySelectorAll("[data-del-tr]").forEach((b) => b.addEventListener("click", async () => {
          if (!(await confirmDialog("Borrar tratamiento", "Se quitará del registro.", "Borrar", true))) return;
          try { await api.delete(`/treatments/${b.dataset.delTr}`); drawTreatments(); } catch (error) { toast(error.message, "error"); }
        }));
      } catch (error) {
        host.innerHTML = `<p class="muted">${esc(error.message)}</p>`;
      }
    };

    // ---------- reminders ----------
    const drawReminders = async () => {
      const host = root.querySelector("[data-reminders]");
      try {
        const list = await api.get("/reminders");
        if (ctx.stale()) return;
        host.innerHTML = list.length ? `<ul class="list reminders">${list.map((r) => `<li class="${r.due ? "due" : ""}">
            <span><strong>${esc(r.title)}</strong> ${r.due ? `<span class="badge badge-warn">Toca hoy</span>` : ""}
            <br><small class="muted">Cada ${r.everyDays} ${r.everyDays === 1 ? "día" : "días"} · ${r.due ? "pendiente" : `próxima ${fmt.dateTime(r.nextDue)}`}${r.placeName ? ` · ${esc(r.placeName)}` : ""}${r.byPush || r.byEmail ? ` · aviso por ${[r.byPush ? "notificación" : "", r.byEmail ? "correo" : ""].filter(Boolean).join(" y ")}` : ""}</small></span>
            <span class="row" style="gap:4px;flex-wrap:nowrap">
              ${r.due ? `<button type="button" class="btn btn-sm btn-primary" data-done="${r.id}">${icon("check")}Hecho</button>` : ""}
              <button type="button" class="icon-btn btn btn-ghost" data-edit-rm="${r.id}" aria-label="Editar ${esc(r.title)}">${icon("edit")}</button>
              <button type="button" class="icon-btn btn btn-ghost" data-del-rm="${r.id}" aria-label="Borrar ${esc(r.title)}">${icon("trash")}</button></span></li>`).join("")}</ul>`
          : `<p class="muted small">Sin recordatorios. Crea uno para medir cada semana, limpiar el filtro o calibrar el medidor; te avisaré aunque no tengas la app abierta.</p>`;
        host.querySelectorAll("[data-done]").forEach((b) => b.addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
          try { await api.post(`/reminders/${b.dataset.done}/done`); toast("¡Hecho! El próximo se cuenta desde ahora.", "ok"); bus.emit("reminder:saved"); drawReminders(); }
          catch (error) { toast(error.message, "error"); }
        })));
        host.querySelectorAll("[data-edit-rm]").forEach((b) => b.addEventListener("click", async () => {
          if (await reminderForm(list.find((r) => r.id === Number(b.dataset.editRm)))) drawReminders();
        }));
        host.querySelectorAll("[data-del-rm]").forEach((b) => b.addEventListener("click", async () => {
          if (!(await confirmDialog("Borrar recordatorio", "No te volveré a avisar de esto.", "Borrar", true))) return;
          try { await api.delete(`/reminders/${b.dataset.delRm}`); drawReminders(); } catch (error) { toast(error.message, "error"); }
        }));
      } catch (error) {
        host.innerHTML = `<p class="muted">${esc(error.message)}</p>`;
      }
    };
    root.querySelector("[data-new-treatment]")?.addEventListener("click", async () => { if (await treatmentForm()) drawTreatments(); });
    root.querySelector("[data-new-reminder]").addEventListener("click", async () => { if (await reminderForm()) drawReminders(); });
    drawTreatments();
    drawReminders();
    return null;
  },
};
