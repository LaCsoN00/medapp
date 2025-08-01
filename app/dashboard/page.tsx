'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import ProtectedLayout from '@/components/ProtectedLayout';

const DashboardPage = () => {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('DashboardPage: Utilisateur:', user);
    if (user) {
      console.log('DashboardPage: Rôle de l\'utilisateur:', user.role);
      if (user.role === 'PATIENT') {
        console.log('DashboardPage: Redirection vers patient dashboard');
        router.push('/patient/dashboard');
      } else if (user.role === 'MEDECIN') {
        console.log('DashboardPage: Redirection vers médecin dashboard');
        router.push('/medecin/dashboard');
      } else {
        console.log('DashboardPage: Rôle non reconnu, redirection vers /');
        // Redirection par défaut si rôle non reconnu
        router.push('/');
      }
    } else {
      console.log('DashboardPage: Aucun utilisateur connecté');
    }
  }, [user, router]);

  return (
    <ProtectedLayout>
      <div className="max-w-6xl mx-auto pt-24 pb-20 w-full px-2 sm:px-4">
        <div className="min-h-screen bg-base-100 flex items-center justify-center">
          <div className="text-center">
            <div className="loading loading-spinner loading-lg text-primary"></div>
            <p className="mt-4 text-base-content/70">Redirection vers votre tableau de bord...</p>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
};

export default DashboardPage; 