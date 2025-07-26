"use client";

import { useEffect, useState } from "react";
import { getPrescriptionRequests, updatePrescriptionRequest, createPrescription, createPayment, getMedecinByUserId, getPatientById, getMedicalRecordByPatientId, getAppointments, getPrescriptions, getHealthData } from "@/actions";
import { useAuth } from "@/../hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, User, Calendar, Pill, Activity } from "lucide-react";
import toast from 'react-hot-toast';
import BottomNavBar from "@/components/BottomNavBar";
import Header from "@/components/Header";
import Image from 'next/image';
import type { Medecin } from '@/types';

interface PrescriptionRequest {
  id: number;
  motif: string;
  status: string;
  createdAt: string | Date;
  patient: { id: number; firstName: string; lastName: string };
  prescription?: { medication: string; dosage: string; createdAt: string | Date } | null;
}

interface PatientDetails {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  photo?: string;
  medicalRecord?: {
    id: number;
    notes?: string;
    createdAt: string | Date;
  };
  appointments?: Array<{
    id: number;
    date: string | Date;
    reason?: string;
    status: string;
  }>;
  prescriptions?: Array<{
    id: number;
    medication: string;
    dosage: string;
    renewal: boolean;
    createdAt: string | Date;
  }>;
  healthData?: Array<{
    id: number;
    label: string;
    value: string;
    status: string;
    date: string | Date;
    icon?: string;
  }>;
}

