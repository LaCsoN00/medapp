'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ProtectedLayout from '@/components/ProtectedLayout';
import RoleBasedRedirect from '@/components/RoleBasedRedirect';

interface PrescriptionRequest {
  id: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  medecin: {
    id: number;
    firstName: string;
    lastName: string;
    speciality?: {
      name: string;
    };
  };
  prescription?: {
    medication: string;
    dosage: string;
    createdAt: string;
  };
}

export default function PrescriptionRequestListPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PrescriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetch(`/api/prescription-requests?patientId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          setRequests(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [user]);

  return (
    <RoleBasedRedirect allowedRoles={['PATIENT']}>
      <ProtectedLayout>
        <div className="max-w-6xl mx-auto pt-24 pb-20 w-full px-2 sm:px-4">
          <div className="container max-w-2xl mx-auto w-full">
            <Card className="card bg-base-100 shadow-xl max-w-full">
              <CardHeader className="break-words max-w-full">
                <CardTitle className="text-2xl font-bold mb-2 break-words max-w-full truncate">Mes demandes d&apos;ordonnance</CardTitle>
                <p className="text-base-content/70 break-words max-w-full">Suivez l&apos;état de vos demandes et accédez à vos prescriptions validées.</p>
              </CardHeader>
              <CardContent className="break-words max-w-full">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="loading loading-spinner loading-lg mx-auto"></div>
                    <p className="mt-4 break-words max-w-full">Chargement de vos demandes...</p>
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center text-base-content/70 py-8 break-words max-w-full">Aucune demande trouvée.</div>
                ) : (
                  <div className="space-y-6 break-words max-w-full">
                    {requests.map((req) => (
                      <Card key={req.id} className="card bg-base-100 shadow-md border border-base-200 max-w-full">
                        <CardContent className="p-4 break-words max-w-full">
                          <div className="flex items-center justify-between mb-2 break-words max-w-full flex-wrap">
                            <div className="break-words max-w-full">
                              <div className="font-semibold break-words max-w-full">Dr. {req.medecin.firstName} {req.medecin.lastName}</div>
                              <div className="text-sm text-base-content/70 break-words max-w-full">{req.medecin.speciality?.name}</div>
                            </div>
                            <Badge variant="outline" className="capitalize break-words max-w-full truncate">
                              {req.status === 'PENDING' ? 'En attente' : req.status === 'APPROVED' ? 'Approuvée' : 'Rejetée'}
                            </Badge>
                          </div>
                          <div className="mb-2 text-base-content/80 break-words max-w-full">
                            <strong>Motif :</strong> {req.reason}
                          </div>
                          <div className="text-xs text-base-content/50 mb-2 break-words max-w-full">
                            Demande du {new Date(req.createdAt).toLocaleDateString("fr-FR")}
                          </div>
                          {req.prescription && (
                            <div className="mt-2 p-3 bg-base-200 rounded-lg break-words max-w-full">
                              <div className="flex items-center gap-2 mb-1 break-words max-w-full">
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  <span className="font-semibold break-words max-w-full">Prescription validée</span>
                                </Badge>
                              </div>
                              <div className="break-words max-w-full"><strong>Médicament :</strong> {req.prescription.medication}</div>
                              <div className="break-words max-w-full"><strong>Posologie :</strong> {req.prescription.dosage}</div>
                              <div className="text-xs text-base-content/50 break-words max-w-full">Prescrite le {new Date(req.prescription.createdAt).toLocaleDateString("fr-FR")}</div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedLayout>
    </RoleBasedRedirect>
  );
} 