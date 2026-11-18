// The AI functions of Aqua Assistant. They open from Aqua (the robot), the only entry point to the AI.
// [route key, title, icon, short explanation shown in Aqua's panel]
export const AI_FUNCTIONS = [
  ["diagnosis", "Diagnóstico y recomendaciones", "sparkle", "Te dice el riesgo de tu agua y qué hacer ahora"],
  ["anomalies", "Detección de anomalías", "activity", "Busca valores raros en tu historial"],
  ["forecast", "Predicción del pH", "trend", "Hacia dónde va tu pH en los próximos días"],
  ["reports", "Agente de informes", "file", "Arma un informe completo de tu agua"],
  ["library", "Biblioteca normativa", "book", "Normas oficiales y datos oficiales de pH"],
  // Análisis avanzado: the same questions answered with models trained on the person's own data.
  ["deep", "Red neuronal (LSTM)", "trend", "Predicción aprendida de tus propios datos"],
  ["ml", "Aprendizaje automático", "brain", "Isolation Forest entrenado con tus datos"],
  ["scenario", "Simulador de escenarios", "flask", "¿Y si el pH fuera otro? Mira qué pasaría"],
  // Not in Aqua's list: the chat in large (from the chat itself) and the AI consumption (administrators).
  ["assistant", "Mis conversaciones", "message", "Todas tus conversaciones con Aqua"],
  ["usage", "Consumo y costos", "database", "Cuántas consultas de IA se han usado"],
];

/** Old links to a function that is now part of another one. */
export const AI_ALIASES = { recommendations: "diagnosis" };

export const aiFunction = (key) => AI_FUNCTIONS.find(([k]) => k === key);
