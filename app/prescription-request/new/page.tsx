"use client";

import { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProtectedLayout from '@/components/ProtectedLayout';
import RoleBasedRedirect from '@/components/RoleBasedRedirect';
import { useRouter } from 'next/navigation';

interface Medecin {
  id: number;
  firstName: string;
  lastName: string;
  speciality: {
    name: string;
  };
}

export default function NewPrescriptionRequestPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [medecins, setMedecins] = useState<Medecin[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    medecinId: '',
    reason: ''
  });

  const handleOpenModal = () => {
    // Charger la liste des médecins
    fetch('/api/medecin')
      .then(res => res.json())
      .then(data => setMedecins(data))
      .catch(() => setMedecins([]));
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.medecinId || !formData.reason) return;

    setLoading(true);
    try {
      const res = await fetch('/api/prescription-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: user.id,
          medecinId: parseInt(formData.medecinId),
          reason: formData.reason
        })
      });

      if (res.ok) {
        router.push('/prescription-request');
      }
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleBasedRedirect allowedRoles={['PATIENT']}>
      <ProtectedLayout>
        <div className="max-w-6xl mx-auto pt-24 pb-20 w-full px-2 sm:px-4">
          <section className="section-padding bg-base-100 min-h-screen">
            <div className="container max-w-xl mx-auto">
              <Button className="btn btn-primary mb-6" onClick={handleOpenModal}>Nouvelle demande d&apos;ordonnance</Button>
              {showCreateModal && (
                <Card className="card bg-base-100 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold mb-2">Nouvelle demande d&apos;ordonnance</CardTitle>
                    <p className="text-base-content/70">Choisissez un médecin et décrivez le motif de votre demande. Le médecin rédigera l&apos;ordonnance si nécessaire.</p>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div>
                        <label className="block mb-2 font-medium">Médecin</label>
                        {loading ? (
                          <div className="loading loading-spinner loading-sm"></div>
                        ) : (
                          <Select value={formData.medecinId} onValueChange={(value) => setFormData({...formData, medecinId: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez un médecin" />
                            </SelectTrigger>
                            <SelectContent>
                              {medecins.map((medecin) => (
                                <SelectItem key={medecin.id} value={medecin.id.toString()}>
                                  Dr. {medecin.firstName} {medecin.lastName} - {medecin.speciality.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div>
                        <label className="block mb-2 font-medium">Motif de la demande</label>
                        <Textarea
                          value={formData.reason}
                          onChange={(e) => setFormData({...formData, reason: e.target.value})}
                          placeholder="Décrivez le motif de votre demande d'ordonnance..."
                          rows={4}
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={loading} className="flex-1">
                          {loading ? 'Envoi en cours...' : 'Envoyer la demande'}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                          Annuler
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        </div>
      </ProtectedLayout>
    </RoleBasedRedirect>
  );
} 