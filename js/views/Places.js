import { api } from "../core/Api.js";
import { bus } from "../core/EventBus.js";
import { session } from "../core/Session.js";
import { esc, fmt, own, relativeTime } from "../core/Format.js";
import { icon } from "../ui/Icons.js";
import { bindHelp, helpBox } from "../ui/Help.js";
import { confirmDialog, emptyState, loading, modal, showFieldErrors, toast, withBusy } from "../ui/Components.js";
import { LOCALE } from "../core/Locale.js";

export const PLACE_KINDS = [
  ["POOL", "Piscina", "pool"], ["SPA", "Jacuzzi o spa", "pool"], ["AQUARIUM", "Acuario", "fish"], ["POND", "Estanque", "fish"],
  ["DRINKING", "Agua potable", "cup"], ["IRRIGATION", "Riego", "leaf"], ["HYDROPONICS", "Hidroponía", "leaf"],
  ["GENERAL", "Uso general", "drop"], ["OTHER", "Otro", "drop"],
];
export const kindIcon = (kind) => PLACE_KINDS.find(([k]) => k === kind)?.[2] || "drop";
const VOLUME_UNITS = [["L", "litros", 1], ["m3", "m³", 1000], ["gal", "galones (EE. UU.)", 3.78541]];

export function volumeText(liters) {
  if (!liters) return "Volumen sin indicar";
  return liters >= 10000 ? `${(liters / 1000).toLocaleString(LOCALE, { maximumFractionDigits: 1 })} m³` : `${Math.round(liters).toLocaleString(LOCALE)} L`;
}

/** Makes a place the active one; the whole app (Inicio, Historial, IA...) then shows it. */
export async function activatePlace(id) {
  const place = await api.post(`/places/${id}/activate`);
  bus.emit("place:changed", place);
  return place;
}

