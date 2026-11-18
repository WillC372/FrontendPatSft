// The AI functions of Aqua Assistant. They open from Aqua (the robot), the only entry point to the AI.
// [route key, title, icon, short explanation shown in Aqua's panel]
export const AI_FUNCTIONS = [
  ["diagnosis", "Diagnóstico IA", "sparkle", "Revisa tus mediciones y te dice el riesgo"],
  ["anomalies", "Detección de anomalías", "activity", "Busca valores raros en tu historial"],
  ["recommendations", "Recomendaciones", "shield", "Qué hacer según tu última medición"],
  ["forecast", "Predicción de tendencias", "trend", "Hacia dónde va tu pH en los próximos días"],
  ["deep", "Red neuronal (LSTM)", "trend", "Predicción aprendida de tus propios datos"],
  ["scenario", "Simulador de escenarios", "flask", "¿Y si el pH fuera otro? Mira qué pasaría"],
  ["ml", "Aprendizaje automático", "brain", "Isolation Forest entrenado con tus datos"],
  ["reports", "Agente de informes", "file", "Arma un informe completo de tu agua"],
  ["library", "Biblioteca normativa", "book", "Normas oficiales sobre el pH del agua"],
  ["assistant", "Asistente IA", "message", "Todas tus conversaciones, en grande"],
  ["usage", "Consumo y costos", "database", "Cuántas consultas de IA has usado"],
];

export const aiFunction = (key) => AI_FUNCTIONS.find(([k]) => k === key);
