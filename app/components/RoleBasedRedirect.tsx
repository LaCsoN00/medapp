'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';

interface RoleBasedRedirectProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const RoleBasedRedirect = ({ children, allowedRoles }: RoleBasedRedirectProps) => {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && user) {
      // Définir les pages autorisées pour chaque rôle
      const authorizedPages = {
        MEDECIN: [
          '/medecin/dashboard',
          '/appointment',
          '/medical-records',
          '/prescription',
          '/location',
          '/payment',
          '/medecin/profile'
        ],
        DOCTEUR: [
          '/medecin/dashboard',
          '/appointment',
          '/medical-records',
          '/prescription',
          '/location',
          '/payment',
          '/medecin/profile'
        ],
        PATIENT: [
          '/patient/dashboard',
          '/appointment',
          '/medical-records',
          '/prescription',
          '/location',
          '/payment',
          '/patient/profile'
        ]
      };

      const userRole = user.role as keyof typeof authorizedPages;
      const pagesForRole = authorizedPages[userRole] || [];

      // Vérifier si l'utilisateur a accès à la page actuelle
      const hasAccess = pagesForRole.some(page => pathname.startsWith(page)) || 
                       allowedRoles?.includes(userRole) ||
                       pathname === '/dashboard';

      if (!hasAccess) {
        // Rediriger vers le tableau de bord approprié
        switch (userRole) {
          case 'MEDECIN':
          case 'DOCTEUR':
            router.push('/medecin/dashboard');
            break;
          case 'PATIENT':
            router.push('/patient/dashboard');
            break;
          default:
            router.push('/');
            break;
        }
      }
    }
  }, [user, isLoading, router, pathname, allowedRoles]);

  // Si en cours de chargement, afficher un spinner
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  // Si pas d'utilisateur connecté, afficher les enfants (page de connexion)
  if (!user) {
    return <>{children}</>;
  }

  // Si utilisateur connecté et autorisé, afficher les enfants
  return <>{children}</>;
};

export default RoleBasedRedirect; 