/** Form to create or edit a place. Resolves with the saved place or null. */
export async function placeForm(existing = null) {
  let profiles = [];
  try { profiles = await api.get("/profiles"); } catch { /* the profile can be chosen later */ }
  const unit = existing?.volumeLiters && existing.volumeLiters >= 10000 ? "m3" : "L";
  const shown = existing?.volumeLiters ? Math.round((existing.volumeLiters / (unit === "m3" ? 1000 : 1)) * 100) / 100 : "";
  return modal({
    title: existing ? "Editar lugar" : "Nuevo lugar",
    body: `<form class="stack" data-place-form novalidate>
      <div class="field"><label for="pl-name">Nombre</label><input class="input" id="pl-name" name="name" maxlength="80" required placeholder="Piscina de la casa" value="${esc(existing?.name || "")}"><div class="field-error" data-error-for="name"></div></div>
      <div class="field"><label for="pl-kind">Tipo de agua</label><select class="input" id="pl-kind" name="kind">
        ${PLACE_KINDS.map(([k, label]) => `<option value="${k}" ${existing?.kind === k ? "selected" : ""}>${label}</option>`).join("")}</select></div>
      <div class="field"><label for="pl-volume">Volumen (opcional, para calcular dosis)</label>
        <div class="row" style="gap:8px;flex-wrap:nowrap"><input class="input" id="pl-volume" name="volume" type="number" min="0" step="any" inputmode="decimal" value="${shown}" style="flex:1;min-width:0">
        <select class="input" name="unit" aria-label="Unidad del volumen" style="width:auto">${VOLUME_UNITS.map(([u, label]) => `<option value="${u}" ${u === unit ? "selected" : ""}>${label}</option>`).join("")}</select></div>
        <div class="field-error" data-error-for="volumeLiters"></div></div>
      <div class="field"><label for="pl-profile">Perfil de pH</label><select class="input" id="pl-profile" name="profileId">
        <option value="">El recomendado para ese tipo de agua</option>
        ${profiles.map((p) => `<option value="${p.id}" ${existing?.profileId === p.id && existing ? "selected" : ""}${p.systemProfile ? "" : ' translate="no"'}>${esc(p.name)} (${p.idealMin.toFixed(1)} - ${p.idealMax.toFixed(1)})</option>`).join("")}</select></div>
    </form>`,
    actions: [
      { label: "Cancelar", className: "btn-ghost", value: null },
      { label: existing ? "Guardar" : "Crear y usar", className: "btn-primary", icon: "check", handler: async (node) => {
        const form = node.querySelector("[data-place-form]");
        const data = Object.fromEntries(new FormData(form));
        if (!data.name.trim()) { showFieldErrors(form, { name: "Escribe un nombre." }); return false; }
        const factor = VOLUME_UNITS.find(([u]) => u === data.unit)[2];
        const volume = data.volume === "" ? null : Number.parseFloat(data.volume) * factor;
        if (volume !== null && (Number.isNaN(volume) || volume < 1)) { showFieldErrors(form, { volumeLiters: "Escribe un volumen mayor que cero." }); return false; }
        const body = { name: data.name.trim(), kind: data.kind, volumeLiters: volume === null ? null : Math.round(volume * 10) / 10,
          profileId: data.profileId ? Number(data.profileId) : null };
        try {
          const saved = existing ? await api.put(`/places/${existing.id}`, body) : await api.post("/places", body);
          toast(existing ? "Lugar guardado." : `Ahora estás en "${saved.name}".`, "ok");
          bus.emit("place:changed", saved);
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

async function shareDialog(place, refresh) {
  await modal({
    titleHtml: `Compartir «${own(place.name)}»`,
    body: `<div class="stack" data-share>
      <p class="muted">Quien escriba el código en <strong>Lugares → Unirme con un código</strong> verá las mediciones, tratamientos y análisis de este lugar. Tú decides si también puede medir.</p>
      <div class="segmented" role="radiogroup" aria-label="Qué puede hacer quien se una">
        <label><input type="radio" name="role" value="VIEWER" ${place.shareRole !== "EDITOR" ? "checked" : ""}> Solo ver</label>
        <label><input type="radio" name="role" value="EDITOR" ${place.shareRole === "EDITOR" ? "checked" : ""}> Ver y medir</label>
      </div>
      <div data-code-box></div>
      <h3 class="h-sm" style="margin-top:6px">Personas en este lugar</h3>
      <div data-members>${loading()}</div>
    </div>`,
    actions: [{ label: "Cerrar", className: "btn-ghost", value: null }],
    onMount: (node) => {
      const box = node.querySelector("[data-code-box]");
      const showCode = (p) => {
        place = p;
        box.innerHTML = p.shareCode
          ? `<div class="share-code"><span class="muted small">Código (${p.shareRole === "EDITOR" ? "ver y medir" : "solo ver"})</span>
              <strong class="mono" data-code>${p.shareCode.slice(0, 4)}-${p.shareCode.slice(4)}</strong>
              <div class="row"><button type="button" class="btn btn-sm btn-primary" data-copy>${icon("copy")}Copiar</button>
              <button type="button" class="btn btn-sm" data-new-code>${icon("refresh")}Código nuevo</button>
              <button type="button" class="btn btn-sm btn-ghost" data-stop>${icon("ban")}Desactivar</button></div>
              <p class="muted small">Desactivarlo impide que alguien más se una; quienes ya están siguen hasta que los quites.</p></div>`
          : `<button type="button" class="btn btn-primary" data-new-code>${icon("key")}Crear código</button>`;
        box.querySelector("[data-copy]")?.addEventListener("click", async () => {
          try { await navigator.clipboard.writeText(p.shareCode); toast("Código copiado.", "ok", 2000); }
          catch { toast(`Código: ${p.shareCode}`, "info", 8000); }
        });
        box.querySelector("[data-new-code]")?.addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
          try {
            showCode(await api.post(`/places/${p.id}/share`, { role: node.querySelector("[name=role]:checked").value }));
            refresh();
          } catch (error) { toast(error.message, "error"); }
        }));
        box.querySelector("[data-stop]")?.addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
          try { showCode(await api.delete(`/places/${p.id}/share`)); refresh(); } catch (error) { toast(error.message, "error"); }
        }));
      };
      showCode(place);
      node.querySelectorAll("[name=role]").forEach((r) => r.addEventListener("change", () => {
        if (place.shareCode) toast("Pulsa «Código nuevo» para crear un código con este permiso.", "info", 3500);
      }));
      const listMembers = async () => {
        const host = node.querySelector("[data-members]");
        try {
          const people = await api.get(`/places/${place.id}/members`);
          host.innerHTML = people.length <= 1 ? `<p class="muted small">Todavía no se ha unido nadie.</p>`
            : `<ul class="list members">${people.map((m) => `<li><span><strong>${own(m.name)}</strong> <small class="muted">${own(m.email)}</small><br><small class="muted">${esc(m.roleLabel)}</small></span>
              ${m.role !== "OWNER" ? `<button type="button" class="btn btn-sm btn-ghost" data-remove="${m.userId}" aria-label="Quitar a esta persona">${icon("trash")}Quitar</button>` : ""}</li>`).join("")}</ul>`;
          host.querySelectorAll("[data-remove]").forEach((b) => b.addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
            try { await api.delete(`/places/${place.id}/members/${b.dataset.remove}`); toast("Persona quitada del lugar.", "ok"); listMembers(); refresh(); }
            catch (error) { toast(error.message, "error"); }
          })));
        } catch (error) { host.innerHTML = `<p class="muted">${esc(error.message)}</p>`; }
      };
      listMembers();
    },
  });
}

