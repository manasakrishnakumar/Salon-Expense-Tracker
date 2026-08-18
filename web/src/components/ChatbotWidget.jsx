import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../lib/api';

const SUGGESTIONS = [
  "How much did I make today?",
  "What's my profit this month?",
  "What's low on stock?",
  "Who is my top customer?",
];

const GREETING = "Hi! I'm your salon assistant — ask me things like \"how much did I make today\" or \"what's low on stock\".";

// Owner-only floating chat widget. Answers are computed server-side from
// this owner's real data (logic/chatbot.js) — no external AI service, no
// hallucinated numbers. Mounted once in App.jsx.
export default function ChatbotWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'bot', text: GREETING }]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  if (user?.role !== 'owner') return null;

  const send = async (text) => {
    const message = (text ?? input).trim();
    if (!message || sending) return;

    setMessages((prev) => [...prev, { role: 'user', text: message }]);
    setInput('');
    setSending(true);
    setError('');

    try {
      const result = await apiPost('/api/chatbot/query', { message });
      setMessages((prev) => [...prev, { role: 'bot', text: result.answer }]);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setMessages((prev) => [...prev, { role: 'bot', text: "Sorry, I couldn't reach the server just now." }]);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    send();
  };

  return (
    <>
      {open && (
        <div
          style={{
            position: 'fixed', bottom: 96, right: 24, width: 340, maxWidth: 'calc(100vw - 32px)',
            height: 460, maxHeight: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column',
            background: 'var(--bg-card)', border: '1px solid var(--border-glow)', borderRadius: 20,
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)', zIndex: 1000, overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '14px 16px', background: 'var(--grad-hero)', display: 'flex',
            justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
          }}>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>🤖 Salon Assistant</div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 4 }}
              aria-label="Close assistant"
            >✕</button>
          </div>

          <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '9px 13px',
                  borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: m.role === 'user' ? 'var(--grad-purple-pink)' : 'var(--bg-card-light)',
                  color: m.role === 'user' ? '#fff' : 'var(--text)',
                  border: m.role === 'bot' ? '1px solid var(--border)' : 'none',
                  fontSize: 13,
                  lineHeight: 1.4,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {m.text}
              </div>
            ))}
            {sending && (
              <div style={{ alignSelf: 'flex-start', fontSize: 12, color: 'var(--text-muted)', padding: '4px 8px' }}>
                thinking…
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 12px 10px', flexShrink: 0 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{
                    fontSize: 11, padding: '6px 10px', borderRadius: 99, cursor: 'pointer',
                    background: 'var(--bg-card-light)', border: '1px solid var(--border)', color: 'var(--text-secondary, var(--text))',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <input
              className="form-input"
              style={{ flex: 1, fontSize: 13 }}
              placeholder="Ask about your salon..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !input.trim()}>
              →
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24, width: 56, height: 56, borderRadius: '50%',
          background: 'var(--grad-purple-pink)', border: 'none', color: '#fff', fontSize: 24,
          cursor: 'pointer', boxShadow: '0 10px 30px rgba(168,85,247,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        aria-label={open ? 'Close salon assistant' : 'Open salon assistant'}
      >
        {open ? '✕' : '💬'}
      </button>
    </>
  );
}
