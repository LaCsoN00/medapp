import { FileText, RefreshCw, Calendar, Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Image from 'next/image';
import { useAuth } from '../../hooks/useAuth';
import { useEffect, useState, useRef } from 'react';
import { getMedecinByUserId, getPatientByUserId, getPrescriptions, createPrescription, getMedecins, createPrescriptionRequest } from '@/actions';
import { useToast } from '../../hooks/use-toast';

interface PrescriptionDoctorView {
  id: number;
  medication: string;
  dosage: string;
  renewal: boolean;
  createdAt: string | Date;
  patient: {
    firstName: string;
    lastName: string;
  };
}

interface PatientPrescription {
  id: number;
  medication: string;
  dosage: string;
  renewal: boolean;
  createdAt: string | Date;
  patientId: number;
  medecinId: number;
  medecin?: {
    id: number;
    firstName: string;
    lastName: string;
    photo?: string;
    speciality?: { name: string };
  };
}

interface Medecin {
  id: number;
  firstName: string;
  lastName: string;
  speciality?: { name: string };
  city?: string | null;
}

const PrescriptionSection = () => {
  const { user, isLoading } = useAuth();
  const [doctorPrescriptions, setDoctorPrescriptions] = useState<PrescriptionDoctorView[]>([]);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const { toast } = useToast();
  const [patientPrescriptions, setPatientPrescriptions] = useState<PatientPrescription[]>([]);
  const [patientLoading, setPatientLoading] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<PatientPrescription | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMed, setNewMed] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMedecins, setRequestMedecins] = useState<Medecin[]>([]);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSelectedMedecinId, setRequestSelectedMedecinId] = useState<number | null>(null);
  const [requestMotif, setRequestMotif] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  // Chargement dynamique des ordonnances du médecin
  useEffect(() => {
    const fetchDoctorPrescriptions = async () => {
      if (user && (user.role === 'MEDECIN' || user.role === 'DOCTEUR')) {
        setDoctorLoading(true);
        try {
          const medecin = await getMedecinByUserId(user.id);
          // On récupère toutes les prescriptions de ses patients
          const prescriptions: PrescriptionDoctorView[] = [];
          (medecin?.appointments || []).forEach((appointment: { patient?: { firstName: string; lastName: string; prescriptions?: PrescriptionDoctorView[] } }) => {
            const patient = appointment.patient;
            if (patient && Array.isArray(patient.prescriptions)) {
              patient.prescriptions.forEach((p) => {
                prescriptions.push({
                  id: p.id,
                  medication: p.medication,
                  dosage: p.dosage,
                  renewal: p.renewal,
                  createdAt: p.createdAt,
                  patient: { firstName: patient.firstName, lastName: patient.lastName }
                });
              });
            }
          });
          // On trie par date décroissante
          prescriptions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setDoctorPrescriptions(prescriptions);
        } catch {
          setDoctorPrescriptions([]);
        } finally {
          setDoctorLoading(false);
        }
      }
    };
    fetchDoctorPrescriptions();
  }, [user]);

  // Chargement dynamique des prescriptions du patient
  useEffect(() => {
    const fetchPatientPrescriptions = async () => {
      if (user && user.role === 'PATIENT') {
        setPatientLoading(true);
        try {
          const patient = await getPatientByUserId(user.id);
          if (patient) {
            const prescriptions = await getPrescriptions({ patientId: patient.id });
            setPatientPrescriptions((prescriptions as { id: number; medication: string; dosage: string; renewal: boolean; createdAt: string | Date; patientId: number; medecinId?: number; medecin?: { id?: number; firstName?: string; lastName?: string; photo?: string; speciality?: { name: string } } }[]).map(p => ({
              id: p.id,
              medication: p.medication,
              dosage: p.dosage,
              renewal: p.renewal,
              createdAt: p.createdAt,
              patientId: p.patientId,
              medecinId: p.medecinId || (p.medecin?.id ?? 0),
              medecin: p.medecin && p.medecin.id ? {
                id: p.medecin.id,
                firstName: p.medecin.firstName ?? '',
                lastName: p.medecin.lastName ?? '',
                photo: p.medecin.photo ?? undefined,
                speciality: p.medecin.speciality ? { name: p.medecin.speciality.name } : undefined
              } : undefined
            })));
          }
        } catch {
          setPatientPrescriptions([]);
        } finally {
          setPatientLoading(false);
        }
      }
    };
    fetchPatientPrescriptions();
  }, [user]);

  // Fonction de renouvellement
  const handleRenew = async (prescription: PatientPrescription) => {
    try {
      // Ici, on peut soit créer une nouvelle prescription, soit mettre à jour renewal
      if (!user) return;
      const p = prescription as PatientPrescription & { medecinId: number };
      await createPrescription({
        patientId: p.patientId,
        medecinId: p.medecinId,
        medication: p.medication,
        dosage: p.dosage,
        renewal: true
      });
      toast({ title: 'Demande envoyée', description: 'Votre demande de renouvellement a été transmise au médecin.', duration: 4000 });
      // Recharger la liste
      const patient = await getPatientByUserId(user.id);
      if (patient) {
        const prescriptions = await getPrescriptions({ patientId: patient.id });
        setPatientPrescriptions(prescriptions as PatientPrescription[]);
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de renouveler cette ordonnance.', variant: 'destructive' });
    }
  };

  // Fonction d'affichage des détails
  const handleShowDetails = (prescription: PatientPrescription) => {
    setSelectedPrescription(prescription);
    setShowDetailsModal(true);
  };
  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedPrescription(null);
  };

  // Action rapide : Planifier renouvellement
  const handleQuickRenew = () => {
    if (listRef.current) listRef.current.scrollIntoView({ behavior: 'smooth' });
    toast({ title: 'Renouvellement', description: 'Sélectionnez une ordonnance à renouveler dans la liste.' });
  };

  // Action rapide : Historique
  const handleQuickHistory = () => {
    if (listRef.current) listRef.current.scrollIntoView({ behavior: 'smooth' });
    toast({ title: 'Historique', description: 'Voici l\'historique de vos ordonnances.' });
  };

  // Ouvre la modale de demande et charge les médecins
  const handleOpenRequestModal = async () => {
    setRequestMotif("");
    setRequestSelectedMedecinId(null);
    setShowRequestModal(true);
    setRequestLoading(true);
    try {
      const medList = await getMedecins();
      setRequestMedecins(medList);
    } catch {
      setRequestMedecins([]);
    } finally {
      setRequestLoading(false);
    }
  };

  // Envoi de la demande d'ordonnance
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestSelectedMedecinId || !requestMotif || !user) return;
    setRequestSubmitting(true);
    try {
      const patient = await getPatientByUserId(user.id);
      if (!patient) throw new Error("Profil patient introuvable");
      await createPrescriptionRequest({
        patientId: patient.id,
        medecinId: requestSelectedMedecinId,
        motif: requestMotif
      });
      toast({ title: "Demande envoyée", description: "Votre demande a été transmise au médecin.", variant: "default", style: { background: '#1e293b', color: '#fff' } });
      setShowRequestModal(false);
    } catch (err: unknown) {
      let errorMsg = "Erreur inconnue";
      if (err && typeof err === 'object' && 'message' in err) errorMsg = (err as { message: string }).message;
      else if (typeof err === 'string') errorMsg = err;
      else errorMsg = JSON.stringify(err);
      toast({ title: "Erreur lors de l'envoi", description: errorMsg, variant: "destructive", style: { background: '#dc2626', color: '#fff' } });
    } finally {
      setRequestSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="section-padding bg-base-100">
        <div className="container">
          <div className="text-center">
            <div className="loading loading-spinner loading-lg"></div>
            <p className="mt-4">Chargement des données...</p>
          </div>
        </div>
      </section>
    );
  }

  if (!user) {
    return null;
  }

  if (user.role === 'MEDECIN' || user.role === 'DOCTEUR') {
    return (
      <section className="section-padding bg-base-100">
        <div className="container">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="badge-lg mb-4 max-w-full break-words truncate">
              💊 Ordonnances patients
            </Badge>
            <h2 className="heading-responsive font-bold text-base-content mb-4 break-words max-w-full truncate">
              Gestion des ordonnances
            </h2>
            <p className="text-responsive text-base-content/70 max-w-full mx-auto break-words">
              Retrouvez ici la liste des ordonnances que vous avez émises pour vos patients.
            </p>
          </div>
          {doctorLoading ? (
            <div className="text-center py-8">
              <div className="loading loading-spinner loading-lg mx-auto"></div>
              <p className="mt-4">Chargement des ordonnances...</p>
            </div>
          ) : doctorPrescriptions.length === 0 ? (
            <div className="text-center py-8 text-base-content/70">Aucune ordonnance trouvée.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {doctorPrescriptions.map((prescription) => (
                <Card key={prescription.id} className="card bg-white shadow-xl rounded-2xl border border-base-200 hover:shadow-2xl transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar className="w-14 h-14 shadow-md">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-content text-xl font-bold">
                          {prescription.patient?.firstName?.charAt(0)}{prescription.patient?.lastName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">
                          {prescription.patient ? `${prescription.patient.firstName} ${prescription.patient.lastName}` : 'Patient inconnu'}
                        </h3>
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-primary" />
                          <span className="text-base-content/80">
                            {prescription.medication}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-secondary" />
                          <span className="text-base-content/70">{new Date(prescription.createdAt).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base-content/70">{prescription.dosage}</span>
                        </div>
                        <Badge className={`mt-1 ${prescription.renewal ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{prescription.renewal ? 'Renouvelable' : 'Non renouvelable'}</Badge>
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-2 pt-2">
                      <Button className="btn btn-primary flex-1" onClick={() => {/* TODO: voir l'ordonnance */}}>
                        Voir l&apos;ordonnance
                      </Button>
                      <Button variant="outline" className="btn btn-outline flex-1" onClick={() => {/* TODO: renouveler */}} disabled={!prescription.renewal}>
                        Renouveler
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (user.role === 'PATIENT') {
    return (
      <section className="section-padding bg-base-100">
        <div className="container">
          {/* Header Section */}
          <div className="text-center mb-12">
            <Badge variant="secondary" className="badge-lg mb-4 max-w-full break-words truncate">💊 Ordonnances</Badge>
            <h2 className="heading-responsive font-bold text-base-content mb-4 break-words max-w-full truncate">Gestion des ordonnances</h2>
            <p className="text-responsive text-base-content/70 max-w-full mx-auto break-words">
              Renouvelez vos ordonnances en ligne pour vos traitements réguliers. Validation rapide par votre médecin traitant.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
            {/* Image - First on mobile, left on desktop */}
            <div className="lg:col-span-1 order-first lg:order-first">
              <Card className="card bg-base-100 shadow-xl overflow-hidden max-w-full">
                <Image
                  src="/assets/10.jpeg"
                  alt="Renouvellement d'ordonnances"
                  width={600}
                  height={400}
                  className="w-full h-full object-cover min-h-[300px] sm:min-h-[400px] lg:min-h-[500px]"
                  priority
                />
                {/* Overlay Content */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                  <div className="p-6 text-white break-words max-w-full">
                    <h3 className="text-xl font-bold mb-2 break-words max-w-full truncate">Renouvellement en ligne</h3>
                    <p className="text-sm opacity-90 break-words max-w-full">
                      Gérez vos ordonnances depuis votre espace personnel
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Center & Right - Prescriptions Management */}
            <div className="lg:col-span-2 space-y-6 order-2">
              {/* Quick Actions */}
              <Card className="card bg-base-100 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <RefreshCw className="w-5 h-5 mr-2 text-primary" />
                    Actions rapides
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button className="btn btn-primary" onClick={handleOpenRequestModal}>
                      <Plus className="w-4 h-4" />
                      <span className="ml-2">Nouvelle demande</span>
                    </Button>
                    <Button className="btn btn-secondary" onClick={handleQuickRenew}>
                      <Calendar className="w-4 h-4" />
                      <span className="ml-2">Planifier renouvellement</span>
                    </Button>
                    <Button className="btn btn-outline" onClick={handleQuickHistory}>
                      <Clock className="w-4 h-4" />
                      <span className="ml-2">Historique</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Prescriptions List dynamique */}
              <Card className="card bg-base-100 shadow-md" ref={listRef}>
                <CardHeader>
                  <CardTitle className="text-lg">Mes ordonnances</CardTitle>
                </CardHeader>
                <CardContent>
                  {patientLoading ? (
                    <div className="text-center py-8">
                      <div className="loading loading-spinner loading-lg mx-auto"></div>
                      <p className="mt-4">Chargement de vos ordonnances...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {patientPrescriptions.length === 0 ? (
                        <div className="text-center text-base-content/70 py-8">Aucune ordonnance trouvée.</div>
                      ) : patientPrescriptions.map((prescription) => (
                        <div key={prescription.id} className="card bg-base-100 shadow-sm border border-base-300">
                          <div className="card-body p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-4 flex-1">
                                <Avatar className="w-10 h-10 border-2 border-primary/20">
                                  <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-primary-content font-bold">
                                    {prescription.medication.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-base-content text-lg mb-1">
                                    {prescription.medication}
                                  </h4>
                                  <div className="space-y-1 text-sm text-base-content/70">
                                    <p>Prescrit le {new Date(prescription.createdAt).toLocaleDateString('fr-FR')}</p>
                                    <p>Posologie: {prescription.dosage}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      {prescription.medecin?.photo && (
                                        <Image src={prescription.medecin.photo} alt="Photo médecin" width={32} height={32} className="w-8 h-8 rounded-full object-cover border" />
                                      )}
                                      <span><strong>Médecin :</strong> {prescription.medecin ? `Dr. ${prescription.medecin.firstName} ${prescription.medecin.lastName}` : 'Inconnu'}</span>
                                      {prescription.medecin?.speciality?.name && (
                                        <span className="ml-2 text-xs text-primary font-semibold">{prescription.medecin.speciality.name}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <Badge className={`ml-2 ${prescription.renewal ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{prescription.renewal ? 'Renouvelable' : 'Non renouvelable'}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-base-content/70">
                                <span className="flex items-center">
                                  <Calendar className="w-4 h-4 mr-2" />
                                  {prescription.dosage}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  disabled={!prescription.renewal}
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleRenew(prescription)}
                                >
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Renouveler
                                </Button>
                                <Button variant="outline" className="btn btn-outline btn-sm" onClick={() => handleShowDetails(prescription)}>
                                  <FileText className="w-4 h-4 mr-2" />
                                  Détails
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Modale de détails */}
              {showDetailsModal && selectedPrescription && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between p-6 border-b">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Détails de l&apos;ordonnance
                      </h3>
                      <Button variant="ghost" size="sm" onClick={handleCloseDetails} className="h-8 w-8 p-0">X</Button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div><strong>Médicament :</strong> {selectedPrescription.medication}</div>
                      <div><strong>Posologie :</strong> {selectedPrescription.dosage}</div>
                      <div><strong>Date :</strong> {new Date(selectedPrescription.createdAt).toLocaleDateString('fr-FR')}</div>
                      <div><strong>Renouvelable :</strong> {selectedPrescription.renewal ? 'Oui' : 'Non'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modale de création d'ordonnance */}
              {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between p-6 border-b">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Plus className="w-5 h-5 text-primary" />
                        Nouvelle ordonnance
                      </h3>
                      <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)} className="h-8 w-8 p-0">X</Button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="block mb-1 font-medium">Médicament</label>
                        <input type="text" className="input input-bordered w-full" value={newMed} onChange={e => setNewMed(e.target.value)} />
                      </div>
                      <div>
                        <label className="block mb-1 font-medium">Posologie</label>
                        <input type="text" className="input input-bordered w-full" value={newDosage} onChange={e => setNewDosage(e.target.value)} />
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">Annuler</Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modale de demande d'ordonnance (choix médecin + motif) */}
              {showRequestModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between p-6 border-b">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Plus className="w-5 h-5 text-primary" />
                        Nouvelle demande d&apos;ordonnance
                      </h3>
                      <Button variant="ghost" size="sm" onClick={() => setShowRequestModal(false)} className="h-8 w-8 p-0">X</Button>
                    </div>
                    <div className="p-6 space-y-6">
                      <form onSubmit={handleSubmitRequest} className="space-y-4">
                        <div>
                          <label className="block mb-2 font-medium">Médecin</label>
                          {requestLoading ? (
                            <div className="loading loading-spinner loading-md" />
                          ) : (
                            <div className="space-y-2">
                              {requestMedecins.map((med) => (
                                <div
                                  key={med.id}
                                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                    requestSelectedMedecinId === med.id
                                      ? "border-primary bg-primary/10"
                                      : "border-base-300 hover:border-primary/50"
                                  }`}
                                  onClick={() => setRequestSelectedMedecinId(med.id)}
                                >
                                  <Avatar className="w-10 h-10">
                                    <AvatarFallback className="bg-primary text-primary-content">
                                      {med.firstName.charAt(0)}
                                      {med.lastName.charAt(0)}
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
                          <label className="block mb-1 font-medium">Motif de la demande</label>
                          <textarea
                            className="textarea textarea-bordered w-full"
                            rows={3}
                            value={requestMotif}
                            onChange={e => setRequestMotif(e.target.value)}
                            placeholder="Ex : Renouvellement traitement, symptômes, etc."
                            required
                          />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            onClick={() => setShowRequestModal(false)}
                            className="flex-1"
                            type="button"
                          >
                            Annuler
                          </Button>
                          <Button
                            type="submit"
                            className="btn btn-primary flex-1"
                            disabled={!requestSelectedMedecinId || !requestMotif || requestSubmitting}
                          >
                            {requestSubmitting ? "Envoi..." : "Envoyer la demande"}
                          </Button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return null;
};

export default PrescriptionSection;