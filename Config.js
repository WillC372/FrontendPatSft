// Frontend configuration: the addresses depend on where the page runs. The app talks to two services: the backend
// (accounts, measurements, places, care, payments...) and the AI service (Aqua, analyses, reports, photo reading,
// translations). Locally they run on ports 8080 and 8081; once published, on Render.
(() => {
  const local = ["localhost", "127.0.0.1", ""].includes(location.hostname);
  window.AQUASENSE_CONFIG = {
    apiBaseUrl: local ? "http://localhost:8080/api/v1" : "https://aquasense-backend-willc372.onrender.com/api/v1",
    aiBaseUrl: local ? "http://localhost:8081/api/v1" : "https://aquasense-ai-willc372.onrender.com/api/v1",
  };
})();
