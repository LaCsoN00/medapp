'use client';

import ProtectedLayout from '@/components/ProtectedLayout';
import RoleBasedRedirect from '@/components/RoleBasedRedirect';
import PrescriptionSection from '@/components/PrescriptionSection';

export default function PrescriptionPage() {
  return (
    <RoleBasedRedirect allowedRoles={['PATIENT', 'MEDECIN', 'DOCTEUR']}>
      <ProtectedLayout>
        <PrescriptionSection />
      </ProtectedLayout>
    </RoleBasedRedirect>
  );
} 