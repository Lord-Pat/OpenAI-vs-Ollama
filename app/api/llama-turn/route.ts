import { NextResponse } from "next/server";

// Tipo interno: un mensaje de nuestra conversación (frontend/backend)
type ChatMsg = { speaker: "openai" | "llama"; content: string };

/**
 * ENDPOINT: POST /api/llama-turn
 *
 * Qué hace:
 * - Recibe el historial de la conversación (history)
 * - Llama al modelo local (Ollama) para generar la siguiente respuesta
 * - Devuelve un único mensaje nuevo (speaker="llama", content="...")
 *
 * Por qué es POST:
 * - Porque enviamos datos (history) en el body.
 */
export async function POST(req: Request) {
  try {
    // 1) Leemos el body JSON del request y extraemos "history"
    //    history es un array de ChatMsg (mensajes anteriores)
    const { history } = (await req.json()) as { history: ChatMsg[] };

    // 2) Leemos configuración desde .env.local (o usamos valores por defecto)
    //    baseUrl: dónde escucha Ollama
    //    model: qué modelo local se usará (en tu caso: deepseek-r1:8b)
    const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
    const model = process.env.OLLAMA_MODEL ?? "llama3";

    /**
     * 3) Convertimos nuestro "history" (ChatMsg[]) al formato que espera Ollama:
     *    - Ollama /api/chat trabaja con "messages" y roles: system / user / assistant
     *
     *    Estrategia simple para el ejercicio:
     *    - Ponemos un mensaje system (reglas de estilo)
     *    - Metemos todo el historial como si fuera "assistant" (texto plano etiquetado)
     *      Esto NO es perfecto, pero es suficiente para el ejercicio didáctico.
     *    - Añadimos al final un "user" que le dice: "ahora te toca responder"
     */
    const messages = [
      {
        role: "system",
        content:
          "Eres un LLM hablando con otro LLM, ten en cuenta que eres muy pasota y eres muy feliz en la vida sin darle mucha importancia a las cosas. Responde en 2-4 frases. " +
          "No hables como si fueras un humano.",
      },

      // Convertimos cada ChatMsg del historial a un mensaje que Ollama entienda
      ...(history ?? []).map((m) => ({
        role: "assistant",
        content: `${m.speaker.toUpperCase()}: ${m.content}`,
      })),

      // Este último mensaje fuerza a Ollama a generar la siguiente respuesta
      { role: "user", content: "Ahora te toca responder. Continúa la conversación." },
    ];

    /**
     * 4) Llamada HTTP a Ollama local
     *    Endpoint: POST http://localhost:11434/api/chat
     *    Enviamos: model, messages, y stream=false (respuesta completa de golpe)
     */
    const r = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
      }),
    });

    // 5) Si Ollama responde con error (ej: modelo no existe, servidor apagado...)
    //    devolvemos un 500 al frontend con el texto del error.
    if (!r.ok) {
      const txt = await r.text();
      return NextResponse.json(
        { error: `Ollama error ${r.status}: ${txt}` },
        { status: 500 }
      );
    }

    // 6) Si va bien, parseamos el JSON y extraemos el texto generado por Ollama
    const data = await r.json();
    const content = (data?.message?.content ?? "").trim() || "(sin respuesta)";

    // 7) Devolvemos al frontend el nuevo mensaje en nuestro formato estándar (ChatMsg)
    return NextResponse.json({ speaker: "llama", content });
  } catch (err: any) {
    // 8) Captura de errores inesperados (JSON mal formado, fallo de red, etc.)
    return NextResponse.json(
      { error: err?.message ?? "Ollama error" },
      { status: 500 }
    );
  }
}
