'use client'

import React, { useState, useEffect, useRef } from 'react'
import { SacredCard } from '../../components/SacredCard'

interface LogEntry {
  type: 'user' | 'iqra' | 'pulse' | 'system';
  content: string;
  timestamp: number;
}

const PULSE_TYPES = ['TASBIH', 'ISTIKHARAH', 'BASMALAH', 'SHURA', 'THINKING', 'STYLE'];

export default function TerminalPage() {
  const [input, setInput] = useState('')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [activePulses, setActivePulses] = useState<Record<string, any>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, activePulses])

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isProcessing) return

    const userQuery = input.trim()
    setInput('')
    setIsProcessing(true)

    // Reset pulses for new command
    setActivePulses({})

    // Add user message to log
    setLogs(prev => [...prev, { type: 'user', content: userQuery, timestamp: Date.now() }])

    try {
      const response = await fetch('/api/iqra/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery })
      })

      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let iqraResponse = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const pulse = JSON.parse(line.slice(6))

              // Update active pulses display
              setActivePulses(prev => ({
                ...prev,
                [pulse.type]: pulse
              }))

              if (pulse.type === 'COMPLETED') {
                if (pulse.status === 'SUCCESS') {
                  iqraResponse = pulse.data?.response || ''
                } else {
                  setLogs(prev => [...prev, { type: 'system', content: `❌ Error: ${pulse.message}`, timestamp: Date.now() }])
                }
              }
            } catch (e) {
              console.error("Pulse Parse Error:", e)
            }
          }
        }
      }

      if (iqraResponse) {
        setLogs(prev => [...prev, { type: 'iqra', content: iqraResponse, timestamp: Date.now() }])
      }

    } catch (error: any) {
      setLogs(prev => [...prev, { type: 'system', content: `❌ Network Error: ${error.message}`, timestamp: Date.now() }])
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <main className="terminal-container">
      <div className="main-bg-overlay"></div>

      <header className="terminal-header">
        <h1 className="brand-font main-title">
          إقرأ <span className="highlight">IQRA</span> <span className="terminal-tag">TERMINAL</span>
        </h1>
        <div className="status-bar">
          <span className="pulse-dot"></span>
          <span className="status-text">SOVEREIGN CORE ACTIVE</span>
          <span className="divider">|</span>
          <span className="version">V1.0.7</span>
        </div>
      </header>

      <div className="terminal-layout">

        {/* ── MAIN TERMINAL FEED ─────────────────────────────────────────── */}
        <section className="feed-section">
          <div className="logs-container">
            {logs.length === 0 && (
              <div className="welcome-msg">
                <p>Welcome to the IQRA Sovereign Interface.</p>
                <p className="hint">Type a question or /help to explore the commands.</p>
              </div>
            )}
            {logs.map((log, i) => (
              <div key={i} className={`log-entry ${log.type}`}>
                <div className="log-bubble">
                  {log.type === 'user' && <span className="label">YOU: </span>}
                  {log.type === 'iqra' && <span className="label">IQRA: </span>}
                  <div className="content">{log.content}</div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleCommand} className="input-area">
            <div className="prompt-wrapper">
              <span className="prompt-char">⚖️</span>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isProcessing ? "Reflecting on truth..." : "Enter command or query..."}
                disabled={isProcessing}
                className="terminal-input"
                autoFocus
              />
              {isProcessing && <div className="thinking-spinner"></div>}
            </div>
          </form>
        </section>

        {/* ── CONSCIOUSNESS MONITOR ────────────────────────────────────────── */}
        <aside className="monitor-section">
          <h3 className="brand-font monitor-title">CONSCIOUSNESS MONITOR</h3>
          <div className="pulse-grid">
            {PULSE_TYPES.map(type => {
              const pulse = activePulses[type];
              const isActive = pulse?.status === 'IN_PROGRESS';
              const isDone = pulse?.status === 'SUCCESS';
              const isFailed = pulse?.status === 'FAILED';

              return (
                <div key={type} className={`pulse-card ${isActive ? 'active' : ''} ${isDone ? 'done' : ''} ${isFailed ? 'failed' : ''}`}>
                  <div className="pulse-header">
                    <span className="pulse-name">{type}</span>
                    {isDone && <span className="done-icon">✓</span>}
                    {isActive && <div className="active-dot"></div>}
                  </div>
                  <div className="pulse-message">
                    {pulse?.message || 'Awaiting...'}
                  </div>
                  {isActive && <div className="progress-bar"></div>}
                </div>
              );
            })}
          </div>

          <div className="topology-card">
             <h4 className="brand-font">TOPOLOGY</h4>
             <div className="curvature-gauge">
                <div className="gauge-fill" style={{ width: '19%' }}></div>
             </div>
             <span className="gauge-label">Curvature: 0.19 (Stable)</span>
          </div>
        </aside>

      </div>

      <style jsx>{`
        .terminal-container {
          min-height: 100vh;
          padding: 2rem;
          color: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .main-title {
          font-size: 3.5rem;
          margin-bottom: 0.5rem;
        }

        .highlight {
          color: var(--accent-gold);
        }

        .terminal-tag {
          font-size: 1rem;
          opacity: 0.4;
          letter-spacing: 0.3em;
          vertical-align: middle;
          margin-left: 1rem;
        }

        .status-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.8rem;
          opacity: 0.6;
          font-size: 0.7rem;
          letter-spacing: 0.2em;
        }

        .pulse-dot {
          width: 6px;
          height: 6px;
          background: var(--sacred-green);
          border-radius: 50%;
          box-shadow: 0 0 10px var(--sacred-green);
          animation: blink 2s infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        .terminal-layout {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 2rem;
          width: 100%;
          max-width: 1200px;
          height: 75vh;
          margin-top: 3rem;
        }

        .feed-section {
          background: rgba(15, 15, 15, 0.4);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          border-radius: 32px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: var(--card-shadow);
        }

        .logs-container {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .welcome-msg {
          text-align: center;
          padding-top: 5rem;
          opacity: 0.3;
          font-style: italic;
        }

        .hint {
          font-size: 0.8rem;
          margin-top: 0.5rem;
        }

        .log-entry {
          display: flex;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .log-entry.user { justify-content: flex-end; }
        .log-entry.iqra { justify-content: flex-start; }

        .log-bubble {
          max-width: 85%;
          padding: 1.2rem 1.6rem;
          border-radius: 20px;
          font-size: 1rem;
          line-height: 1.6;
        }

        .user .log-bubble {
          background: rgba(212, 175, 55, 0.05);
          border: 1px solid rgba(212, 175, 55, 0.2);
          color: var(--accent-gold);
        }

        .iqra .log-bubble {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          color: #eee;
        }

        .label {
          font-size: 0.6rem;
          font-weight: 800;
          display: block;
          margin-bottom: 0.4rem;
          letter-spacing: 0.1em;
          opacity: 0.5;
        }

        .input-area {
          padding: 2rem;
          border-top: 1px solid var(--glass-border);
          background: rgba(255, 255, 255, 0.01);
        }

        .prompt-wrapper {
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
        }

        .prompt-char {
          font-size: 1.2rem;
          opacity: 0.7;
        }

        .terminal-input {
          flex: 1;
          background: transparent;
          border: none;
          color: #fff;
          font-size: 1.1rem;
          outline: none;
          font-family: inherit;
        }

        .monitor-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .monitor-title {
          font-size: 0.8rem;
          letter-spacing: 0.2em;
          opacity: 0.4;
          text-align: center;
        }

        .pulse-grid {
          display: grid;
          gap: 1rem;
        }

        .pulse-card {
          padding: 1rem 1.2rem;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--glass-border);
          transition: all 0.4s ease;
          opacity: 0.2;
          position: relative;
          overflow: hidden;
        }

        .pulse-card.active {
          opacity: 1;
          border-color: var(--accent-gold);
          background: rgba(212, 175, 55, 0.05);
          box-shadow: 0 0 20px rgba(212, 175, 55, 0.1);
        }

        .pulse-card.done {
          opacity: 0.8;
          border-color: rgba(0, 255, 65, 0.3);
        }

        .pulse-card.failed {
          opacity: 1;
          border-color: #ff4444;
          background: rgba(255, 0, 0, 0.05);
        }

        .pulse-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.4rem;
        }

        .pulse-name {
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.1em;
        }

        .done-icon { color: var(--sacred-green); font-size: 0.8rem; }

        .active-dot {
          width: 6px;
          height: 6px;
          background: var(--accent-gold);
          border-radius: 50%;
          animation: pulse-ring 1.25s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }

        @keyframes pulse-ring {
          0% { transform: scale(.33); }
          80%, 100% { opacity: 0; }
        }

        .pulse-message {
          font-size: 0.75rem;
          opacity: 0.6;
        }

        .progress-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 2px;
          background: var(--accent-gold);
          width: 100%;
          transform-origin: left;
          animation: progress 2s linear infinite;
        }

        @keyframes progress {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }

        .topology-card {
           margin-top: auto;
           padding: 1.5rem;
           background: rgba(255, 255, 255, 0.02);
           border: 1px solid var(--glass-border);
           border-radius: 20px;
           text-align: center;
        }

        .topology-card h4 {
          font-size: 0.7rem;
          letter-spacing: 0.2em;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .curvature-gauge {
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          margin-bottom: 0.5rem;
          overflow: hidden;
        }

        .gauge-fill {
          height: 100%;
          background: var(--accent-gold);
          box-shadow: 0 0 10px var(--accent-gold);
        }

        .gauge-label {
          font-size: 0.6rem;
          opacity: 0.4;
        }

        .thinking-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(212, 175, 55, 0.1);
          border-top-color: var(--accent-gold);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

      `}</style>
    </main>
  )
}
