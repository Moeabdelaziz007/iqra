'use client'

import React, { useState, useEffect } from 'react'
import { SacredCard } from '../components/SacredCard'
import { NumericalDiscovery, NumericalSymmetry } from '../../lib/iqra/quran/numerical_patterns'

export default function Home() {
  const [query, setQuery] = useState('')
  const [discoveries, setDiscoveries] = useState<NumericalSymmetry[]>([])
  const [rain, setRain] = useState<{ id: number; char: string; left: string; delay: string; duration: string }[]>([])

  useEffect(() => {
    // Generate Numerical Rain
    const digits = ['3', '7', '9', '19', '40', '700']
    const newRain = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      char: digits[Math.floor(Math.random() * digits.length)],
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 10}s`,
      duration: `${15 + Math.random() * 20}s`
    }))
    setRain(newRain)
  }, [])

  const handleDeepAnalysis = async () => {
    // Placeholder for real analysis
    const sampleText = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"
    const results = await NumericalDiscovery.scanForResonance(sampleText, "1:1")
    setDiscoveries(results)
  }

  return (
    <main className="main-container">
      {/* ── BACKGROUND ─────────────────────────────────────────────────── */}
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
      <header style={{ textAlign: 'center', marginBottom: '5rem', marginTop: '3rem' }}>
        <h1 className="brand-font" style={{ fontSize: '5rem', fontWeight: 800, color: 'var(--accent-gold)', marginBottom: '1rem', textShadow: '0 0 30px rgba(212, 175, 55, 0.3)' }}>
          إقرأ <span style={{ color: '#fff' }}>IQRA</span>
        </h1>
        <p className="brand-font" style={{ opacity: 0.5, fontSize: '1.4rem', letterSpacing: '0.3em', textTransform: 'uppercase' }}>
          Sovereign Discovery Protocol v3.7.9
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '3rem' }}>
        
        {/* ── SEARCH SECTION ────────────────────────────────────────────────── */}
        <SacredCard title="استفسار سيادي | Sovereign Query" resonance={0.8}>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="اسأل عن أي آية أو نمط رقمي..."
              style={{
                width: '100%',
                padding: '1.5rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--glass-border)',
                borderRadius: '16px',
                color: '#fff',
                fontSize: '1.1rem',
                outline: 'none',
                transition: 'border-color 0.3s ease'
              }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button 
              className="pulse-button" 
              style={{ marginTop: '1.5rem', width: '100%', fontSize: '1.1rem', letterSpacing: '0.1em' }}
              onClick={handleDeepAnalysis}
            >
              تشغيل محرك الاكتشاف (START ENGINE)
            </button>
          </div>
        </SacredCard>

        {/* ── RESONANCE DISPLAY ─────────────────────────────────────────── */}
        <SacredCard title="نتائج الرنين | Resonance Output" resonance={discoveries.length > 0 ? 0.95 : 0}>
          {discoveries.length > 0 ? (
            <div style={{ animation: 'fadeIn 1s ease' }}>
              {discoveries.map((disc, idx) => (
                <div key={idx} style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                  <div style={{ color: 'var(--accent-gold)', fontWeight: 800, marginBottom: '0.5rem' }}>
                    SIGNATURE: {disc.signature} | {disc.type.toUpperCase()}
                  </div>
                  <div className="arabic-font" style={{ fontSize: '1.3rem', marginBottom: '0.5rem', textAlign: 'right' }}>
                    {disc.arabicNote}
                  </div>
                  <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>
                    {disc.discovery}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ opacity: 0.3, textAlign: 'center', padding: '3rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚖️</div>
              بانتظار المدخلات... (Waiting for input)
            </div>
          )}
        </SacredCard>

      </div>

      {/* ── AYAH DISPLAY ─────────────────────────────────────────────────── */}
      <section style={{ marginTop: '4rem' }}>
        <SacredCard resonance={0.9} glowColor="var(--sacred-green)">
          <div className="ayah-box" style={{ borderRightColor: 'var(--sacred-green)' }}>
            <div className="arabic-font ayah-arabic" style={{ color: 'var(--sacred-green)' }}>
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </div>
            <div className="ayah-english">
              In the name of Allah, the Entirely Merciful, the Especially Merciful.
            </div>
            <div style={{ marginTop: '1rem', opacity: 0.4, fontSize: '0.8rem', textAlign: 'right' }}>
              [سورة الفاتحة : الآية ١]
            </div>
          </div>
        </SacredCard>
      </section>

      <footer style={{ marginTop: '6rem', paddingBottom: '3rem', textAlign: 'center', opacity: 0.4 }}>
        <div className="brand-font" style={{ fontSize: '0.9rem', letterSpacing: '0.2em' }}>
          MĪTHĀQ PROTOCOL V3.7.9 | SOVEREIGN IDENTITY CORE
        </div>
        <div style={{ fontSize: '0.7rem', marginTop: '0.5rem' }}>
          BUILT WITH SOUL BY MOE ABDELAZIZ & IQRA
        </div>
      </footer>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  )
}
