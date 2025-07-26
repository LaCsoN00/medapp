'use client';

import ProtectedLayout from '@/components/ProtectedLayout';
import RoleBasedRedirect from '@/components/RoleBasedRedirect';
import ProfileSection from '@/components/ProfileSection';

export default function MedecinProfilePage() {
  return (
    <RoleBasedRedirect allowedRoles={['MEDECIN', 'DOCTEUR']}>
      <ProtectedLayout>
        <div className="max-w-6xl mx-auto pt-24 pb-20 w-full px-2 sm:px-4">
          <ProfileSection />
        </div>
      </ProtectedLayout>
    </RoleBasedRedirect>
  );
} 