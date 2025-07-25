'use client';

import ProtectedLayout from '@/components/ProtectedLayout';
import RoleBasedRedirect from '@/components/RoleBasedRedirect';
import ProfileSection from '@/components/ProfileSection';

export default function PatientProfilePage() {
  return (
    <RoleBasedRedirect allowedRoles={['PATIENT']}>
      <ProtectedLayout>
        <div className="pt-24 pb-20">
          <ProfileSection />
        </div>
      </ProtectedLayout>
    </RoleBasedRedirect>
  );
} 