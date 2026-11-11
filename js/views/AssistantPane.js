import { api } from "../core/Api.js";
import { esc, fmt } from "../core/Format.js";
import { icon } from "../ui/Icons.js";
import { confirmDialog, emptyState, loading, toast } from "../ui/Components.js";
import { bindReferenceMarks, chatCitations, withReferenceMarks } from "./Citations.js";

const SUGGESTIONS = ["¿Cómo está mi agua esta semana?", "¿Qué pH es recomendable para una piscina?", "¿Cómo subo el pH de un acuario sin dañar a los peces?", "¿Cómo calibro un medidor de pH?"];

/** Plain text of an answer for the clipboard: without reference ids, with the cited sources numbered at the end. */
function copyText(text, citations) {
  const order = new Map(citations.map((c, i) => [c.id, i + 1]));
  const body = String(text).replace(/\*\*/g, "")
    .replace(/\[([a-z0-9]+(?:-[a-z0-9]+)+)\]/g, (m, id) => (order.has(id) ? `[${order.get(id)}]` : "")).trim();
  const sources = citations.map((c, i) => `[${i + 1}] ${c.organization}, ${c.title}${c.section ? ` (${c.section})` : ""}. ${c.url}`);
  return sources.length ? `${body}\n\nFuentes:\n${sources.join("\n")}` : body;
}

function aiBubble(text, model, citations = [], extra = "") {
  const meta = `Generado por IA · ${esc(model || "")}${citations.length ? " · con citas verificadas" : ""}${extra}`;
  return `<div class="bubble ai" data-copy-text="${esc(copyText(text, citations))}">${withReferenceMarks(String(text).replace(/\*\*/g, "").trim(), citations)}`
    + `<small class="muted bubble-meta"><span>${meta}</span><button type="button" class="copy-btn" data-copy aria-label="Copiar respuesta" title="Copiar respuesta">${icon("copy")}</button></small>${chatCitations(citations)}</div>`;
}

/**
 * Assistant with memory: list of conversations, stored history and follow-up questions that use the previous context.
 */
