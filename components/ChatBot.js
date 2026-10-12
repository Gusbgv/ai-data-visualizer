import { useEffect, useRef, useState } from "react";
import styles from "../styles/app.module.css";

// Floating AI analyst: always visible in the corner, knows which chart you asked about.
export default function ChatBot({ open, setOpen, chartContext, clearChart, datasetContext, request }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading]);

  // A chart card asked a question (e.g. "Summarize this chart")
  useEffect(() => {
    if (request) send(request.question, request.context);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.id]);

  async function send(text, ctx) {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput("");
    const next = [...messages, { role: "user", content: q, chart: (ctx || chartContext)?.chart }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.slice(-8).map(({ role, content }) => ({ role, content })),
          context: { dataset: datasetContext, chart: ctx || chartContext || null },
        }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.result || data.error }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Couldn't reach the AI. Is the server running?" }]);
    }
    setLoading(false);
  }

  const quick = chartContext
    ? ["Summarize this chart", "What stands out?", "Explain it simply"]
    : ["Give me an overview", "What's most surprising?", "What should I look at first?"];

  return (
    <>
      <button className={styles.fab} onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Open AI analyst">
        {open ? "✕" : "✨"} <span className={styles.fabText}>{open ? "Close" : "Ask AI"}</span>
      </button>

      {open && (
        <aside className={styles.chat} aria-label="AI analyst">
          <header className={styles.chatHead}>
            <div>
              <strong>AI Analyst</strong>
              <span className={styles.chatSub}>Short answers from the data on screen</span>
            </div>
            {messages.length > 0 && (
              <button className={styles.linkBtn} onClick={() => setMessages([])}>Clear</button>
            )}
          </header>

          <div className={styles.chatContext}>
            {chartContext ? (
              <span className={styles.contextChip}>
                📊 {chartContext.chart}
                <button onClick={clearChart} aria-label="Stop focusing on this chart">✕</button>
              </span>
            ) : (
              <span className={styles.contextMuted}>Talking about: {datasetContext?.name}. Tip: hit ✨ Summarize on any chart.</span>
            )}
          </div>

          <div className={styles.chatList} ref={listRef}>
            {messages.length === 0 && <p className={styles.chatEmpty}>Ask anything about the charts. I keep it short.</p>}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? styles.msgUser : styles.msgBot}>
                {m.content}
              </div>
            ))}
            {loading && <div className={styles.msgBot}><span className={styles.dots}><i /><i /><i /></span></div>}
          </div>

          <div className={styles.chips}>
            {quick.map((q) => (
              <button key={q} className={styles.chip} onClick={() => send(q)} disabled={loading}>{q}</button>
            ))}
          </div>
          <form className={styles.askRow} onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input className={styles.input} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about the data..." />
            <button className={styles.primary} disabled={loading}>Ask</button>
          </form>
        </aside>
      )}
    </>
  );
}
