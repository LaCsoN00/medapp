'use client';

import ProtectedLayout from '@/components/ProtectedLayout';
import RoleBasedRedirect from '@/components/RoleBasedRedirect';
import AppointmentSection from '@/components/AppointmentSection';

export default function AppointmentPage() {
  return (
    <RoleBasedRedirect allowedRoles={['PATIENT', 'MEDECIN', 'DOCTEUR']}>
      <ProtectedLayout>
        <AppointmentSection />
      </ProtectedLayout>
    </RoleBasedRedirect>
  );
} 