import React, { useEffect, useRef, useState } from 'react';

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  sentAt: string;
}

interface MessageConversationProps {
  userId: number;
  interlocutorId: number;
}

export default function MessageConversation({ userId, interlocutorId }: MessageConversationProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Récupérer les messages
  useEffect(() => {
    async function fetchMessages() {
      setLoading(true);
      console.log('📨 Récupération des messages entre userId:', userId, 'et interlocutorId:', interlocutorId);
      const res = await fetch(`/api/messages/conversation?userA=${userId}&userB=${interlocutorId}`);
      const data = await res.json();
      console.log('📨 Messages récupérés:', data);
      setMessages(data);
      setLoading(false);
    }
    if (userId && interlocutorId) fetchMessages();
  }, [userId, interlocutorId]);

  // Scroll auto en bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Envoi d’un message
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId: userId, receiverId: interlocutorId, content: input })
    });
    setInput('');
    setSending(false);
    // Rafraîchir les messages
    const res = await fetch(`/api/messages/conversation?userA=${userId}&userB=${interlocutorId}`);
    const data = await res.json();
    setMessages(data);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '100vw', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12, paddingRight: 4, maxWidth: '100vw' }}>
        {loading ? (
          <div style={{ wordBreak: 'break-word', maxWidth: '100vw' }}>Chargement des messages...</div>
        ) : messages.length === 0 ? (
          <div style={{ color: '#888', textAlign: 'center', marginTop: 24, wordBreak: 'break-word', maxWidth: '100vw' }}>Aucun message pour l’instant.</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} style={{
              display: 'flex',
              flexDirection: userId === msg.senderId ? 'row-reverse' : 'row',
              alignItems: 'flex-end',
              marginBottom: 8,
              maxWidth: '100vw',
              flexWrap: 'wrap'
            }}>
              <div style={{
                background: userId === msg.senderId ? '#2563eb' : '#f1f5f9',
                color: userId === msg.senderId ? '#fff' : '#222',
                borderRadius: 16,
                padding: '8px 14px',
                maxWidth: '80vw',
                fontSize: 15,
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                marginLeft: userId === msg.senderId ? 0 : 8,
                marginRight: userId === msg.senderId ? 8 : 0
              }}>
                {msg.content}
              </div>
              <div style={{ fontSize: 11, color: '#888', margin: userId === msg.senderId ? '0 8px 0 0' : '0 0 0 8px', wordBreak: 'break-word', maxWidth: '20vw' }}>
                {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, maxWidth: '100vw', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Écrire un message..."
          style={{ flex: 1, border: '1px solid #ddd', borderRadius: 16, padding: '8px 12px', fontSize: 15, maxWidth: '100vw', minWidth: 0, wordBreak: 'break-word' }}
          disabled={sending}
        />
        <button type="submit" disabled={sending || !input.trim()} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 16, padding: '8px 16px', fontWeight: 500, cursor: 'pointer', maxWidth: 120, minWidth: 0, wordBreak: 'break-word' }}>
          Envoyer
        </button>
      </form>
    </div>
  );
} 