import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import type { Session } from './types';

const WebApp = window.Telegram?.WebApp;
function getApiUrl(): string {
  // Try query param (?api=...)
  const params = new URLSearchParams(window.location.search);
  const api = params.get('api');
  if (api) return api;

  // Try from hash (Telegram puts query after hash)
  const hash = window.location.hash;
  const match = hash.match(/[?&]api=([^&]+)/);
  if (match) return decodeURIComponent(match[1]);

  // Also check tgWebAppStartParam
  const startMatch = hash.match(/tgWebAppStartParam=([^&]+)/);
  if (startMatch) return decodeURIComponent(startMatch[1]);

  // Fallback: try localStorage (saved from last session)
  return localStorage.getItem('claude_api_url') ?? '';
}

const API_URL = getApiUrl();

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  sessionLabel: string;
  duration?: number;
  timestamp: number;
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function shortenPath(cwd: string): string {
  return cwd.replace(/^\/Users\/[^/]+/, '~');
}

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [stickyId, setStickyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/sessions`);
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
        if (data.stickyId && !selected) {
          setStickyId(data.stickyId);
          setSelected(data.stickyId);
        }
      }
      setError(null);
      if (API_URL) localStorage.setItem('claude_api_url', API_URL);
    } catch {
      setError('Cannot reach Claude bot');
    }
  }, [selected]);

  useEffect(() => {
    if (WebApp) {
      WebApp.ready();
      WebApp.expand();
    }
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSelect = (session: Session) => {
    setSelected(session.id);
    inputRef.current?.focus();
  };

  const handleSend = async () => {
    if (!message.trim() || !selected || loading) return;

    const session = sessions.find(s => s.id === selected);
    if (!session) return;

    const userMsg: ChatMessage = {
      role: 'user',
      text: message.trim(),
      sessionLabel: session.label,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/sessions/${selected}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.text }),
      });
      const data = await res.json();

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        text: data.output ?? data.error ?? 'No response',
        sessionLabel: session.label,
        duration: data.duration,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Failed to reach Claude bot. Is your Mac online?',
        sessionLabel: session.label,
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const targetSession = sessions.find(s => s.id === selected);

  return (
    <div className="app">
      <div className="header">
        <h1>Claude Code</h1>
        <div className="header-sub">
          {error ? (
            <span className="error-text">{error}</span>
          ) : (
            `${sessions.length} session${sessions.length !== 1 ? 's' : ''} active`
          )}
        </div>
      </div>

      {sessions.length === 0 && !error ? (
        <div className="empty-state">
          <div className="empty-icon">&#x1F4BB;</div>
          <div className="empty-title">No sessions</div>
          <div className="empty-text">
            Start Claude Code in a terminal to see sessions here
          </div>
        </div>
      ) : (
        <>
          <div className="section-title">Sessions</div>
          <div className="session-list">
            {sessions.map((session, i) => (
              <div
                key={session.id}
                className={`session-card ${selected === session.id ? 'selected' : ''} ${stickyId === session.id ? 'sticky' : ''}`}
                onClick={() => handleSelect(session)}
              >
                <div className="session-top">
                  <div className={`session-status ${session.status}`} />
                  <span className="session-number">#{i + 1}</span>
                  <span className="session-label">{session.label}</span>
                </div>
                <div className="session-cwd">{shortenPath(session.cwd)}</div>
                <div className="session-time">{timeAgo(session.lastActivityAt)}</div>
              </div>
            ))}
          </div>

          {messages.length > 0 && (
            <>
              <div className="section-title">Messages</div>
              <div className="chat-area" ref={chatRef}>
                {messages.map((msg, i) => (
                  <div key={i} className={`chat-msg ${msg.role}`}>
                    <div className="chat-msg-header">
                      {msg.role === 'user' ? 'You' : 'Claude'}
                      <span className="chat-msg-meta">
                        {msg.sessionLabel}
                        {msg.duration != null && ` · ${msg.duration}s`}
                      </span>
                    </div>
                    <div className="chat-msg-text">{msg.text}</div>
                  </div>
                ))}
                {loading && (
                  <div className="chat-msg assistant">
                    <div className="chat-msg-header">Claude <span className="chat-msg-meta">thinking...</span></div>
                    <div className="chat-msg-text loading-dots">
                      <span /><span /><span />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      <div className="message-area">
        {targetSession ? (
          <div className="message-target">
            Sending to <strong>{targetSession.label}</strong>
          </div>
        ) : (
          <div className="message-target">Select a session above</div>
        )}
        <div className="message-row">
          <textarea
            ref={inputRef}
            className="message-input"
            placeholder="Message to Claude..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
          />
          <button
            className="send-btn"
            disabled={!message.trim() || !selected || loading}
            onClick={handleSend}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
