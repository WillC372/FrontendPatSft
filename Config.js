// Frontend configuration: the backend URL depends on where the page runs.
// Locally (localhost) it uses the backend on port 8080; once published it uses the backend deployed on Render.
(() => {
  const local = ["localhost", "127.0.0.1", ""].includes(location.hostname);
  window.AQUASENSE_CONFIG = {
    apiBaseUrl: local ? "http://localhost:8080/api/v1" : "https://aquasense-backend-willc372.onrender.com/api/v1",
  };
})();
