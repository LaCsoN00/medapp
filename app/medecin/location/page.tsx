'use client';

import ProtectedLayout from '@/components/ProtectedLayout';
import RoleBasedRedirect from '@/components/RoleBasedRedirect';
import LocationSection from '@/components/LocationSection';

export default function MedecinLocationPage() {
  return (
    <RoleBasedRedirect allowedRoles={['MEDECIN', 'DOCTEUR']}>
      <ProtectedLayout>
        <div className="max-w-6xl mx-auto pt-24 pb-20 w-full px-2 sm:px-4">
          <LocationSection />
        </div>
      </ProtectedLayout>
    </RoleBasedRedirect>
  );
} 