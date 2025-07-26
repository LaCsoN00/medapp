'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function TestAuth() {
  const { user, isLoading } = useAuth();
  const [localStorageData, setLocalStorageData] = useState<string>('');

  useEffect(() => {
    const stored = localStorage.getItem('authUser');
    setLocalStorageData(stored || 'Aucune donnée');
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-base-100 rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Test d&aposauthentification</h1>
        
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800">État du hook useAuth</h3>
            <p>Loading: {isLoading ? 'Oui' : 'Non'}</p>
            <p>User: {user ? JSON.stringify(user, null, 2) : 'null'}</p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800">localStorage</h3>
            <p>authUser: {localStorageData}</p>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold text-yellow-800">Actions</h3>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2"
            >
              Recharger
            </button>
            <button 
              onClick={() => {
                localStorage.removeItem('authUser');
                window.location.reload();
              }}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Vider localStorage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 