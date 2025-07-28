'use client';

import ProtectedLayout from '@/components/ProtectedLayout';
import RoleBasedRedirect from '@/components/RoleBasedRedirect';
import PatientDossierOverview from '@/components/PatientDossierOverview';

export default function PatientDossierPage() {
  return (
    <RoleBasedRedirect allowedRoles={['PATIENT']}>
      <ProtectedLayout>
        <div className="max-w-6xl mx-auto pt-24 pb-20 w-full px-2 sm:px-4">
          <PatientDossierOverview />
        </div>
      </ProtectedLayout>
    </RoleBasedRedirect>
  );
} 