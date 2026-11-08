import { api } from "../core/Api.js";
import { esc } from "../core/Format.js";
import { session } from "../core/Session.js";
import { icon } from "../ui/Icons.js";
import { countUp, emptyState, loading } from "../ui/Components.js";
import { usageChart } from "../ui/Charts.js";

const usd = (v, digits = 4) => `US$ ${Number(v || 0).toFixed(digits)}`;
const int = (v) => Number(v || 0).toLocaleString("es");

/** AI usage and costs: calls, failures, tokens, estimated cost and real charge, per model, feature and day. */
export async function usagePane(host) {
  const admin = session.user?.role === "ADMIN";
  let days = 30;
  let scope = "mine";
  host.innerHTML = `
    <div class="dx-head">
      <div><h2>Consumo y costos de IA</h2>
        <p class="muted" style="max-width:64ch">Cada llamada queda registrada con su proveedor, tokens, latencia y costo estimado. Los intentos fallidos también se registran, pero no cuentan para tu cuota.</p></div>
      <div class="row">
        ${admin ? `<div class="tabs"><button class="tab active" data-scope="mine">Mi consumo</button><button class="tab" data-scope="all">Global (admin)</button></div>` : ""}
        <div class="tabs"><button class="tab" data-ud="7">7 días</button><button class="tab active" data-ud="30">30 días</button><button class="tab" data-ud="90">90 días</button></div>
      </div>
    </div>
    <div data-usage style="margin-top:12px">${loading()}</div>`;
  const target = host.querySelector("[data-usage]");
  const load = async () => {
    target.innerHTML = loading("Calculando consumo...");
    try {
      const r = await api.get(scope === "all" ? "/admin/ai-usage" : "/intelligence/ai-usage", { days });
      render(target, r, scope);
    } catch (error) {
      target.innerHTML = emptyState("error", "No disponible", error.message);
    }
  };
  host.querySelectorAll("[data-ud]").forEach((t) => t.addEventListener("click", () => {
    host.querySelectorAll("[data-ud]").forEach((x) => x.classList.toggle("active", x === t));
    days = Number(t.dataset.ud);
    load();
  }));
  host.querySelectorAll("[data-scope]").forEach((t) => t.addEventListener("click", () => {
    host.querySelectorAll("[data-scope]").forEach((x) => x.classList.toggle("active", x === t));
    scope = t.dataset.scope;
    load();
  }));
  await load();
}

