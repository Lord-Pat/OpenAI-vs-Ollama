// types.ts
// ----------
// Este archivo define los TIPOS de datos que usaremos en toda la aplicación.
//
// En este caso definimos el tipo ChatMsg, que representa
// un mensaje dentro de la conversación entre los dos LLM.
//
// Usar tipos tiene varias ventajas:
// - Evita errores (TypeScript comprueba que los datos sean correctos)
// - Hace el código más fácil de entender
// - Permite reutilizar el mismo formato de mensaje en frontend y backend

export type ChatMsg = {
  // Indica qué modelo ha generado el mensaje.
  // Solo puede ser "openai" o "llama"
  speaker: "openai" | "llama";

  // Texto del mensaje generado por el LLM
  content: string;
};