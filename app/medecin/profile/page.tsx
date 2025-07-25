'use client';

import ProtectedLayout from '@/components/ProtectedLayout';
import RoleBasedRedirect from '@/components/RoleBasedRedirect';
import ProfileSection from '@/components/ProfileSection';

export default function MedecinProfilePage() {
  return (
    <RoleBasedRedirect allowedRoles={['MEDECIN', 'DOCTEUR']}>
      <ProtectedLayout>
        <div className="pt-24 pb-20">
          <ProfileSection />
        </div>
      </ProtectedLayout>
    </RoleBasedRedirect>
  );
} 