function render(target, r, scope) {
  const t = r.totals;
  const free = r.billing === "FREE";
  const unverified = r.byModel.some((m) => m.priceVerified === false);
  target.innerHTML = `
    <div class="usage-stats">
      <div class="stat reveal"><span>Llamadas</span><strong data-count="${t.calls}">0</strong><small>${int(t.cachedHits)} desde caché</small></div>
      <div class="stat reveal"><span>Fallos de proveedor</span><strong class="${t.failures ? "warn-text" : ""}" data-count="${t.failures}">0</strong><small>${Math.round(t.failureRate * 100)} % de los intentos</small></div>
      <div class="stat reveal"><span>Tokens</span><strong>${int(t.inputTokens + t.outputTokens)}</strong><small>${int(t.inputTokens)} entrada · ${int(t.outputTokens)} salida</small></div>
      <div class="stat reveal"><span>Costo estimado</span><strong>${usd(t.estimatedUsd)}</strong><small>con precios de pago</small></div>
      <div class="stat reveal highlight"><span>Cargo real</span><strong>${usd(t.chargedUsd, 2)}</strong><small>${free ? "plan gratuito de los proveedores" : "facturación de pago"}</small></div>
      <div class="stat reveal"><span>Latencia media</span><strong>${t.avgLatencyMs ? `${(t.avgLatencyMs / 1000).toFixed(1)} s` : "—"}</strong><small>${r.usedToday != null ? `${r.usedToday}/${r.dailyQuota} consultas hoy` : `últimos ${r.periodDays} días`}</small></div>
    </div>
    ${unverified ? `<div class="banner banner-warn" style="margin-top:14px">${icon("alert")}<p><strong>Precios no verificados.</strong> ${esc(r.pricingNote || "")}</p></div>` : ""}
    <section class="card reveal" style="margin-top:16px"><div class="card-head"><div class="card-title">${icon("activity")}Llamadas por día</div>
      <div class="row legend"><span><i style="background:var(--primary-2)"></i>Correctas</span><span><i style="background:var(--crit)"></i>Fallos</span></div></div>
      <div data-usage-chart></div></section>
    <div class="dx-grid">
      <section class="card reveal" style="grid-column:1 / -1"><div class="card-head"><div class="card-title">${icon("chip")}Por modelo</div></div>
        ${r.byModel.length ? `<div class="table-wrap"><table class="table usage-table"><thead><tr><th>Modelo</th><th>Llamadas</th><th>Fallos</th><th>Tokens</th><th>Costo est.</th></tr></thead><tbody>
          ${r.byModel.map((m) => `<tr><td><strong>${esc(m.model)}</strong><small class="muted">${esc(m.provider)}${m.avgLatencyMs ? ` · ${(m.avgLatencyMs / 1000).toFixed(1)} s` : ""}</small>
            ${m.inputPerMillion != null ? `<small class="muted">US$ ${m.inputPerMillion} / ${m.outputPerMillion} por M tokens ${m.priceVerified ? "" : "· no verificado"}</small>` : `<small class="muted">Sin precio configurado</small>`}
            ${m.lastError ? `<small class="err-text" title="${esc(m.lastError)}">Último error: ${esc(m.lastError.slice(0, 70))}</small>` : ""}</td>
            <td class="num">${int(m.calls)}</td><td class="num">${int(m.failures)}</td><td class="num">${int(m.inputTokens + m.outputTokens)}</td><td class="num">${usd(m.estimatedUsd)}</td></tr>`).join("")}
          </tbody></table></div>` : `<p class="muted">Sin llamadas en el periodo.</p>`}
      </section>
      <section class="card reveal" style="grid-column:1 / -1"><div class="card-head"><div class="card-title">${icon("target")}Por función</div></div>
        ${r.byPurpose.length ? (() => {
          const max = Math.max(...r.byPurpose.map((p) => p.tokens), 1);
          return r.byPurpose.map((p) => `<div class="purpose-row"><div class="row-between"><span>${esc(p.label)}</span><small class="muted">${int(p.calls)} ${p.calls === 1 ? "llamada" : "llamadas"} · ${usd(p.estimatedUsd)}</small></div>
            <div class="meter"><i style="width:0" data-width="${Math.max(3, (p.tokens / max) * 100)}%"></i></div></div>`).join("");
        })() : `<p class="muted">Sin llamadas en el periodo.</p>`}
      </section>
    </div>
    ${scope === "all" && r.topUsers.length ? `<section class="card reveal" style="margin-top:16px"><div class="card-head"><div class="card-title">${icon("user")}Usuarios con más consumo</div></div>
      <div class="table-wrap"><table class="table usage-table"><thead><tr><th>Usuario</th><th>Llamadas</th><th>Tokens</th><th>Costo est.</th></tr></thead><tbody>
      ${r.topUsers.map((u) => `<tr><td>${esc(u.email)}</td><td class="num">${int(u.calls)}</td><td class="num">${int(u.tokens)}</td><td class="num">${usd(u.estimatedUsd)}</td></tr>`).join("")}</tbody></table></div></section>` : ""}
    <p class="disclaimer" style="margin-top:14px">${icon("info")}El costo estimado multiplica los tokens por el precio configurado de cada modelo y se guarda con cada llamada, así un cambio de precio no reescribe el historial.</p>`;
  usageChart(target.querySelector("[data-usage-chart]"), r.daily);
  target.querySelectorAll("[data-count]").forEach((n) => countUp(n, Number(n.dataset.count), { decimals: 0 }));
  requestAnimationFrame(() => target.querySelectorAll("[data-width]").forEach((n) => { n.style.width = n.dataset.width; }));
}
