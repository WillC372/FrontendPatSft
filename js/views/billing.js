import { api } from "../core/api.js";
import { esc, fmt } from "../core/format.js";
import { icon } from "../ui/icons.js";
import { emptyState, loading, toast, withBusy } from "../ui/components.js";

const STATUS = { PENDING: ["warn", "Pendiente"], APPROVED: ["ok", "Aprobado"], DECLINED: ["crit", "Rechazado"], ERROR: ["crit", "Error"], EXPIRED: ["", "Vencido"] };
const RESULT = { APPROVED: ["ok", "check"], DECLINED: ["crit", "error"], ERROR: ["crit", "error"], EXPIRED: ["warn", "alert"], PENDING: ["info", "refresh"] };
const cop = (value) => `COP ${Number(value).toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
const longDate = (iso) => new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(new Date(iso));

/** Reads the reference PayU sends the user back with (in the hash or, just in case, in the URL). */
function returnedReference(route) {
  const fromHash = route.query.referenceCode;
  if (fromHash) return fromHash;
  try { return new URLSearchParams(location.search).get("referenceCode"); } catch { return null; }
}

function planCard(p) {
  const premium = p.plan === "PREMIUM";
  return `
    <section class="card plan-card ${premium ? "premium" : ""} reveal">
      <div class="card-head"><div class="card-title">${icon("star")}Tu plan</div>
        <span class="badge ${premium ? "badge-info" : "badge-ok"}">${premium ? "Premium" : "Gratuito"}</span></div>
      ${premium
        ? `<p class="plan-until">${p.manualPremium ? "Premium asignado por un administrador, sin vencimiento." : `Activo hasta el <strong>${longDate(p.premiumUntil)}</strong>.`}</p>`
        : `<p class="plan-until">Estás en el plan gratuito.</p>`}
      <div class="compare">
        <div><span>Análisis histórico</span><strong>${premium ? "365 días" : "30 días"}</strong><small>Premium: 365 días</small></div>
        <div><span>Predicción</span><strong>${premium ? "7 días" : "3 días"}</strong><small>Premium: 7 días</small></div>
        <div><span>Consultas de IA al día</span><strong>${premium ? "200" : "20"}</strong><small>Premium: 200</small></div>
      </div>
    </section>`;
}

function buyCard(p) {
  if (p.manualPremium) return "";
  const renew = p.plan === "PREMIUM";
  return `
    <section class="card buy-card reveal">
      <div class="price"><span class="amount">${cop(p.price)}</span><span class="per">por ${p.periodDays} días</span></div>
      <p class="muted">Pago único por periodo: sin cobros automáticos y sin guardar tu tarjeta. ${renew ? "Si renuevas antes de que venza, los días se suman a tu fecha actual." : ""}</p>
      <button class="btn btn-primary btn-pill" data-pay ${p.paymentsEnabled ? "" : "disabled"}>${icon("card")}${renew ? "Renovar con PayU" : "Pagar con PayU"}</button>
      <p class="secure">${icon("shield")}Pagas en la página segura de ${esc(p.provider)}. AquaSense nunca ve los datos de tu tarjeta y activa Premium solo después de confirmar el pago con PayU.</p>
    </section>`;
}

function sandboxCard(p) {
  if (!p.testMode) return "";
  return `
    <section class="card sandbox reveal">
      <div class="card-head"><div class="card-title">${icon("flask")}Modo de pruebas de PayU</div><span class="badge badge-sim">Sin dinero real</span></div>
      <p>${esc(p.testNote)} Elige "Tarjeta de crédito" en la página de PayU y usa estos datos:</p>
      <div class="table-wrap"><table><thead><tr><th>Resultado</th><th>Número</th><th>Nombre del titular</th><th>CVV</th><th>Vence</th></tr></thead><tbody>
        ${p.testCases.map((c) => `<tr><td><span class="badge ${c.result === "APPROVED" ? "badge-ok" : "badge-crit"}">${c.result === "APPROVED" ? "Aprobado" : "Rechazado"}</span></td>
          <td class="mono">${esc(c.cardNumber)}</td><td class="mono">${esc(c.cardholder)}</td><td class="mono">${esc(c.cvv)}</td><td class="mono">${esc(c.expiry)}</td></tr>`).join("")}
      </tbody></table></div>
      <small class="muted">Datos de prueba publicados por PayU para su sandbox (VISA Colombia). Con ellos no se cobra nada.</small>
    </section>`;
}

function historyCard(list) {
  return `
    <section class="card reveal">
      <div class="card-head"><div class="card-title">${icon("history")}Historial de pagos</div></div>
      ${list.length ? `<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Referencia</th><th>Valor</th><th>Estado</th><th>Medio</th><th></th></tr></thead><tbody>
        ${list.map((p) => `<tr><td class="num">${fmt.dateTime(p.createdAt)}</td><td class="mono">${esc(p.referenceCode)}${p.testMode ? ` <span class="badge badge-sim">Prueba</span>` : ""}</td>
          <td class="num">${cop(p.amount)}</td><td><span class="badge badge-${STATUS[p.status][0]}">${STATUS[p.status][1]}</span></td>
          <td>${esc(p.paymentMethod || "—")}</td>
          <td>${p.status === "PENDING" ? `<button class="btn btn-ghost btn-sm" data-verify="${esc(p.referenceCode)}">${icon("refresh")}Verificar</button>` : ""}</td></tr>`).join("")}
      </tbody></table></div>` : `<p class="muted">Aún no tienes pagos.</p>`}
    </section>`;
}

function resultBanner(r) {
  const [kind, ic] = RESULT[r.status] || RESULT.PENDING;
  return `<div class="pay-result ${kind}" role="status"><div class="pay-icon">${icon(ic)}</div>
    <div><strong>${esc(STATUS[r.status][1])} · ${esc(r.referenceCode)}</strong><p>${esc(r.message)}</p></div></div>`;
}

export const billingView = {
  name: "billing",
  title: "Plan y pagos",
  async render(root, ctx) {
    root.innerHTML = loading("Cargando tu plan...");
    const reference = returnedReference(ctx.route);
    let verified = null;
    if (reference) {
      try { verified = await api.post("/payments/verify", { referenceCode: reference }); } catch (error) { toast(error.message, "error"); }
    }
    let plan;
    let history;
    try {
      [plan, history] = await Promise.all([api.get("/payments/plan"), api.get("/payments")]);
      if (ctx.stale()) return null;
    } catch (error) {
      root.innerHTML = emptyState("error", "No se pudo cargar tu plan", error.message);
      return null;
    }
    root.innerHTML = `
      <div class="billing">
        ${verified ? resultBanner(verified) : ""}
        <div class="billing-top">${planCard(plan)}${buyCard(plan)}</div>
        ${sandboxCard(plan)}
        ${historyCard(history)}
      </div>`;
    if (verified) window.history.replaceState(null, "", "#/billing");
    root.querySelector("[data-pay]")?.addEventListener("click", (event) => withBusy(event.currentTarget, async () => {
      try {
        const checkout = await api.post("/payments/checkout");
        const form = document.createElement("form");
        form.method = "POST";
        form.action = checkout.actionUrl;
        form.hidden = true;
        Object.entries(checkout.fields).forEach(([name, value]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = name;
          input.value = value;
          form.append(input);
        });
        document.body.append(form);
        toast("Te llevamos a la página segura de PayU...", "info");
        form.submit();
      } catch (error) {
        toast(error.message, "error");
      }
    }));
    root.querySelectorAll("[data-verify]").forEach((b) => b.addEventListener("click", () => ctx.router.go(`billing?referenceCode=${encodeURIComponent(b.dataset.verify)}`)));
    return null;
  },
};
