'use client';

import ProtectedLayout from '@/components/ProtectedLayout';
import RoleBasedRedirect from '@/components/RoleBasedRedirect';
import PrescriptionSection from '@/components/PrescriptionSection';

export default function PrescriptionPage() {
  return (
    <RoleBasedRedirect allowedRoles={['PATIENT', 'MEDECIN', 'DOCTEUR']}>
      <ProtectedLayout>
        <div className="max-w-6xl mx-auto pt-24 pb-20 w-full px-2 sm:px-4">
          <PrescriptionSection />
        </div>
      </ProtectedLayout>
    </RoleBasedRedirect>
  );
} 