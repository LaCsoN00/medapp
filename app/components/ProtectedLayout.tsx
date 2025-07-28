'use client';
import Header from './Header';
import BottomNavBar from './BottomNavBar';
import { useAuth } from '../../hooks/useAuth';
import { Loader2 } from 'lucide-react';
import MessageFloatingButton from './MessageFloatingButton';
import MessageSidebar from './MessageSidebar';
import { useState, useEffect, createContext, useContext } from 'react';

// Contexte pour la messagerie
interface MessagingContextType {
  openMessaging: (patientId?: number) => void;
  closeMessaging: () => void;
  isOpen: boolean;
  selectedPatientId?: number;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export const useMessaging = () => {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
};

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(undefined);

  useEffect(() => {
    async function fetchUnread() {
      if (!user) return;
      try {
        const res = await fetch(`/api/messages/unread-count?userId=${user.id}`);
        const data = await res.json();
        setHasNewMessage(data.count > 0);
      } catch {}
    }
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const openMessaging = (patientId?: number) => {
    setSelectedPatientId(patientId);
    setSidebarOpen(true);
  };

  const closeMessaging = () => {
    setSidebarOpen(false);
    setSelectedPatientId(undefined);
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-base-content/70">Chargement...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-base-content">Accès non autorisé</h2>
          <p className="text-base-content/70">Veuillez vous connecter pour accéder à cette page.</p>
        </div>
      </div>
    );
  }
  
  const messagingContextValue: MessagingContextType = {
    openMessaging,
    closeMessaging,
    isOpen: sidebarOpen,
    selectedPatientId,
  };
  
  return (
    <MessagingContext.Provider value={messagingContextValue}>
      <div className="min-h-screen bg-base-100">
        <Header />
        <main className="pt-24 pb-20 px-4">
          {children}
        </main>
        <BottomNavBar />
        <MessageFloatingButton
          hasNewMessage={hasNewMessage}
          onClick={() => openMessaging()}
        />
        <MessageSidebar open={sidebarOpen} onClose={closeMessaging} selectedPatientId={selectedPatientId}>
          {/* Ici viendra la logique d'affichage des messages */}
          <div style={{padding: 16, color: '#888'}}>Sélectionnez un contact ou commencez une conversation.</div>
        </MessageSidebar>
      </div>
    </MessagingContext.Provider>
  );
} 