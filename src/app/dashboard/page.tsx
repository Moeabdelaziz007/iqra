'use client'

import React, { useState, useEffect } from 'react'
import '../../styles/sovereign.css'

/**
 * 🏛️ IQRA Sovereign OS Dashboard
 * Visualizes System Coherence & Operational Integrity
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
    const interval = setInterval(fetchData, 9000); // Pulse cycle: 9s
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="pulse-neon" style={{ 
      textAlign: 'center', 
      marginTop: '40vh', 
      fontSize: '1rem', 
      letterSpacing: '0.5em',
      color: 'var(--iqra-neon)' 
    }}>
      INITIALIZING SOVEREIGN KERNEL...
    </div>
  );

  return (
    <main className="iqra-padding scanline" style={{ minHeight: '100vh', background: 'var(--iqra-black)', color: '#fff', direction: 'ltr' }}>
      <header style={{ marginBottom: '4rem', borderBottom: '1px solid var(--iqra-border)', paddingBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 className="neon-text" style={{ fontSize: '2.5rem', margin: 0 }}>Sovereign OS Command Center</h1>
            <p style={{ opacity: 0.4, fontSize: '0.7rem', marginTop: '0.5rem', letterSpacing: '0.3em' }}>
              PROTOCOL: MĪTHĀQ V3.7.9 | STATUS: NOMINAL
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.6rem', opacity: 0.3 }}>OS_VERSION: 1.0.0-STABLE</p>
            <p style={{ fontSize: '0.6rem', opacity: 0.3 }}>UPTIME: {Math.floor(process.uptime ? process.uptime() : 369)}s</p>
          </div>
        </div>
      </header>

      {/* ── METRIC GRID ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {[
          { label: 'TOTAL NETWORK STATES', value: data?.stats?.totalStates || 0, color: 'var(--iqra-neon)' },
          { label: 'SYSTEM RESONANCE', value: `${((data?.stats?.avgResonance || 0) * 100).toFixed(2)}%`, color: 'var(--iqra-info)' },
          { label: 'VALIDATED LOGIC NODES', value: data?.stats?.verifiedTruths || 0, color: 'var(--iqra-warning)' },
          { label: 'HEARTBEAT FREQUENCY', value: '9.0s', color: '#fff' }
        ].map((stat, i) => (
          <div key={i} className="glass-surface iqra-padding neon-border">
            <p style={{ fontSize: '0.6rem', opacity: 0.4, marginBottom: '0.8rem', letterSpacing: '0.1em' }}>{stat.label}</p>
            <p style={{ fontSize: '1.8rem', fontWeight: '800', color: stat.color, margin: 0 }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
        {/* ── INTEGRITY LEDGER (TRUSTCHAIN) ────────────────────────────────── */}
        <section className="glass-surface iqra-padding">
          <h2 className="neon-text" style={{ fontSize: '1rem', marginBottom: '2rem', borderLeft: '4px solid var(--iqra-neon)', paddingLeft: '1rem' }}>
            Integrity Ledger (TrustChain)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data?.trustChain?.slice(0, 7).map((node: any, i: number) => (
              <div key={i} className="trust-chain-node" style={{ paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '0.6rem', opacity: 0.3 }}>{node.timestamp}</span>
                  <span style={{ color: 'var(--iqra-neon)', fontSize: '0.7rem', fontFamily: 'monospace' }}>RES: {node.resonance.toFixed(6)}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#ccc', letterSpacing: '0.02em' }}>
                  {node.state.join(' > ')}
                </div>
                <div style={{ fontSize: '0.5rem', opacity: 0.2, marginTop: '0.4rem', fontFamily: 'monospace' }}>NODE_HASH: {node.hash}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── REAL-TIME RESONANCE MONITOR ─────────────────────────────────── */}
        <section className="glass-surface iqra-padding">
          <h2 className="neon-text" style={{ fontSize: '1rem', marginBottom: '2rem', borderLeft: '4px solid var(--iqra-info)', paddingLeft: '1rem' }}>
            Resonance Monitor
          </h2>
          <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', maxHeight: '400px', overflowY: 'auto' }}>
            {data?.recentSimulations?.map((sim: any, i: number) => (
              <div key={i} style={{ borderBottom: '1px solid var(--iqra-border)', padding: '0.6rem 0', display: 'flex', gap: '1rem' }}>
                <span style={{ color: sim.completion > 0.8 ? 'var(--iqra-neon)' : '#444', width: '40px' }}>
                  {(sim.completion * 100).toFixed(0)}%
                </span>
                <span style={{ opacity: 0.5, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sim.prompt}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── COHERENCE OSCILLATOR (3-6-9) ────────────────────────────────── */}
      <section style={{ marginTop: '5rem', borderTop: '1px solid var(--iqra-border)', paddingTop: '4rem' }}>
        <h2 className="neon-text" style={{ textAlign: 'center', fontSize: '1rem', marginBottom: '4rem' }}>
          Coherence Oscillator (3-6-9 Pattern)
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '3rem' }}>
          {[3, 6, 9].map(n => (
            <div key={n} className="pulse-neon glass-surface" style={{
              width: n * 18,
              height: n * 18,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: '900',
              border: `1px solid var(--iqra-border)`,
              color: 'var(--iqra-neon)',
              boxShadow: n === 9 ? '0 0 30px var(--iqra-neon-glow-strong)' : 'none'
            }}>
              {n}
            </div>
          ))}
        </div>
      </section>

      <footer style={{ marginTop: '6rem', paddingBottom: '3rem', textAlign: 'center', opacity: 0.2 }}>
        <p style={{ fontSize: '0.6rem', letterSpacing: '0.5em' }}>© 2026 | IQRA SOVEREIGN OPERATING SYSTEM | ALL RIGHTS RESERVED</p>
      </footer>
    </main>
  );
}

