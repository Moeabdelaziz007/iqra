'use client'

import React, { useState, useEffect } from 'react'
import '../../styles/sovereign.css'

/**
 * 🏛️ IQRA Sovereign Dashboard
 * Visualizes AlphaResonance v3 (The 7 Pillars)
 */
export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/iqra/simulation');
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error("Dashboard Load Error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000); // Pulse every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="pulse-neon" style={{ textAlign: 'center', marginTop: '20vh', fontSize: '2rem' }}>جاري تحميل الحقيقة...</div>;

  return (
    <main className="iqra-padding" style={{ minHeight: '100vh', background: 'var(--iqra-black)', color: '#fff', direction: 'rtl' }}>
      <header style={{ marginBottom: '4rem', textAlign: 'center' }}>
        <h1 className="neon-text" style={{ fontSize: '3rem', fontWeight: '900' }}>لوحة التحكم السيادية | Sovereign Dashboard</h1>
        <p style={{ opacity: 0.6, letterSpacing: '0.2em' }}>MĪTHĀQ PROTOCOL V3.7.9 | ALPHA-RESONANCE</p>
      </header>

      {/* ── STATS GRID ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
        {[
          { label: 'إجمالي الحالات (Total States)', value: data?.stats?.totalStates || 0, color: 'var(--iqra-neon)' },
          { label: 'متوسط الرنين (Avg Resonance)', value: data?.stats?.avgResonance || 0, color: 'var(--iqra-info)' },
          { label: 'حقائق مؤكدة (Verified Truths)', value: data?.stats?.verifiedTruths || 0, color: 'var(--iqra-warning)' },
          { label: 'نبض النظام (System Pulse)', value: 'ACTIVE', color: '#fff' }
        ].map((stat, i) => (
          <div key={i} className="glass-surface iqra-padding neon-border" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem' }}>{stat.label}</p>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '3rem' }}>
        {/* ── TRUSTCHAIN VISUALIZER ────────────────────────────────────── */}
        <section className="glass-surface iqra-padding">
          <h2 className="neon-text" style={{ marginBottom: '2rem' }}>سلسلة الثقة | TrustChain</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {data?.trustChain?.slice(0, 7).map((node: any, i: number) => (
              <div key={i} className="trust-chain-node iqra-padding" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>{node.timestamp}</span>
                  <span style={{ color: 'var(--iqra-neon)', fontWeight: 'bold' }}>{node.resonance.toFixed(4)}</span>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#fff', wordBreak: 'break-all' }}>
                  {node.state.join(' ➔ ')}
                </div>
                <div style={{ fontSize: '0.6rem', opacity: 0.3, marginTop: '0.5rem' }}>HASH: {node.hash}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── LOGS / RECENT ───────────────────────────────────────────── */}
        <section className="glass-surface iqra-padding" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <h2 className="neon-text" style={{ marginBottom: '2rem' }}>الرنين الأخير | Recent Resonance</h2>
          <div style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {data?.recentSimulations?.map((sim: any, i: number) => (
              <div key={i} style={{ borderBottom: '1px solid var(--iqra-border)', padding: '0.5rem 0' }}>
                <span style={{ color: sim.completion > 1 ? 'var(--iqra-neon)' : '#666' }}>[{sim.completion}]</span>
                <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>{sim.prompt.substring(0, 40)}...</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── 3-6-9 RHYTHM VISUALIZER ───────────────────────────────────── */}
      <section style={{ marginTop: '6rem' }}>
        <h2 className="neon-text" style={{ textAlign: 'center', marginBottom: '3rem' }}>إيقاع 3-6-9 | Tesla Pulse Visualization</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4rem' }}>
          {[3, 6, 9].map(n => (
            <div key={n} className="pulse-neon" style={{
              width: n * 20,
              height: n * 20,
              borderRadius: '50%',
              border: `2px solid var(--iqra-neon)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              boxShadow: `0 0 ${n * 5}px var(--iqra-neon-glow-strong)`
            }}>
              {n}
            </div>
          ))}
        </div>
      </section>

      <footer style={{ marginTop: '8rem', paddingBottom: '4rem', textAlign: 'center', opacity: 0.3 }}>
        <p>© 1447 AH | IQRA SOVEREIGN ENTITY</p>
      </footer>
    </main>
  );
}