export default function MedecinPrescriptionRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PrescriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModalId, setShowModalId] = useState<number | null>(null);
  const [medication, setMedication] = useState("");
  const [dosage, setDosage] = useState("");
  const [facture, setFacture] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [medecinInfo, setMedecinInfo] = useState<Medecin | null>(null);
  const [showPatientModal, setShowPatientModal] = useState<number | null>(null);
  const [patientDetails, setPatientDetails] = useState<PatientDetails | null>(null);
  const [loadingPatientDetails, setLoadingPatientDetails] = useState(false);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        if (!user) return;
        const medecin = await getMedecinByUserId(user.id);
        if (!medecin) return;
        setMedecinInfo({
          id: medecin.id,
          firstName: medecin.firstName,
          lastName: medecin.lastName,
          email: medecin.email,
          phone: medecin.phone ?? undefined,
          address: medecin.address ?? undefined,
          city: medecin.city ?? undefined,
          photo: medecin.photo ?? undefined,
          rating: medecin.rating,
          reviews: medecin.reviews,
          experience: medecin.experience ?? undefined,
          education: medecin.education ?? undefined,
          about: medecin.about ?? undefined,
          languages: medecin.languages ?? undefined,
          specialityId: medecin.specialityId,
          speciality: medecin.speciality ? {
            id: medecin.speciality.id,
            name: medecin.speciality.name,
            icon: medecin.speciality.icon,
            description: medecin.speciality.description ?? undefined
          } : undefined,
          userId: medecin.userId
        });
        const reqs = await getPrescriptionRequests({ medecinId: medecin.id, status: "PENDING" });
        setRequests(reqs as PrescriptionRequest[]);
      } catch {
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [user]);

  const handleRefuse = async (id: number) => {
    setSubmitting(true);
    try {
      await updatePrescriptionRequest(id, { status: "REJECTED" });
      setRequests((prev) => prev.filter((r) => r.id !== id));
      toast.success("Demande refusée", { position: 'top-center' });
    } catch {
      toast.error("Impossible de refuser la demande.", { position: 'top-center' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = (id: number) => {
    setShowModalId(id);
    setMedication("");
    setDosage("");
    setFacture("");
  };

  const handleValidatePrescription = async (req: PrescriptionRequest) => {
    if (!medication || !dosage || !user) return;
    setSubmitting(true);
    try {
      // Créer la prescription
      const prescription = await createPrescription({
        patientId: req.patient.id,
        medecinId: user.id,
        medication,
        dosage,
        renewal: true
      });
      // Générer la facture (exemple montant fixe)
      await createPayment({ patientId: req.patient.id, amount: facture ? Number(facture) : 10000, method: "consultation" });
      // Lier la prescription à la demande et passer en COMPLETED
      await updatePrescriptionRequest(req.id, { status: "APPROVED", prescriptionId: prescription.id });
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      toast.success("Prescription validée et facturée", { position: 'top-center' });
      setShowModalId(null);
    } catch {
      toast.error("Impossible de valider la prescription.", { position: 'top-center' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewPatientFile = async (patientId: number) => {
    setShowPatientModal(patientId);
    setLoadingPatientDetails(true);
    try {
      const [patient, medicalRecord, appointments, prescriptions, healthData] = await Promise.all([
        getPatientById(patientId),
        getMedicalRecordByPatientId(patientId),
        getAppointments({ patientId }),
        getPrescriptions({ patientId }),
        getHealthData(patientId)
      ]);

      if (!patient) {
        throw new Error("Patient introuvable");
      }

      setPatientDetails({
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone ?? undefined,
        address: patient.address ?? undefined,
        city: patient.city ?? undefined,
        photo: patient.photo ?? undefined,
        medicalRecord: medicalRecord ? {
          id: medicalRecord.id,
          notes: medicalRecord.notes ?? undefined,
          createdAt: medicalRecord.createdAt
        } : undefined,
        appointments: appointments?.map(a => ({
          id: a.id,
          date: a.date,
          reason: a.reason ?? undefined,
          status: a.status
        })),
        prescriptions: prescriptions?.map(p => ({
          id: p.id,
          medication: p.medication,
          dosage: p.dosage,
          renewal: p.renewal,
          createdAt: p.createdAt
        })),
        healthData: healthData?.map(h => ({
          id: h.id,
          label: h.label,
          value: h.value,
          status: h.status,
          date: h.date,
          icon: h.icon ?? undefined
        }))
      });
    } catch (error) {
      console.error("Erreur lors du chargement du dossier:", error);
      toast.error("Impossible de charger le dossier du patient", { position: 'top-center' });
    } finally {
      setLoadingPatientDetails(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <Header />
      <div className="max-w-6xl mx-auto pt-24 pb-20 w-full px-2 sm:px-4">
        <section className="section-padding bg-base-100 min-h-screen pb-24">
          <div className="container max-w-3xl mx-auto">
            {/* Header visuel local supprimé, seul le Header global est affiché */}
            {/* Comment ça marche */}
            <div className="bg-base-200 rounded-xl p-6 mb-10">
              <h2 className="text-xl font-semibold mb-4 text-primary">Comment ça marche ?</h2>
              <ol className="list-decimal list-inside space-y-2 text-base-content/80">
                <li>Vous recevez une demande d&apos;ordonnance d&apos;un patient avec le motif détaillé.</li>
                <li>Vous pouvez consulter le dossier complet du patient avant de décider.</li>
                <li>Vous pouvez valider (et rédiger l&apos;ordonnance) ou refuser la demande.</li>
                <li>Le patient est notifié et peut accéder à sa prescription en ligne.</li>
              </ol>
            </div>
            {/* Liste des demandes */}
            <div className="mb-8">
              <h2 className="text-lg font-bold mb-4">Demandes en attente</h2>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="loading loading-spinner loading-lg mx-auto"></div>
                    <p className="mt-4">Chargement des demandes...</p>
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center text-base-content/70 py-8">Aucune demande en attente.</div>
                ) : (
                  <div className="divide-y divide-base-200 rounded-xl border border-base-200 bg-base-100 overflow-hidden">
                    {requests.map((req) => (
                      <div key={req.id} className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-6 px-4 py-4 hover:bg-base-200/40 transition-all">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-semibold text-base-content truncate">{req.patient.firstName} {req.patient.lastName}</span>
                            <Badge variant="outline" className="capitalize">En attente</Badge>
                          </div>
                          <div className="text-base-content/80 mb-1 truncate"><strong>Motif :</strong> {req.motif}</div>
                          <div className="text-xs text-base-content/50">Envoyée le {new Date(req.createdAt).toLocaleDateString("fr-FR")}</div>
                        </div>
                        <div className="flex gap-2 md:ml-auto mt-2 md:mt-0">
                          <Button 
                            variant="outline" 
                            onClick={() => handleViewPatientFile(req.patient.id)} 
                            className="rounded-full"
                            size="sm"
                          >
                            <User className="w-4 h-4 mr-1" />
                            Dossier
                          </Button>
                          <Button variant="outline" onClick={() => handleRefuse(req.id)} disabled={submitting} className="rounded-full">Refuser</Button>
                          <Button className="btn btn-primary rounded-full" onClick={() => handleAccept(req.id)} disabled={submitting}>Prescrire</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Modale de prescription */}
            {requests.map((req) => showModalId === req.id && (
              <div key={req.id} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-base-100 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-base-300 relative animate-fade-in">
                  <div className="flex items-center justify-between p-6 border-b border-base-200 bg-base-100 rounded-t-2xl">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
                      <FileText className="w-6 h-6 text-primary" />
                      Détail de la demande
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setShowModalId(null)} className="h-8 w-8 p-0 rounded-full">X</Button>
                  </div>
                  <div className="p-6 space-y-6">
                    {/* Infos du médecin prescripteur */}
                    {medecinInfo && (
                      <div className="bg-base-100 border border-primary/30 rounded-xl p-4 flex items-center gap-4 mb-4">
                        {medecinInfo.photo && (
                          <Image src={medecinInfo.photo} alt="Photo médecin" width={48} height={48} className="w-12 h-12 rounded-full object-cover border" />
                        )}
                        <div>
                          <div className="font-bold text-primary text-lg">Dr. {medecinInfo.firstName} {medecinInfo.lastName}</div>
                          {medecinInfo.speciality && (
                            <div className="text-xs text-primary font-semibold">{medecinInfo.speciality.name}</div>
                          )}
                          <div className="text-xs text-base-content/60">{medecinInfo.email}</div>
                        </div>
                      </div>
                    )}
                    {/* Infos patient et demande */}
                    <div className="bg-base-200/60 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-tr from-blue-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg border-2 border-white shadow">
                        {req.patient.firstName[0]}{req.patient.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-base-content text-lg">{req.patient.firstName} {req.patient.lastName}</div>
                        <div className="text-xs text-base-content/50">Demande envoyée le {new Date(req.createdAt).toLocaleDateString("fr-FR")}</div>
                        <div className="text-base-content/80 mt-1"><strong>Motif :</strong> {req.motif}</div>
                      </div>
                    </div>
                    {/* Ancienne ordonnance si existante */}
                    {req.prescription && (
                      <div className="bg-base-100 border border-base-300 rounded-xl p-4">
                        <div className="font-semibold text-base-content mb-2">Ordonnance précédente</div>
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex-1">
                            <div className="text-sm text-base-content/70"><strong>Médicament :</strong> {req.prescription.medication}</div>
                            <div className="text-sm text-base-content/70"><strong>Posologie :</strong> {req.prescription.dosage}</div>
                            <div className="text-xs text-base-content/50">Émise le {new Date(req.prescription.createdAt).toLocaleDateString("fr-FR")}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Formulaire de prescription */}
                    <div className="space-y-4">
                      <div className="font-semibold text-base-content mb-2">Nouvelle ordonnance</div>
                      <div>
                        <label className="block mb-1 font-medium">Médicament</label>
                        <input type="text" className="input input-bordered w-full" value={medication || req.prescription?.medication || ''} onChange={e => setMedication(e.target.value)} placeholder="Nom du médicament" />
                      </div>
                      <div>
                        <label className="block mb-1 font-medium">Posologie</label>
                        <input type="text" className="input input-bordered w-full" value={dosage || req.prescription?.dosage || ''} onChange={e => setDosage(e.target.value)} placeholder="Ex : 1 comprimé 2x/jour" />
                      </div>
                      <div>
                        <label className="block mb-1 font-medium">Montant facturé (FCFA)</label>
                        <input type="number" className="input input-bordered w-full" value={facture} onChange={e => setFacture(e.target.value)} placeholder="Ex : 10000" />
                      </div>
                      <div>
                        <label className="block mb-1 font-medium">Commentaire du médecin <span className="text-base-content/50">(optionnel)</span></label>
                        <textarea className="textarea textarea-bordered w-full" rows={2} placeholder="Ajouter un commentaire..." />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setShowModalId(null)} className="rounded-full">Annuler</Button>
                      <Button onClick={() => handleValidatePrescription(req)} className="btn btn-primary rounded-full" disabled={!(medication || req.prescription?.medication) || !(dosage || req.prescription?.dosage) || submitting}>Valider</Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {/* Modale du dossier patient */}
            {showPatientModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-base-100 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-base-300 relative animate-fade-in">
                  <div className="flex items-center justify-between p-6 border-b border-base-200 bg-base-100 rounded-t-2xl">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
                      <User className="w-6 h-6 text-primary" />
                      Dossier Patient
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setShowPatientModal(null)} className="h-8 w-8 p-0 rounded-full">X</Button>
                  </div>
                  <div className="p-6">
                    {loadingPatientDetails ? (
                      <div className="text-center py-8">
                        <div className="loading loading-spinner loading-lg mx-auto"></div>
                        <p className="mt-4">Chargement du dossier...</p>
                      </div>
                    ) : patientDetails ? (
                      <div className="space-y-6">
                        {/* Informations personnelles */}
                        <div className="bg-base-200/60 rounded-xl p-4">
                          <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <User className="w-5 h-5" />
                            Informations personnelles
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <strong>Nom complet :</strong> {patientDetails.firstName} {patientDetails.lastName}
                            </div>
                            <div>
                              <strong>Email :</strong> {patientDetails.email}
                            </div>
                            {patientDetails.phone && (
                              <div>
                                <strong>Téléphone :</strong> {patientDetails.phone}
                              </div>
                            )}
                            {patientDetails.address && (
                              <div>
                                <strong>Adresse :</strong> {patientDetails.address}
                              </div>
                            )}
                            {patientDetails.city && (
                              <div>
                                <strong>Ville :</strong> {patientDetails.city}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Dossier médical */}
                        {patientDetails.medicalRecord && (
                          <div className="bg-base-200/60 rounded-xl p-4">
                            <h4 className="font-semibold text-lg mb-3">Notes médicales</h4>
                            <div className="text-sm text-base-content/80">
                              {patientDetails.medicalRecord.notes || "Aucune note médicale disponible"}
                            </div>
                            <div className="text-xs text-base-content/50 mt-2">
                              Dossier créé le {new Date(patientDetails.medicalRecord.createdAt).toLocaleDateString("fr-FR")}
                            </div>
                          </div>
                        )}

                        {/* Consultations */}
                        {patientDetails.appointments && patientDetails.appointments.length > 0 && (
                          <div className="bg-base-200/60 rounded-xl p-4">
                            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                              <Calendar className="w-5 h-5" />
                              Historique des consultations ({patientDetails.appointments.length})
                            </h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {patientDetails.appointments.map((appointment) => (
                                <div key={appointment.id} className="bg-base-100 rounded-lg p-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="font-medium">
                                        {new Date(appointment.date).toLocaleDateString("fr-FR")}
                                      </div>
                                      {appointment.reason && (
                                        <div className="text-sm text-base-content/70">
                                          Motif : {appointment.reason}
                                        </div>
                                      )}
                                    </div>
                                    <Badge variant={appointment.status === "COMPLETED" ? "default" : "outline"}>
                                      {appointment.status}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Ordonnances */}
                        {patientDetails.prescriptions && patientDetails.prescriptions.length > 0 && (
                          <div className="bg-base-200/60 rounded-xl p-4">
                            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                              <Pill className="w-5 h-5" />
                              Historique des ordonnances ({patientDetails.prescriptions.length})
                            </h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {patientDetails.prescriptions.map((prescription) => (
                                <div key={prescription.id} className="bg-base-100 rounded-lg p-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="font-medium">{prescription.medication}</div>
                                      <div className="text-sm text-base-content/70">
                                        Posologie : {prescription.dosage}
                                      </div>
                                      <div className="text-xs text-base-content/50">
                                        {new Date(prescription.createdAt).toLocaleDateString("fr-FR")}
                                      </div>
                                    </div>
                                    {prescription.renewal && (
                                      <Badge variant="outline">Renouvellement</Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Données de santé */}
                        {patientDetails.healthData && patientDetails.healthData.length > 0 && (
                          <div className="bg-base-200/60 rounded-xl p-4">
                            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                              <Activity className="w-5 h-5" />
                              Données de santé ({patientDetails.healthData.length})
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {patientDetails.healthData.map((data) => (
                                <div key={data.id} className="bg-base-100 rounded-lg p-3">
                                  <div className="flex items-center gap-2">
                                    {data.icon && <span className="text-lg">{data.icon}</span>}
                                    <div>
                                      <div className="font-medium">{data.label}</div>
                                      <div className="text-sm text-base-content/70">
                                        {data.value} - {data.status}
                                      </div>
                                      <div className="text-xs text-base-content/50">
                                        {new Date(data.date).toLocaleDateString("fr-FR")}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-base-content/70">
                        Impossible de charger le dossier du patient
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
        <BottomNavBar />
      </div>
    </>
  );
} 