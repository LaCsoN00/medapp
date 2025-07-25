'use client';

import ProtectedLayout from '@/components/ProtectedLayout';
import RoleBasedRedirect from '@/components/RoleBasedRedirect';
import MedicalRecordsSection from '@/components/MedicalRecordsSection';

export default function MedicalRecordsPage() {
  return (
    <RoleBasedRedirect allowedRoles={['PATIENT', 'MEDECIN', 'DOCTEUR']}>
      <ProtectedLayout>
        <MedicalRecordsSection />
      </ProtectedLayout>
    </RoleBasedRedirect>
  );
} 