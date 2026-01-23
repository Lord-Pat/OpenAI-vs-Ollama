"use client";

import { useMemo, useState, useEffect, useRef } from "react";

type ChatMsg = { speaker: "openai" | "llama"; content: string };

export default function Home() {
  const [topic, setTopic] = useState("Impacto de la IA en la educación");
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [turn, setTurn] = useState<"openai" | "llama">("openai");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [roundCount, setRoundCount] = useState(0);
  const maxRounds = 10;

  const [showExport, setShowExport] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isFinished = roundCount >= maxRounds;
  const canExport = (showExport || isFinished) && history.length > 0;

  const title = useMemo(
    () =>
      isRunning
        ? `💬 Debate en curso: ${turn.toUpperCase()} (${roundCount}/${maxRounds})`
        : isFinished
        ? `✅ Debate finalizado (${topic})`
        : `Debate LLM vs LLM (${topic})`,
    [turn, isRunning, roundCount, topic, isFinished]
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  useEffect(() => {
    if (isFinished && history.length > 0) setShowExport(true);
  }, [isFinished, history.length]);

  // 🌌 Fondo Matrix animado (con resize)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const letters = "01";
    const fontSize = 16;

    let columns = 0;
    let drops: number[] = [];
    let interval: number | undefined;

    const setup = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Math.floor(canvas.width / fontSize);
      drops = Array(columns).fill(1);
    };

    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#00FF80";
      ctx.font = `${fontSize}px monospace`;

      drops.forEach((y, i) => {
        const text = letters.charAt(Math.floor(Math.random() * 2));
        ctx.fillText(text, i * fontSize, y * fontSize);
        if (y * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });
    };

    setup();
    interval = window.setInterval(draw, 50);

    const onResize = () => setup();
    window.addEventListener("resize", onResize);

    return () => {
      if (interval) window.clearInterval(interval);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  async function nextTurn() {
    setLoading(true);
    setError(null);
    try {
      const endpoint = turn === "openai" ? "/api/openai-turn" : "/api/llama-turn";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history, topic }),
      });

      if (!res.ok) throw new Error(await res.text());
      const msg = (await res.json()) as ChatMsg;

      setHistory((h) => [...h, msg]);
      setTurn((t) => (t === "openai" ? "llama" : "openai"));
      setRoundCount((r) => r + 1);
    } catch (e: any) {
      setError(e?.message ?? "Error desconocido");
      setIsRunning(false);
      if (history.length > 0) setShowExport(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isRunning && !loading && roundCount < maxRounds) {
      const timer = setTimeout(() => nextTurn(), 2000);
      return () => clearTimeout(timer);
    }
    if (isRunning && roundCount >= maxRounds) {
      setIsRunning(false);
      setShowExport(true);
    }
  }, [isRunning, loading, turn, roundCount, topic]);

  function reset() {
    setHistory([]);
    setTurn("openai");
    setError(null);
    setRoundCount(0);
    setIsRunning(false);
    setShowExport(false);
  }

  function stopDebate() {
    setIsRunning(false);
    if (history.length > 0) setShowExport(true);
  }

  function startConversation() {
    if (history.length > 0) reset();
    setIsRunning(true);
    setShowExport(false);
    void nextTurn();
  }

  function handleKeyPress(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && topic.trim()) {
      e.preventDefault();
      startConversation();
    }
  }

  function exportConversation(format: "txt" | "json") {
    const filename = `debate-${new Date().toISOString().split("T")[0]}.${format}`;
    const blob =
      format === "txt"
        ? new Blob(
            [
              `Tema: ${topic}\n\n${history
                .map((m, i) => `${i + 1}. [${m.speaker.toUpperCase()}]: ${m.content}`)
                .join("\n\n")}`,
            ],
            { type: "text/plain" }
          )
        : new Blob([JSON.stringify({ topic, history }, null, 2)], {
            type: "application/json",
          });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100vh",
        overflowX: "hidden",
        fontFamily: "'Fira Code', monospace",
        color: "#E0FFE0",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          background: "radial-gradient(circle at center, rgba(0,40,0,0.7) 0%, black 80%)",
        }}
      />

      <section
        style={{
          position: "relative",
          zIndex: 10,
          padding: "24px",
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <h1 style={{ fontSize: 22, marginBottom: 10 }}>{title}</h1>

        {/* ✅ Arriba SOLO la fila input + start + stop/reset */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Escribe un tema y pulsa Enter…"
            style={{
              flex: "1 1 320px",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,255,128,0.25)",
              background: "rgba(0,0,0,0.35)",
              color: "#E0FFE0",
              outline: "none",
            }}
          />

          <button
            onClick={startConversation}
            disabled={loading || !topic.trim()}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(0,255,128,0.35)",
              background: loading ? "rgba(0,255,128,0.12)" : "rgba(0,255,128,0.18)",
              color: "#E0FFE0",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {isRunning ? "Reiniciar y empezar" : "Empezar debate"}
          </button>

          {isRunning ? (
          <button
            onClick={stopDebate}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,80,80,0.35)",
              background: "rgba(255,200,80,0.12)",
              color: "#E0FFE0",
              cursor: "pointer",
            }}
          >
            Parar debate
          </button>

          ) : (
            <button
              onClick={reset}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,80,80,0.35)",
                background: "rgba(255,80,80,0.12)",
                color: "#E0FFE0",
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          )}
        </div>

        {error && (
          <div
            style={{
              marginBottom: 12,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,80,80,0.35)",
              background: "rgba(255,80,80,0.10)",
            }}
          >
            {error}
          </div>
        )}

        {/* Caja de chat */}
        <div
          style={{
            border: "1px solid rgba(0,255,128,0.22)",
            background: "rgba(0,0,0,0.35)",
            borderRadius: 14,
            padding: 14,
            height: "60vh",
            overflowY: "auto",
            boxShadow: "0 0 30px rgba(0,255,128,0.06)",
          }}
        >
          {history.length === 0 ? (
            <div style={{ opacity: 0.8, lineHeight: 1.5 }}>
              Escribe un tema y pulsa <b>Enter</b> o <b>Empezar debate</b>.
              <br />
              Se alternarán turnos entre <b>OpenAI</b> y <b>Ollama</b> hasta {maxRounds} rondas.
            </div>
          ) : (
            <>
              {history.map((m, i) => {
                // ✅ OpenAI derecha, llama izquierda
                const isOpenAI = m.speaker === "openai";

                return (
                  <div
                    key={`${m.speaker}-${i}`}
                    style={{
                      display: "flex",
                      justifyContent: isOpenAI ? "flex-end" : "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "85%",
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: `1px solid ${
                          isOpenAI ? "rgba(0,255,128,0.28)" : "rgba(140,200,255,0.28)"
                        }`,
                        background: isOpenAI
                          ? "rgba(0,255,128,0.08)"
                          : "rgba(140,200,255,0.08)",
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.45,
                      }}
                    >
                      <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>
                        {isOpenAI ? "OPENAI" : "LLAMA"}
                      </div>
                      {m.content}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div style={{ opacity: 0.8, marginTop: 8 }}>
                  Generando respuesta de <b>{turn.toUpperCase()}</b>…
                </div>
              )}

              {/* ✅ Export debajo de los mensajes (y al final) */}
              {canExport && (
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: "1px solid rgba(224,255,224,0.12)",
                    display: "flex",
                    gap: 10,
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() => exportConversation("txt")}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid rgba(160,160,255,0.35)",
                      background: "rgba(160,160,255,0.12)",
                      color: "#E0FFE0",
                      cursor: "pointer",
                    }}
                  >
                    Exportar TXT
                  </button>

                  <button
                    onClick={() => exportConversation("json")}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid rgba(160,160,255,0.35)",
                      background: "rgba(160,160,255,0.12)",
                      color: "#E0FFE0",
                      cursor: "pointer",
                    }}
                  >
                    Exportar JSON
                  </button>
                </div>
              )}
            </>
          )}

          <div ref={chatEndRef} />
        </div>
      </section>
    </main>
  );
}
