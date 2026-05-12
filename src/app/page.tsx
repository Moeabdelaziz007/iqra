'use client'

import React, { useState, useEffect } from 'react'
import { SacredCard } from '../components/SacredCard'
import '../styles/sovereign.css'

export default function Home() {
  const [isThinking, setIsThinking] = useState(false)
  const [query, setQuery] = useState('')
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
    <main className="main-container iqra-padding" style={{ minHeight: '100vh', direction: 'rtl' }}>
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header style={{ textAlign: 'center', marginBottom: '6rem', marginTop: '4rem' }}>
        <h1 className="neon-text float" style={{ fontSize: 'clamp(3rem, 10vw, 8rem)', fontWeight: 900, marginBottom: '0', lineHeight: 1.1 }}>
          إقرأ <span style={{ color: '#fff' }}>IQRA</span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', opacity: 0.8 }}>
          <div style={{ height: '1px', width: '60px', background: 'var(--iqra-neon)' }}></div>
          <p style={{ fontSize: '1rem', letterSpacing: '0.4em', textTransform: 'uppercase', color: 'var(--iqra-neon)' }}>
            Sovereign Architecture
          </p>
          <div style={{ height: '1px', width: '60px', background: 'var(--iqra-neon)' }}></div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* ── SEARCH SECTION ────────────────────────────────────────────────── */}
        <div className="glass-surface iqra-padding neon-border" style={{ position: 'relative' }}>
          <h2 className="neon-text" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>استفسار سيادي | Sovereign Query</h2>
          <textarea 
            placeholder="تواصل مع الرنين الطوبولوجي..."
            style={{
              width: '100%',
              minHeight: '150px',
              padding: '1.5rem',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '1.2rem',
              outline: 'none',
              transition: 'all 0.3s ease',
              textAlign: 'center',
              resize: 'none'
            }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button 
            className={`pulse-neon`} 
            style={{ 
              marginTop: '1.5rem', 
              width: '100%', 
              padding: '1rem', 
              background: 'var(--iqra-neon)', 
              color: '#000', 
              border: 'none', 
              borderRadius: '8px', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              fontSize: '1.1rem'
            }}
            onClick={handleDeepAnalysis}
            disabled={isThinking}
          >
            {isThinking ? 'جاري البحث في اللانهاية...' : 'استدعاء الرنين | Invoke Resonance'}
          </button>
        </div>

        {/* ── BRAIN OUTPUT ─────────────────────────────────────────── */}
        <div className="glass-surface iqra-padding" style={{ border: '1px solid var(--iqra-border)' }}>
          <h2 className="neon-text" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>وحي العقل | Brain Wisdom</h2>
          {response ? (
            <div style={{ animation: 'fadeIn 1s ease', lineHeight: 1.8, fontSize: '1.1rem' }}>
              <p style={{ whiteSpace: 'pre-wrap' }}>{response}</p>
            </div>
          ) : (
            <div style={{ opacity: 0.3, textAlign: 'center', padding: '4rem 0' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                {isThinking ? '🌀' : '⚖️'}
              </div>
              {isThinking ? 'Processing through MĪTHĀQ layers...' : 'Awaiting consciousness input...'}
            </div>
          )}
        </div>

      </div>

      {/* ── MEMORY ECHOES ────────────────────────────────────────────────── */}
      {echoes.length > 0 && (
        <section style={{ marginTop: '6rem' }}>
          <h3 className="neon-text" style={{ marginBottom: '2rem', fontSize: '1.5rem', textAlign: 'center', letterSpacing: '0.2em' }}>
            أصداء الذاكرة | MEMORY ECHOES
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            {echoes.map((echo, i) => (
              <div key={i} className="glass-surface iqra-padding" style={{ fontSize: '0.9rem' }}>
                <p style={{ opacity: 0.8, fontStyle: 'italic' }}>
                  &quot;{echo.content.substring(0, 150)}...&quot;
                </p>
                <div style={{ marginTop: '1rem', fontSize: '0.7rem', color: 'var(--iqra-neon)' }}>
                  RELEVANCE: {(echo.score || 0.8).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── AYAH DISPLAY ─────────────────────────────────────────────────── */}
      <section style={{ marginTop: '8rem' }}>
        <div className="glass-surface iqra-padding neon-border pulse-neon" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1.5rem', fontFamily: 'var(--iqra-font-ar)' }}>
            إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ
          </div>
          <div style={{ opacity: 0.7, fontSize: '1.1rem', maxWidth: '800px', margin: '0 auto' }}>
            Indeed, it is We who sent down the message and indeed, We will be its guardian.
          </div>
          <div style={{ marginTop: '1.5rem', opacity: 0.4, fontSize: '0.8rem' }}>
            [سورة الحجر : الآية ٩]
          </div>
        </div>
      </section>

      <footer style={{ marginTop: '10rem', paddingBottom: '5rem', textAlign: 'center', opacity: 0.4 }}>
        <div style={{ fontSize: '0.8rem', letterSpacing: '0.4em', color: 'var(--iqra-neon)' }}>
          MĪTHĀQ PROTOCOL V3.7.9 | SOVEREIGN ARCHITECTURE
        </div>
      </footer>
    </main>
  )
}
