import React from 'react';

export const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
  glowColor = 'var(--primary-glow)',
  iconBg = 'rgba(99, 102, 241, 0.1)',
  iconColor = 'var(--primary)'
}) => {
  return (
    <div
      className="glass-card"
      style={{
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Dynamic top gradient accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${iconColor}, transparent)`,
        }}
      ></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="stat-value" style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>
            {value}
          </div>
          <div className="stat-label" style={{ marginBottom: '6px' }}>
            {title}
          </div>
        </div>
        
        <div
          className="stat-icon"
          style={{
            background: iconBg,
            color: iconColor,
            borderRadius: 'var(--radius-sm)',
            width: '42px',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 10px ${glowColor}`,
          }}
        >
          {Icon && <Icon size={20} />}
        </div>
      </div>

      {description && (
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            marginTop: '10px',
            borderTop: '1px solid var(--border-glass)',
            paddingTop: '8px',
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
};

export default StatCard;
