import { useEffect, useRef, useState } from "react";
import { checkHealth, sendMessage } from "./api.js";

function Message({ role, content }) {
  return (
    <div className={`message message--${role}`}>
      <span className="message__role">{role === "user" ? "You" : "AI"}</span>
      <p className="message__content">{content}</p>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [model, setModel] = useState(null);
  const [online, setOnline] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    checkHealth()
      .then((data) => {
        setOnline(true);
        setModel(data.model);
      })
      .catch(() => setOnline(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSubmit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const reply = await sendMessage(text);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header__title">
          <h1>AI Chat</h1>
          {model && <span className="header__model">{model}</span>}
        </div>
        <span className={`status ${online ? "status--online" : "status--offline"}`}>
          {online ? "Connected" : "Offline"}
        </span>
      </header>

      <main className="chat">
        {messages.length === 0 && !loading && (
          <div className="empty">
            <p>Send a message to start chatting with your local AI.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <Message key={i} role={msg.role} content={msg.content} />
        ))}

        {loading && (
          <div className="message message--assistant">
            <span className="message__role">AI</span>
            <p className="message__content typing">Thinking…</p>
          </div>
        )}

        {error && <div className="error">{error}</div>}
        <div ref={messagesEndRef} />
      </main>

      <form className="composer" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={online ? "Type a message…" : "Server offline"}
          disabled={!online || loading}
          autoFocus
        />
        <button type="submit" disabled={!online || loading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
