import { usagePane } from "./UsagePane.js";

// «Consumo de IA» of the administrator: calls, failures, tokens, estimated cost and real charge of the whole platform.
export const aiUsageView = {
  name: "ai-usage",
  title: "Consumo de IA",
  async render(root) {
    root.innerHTML = `<div class="reveal"><h1>Consumo de IA</h1>
      <p class="muted">Lo que gasta la plataforma en inteligencia artificial: llamadas, fallos, tokens y costo, por modelo y por función.</p></div>
      <div data-usage style="margin-top:16px"></div>`;
    await usagePane(root.querySelector("[data-usage]"), { platform: true });
    return null;
  },
};