export async function assistantPane(host) {
  host.innerHTML = loading();
  let status;
  try { status = await api.get("/intelligence/ai-status"); } catch (error) { host.innerHTML = emptyState("error", "No disponible", error.message); return; }
  let current = null;
  // Answer being written: only one at a time, and it can be stopped.
  let running = null;
  host.innerHTML = `
    <div class="row-between"><h2>Asistente IA</h2>
      <span class="badge ${status.configured ? "badge-ok" : "badge-warn"}" data-quota>${status.configured ? `${status.usedToday}/${status.dailyQuota} consultas hoy` : "IA no configurada"}</span></div>
    <div class="row" style="margin-top:10px">${status.providers.map((p) => `<span class="badge ${p.configured ? "badge-info" : ""}" style="${p.configured ? "" : "opacity:.5"}">${p.order}. ${esc(p.provider)} · ${esc(p.model)}${p.configured ? "" : " (sin clave)"}</span>`).join("")}</div>
    ${status.configured ? "" : `<div class="banner banner-warn" style="margin-top:14px">${icon("alert")}<p>El servidor no tiene una clave de IA configurada (Gemini o Groq). El asistente no está disponible; los análisis estadísticos siguen funcionando.</p></div>`}
    <div class="assistant-layout" style="margin-top:14px">
      <aside class="conv-list card" aria-label="Conversaciones">
        <button class="btn btn-primary btn-pill" data-new>${icon("plus")}Nueva conversación</button>
        <div class="conv-items" data-convs></div>
        <button class="btn btn-ghost conv-clear" data-clear>${icon("trash")}Borrar todas</button>
      </aside>
      <div class="stack" style="gap:10px;min-width:0">
        <div class="row-between"><strong data-title>Nueva conversación</strong><span class="badge" data-memory hidden></span></div>
        <div class="chat card" data-chat></div>
        <div class="row" data-suggestions>${SUGGESTIONS.map((s) => `<button class="tab" data-q="${esc(s)}">${esc(s)}</button>`).join("")}</div>
        <form class="row" data-form>
          <input class="input" style="flex:1;min-width:200px" name="q" maxlength="500" placeholder="Escribe tu pregunta... puedes repreguntar sobre lo anterior" aria-label="Pregunta" ${status.configured ? "" : "disabled"}>
          <button class="btn btn-primary" type="submit" data-send ${status.configured ? "" : "disabled"}>${icon("send")}Enviar</button>
          <button class="btn" type="button" data-stop hidden>${icon("pause")}Detener</button>
        </form>
      </div>
    </div>`;
  const chat = host.querySelector("[data-chat]");
  const form = host.querySelector("[data-form]");
  const list = host.querySelector("[data-convs]");
  const title = host.querySelector("[data-title]");
  const memory = host.querySelector("[data-memory]");
  bindReferenceMarks(chat);

  const greet = () => {
    chat.innerHTML = `<div class="bubble ai">Hola, soy AquaSense Intelligence. Pregúntame lo que quieras sobre el agua y su pH: tus mediciones, piscinas, acuarios, agua potable, riego, cómo corregir el pH, medidores y calibración, o cómo usar AquaSense. Recuerdo lo que hablamos en esta conversación.<small class="muted">Uso tus datos registrados, cito normas oficiales cuando aplican y no respondo temas ajenos al agua.</small></div>`;
  };
  const setMemory = (turns, omitted) => {
    memory.hidden = !turns;
    memory.innerHTML = `${icon("brain")}Recuerda ${turns} mensajes${omitted ? ` · ${omitted} más antiguos fuera de memoria` : ""}`;
  };
  const loadList = async () => {
    try {
      const items = await api.get("/intelligence/chat/conversations");
      list.innerHTML = items.length ? items.map((c) => `<div class="conv-item ${c.id === current ? "active" : ""}" data-cid="${c.id}">
          <button class="conv-open" data-open="${c.id}"><strong>${esc(c.title)}</strong><small class="muted">${c.messageCount} mensajes · ${fmt.dateTime(c.updatedAt)}</small></button>
          <button class="icon-btn" data-del="${c.id}" aria-label="Borrar conversación">${icon("trash")}</button></div>`).join("")
        : `<p class="muted" style="font-size:13px">Aún no hay conversaciones guardadas.</p>`;
    } catch (error) {
      list.innerHTML = `<p class="muted">${esc(error.message)}</p>`;
    }
  };
  const open = async (id) => {
    chat.innerHTML = loading("Cargando conversación...");
    try {
      const c = await api.get(`/intelligence/chat/conversations/${id}`);
      current = c.id;
      title.textContent = c.title;
      chat.innerHTML = c.messages.map((m) => m.role === "USER" ? `<div class="bubble user">${esc(m.content)}</div>`
        : aiBubble(m.content, m.model, m.citations || [])).join("");
      setMemory(Math.min(c.messages.length, 12), Math.max(0, c.messages.length - 12));
      chat.scrollTop = chat.scrollHeight;
      list.querySelectorAll("[data-cid]").forEach((x) => x.classList.toggle("active", Number(x.dataset.cid) === current));
    } catch (error) {
      toast(error.message, "error");
    }
  };
  const reset = () => {
    current = null;
    title.textContent = "Nueva conversación";
    memory.hidden = true;
    greet();
    list.querySelectorAll("[data-cid]").forEach((x) => x.classList.remove("active"));
  };
  // The answer appears as the model writes it (streaming); if the stream cannot be used, the normal request is made.
  const answer = async (question, signal) => {
    const body = { question, ...(current ? { conversationId: current } : {}) };
    let text = "";
    let result = null;
    let failure = null;
    try {
      await api.stream("/intelligence/chat/stream", body, (name, data) => {
        if (name === "delta") {
          text += data.t || "";
          const live = chat.querySelector("[data-typing]");
          if (!live) return;
          live.classList.remove("typing");
          // Reference marks become numbered buttons when the answer is complete; while it is written they are hidden.
          live.textContent = text.replace(/\*\*/g, "").replace(/\[[a-z0-9]+(?:-[a-z0-9]+)*-?\]?$|\[[a-z0-9]+(?:-[a-z0-9]+)+\]/g, "");
          chat.scrollTop = chat.scrollHeight;
        } else if (name === "done") {
          result = data;
        } else if (name === "error") {
          failure = data;
        }
      }, signal);
    } catch (error) {
      if (error.name === "AbortError") throw Object.assign(new Error("stopped"), { stopped: true, text });
      if (text || error.status) throw error;
      return api.post("/intelligence/chat", body);
    }
    if (failure) throw new Error(failure.message || "La IA no pudo responder. Intenta de nuevo.");
    if (!result) {
      if (text) throw new Error("Se cortó la conexión mientras llegaba la respuesta. Vuelve a preguntar.");
      return api.post("/intelligence/chat", body);
    }
    return result;
  };
  const setRunning = (controller) => {
    running = controller;
    form.querySelector("[data-send]").hidden = Boolean(controller);
    form.querySelector("[data-stop]").hidden = !controller;
    host.querySelectorAll("[data-q]").forEach((b) => { b.disabled = Boolean(controller); });
  };
  const ask = async (question) => {
    if (!question.trim() || !status.configured || running) return;
    chat.insertAdjacentHTML("beforeend", `<div class="bubble user">${esc(question)}</div><div class="bubble ai typing" data-typing><span></span><span></span><span></span></div>`);
    chat.scrollTop = chat.scrollHeight;
    const controller = new AbortController();
    setRunning(controller);
    try {
      const a = await answer(question, controller.signal);
      const extra = a.removedReferences ? ` · ${a.removedReferences} referencia(s) inexistente(s) eliminada(s)` : "";
      chat.querySelector("[data-typing]").outerHTML = aiBubble(a.answer, a.model, a.citations || [], extra);
      const isNew = current !== a.conversationId;
      current = a.conversationId;
      title.textContent = a.conversationTitle;
      setMemory(a.memoryTurns + 2, a.omittedTurns);
      if (isNew) await loadList(); else list.querySelector(`[data-cid="${current}"] small`)?.replaceChildren(document.createTextNode("Actualizada ahora"));
      const quota = host.querySelector("[data-quota]");
      status.usedToday += 1;
      quota.textContent = `${status.usedToday}/${status.dailyQuota} consultas hoy`;
    } catch (error) {
      const bubble = chat.querySelector("[data-typing]");
      if (error.stopped) {
        // What was already written stays visible; the request to the server is cancelled.
        bubble.outerHTML = `<div class="bubble ai">${error.text ? esc(error.text.replace(/\*\*/g, "").trim()) : ""}<small class="muted">Respuesta detenida.</small></div>`;
      } else {
        bubble.outerHTML = `<div class="bubble ai">${esc(error.message)}</div>`;
      }
    } finally {
      setRunning(null);
    }
    chat.scrollTop = chat.scrollHeight;
  };
  form.querySelector("[data-stop]").addEventListener("click", () => running?.abort());
  chat.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-copy]");
    if (!button) return;
    try {
      await navigator.clipboard.writeText(button.closest("[data-copy-text]").dataset.copyText);
      toast("Respuesta copiada.", "ok", 2000);
    } catch {
      toast("El navegador no permitió copiar. Selecciona el texto y cópialo a mano.", "warn");
    }
  });

  list.addEventListener("click", async (event) => {
    const del = event.target.closest("[data-del]");
    if (del) {
      if (!(await confirmDialog("Borrar conversación", "Se borrará esta conversación y su memoria. No se puede deshacer.", "Borrar", true))) return;
      await api.delete(`/intelligence/chat/conversations/${del.dataset.del}`);
      if (Number(del.dataset.del) === current) reset();
      await loadList();
      return;
    }
    const openBtn = event.target.closest("[data-open]");
    if (openBtn) open(Number(openBtn.dataset.open));
  });
  host.querySelector("[data-new]").addEventListener("click", reset);
  host.querySelector("[data-clear]").addEventListener("click", async () => {
    if (!(await confirmDialog("Borrar todas", "Se borrarán todas tus conversaciones con el asistente.", "Borrar todo", true))) return;
    const r = await api.delete("/intelligence/chat/conversations");
    toast(r.deleted === 1 ? "1 conversación borrada." : `${r.deleted} conversaciones borradas.`, "ok");
    reset();
    await loadList();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = form.querySelector("input");
    const q = input.value;
    input.value = "";
    ask(q);
  });
  host.querySelectorAll("[data-q]").forEach((b) => b.addEventListener("click", () => ask(b.dataset.q)));
  greet();
  await loadList();
}
