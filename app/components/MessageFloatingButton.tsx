import React from 'react';
import { useIsMobile } from '../../hooks/use-mobile';

interface MessageFloatingButtonProps {
  hasNewMessage: boolean;
  onClick: () => void;
}

export default function MessageFloatingButton({ hasNewMessage, onClick }: MessageFloatingButtonProps) {
  const isMobile = useIsMobile();

  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: isMobile ? 80 : 16, // Position plus haute sur mobile pour éviter la barre de navigation
        right: 4,
        zIndex: 1000,
        width: 52,
        height: 52,
        borderRadius: '50%',
        background: hasNewMessage ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.7)',
        boxShadow: hasNewMessage 
          ? '0 4px 12px rgba(0,0,0,0.25)' 
          : '0 2px 8px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        maxWidth: '100vw',
        minWidth: 0,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
      }}
      onMouseLeave={(e) => {
        if (!hasNewMessage) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        }
      }}
      aria-label="Messagerie"
    >
      <svg 
        width="24" 
        height="24" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        style={{ 
          maxWidth: 24, 
          minWidth: 0, 
          overflow: 'hidden',
          color: hasNewMessage ? '#1e40af' : '#6b7280',
          transition: 'color 0.3s ease'
        }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8L3 21l1.8-4A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      {hasNewMessage && (
        <span style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 10,
          height: 10,
          background: '#22c55e', // vert
          borderRadius: '50%',
          border: '2px solid #fff',
          maxWidth: 10,
          minWidth: 0,
          overflow: 'hidden',
          animation: 'pulse 2s infinite',
        }} />
      )}
    </button>
  );
} 