export const placesView = {
  name: "places",
  title: "Lugares",
  async render(root, ctx) {
    root.innerHTML = loading("Cargando tus lugares...");
    const draw = async () => {
      let places;
      try {
        places = await api.get("/places");
        if (ctx.stale()) return;
      } catch (error) {
        root.innerHTML = emptyState("error", "No se pudieron cargar los lugares", error.message);
        return;
      }
      const demo = session.user?.demo;
      root.innerHTML = `
        <div class="row-between reveal"><div><h1>Lugares</h1><p class="muted">Cada sitio con agua que mides, por separado.</p></div>
          <button class="btn btn-primary btn-pill" data-new>${icon("plus")}Nuevo lugar</button></div>
        ${helpBox("places", "¿Para qué sirven los lugares?", [
          ["pin", "Un lugar es un sitio con agua que mides", "Por ejemplo tu piscina, la pecera de la sala o el tanque del techo. Cada uno guarda sus propias mediciones, sin mezclarse con las de los otros."],
          ["drop", "«Mi agua» es tu primer lugar", "Se creó solo cuando te registraste y ahí están todas tus mediciones. Si solo mides un sitio, no necesitas hacer nada más. Puedes cambiarle el nombre con «Editar»."],
          ["check", "El lugar «En uso» es el que ves en toda la app", "Arriba, junto a tu nombre, aparece el lugar en el que estás. Tócalo para cambiar: Inicio, Historial, Medir y Cuidado pasan a mostrar ese lugar."],
          ["calc", "El volumen sirve para la calculadora", "Con los litros de la piscina o la pecera, la pantalla Cuidado te dice cuánto producto echar."],
          ["share", "Compartir es opcional", "Si quieres que tu familia o tu técnico vean ese lugar desde su propia cuenta, toca «Compartir» y dales el código. Ellos lo escriben abajo, en «Unirme con un código»."],
        ])}
        <div class="grid places-grid">
          ${places.map((p) => `<article class="card place-card ${p.active ? "active" : ""} reveal">
            <div class="card-head"><div class="card-title"><span class="place-ic">${icon(kindIcon(p.kind))}</span>${own(p.name)}</div>
              ${p.active ? `<span class="badge badge-ok">${icon("check")}En uso</span>` : ""}</div>
            <p class="muted small">${esc(p.kindLabel)} · ${volumeText(p.volumeLiters)} · Perfil ${esc(p.profileName)} (${p.idealMin.toFixed(1)} - ${p.idealMax.toFixed(1)})</p>
            <p class="small">${p.measurements} ${p.measurements === 1 ? "medición" : "mediciones"}${p.lastMeasuredAt ? ` · última ${relativeTime(p.lastMeasuredAt)}` : ""}</p>
            <div class="row" style="gap:6px">
              <span class="badge">${p.role === "OWNER" ? `${icon("user")}Tuyo` : `${icon("share")}De ${esc(p.ownerName || "otra persona")} · ${esc(p.roleLabel)}`}</span>
              ${p.role === "OWNER" && p.members ? `<span class="badge badge-info">${icon("users")}${p.members} ${p.members === 1 ? "persona" : "personas"}</span>` : ""}
              ${p.shareCode ? `<span class="badge badge-info">${icon("key")}Código activo</span>` : ""}
            </div>
            <div class="row place-actions">
              ${p.active ? "" : `<button class="btn btn-sm btn-primary" data-use="${p.id}">${icon("check")}Usar</button>`}
              ${p.canEdit ? `<button class="btn btn-sm" data-edit="${p.id}">${icon("edit")}Editar</button>` : ""}
              ${p.role === "OWNER" && !demo ? `<button class="btn btn-sm" data-share="${p.id}">${icon("share")}Compartir</button>` : ""}
              ${p.role !== "OWNER" ? `<button class="btn btn-sm btn-ghost" data-leave="${p.id}">${icon("logout")}Salir</button>` : ""}
              ${p.role === "OWNER" && places.filter((x) => x.role === "OWNER").length > 1 ? `<button class="btn btn-sm btn-danger" data-delete="${p.id}" aria-label="Borrar el lugar">${icon("trash")}</button>` : ""}
            </div>
          </article>`).join("")}
        </div>
        ${demo ? "" : `<section class="card reveal join-card">
          <div class="card-head"><div class="card-title">${icon("key")}Unirme con un código</div></div>
          <p class="muted">Si alguien te compartió su piscina o acuario, escribe aquí el código de 8 letras y números que te dio.</p>
          <form class="row" data-join style="margin-top:10px"><input class="input mono" name="code" maxlength="12" placeholder="ABCD-2345" aria-label="Código para unirse" style="flex:1;min-width:160px;text-transform:uppercase" autocomplete="off">
            <button class="btn btn-primary" type="submit">${icon("arrowRight")}Unirme</button></form>
        </section>`}`;
      bindHelp(root);
      const find = (id) => places.find((p) => p.id === Number(id));
      root.querySelector("[data-new]").addEventListener("click", () => placeForm());
      root.querySelectorAll("[data-use]").forEach((b) => b.addEventListener("click", (e) => withBusy(e.currentTarget, async () => {
        try { const p = await activatePlace(b.dataset.use); toast(`Ahora estás en "${p.name}".`, "ok"); } catch (error) { toast(error.message, "error"); }
      })));
      root.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => placeForm(find(b.dataset.edit))));
      root.querySelectorAll("[data-share]").forEach((b) => b.addEventListener("click", () => shareDialog(find(b.dataset.share), draw)));
      root.querySelectorAll("[data-leave]").forEach((b) => b.addEventListener("click", async () => {
        const p = find(b.dataset.leave);
        if (!(await confirmDialog("Salir del lugar", `Dejarás de ver "${p.name}". Para volver necesitarás un código nuevo.`, "Salir"))) return;
        try { await api.post(`/places/${p.id}/leave`); bus.emit("place:changed"); toast("Saliste del lugar.", "ok"); } catch (error) { toast(error.message, "error"); }
      }));
      root.querySelectorAll("[data-delete]").forEach((b) => b.addEventListener("click", async () => {
        const p = find(b.dataset.delete);
        if (!(await confirmDialog("Borrar lugar", `Se borrarán "${p.name}" y sus ${p.measurements} mediciones, tratamientos y recordatorios. No se puede deshacer.`, "Borrar", true))) return;
        try { await api.delete(`/places/${p.id}`); bus.emit("place:changed"); toast("Lugar borrado.", "ok"); } catch (error) { toast(error.message, "error"); }
      }));
      root.querySelector("[data-join]")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const input = event.currentTarget.querySelector("input");
        const code = input.value.trim();
        if (code.replace(/[^a-z0-9]/gi, "").length < 6) { toast("Escribe el código completo.", "warn"); input.focus(); return; }
        try {
          const p = await api.post("/places/join", { code });
          bus.emit("place:changed", p);
          toast(`Te uniste a "${p.name}" (${p.roleLabel.toLowerCase()}).`, "ok");
        } catch (error) { toast(error.message, "error"); }
      });
    };
    // Changing, creating or leaving a place re-opens the screen (the frame does it for every screen).
    await draw();
    return null;
  },
};
