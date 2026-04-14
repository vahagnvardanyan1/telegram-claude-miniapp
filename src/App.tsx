import { useState, useEffect, useRef } from 'react';
import './App.css';
import type { Session } from './types';

const WebApp = window.Telegram?.WebApp;

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
  const [sent, setSent] = useState(false);
  const [debug, setDebug] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!WebApp) return;
    WebApp.ready();
    WebApp.expand();

    // Parse session data from query param, hash, or start_param
    const loadData = (raw: string) => {
      try {
        const data = JSON.parse(decodeURIComponent(raw));
        if (data.sessions) {
          setSessions(data.sessions);
          if (data.stickyId) {
            setStickyId(data.stickyId);
            setSelected(data.stickyId);
          }
        }
      } catch {
        // ignore
      }
    };

    // Debug: show what we received
    const debugInfo = [
      `href: ${window.location.href}`,
      `search: ${window.location.search}`,
      `hash: ${window.location.hash}`,
      `startParam: ${WebApp.initDataUnsafe?.start_param ?? 'none'}`,
    ].join('\n');
    setDebug(debugInfo);

    // Try query parameter (?data=...)
    const params = new URLSearchParams(window.location.search);
    const queryData = params.get('data');
    if (queryData) {
      loadData(queryData);
      return;
    }

    // Try URL hash (#...) — Telegram appends ?tgWebAppData after the hash, so split on ?
    const rawHash = window.location.hash.slice(1);
    const hash = rawHash.split('?')[0];
    if (hash) {
      loadData(hash);
      return;
    }

    // Try start_param (base64)
    const startParam = WebApp.initDataUnsafe?.start_param;
    if (startParam) {
      try {
        loadData(atob(startParam));
      } catch {
        // ignore
      }
    }
  }, []);

  const handleSelect = (session: Session) => {
    setSelected(session.id);
    inputRef.current?.focus();
  };

  const handleSend = () => {
    if (!message.trim() || !selected) return;

    const payload = JSON.stringify({
      action: 'send_message',
      sessionId: selected,
      message: message.trim(),
    });

    if (WebApp) {
      WebApp.sendData(payload);
    }

    setSent(true);
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const targetSession = sessions.find((s) => s.id === selected);

  if (sent) {
    return (
      <div className="app">
        <div className="sent-toast">Sent to Claude</div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <h1>Claude Code</h1>
        <div className="header-sub">
          {sessions.length} session{sessions.length !== 1 ? 's' : ''} active
        </div>
      </div>

      {debug && (
        <pre style={{ padding: '12px 16px', fontSize: '10px', color: '#f97316', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{debug}</pre>
      )}

      {sessions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">&#x1F4BB;</div>
          <div className="empty-title">No sessions loaded</div>
          <div className="empty-text">
            Open this app via <strong>/dash</strong> or <strong>/list</strong> in the chat to load sessions
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
          />
          <button
            className="send-btn"
            disabled={!message.trim() || !selected}
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
