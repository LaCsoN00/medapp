"use client"

import { useState, useEffect } from "react";

export type User = {
  id: number;
  email: string;
  role: "PATIENT" | "MEDECIN" | "DOCTEUR";
  firstName?: string;
  lastName?: string;
  phone?: string;
  photo?: string;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("authUser");
    if (stored) {
      try {
        const userData = JSON.parse(stored);
        setUser(userData);
      } catch (error) {
        console.error('useAuth: Erreur lors du parsing des données:', error);
        localStorage.removeItem("authUser");
      }
    } else {
      console.log('useAuth: Aucun utilisateur trouvé dans localStorage');
    }
    setIsLoading(false);
  }, []);

  const login = (userData: User) => {
    console.log('useAuth: Connexion utilisateur:', userData);
    setUser(userData);
    localStorage.setItem("authUser", JSON.stringify(userData));
  };
  
  const logout = async () => {
    if (user && (user.role === 'MEDECIN' || user.role === 'DOCTEUR')) {
      try {
        await fetch('/api/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, role: user.role }),
        });
      } catch {}
    }
    setUser(null);
    localStorage.removeItem("authUser");
    localStorage.removeItem("token");
  };

  return { user, login, logout, isLoading };
} 