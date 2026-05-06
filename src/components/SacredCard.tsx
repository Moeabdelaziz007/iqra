'use client'

import React from 'react';
import { SacredGeometry } from '../../lib/iqra/style';

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
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid var(--glass-border);
          border-radius: 24px;
          padding: 2rem;
          position: relative;
          overflow: hidden;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
        }

        .sacred-card:hover {
          transform: translateY(-7px) scale(1.01);
          border-color: var(--glow-color);
        }

        .sacred-card.resonating {
          border-color: var(--glow-color);
          box-shadow: 0 0 40px -10px var(--glow-color);
          animation: resonance-pulse 3s infinite ease-in-out;
        }

        .card-title {
          font-size: 1.25rem;
          margin-bottom: 1.5rem;
          color: var(--glow-color);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        @keyframes resonance-pulse {
          0%, 100% { box-shadow: 0 0 40px -15px var(--glow-color); }
          50% { box-shadow: 0 0 60px -5px var(--glow-color); }
        }

        .card-content {
          position: relative;
          z-index: 1;
        }
      `}</style>
    </div>
  );
};
