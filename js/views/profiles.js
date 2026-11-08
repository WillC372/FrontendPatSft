import { api, ApiError } from "../core/api.js";
import { esc } from "../core/format.js";
import { icon, PROFILE_ICONS } from "../ui/icons.js";
import { confirmDialog, emptyState, loading, modal, showFieldErrors, toast } from "../ui/components.js";

function profileForm(p = {}) {
  const v = (key, fallback = "") => esc(p[key] ?? fallback);
  return `<form class="stack" data-profile-form novalidate>
    <div class="field"><label for="p-name">Nombre</label><input class="input" id="p-name" name="name" maxlength="80" value="${v("name")}" required><div class="field-error" data-error-for="name"></div></div>
    <div class="grid grid-2">
      <div class="field"><label for="p-imin">pH ideal mínimo</label><input class="input" id="p-imin" name="idealMin" type="number" step="0.1" min="0" max="14" value="${v("idealMin", "6.5")}"><div class="field-error" data-error-for="idealMin"></div></div>
      <div class="field"><label for="p-imax">pH ideal máximo</label><input class="input" id="p-imax" name="idealMax" type="number" step="0.1" min="0" max="14" value="${v("idealMax", "8.5")}"><div class="field-error" data-error-for="idealMax"></div></div>
      <div class="field"><label for="p-cmin">Precaución mínima</label><input class="input" id="p-cmin" name="cautionMin" type="number" step="0.1" min="0" max="14" value="${v("cautionMin", "6.0")}"><div class="field-error" data-error-for="cautionMin"></div></div>
      <div class="field"><label for="p-cmax">Precaución máxima</label><input class="input" id="p-cmax" name="cautionMax" type="number" step="0.1" min="0" max="14" value="${v("cautionMax", "9.0")}"><div class="field-error" data-error-for="cautionMax"></div></div>
    </div>
    <p class="muted" style="font-size:13px">Fuera de la banda de precaución el estado es crítico. Orden requerido: precaución min ≤ ideal min &lt; ideal max ≤ precaución max.</p>
    <div class="field"><label for="p-desc">Descripción del uso</label><textarea class="input" id="p-desc" name="description" rows="2" maxlength="500">${v("description")}</textarea><div class="field-error" data-error-for="description"></div></div>
    <div class="field"><label for="p-src">Fuente del rango</label><input class="input" id="p-src" name="source" maxlength="300" value="${v("source")}" placeholder="Ej.: recomendación del fabricante, norma local"><div class="field-error" data-error-for="source"></div></div>
  </form>`;
}

async function editProfile(existing) {
  return modal({
    title: existing ? "Editar perfil" : "Nuevo perfil personalizado",
    body: profileForm(existing),
    actions: [
      { label: "Cancelar", className: "btn-ghost", value: false },
      { label: "Guardar", className: "btn-primary", icon: "check", handler: async (node) => {
        const form = node.querySelector("[data-profile-form]");
        const d = Object.fromEntries(new FormData(form));
        const body = { ...d, idealMin: Number(d.idealMin), idealMax: Number(d.idealMax), cautionMin: Number(d.cautionMin), cautionMax: Number(d.cautionMax) };
        try {
          const saved = existing ? await api.put(`/profiles/${existing.id}`, body) : await api.post("/profiles", body);
          toast("Perfil guardado.", "ok");
          return saved;
        } catch (error) {
          if (error instanceof ApiError) showFieldErrors(form, error.fields);
          toast(error.message, "error");
          return false;
        }
      } },
    ],
  });
}

export const profilesView = {
  name: "profiles",
  title: "Perfiles de agua",
  async render(root, ctx) {
    const load = async () => {
      root.innerHTML = loading();
      let profiles;
      try {
        profiles = await api.get("/profiles");
        if (ctx.stale()) return;
      } catch (error) {
        root.innerHTML = emptyState("error", "No se pudieron cargar los perfiles", error.message);
        return;
      }
      root.innerHTML = `
        <div class="row-between reveal"><div><h1>Perfiles de uso</h1><p class="muted">Cada contexto usa rangos distintos. El perfil activo se aplica a nuevas mediciones y análisis.</p></div></div>
        <div class="profile-grid">
          ${profiles.map((p) => `
            <article class="profile-card ${p.active ? "active" : ""} reveal">
              <div class="row-between"><div class="profile-icon">${icon(PROFILE_ICONS[p.type] || "profiles")}</div>
                ${p.active ? `<span class="badge badge-ok">${icon("check")}Activo</span>` : p.systemProfile ? `<span class="badge badge-info">Sistema</span>` : `<span class="badge badge-sim">Personalizado</span>`}</div>
              <h3>${esc(p.name)}</h3>
              <div class="range num">${p.idealMin.toFixed(1)} – ${p.idealMax.toFixed(1)}</div>
              <small class="muted num">Precaución ${p.cautionMin.toFixed(1)} – ${p.cautionMax.toFixed(1)} · fuera: crítico</small>
              <p>${esc(p.description)}</p>
              <p title="${esc(p.source)}"><strong>Fuente:</strong> ${esc(p.source)}</p>
              <div class="actions">
                ${p.active ? "" : `<button class="btn btn-sm btn-primary" data-activate="${p.id}">Activar</button>`}
                <button class="btn btn-sm" data-duplicate="${p.id}" title="Duplicar para personalizar">${icon("copy")}Duplicar</button>
                ${p.systemProfile ? "" : `<button class="btn btn-sm" data-edit="${p.id}">${icon("edit")}</button><button class="btn btn-sm btn-danger" data-delete="${p.id}">${icon("trash")}</button>`}
              </div>
            </article>`).join("")}
          <button class="profile-card add reveal" data-new>${icon("plus")}<strong>Personalizado</strong><small class="muted">Crea un perfil con tus propios rangos</small></button>
        </div>
        <p class="disclaimer">${icon("info")}Los rangos del sistema son referencias generales con su fuente. Verifica la norma o recomendación aplicable a tu caso.</p>`;

      const find = (id) => profiles.find((p) => String(p.id) === String(id));
      root.querySelectorAll("[data-activate]").forEach((b) => b.addEventListener("click", async () => {
        try { await api.post(`/profiles/${b.dataset.activate}/activate`); toast(`Perfil "${find(b.dataset.activate).name}" activado.`, "ok"); load(); } catch (e) { toast(e.message, "error"); }
      }));
      root.querySelectorAll("[data-duplicate]").forEach((b) => b.addEventListener("click", async () => {
        try { const copy = await api.post(`/profiles/${b.dataset.duplicate}/duplicate`); toast("Perfil duplicado. Ajusta sus rangos.", "ok"); if (await editProfile(copy)) load(); else load(); } catch (e) { toast(e.message, "error"); }
      }));
      root.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", async () => { if (await editProfile(find(b.dataset.edit))) load(); }));
      root.querySelectorAll("[data-delete]").forEach((b) => b.addEventListener("click", async () => {
        if (!(await confirmDialog("Eliminar perfil", `Se eliminara "${find(b.dataset.delete).name}".`, "Eliminar", true))) return;
        try { await api.delete(`/profiles/${b.dataset.delete}`); toast("Perfil eliminado.", "ok"); load(); } catch (e) { toast(e.message, "error"); }
      }));
      root.querySelector("[data-new]").addEventListener("click", async () => { if (await editProfile(null)) load(); });
    };
    await load();
    return null;
  },
};
