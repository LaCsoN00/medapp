"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMedecins, createPrescriptionRequest, getPatientByUserId } from "@/actions";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import toast from 'react-hot-toast';

interface Medecin {
  id: number;
  firstName: string;
  lastName: string;
  city?: string | null;
  speciality?: { name: string };
}

export default function NewPrescriptionRequestPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [medecins, setMedecins] = useState<Medecin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedecinId, setSelectedMedecinId] = useState<number | null>(null);
  const [motif, setMotif] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Ouvre la modale et réinitialise les champs
  const handleOpenModal = () => {
    setMotif("");
    setSelectedMedecinId(null);
    setShowCreateModal(true);
  };

  useEffect(() => {
    const fetchMedecins = async () => {
      setLoading(true);
      try {
        const medList = await getMedecins();
        setMedecins(medList);
      } catch {
        setMedecins([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMedecins();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedecinId || !motif || !user) return;
    setSubmitting(true);
    try {
      const patient = await getPatientByUserId(user.id);
      if (!patient) throw new Error("Profil patient introuvable");
      await createPrescriptionRequest({
        patientId: patient.id,
        medecinId: selectedMedecinId,
        motif
      });
      toast.success("Demande envoyée", { position: 'top-center' });
      router.push("/prescription");
    } catch {
      toast.error("Impossible d'envoyer la demande.", { position: 'top-center' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
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
                    <div className="loading loading-spinner loading-md" />
                  ) : (
                    <div className="space-y-2">
                      {medecins.map((med) => (
                        <div key={med.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedMedecinId === med.id ? "border-primary bg-primary/10" : "border-base-300 hover:border-primary/50"}`} onClick={() => setSelectedMedecinId(med.id)}>
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-primary text-primary-content">
                              {med.firstName.charAt(0)}{med.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-semibold">Dr. {med.firstName} {med.lastName}</div>
                            <div className="text-sm text-base-content/70">{med.speciality?.name}</div>
                          </div>
                          <Badge variant="outline">{med.city || "-"}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block mb-2 font-medium">Motif de la demande</label>
                  <textarea className="textarea textarea-bordered w-full" rows={3} value={motif} onChange={e => setMotif(e.target.value)} placeholder="Ex : Renouvellement traitement, symptômes, etc." required />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">Annuler</Button>
                  <Button type="submit" className="btn btn-primary flex-1" disabled={!selectedMedecinId || !motif || submitting}>
                    {submitting ? "Envoi..." : "Envoyer la demande"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
} 