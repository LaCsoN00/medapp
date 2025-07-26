'use client';
import Header from './Header';
import BottomNavBar from './BottomNavBar';
import { useAuth } from '../../hooks/useAuth';
import { Loader2 } from 'lucide-react';
import MessageFloatingButton from './MessageFloatingButton';
import MessageSidebar from './MessageSidebar';
import { useState, useEffect } from 'react';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);

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
  
  return (
    <div className="min-h-screen bg-base-100">
      <Header />
      <main className="pt-24 pb-20 px-4">
        {children}
      </main>
      <BottomNavBar />
      <MessageFloatingButton
        hasNewMessage={hasNewMessage}
        onClick={() => setSidebarOpen(true)}
      />
      <MessageSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        {/* Ici viendra la logique d'affichage des messages */}
        <div style={{padding: 16, color: '#888'}}>Sélectionnez un contact ou commencez une conversation.</div>
      </MessageSidebar>
    </div>
  );
} 