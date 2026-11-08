import { api, ApiError } from "../core/api.js";
import { bus } from "../core/event-bus.js";
import { esc, fmt } from "../core/format.js";
import { icon } from "../ui/icons.js";
import { modal, toast } from "../ui/components.js";

const MAX_SIDE = 1600;

// Convierte cualquier foto que el navegador pueda abrir (incluida la orientación de la cámara) a JPEG reducido.
async function prepareImage(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => null);
  if (!bitmap) throw new Error("No se pudo abrir la imagen. Prueba con una foto JPEG o PNG.");
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
}

function resultView(r, previewUrl) {
  if (!r.readable) {
    return `
      <div class="photo-preview"><img src="${previewUrl}" alt="Foto analizada"></div>
      <div class="banner banner-warn" style="margin-top:14px">${icon("alert")}<div><strong>No se pudo leer un valor de pH</strong>
        <p>${esc(r.observations || "La foto no permite una lectura confiable.")}</p></div></div>
      ${r.issues.length ? `<div class="row" style="margin-top:10px">${r.issues.map((i) => `<span class="badge badge-warn">${esc(i.label)}</span>`).join("")}</div>` : ""}
      <p class="muted" style="margin-top:12px">Toma otra foto con buena luz, la tira junto a la carta de colores, o registra el valor manualmente.</p>`;
  }
  const pos = (v) => `${(Math.max(0, Math.min(14, v)) / 14) * 100}%`;
  const agreementClass = { AGREE: "banner-ok", DISAGREE: "banner-crit", PARTIAL: "banner-warn", SINGLE: "banner-info" }[r.agreement];
  return `
    <div class="grid grid-2" style="align-items:start">
      <div class="photo-preview"><img src="${previewUrl}" alt="Foto analizada"></div>
      <div class="stack" style="gap:10px">
        <span class="badge badge-info" style="align-self:flex-start">${icon(r.kind === "TEST_STRIP" ? "flask" : "chip")}${esc(r.kindLabel)}</span>
        <div class="result-value"><strong class="num">${r.kind === "TEST_STRIP" ? r.ph.toFixed(1) : fmt.ph(r.ph)}</strong><span class="gauge-unit">pH</span></div>
        <div class="muted num">Entre ${fmt.ph(r.phLow)} y ${fmt.ph(r.phHigh)}${r.temperatureC !== null ? ` · ${r.temperatureC.toFixed(1)} °C` : ""}</div>
        <div class="range-band" aria-hidden="true"><div class="band" style="left:${pos(r.phLow)};width:calc(${pos(r.phHigh)} - ${pos(r.phLow)})"></div><div class="pin" style="left:${pos(r.ph)}"></div></div>
        <div class="confidence" style="margin-top:6px">Confianza <span class="bar"><i style="width:${r.confidence * 100}%"></i></span><strong class="num">${Math.round(r.confidence * 100)} %</strong></div>
      </div>
    </div>
    <div class="banner ${agreementClass}" style="margin-top:14px">${icon(r.agreement === "AGREE" ? "check" : r.agreement === "DISAGREE" ? "alert" : "info")}
      <div><strong>${esc(r.agreementLabel)}</strong>
      <div class="opinions" style="margin-top:8px">${r.opinions.map((o) => `<div>${esc(o.provider)}<br><small class="muted">${esc(o.model)}</small><strong>${o.readable && o.ph !== null ? o.ph.toFixed(2) : "Sin lectura"}</strong></div>`).join("")}</div></div></div>
    ${r.observations ? `<p style="margin-top:12px">${esc(r.observations)}</p>` : ""}
    ${r.issues.length ? `<div class="row" style="margin-top:10px">${r.issues.map((i) => `<span class="badge badge-warn">${icon("alert")}${esc(i.label)}</span>`).join("")}</div>` : ""}
    ${r.adjustments.length ? `<div class="banner banner-info" style="margin-top:12px">${icon("shield")}<div><strong>Salvaguardas aplicadas</strong>
      <ul class="list bullets" style="margin-top:6px">${r.adjustments.map((a) => `<li>${icon("check")}<span>${esc(a)}</span></li>`).join("")}</ul></div></div>` : ""}
    ${r.note ? `<p class="muted" style="margin-top:8px;font-size:13px">${esc(r.note)}</p>` : ""}
    <div class="grid grid-2" style="margin-top:16px">
      <div class="field"><label for="pr-ph">Valor a guardar (puedes corregirlo)</label>
        <input class="input" id="pr-ph" type="number" step="0.01" min="0" max="14" value="${r.ph}"><div class="field-error" data-error-for="ph"></div></div>
      <div class="field"><label for="pr-note">Nota (opcional)</label><input class="input" id="pr-note" maxlength="120" placeholder="Ej.: piscina, después de lluvia"></div>
    </div>
    <p class="disclaimer" style="margin-top:12px">${icon("info")}${esc(r.disclaimer)}</p>`;
}

