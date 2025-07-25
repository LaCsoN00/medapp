'use client';

import ProtectedLayout from '@/components/ProtectedLayout';
import RoleBasedRedirect from '@/components/RoleBasedRedirect';
import LocationSection from '@/components/LocationSection';

export default function LocationPage() {
  return (
    <RoleBasedRedirect allowedRoles={['PATIENT', 'MEDECIN', 'DOCTEUR']}>
      <ProtectedLayout>
        <LocationSection />
      </ProtectedLayout>
    </RoleBasedRedirect>
  );
} 