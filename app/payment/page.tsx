'use client';

import ProtectedLayout from '@/components/ProtectedLayout';
import RoleBasedRedirect from '@/components/RoleBasedRedirect';
import PaymentSection from '@/components/PaymentSection';

export default function PaymentPage() {
  return (
    <RoleBasedRedirect allowedRoles={['PATIENT', 'MEDECIN', 'DOCTEUR']}>
      <ProtectedLayout>
        <PaymentSection />
      </ProtectedLayout>
    </RoleBasedRedirect>
  );
} 