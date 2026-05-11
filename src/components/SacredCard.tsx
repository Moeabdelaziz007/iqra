'use client'

import React from 'react';
import { SacredGeometry } from '.././lib/iqra/13-utils/style'; // [TC] reason: relative path to canonical lib/iqra | id: c1-scard

interface SacredCardProps {
  children: React.ReactNode;
  title?: string;
  resonance?: number;
  glowColor?: string;
}

export const SacredCard: React.FC<SacredCardProps> = ({ 
  children, 
  title, 
  resonance = 0, 
  glowColor = 'var(--accent-gold)' 
}) => {
  const isResonating = resonance > 0.7;

  return (
    <div className={`sacred-card ${isResonating ? 'resonating' : ''}`} style={{
      '--glow-color': glowColor,
    } as React.CSSProperties}>
      {title && <h3 className="brand-font card-title">{title}</h3>}
      <div className="card-content">
        {children}
      </div>

      <style jsx>{`
        .sacred-card {
          background: var(--glass-bg);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid var(--glass-border);
          border-radius: 32px;
          padding: 2.5rem;
          position: relative;
          overflow: hidden;
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: var(--card-shadow);
        }

        .sacred-card::before {
          content: "";
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle at center, rgba(255, 255, 255, 0.03) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.6s ease;
          pointer-events: none;
        }

        .sacred-card:hover {
          transform: translateY(-8px);
          border-color: rgba(212, 175, 55, 0.4);
        }

        .sacred-card:hover::before {
          opacity: 1;
        }

        .sacred-card.resonating {
          border-color: var(--glow-color);
          animation: resonance-glow 4s infinite ease-in-out;
        }

        @keyframes resonance-glow {
          0%, 100% { border-color: rgba(212, 175, 55, 0.2); box-shadow: 0 0 30px -10px rgba(212, 175, 55, 0.1); }
          50% { border-color: var(--glow-color); box-shadow: 0 0 50px -5px rgba(212, 175, 55, 0.3); }
        }

        .card-title {
          font-size: 1.1rem;
          font-weight: 800;
          margin-bottom: 2rem;
          color: var(--glow-color);
          text-transform: uppercase;
          letter-spacing: 0.2em;
          opacity: 0.8;
        }


        .card-content {
          position: relative;
          z-index: 1;
        }
      `}</style>
    </div>
  );
};
