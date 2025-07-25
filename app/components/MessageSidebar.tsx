import React, { useState } from 'react';
import { useMessagingInterlocutor } from '../../hooks/useMessagingInterlocutor';
import { useAuth } from '../../hooks/useAuth';
import MessageConversation from './MessageConversation';
import Image from 'next/image';

interface MessageSidebarProps {
  open: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

export default function MessageSidebar({ open, onClose }: MessageSidebarProps) {
  const { user } = useAuth();
  const { loading, interlocutor, patients } = useMessagingInterlocutor();
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);

  // Affichage pour le patient : médecin référent
  if (user?.role === 'PATIENT') {
    return (
      <>
        {/* Overlay semi-transparent */}
        {open && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(30, 41, 59, 0.25)',
            zIndex: 1199,
            backdropFilter: 'blur(2px)',
          }} onClick={onClose} />
        )}
        {/* Fenêtre flottante centrée */}
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: open ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.9)',
            opacity: open ? 1 : 0,
            width: '98vw',
            maxWidth: 420,
            height: 600,
            maxHeight: '90vh',
            background: '#fff',
            borderRadius: 18,
            boxShadow: '0 8px 32px rgba(0,0,0,0.25), 0 2px 16px rgba(0,0,0,0.10)',
            zIndex: 1200,
            transition: 'transform 0.25s cubic-bezier(.4,0,.2,1), opacity 0.18s',
            display: open ? 'flex' : 'none',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header flottant */}
          <div style={{
            padding: '18px 24px 14px 24px',
            borderBottom: '1px solid #f1f5f9',
            background: 'rgba(255,255,255,0.95)',
            position: 'sticky',
            top: 0,
            zIndex: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            maxWidth: '100vw',
            overflow: 'hidden',
            wordBreak: 'break-word',
          }}>
            <span style={{ fontWeight: 700, fontSize: 20, letterSpacing: 0.2, wordBreak: 'break-word', maxWidth: '80vw', overflow: 'hidden' }}>Messagerie</span>
            <button onClick={onClose} aria-label="Fermer" style={{ background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: '#64748b', fontWeight: 700, lineHeight: 1 }}>&times;</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 16px 20px', background: 'rgba(248,250,252,0.95)', maxWidth: '100vw', overflowWrap: 'break-word' }}>
            {loading ? (
              <div>Chargement...</div>
            ) : interlocutor ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, maxWidth: '100vw', flexWrap: 'wrap', wordBreak: 'break-word' }}>
                  <Image
                    src={interlocutor.photo || '/assets/logo-medapp.png'}
                    alt="Médecin"
                    width={54}
                    height={54}
                    style={{ borderRadius: '50%', objectFit: 'cover', boxShadow: '0 2px 8px #e0e7ef', maxWidth: 54, minWidth: 0 }}
                  />
                  <div style={{ maxWidth: '70vw', wordBreak: 'break-word', overflow: 'hidden' }}>
                    <div style={{ fontWeight: 700, fontSize: 17, wordBreak: 'break-word', maxWidth: '70vw', overflow: 'hidden' }}>{interlocutor.firstName} {interlocutor.lastName}</div>
                    <div style={{ fontSize: 13, color: '#64748b', wordBreak: 'break-word', maxWidth: '70vw', overflow: 'hidden' }}>{interlocutor.email}</div>
                  </div>
                </div>
                <MessageConversation userId={user.id} interlocutorId={interlocutor.userId} />
              </>
            ) : (
              <div style={{ color: '#888' }}>Aucun médecin référent trouvé.</div>
            )}
          </div>
        </div>
      </>
    );
  }

  // Affichage pour le médecin : liste des patients
  if (user?.role === 'MEDECIN' || user?.role === 'DOCTEUR') {
    return (
      <>
        {/* Overlay semi-transparent */}
        {open && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(30, 41, 59, 0.25)',
            zIndex: 1199,
            backdropFilter: 'blur(2px)',
          }} onClick={onClose} />
        )}
        {/* Fenêtre flottante centrée */}
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: open ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.9)',
            opacity: open ? 1 : 0,
            width: '95vw',
            maxWidth: 420,
            height: 600,
            maxHeight: '90vh',
            background: '#fff',
            borderRadius: 18,
            boxShadow: '0 8px 32px rgba(0,0,0,0.25), 0 2px 16px rgba(0,0,0,0.10)',
            zIndex: 1200,
            transition: 'transform 0.25s cubic-bezier(.4,0,.2,1), opacity 0.18s',
            display: open ? 'flex' : 'none',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header flottant */}
          <div style={{
            padding: '18px 24px 14px 24px',
            borderBottom: '1px solid #f1f5f9',
            background: 'rgba(255,255,255,0.95)',
            position: 'sticky',
            top: 0,
            zIndex: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <span style={{ fontWeight: 700, fontSize: 20, letterSpacing: 0.2 }}>Messagerie</span>
            <button onClick={onClose} aria-label="Fermer" style={{ background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: '#64748b', fontWeight: 700, lineHeight: 1 }}>&times;</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 16px 20px', background: 'rgba(248,250,252,0.95)' }}>
            {loading ? (
              <div>Chargement...</div>
            ) : patients.length > 0 ? (
              <>
                <div style={{ marginBottom: 18, fontWeight: 500, fontSize: 15 }}>Sélectionnez un patient :</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
                  {patients.map((p) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: selectedPatient === p.id ? '#e0e7ef' : 'transparent', borderRadius: 10, padding: 7, boxShadow: selectedPatient === p.id ? '0 2px 8px #e0e7ef' : 'none', border: selectedPatient === p.id ? '1.5px solid #2563eb' : '1.5px solid transparent', maxWidth: '100vw', flexWrap: 'wrap', wordBreak: 'break-word' }} onClick={() => setSelectedPatient(p.id)}>
                      <Image
                        src={p.photo || '/assets/logo-medapp.png'}
                        alt="Patient"
                        width={40}
                        height={40}
                        style={{ borderRadius: '50%', objectFit: 'cover', boxShadow: '0 1px 4px #e0e7ef', maxWidth: 40, minWidth: 0 }}
                      />
                      <div style={{ maxWidth: '60vw', wordBreak: 'break-word', overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, wordBreak: 'break-word', maxWidth: '60vw', overflow: 'hidden' }}>{p.firstName} {p.lastName}</div>
                        <div style={{ fontSize: 13, color: '#64748b', wordBreak: 'break-word', maxWidth: '60vw', overflow: 'hidden' }}>{p.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Conversation avec le patient sélectionné */}
                {selectedPatient && patients.find(p => p.id === selectedPatient)?.userId && (
                  <div style={{ marginTop: 10 }}>
                    <MessageConversation userId={user.id} interlocutorId={patients.find(p => p.id === selectedPatient)!.userId!} />
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: '#888' }}>Aucun patient trouvé.</div>
            )}
          </div>
        </div>
      </>
    );
  }

  // Fallback
  return null;
} 