export function photoReading() {
  let previewUrl = null;
  return modal({
    title: "Leer pH desde una foto",
    body: `
      <div class="stack" data-step="pick">
        <div class="segmented" role="radiogroup" aria-label="Tipo de foto">
          <button class="active" data-kind="TEST_STRIP" role="radio" aria-checked="true">${icon("flask")}Tira reactiva</button>
          <button data-kind="METER_DISPLAY" role="radio" aria-checked="false">${icon("chip")}Pantalla del medidor</button>
        </div>
        <label class="drop-zone" data-drop>
          ${icon("camera")}<strong>Toma una foto o elige una imagen</strong><small class="muted">JPEG o PNG, hasta 10 MB. La foto no se guarda.</small>
          <input type="file" accept="image/*" capture="environment" data-file aria-label="Foto de la prueba de pH">
        </label>
        <div class="photo-tips">
          <div>${icon("sun")}Luz natural o blanca, sin sombras.</div>
          <div>${icon("image")}La tira junto a su carta de colores.</div>
          <div>${icon("target")}Enfocada y sin reflejos.</div>
        </div>
      </div>
      <div data-step="work" hidden></div>
      <div class="modal-actions" data-actions hidden>
        <button class="btn btn-ghost" data-again>${icon("refresh")}Otra foto</button>
        <button class="btn btn-primary" data-save>${icon("check")}Guardar medición</button>
      </div>`,
    actions: [],
    onMount: (node, close) => {
      node.querySelector(".modal").classList.add("photo-modal");
      let kind = "TEST_STRIP";
      let result = null;
      const pick = node.querySelector('[data-step="pick"]');
      const work = node.querySelector('[data-step="work"]');
      const actions = node.querySelector("[data-actions]");
      const drop = node.querySelector("[data-drop]");
      node.querySelectorAll("[data-kind]").forEach((b) => b.addEventListener("click", () => {
        kind = b.dataset.kind;
        node.querySelectorAll("[data-kind]").forEach((x) => { x.classList.toggle("active", x === b); x.setAttribute("aria-checked", String(x === b)); });
      }));
      ["dragenter", "dragover"].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add("over"); }));
      ["dragleave", "drop"].forEach((e) => drop.addEventListener(e, () => drop.classList.remove("over")));
      drop.addEventListener("drop", (ev) => { ev.preventDefault(); if (ev.dataTransfer.files[0]) analyze(ev.dataTransfer.files[0]); });
      node.querySelector("[data-file]").addEventListener("change", (ev) => { if (ev.target.files[0]) analyze(ev.target.files[0]); });

      async function analyze(file) {
        let blob;
        try {
          blob = await prepareImage(file);
        } catch (error) {
          toast(error.message, "error");
          return;
        }
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = URL.createObjectURL(blob);
        pick.hidden = true;
        actions.hidden = true;
        work.hidden = false;
        work.innerHTML = `<div class="photo-preview"><img src="${previewUrl}" alt="Foto a analizar"><div class="scan-grid"></div><div class="scan"></div></div>
          <p class="muted" style="text-align:center;margin-top:12px">Analizando la foto con IA${kind === "TEST_STRIP" ? " y pidiendo una segunda opinión" : ""}...</p>`;
        const form = new FormData();
        form.append("file", blob, "foto.jpg");
        form.append("kind", kind);
        try {
          result = await api.upload("/vision/ph-reading", form);
          work.innerHTML = resultView(result, previewUrl);
          actions.hidden = false;
          node.querySelector("[data-save]").hidden = !result.readable;
        } catch (error) {
          work.innerHTML = `<div class="banner banner-crit">${icon("error")}<p>${esc(error.message)}</p></div>`;
          actions.hidden = false;
          node.querySelector("[data-save]").hidden = true;
        }
      }

      node.querySelector("[data-again]").addEventListener("click", () => {
        work.hidden = true;
        actions.hidden = true;
        pick.hidden = false;
        node.querySelector("[data-file]").value = "";
      });
      node.querySelector("[data-save]").addEventListener("click", async (event) => {
        const value = Number.parseFloat(node.querySelector("#pr-ph").value);
        if (Number.isNaN(value) || value < 0 || value > 14) {
          node.querySelector('[data-error-for="ph"]').textContent = "Escribe un valor entre 0 y 14.";
          return;
        }
        event.currentTarget.disabled = true;
        try {
          const saved = await api.post(`/vision/ph-reading/${encodeURIComponent(result.pendingId)}/save`,
            { ph: value, note: node.querySelector("#pr-note").value || null });
          toast(`Medición guardada: pH ${fmt.ph(saved.ph)} (${saved.statusLabel.toLowerCase()}), origen foto.`, "ok");
          bus.emit("measurement:saved", saved);
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          close(saved);
        } catch (error) {
          if (error instanceof ApiError && error.fields.ph) node.querySelector('[data-error-for="ph"]').textContent = error.fields.ph;
          toast(error.message, "error");
          event.currentTarget.disabled = false;
        }
      });
    },
  });
}
