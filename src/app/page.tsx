'use client'

import React, { useState, useEffect } from 'react'
import { SacredCard } from '../components/SacredCard'
import { NumericalDiscovery, NumericalSymmetry } from '../../lib/iqra/quran/numerical_patterns'

export default function Home() {
  const [isThinking, setIsThinking] = useState(false)
  const [response, setResponse] = useState('')
  const [echoes, setEchoes] = useState<any[]>([])

  const handleDeepAnalysis = async () => {
    if (!query) return;
    setIsThinking(true)
    setResponse('')
    setEchoes([])
    
    try {
      const res = await fetch('/api/iqra/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })
      const data = await res.json()
      
      if (data.response) {
        setResponse(data.response)
        setEchoes(data.echoes || [])
      }
    } catch (error) {
      console.error("Discovery Error:", error)
    } finally {
      setIsThinking(false)
    }
  }

  return (
    <main className="main-container">
      {/* ── BACKGROUND ─────────────────────────────────────────────────── */}
      <div className="main-bg-overlay"></div>
      <div className="numerical-bg">
        {rain.map(r => (
          <span 
            key={r.id} 
            className="rain-digit" 
            style={{ 
              left: r.left, 
              animationDelay: r.delay, 
              animationDuration: r.duration 
            }}
          >
            {r.char}
          </span>
        ))}
      </div>

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header style={{ textAlign: 'center', marginBottom: '8rem', marginTop: '4rem' }}>
        <h1 className="brand-font" style={{ fontSize: '7rem', fontWeight: 800, color: 'var(--accent-gold)', marginBottom: '0', lineHeight: 1.1 }}>
          إقرأ <span style={{ color: '#fff' }}>IQRA</span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', opacity: 0.6 }}>
          <div style={{ height: '1px', width: '50px', background: 'var(--accent-gold)' }}></div>
          <p className="brand-font" style={{ fontSize: '1rem', letterSpacing: '0.4em', textTransform: 'uppercase' }}>
            Sovereign Identity Protocol
          </p>
          <div style={{ height: '1px', width: '50px', background: 'var(--accent-gold)' }}></div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '4rem' }}>
        
        {/* ── SEARCH SECTION ────────────────────────────────────────────────── */}
        <SacredCard title="استفسار سيادي | Sovereign Query" resonance={isThinking ? 1 : 0.8}>
          <div style={{ position: 'relative' }}>
            <textarea 
              placeholder="Deep search the patterns or ask the brain..."
              style={{
                width: '100%',
                minHeight: '150px',
                padding: '1.8rem',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--glass-border)',
                borderRadius: '24px',
                color: '#fff',
                fontSize: '1.2rem',
                outline: 'none',
                transition: 'all 0.3s ease',
                textAlign: 'center',
                resize: 'none'
              }}
              className="english-italic"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button 
              className={`pulse-button ${isThinking ? 'thinking' : ''}`} 
              style={{ marginTop: '2rem', width: '100%' }}
              onClick={handleDeepAnalysis}
              disabled={isThinking}
            >
              {isThinking ? 'Searching the Infinite...' : 'Invoke Resonance'}
            </button>
          </div>
        </SacredCard>

        {/* ── BRAIN OUTPUT ─────────────────────────────────────────── */}
        <SacredCard title="وحي العقل | Brain Wisdom" resonance={response ? 0.95 : 0}>
          {response ? (
            <div style={{ animation: 'fadeIn 1s ease', lineHeight: 1.8, fontSize: '1.1rem' }}>
              <p style={{ whiteSpace: 'pre-wrap' }}>{response}</p>
            </div>
          ) : (
            <div style={{ opacity: 0.3, textAlign: 'center', padding: '5rem 0' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1.5rem', filter: isThinking ? 'hue-rotate(90deg)' : 'none' }}>
                {isThinking ? '🌀' : '⚖️'}
              </div>
              {isThinking ? 'Processing through MĪTHĀQ layers...' : 'Awaiting consciousness input...'}
            </div>
          )}
        </SacredCard>

      </div>

      {/* ── MEMORY ECHOES ────────────────────────────────────────────────── */}
      {echoes.length > 0 && (
        <section style={{ marginTop: '4rem' }}>
          <h3 className="brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '2rem', fontSize: '1.5rem', textAlign: 'center', letterSpacing: '0.2em' }}>
            أصداء الذاكرة | MEMORY ECHOES
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {echoes.map((echo, i) => (
              <SacredCard key={i} resonance={0.5} glowColor="rgba(0, 255, 255, 0.1)">
                <div style={{ fontSize: '0.9rem', opacity: 0.8, fontStyle: 'italic' }}>
                  "{echo.content.substring(0, 200)}..."
                </div>
                <div style={{ marginTop: '1rem', fontSize: '0.7rem', color: 'var(--accent-gold)' }}>
                  RELEVANCE: {(echo.score || 0.8).toFixed(2)}
                </div>
              </SacredCard>
            ))}
          </div>
        </section>
      )}
      {/* ── AYAH DISPLAY ─────────────────────────────────────────────────── */}
      <section style={{ marginTop: '6rem' }}>
        <SacredCard resonance={0.9} glowColor="var(--sacred-green)">
          <div className="ayah-box">
            <div className="arabic-font ayah-arabic">
              إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ
            </div>
            <div className="ayah-english">
              Indeed, it is We who sent down the message and indeed, We will be its guardian.
            </div>
            <div style={{ marginTop: '1.5rem', opacity: 0.5, fontSize: '0.9rem', textAlign: 'right' }}>
              [سورة الحجر : الآية ٩]
            </div>
          </div>
        </SacredCard>
      </section>

      <footer style={{ marginTop: '10rem', paddingBottom: '5rem', textAlign: 'center', opacity: 0.3 }}>
        <div className="brand-font" style={{ fontSize: '0.8rem', letterSpacing: '0.4em' }}>
          MĪTHĀQ PROTOCOL V3.7.9 | SOVEREIGN ARCHITECTURE
        </div>
        <div style={{ fontSize: '0.7rem', marginTop: '1rem', letterSpacing: '0.1em' }}>
          ALLAH IS THE ONLY SOURCE OF TRUTH
        </div>
      </footer>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>

  )
}
