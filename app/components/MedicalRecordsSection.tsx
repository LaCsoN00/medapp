import { FileText, Shield, Eye, Calendar, Activity, Lock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { useAuth } from '../../hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { getMedicalRecordByPatientId, getMedecinByUserId, createMedicalRecord, getAppointments, getPrescriptions, getHealthData, addHealthData, deleteAppointment, deletePrescription, deleteHealthData, createPrescriptionRequest } from '@/actions';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

// Types locaux pour consultations et prescriptions

type Appointment = {
  id: number;
  date: string;
  status: string;
  reason?: string;
  medecin?: {
    firstName?: string;
    lastName?: string;
    speciality?: { name?: string };
    photo?: string; // Added photo property
  };
};

type Prescription = {
  id: number;
  medication: string;
  dosage: string;
  createdAt: string;
  renewal?: boolean;
  medecinId?: number;
  medecin?: {
    id: number;
    firstName: string;
    lastName: string;
    photo?: string;
  };
};

interface PatientRecord {
  id: number;
  notes?: string | null;
  patient: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

interface PatientListItem {
  id: number;
  firstName: string;
  lastName: string;
}

interface HealthData {
  id: number;
  label: string;
  value: string;
  status: string;
  date: string | Date;
  icon?: string;
}


const MedicalRecordsSection = () => {
  const { user, isLoading } = useAuth();
  const [patientRecord, setPatientRecord] = useState<PatientRecord | null>(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [isCreatingRecord, setIsCreatingRecord] = useState(false);
  const [consultations, setConsultations] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [healthData, setHealthData] = useState<HealthData[]>([]);
  const [loadingHealthData, setLoadingHealthData] = useState(true);
  const [newHealth, setNewHealth] = useState({ label: '', value: '', status: 'normal', date: '', icon: '' });
  const [addingHealth, setAddingHealth] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Appointment | null>(null);
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const { toast } = useToast();
  const [renewingId, setRenewingId] = useState<number | null>(null);
  const [renewedIds, setRenewedIds] = useState<number[]>([]);

  const patientIdParam = useSearchParams().get('patientId');

  const consultationsRef = useRef<HTMLDivElement>(null);
  const prescriptionsRef = useRef<HTMLDivElement>(null);
  const healthDataRef = useRef<HTMLDivElement>(null);

  // Chargement du dossier d'un patient spécifique (si patientId dans l'URL)
  useEffect(() => {
    const fetchPatientRecord = async () => {
      if (user && (user.role === 'MEDECIN' || user.role === 'DOCTEUR') && patientIdParam) {
        setRecordLoading(true);
        try {
          const record = await getMedicalRecordByPatientId(Number(patientIdParam));
          if (!record) {
            setIsCreatingRecord(true);
            await createMedicalRecord({ patientId: Number(patientIdParam) });
            const newRecord = await getMedicalRecordByPatientId(Number(patientIdParam));
            setPatientRecord(newRecord as PatientRecord);
            setIsCreatingRecord(false);
          } else {
            setPatientRecord(record as PatientRecord);
            setIsCreatingRecord(false);
          }
        } catch {
          setPatientRecord(null);
          setIsCreatingRecord(false);
        } finally {
          setRecordLoading(false);
        }
      }
    };
    fetchPatientRecord();
  }, [user, patientIdParam]);

  // Chargement de la liste des patients du médecin (si pas de patientId)
  useEffect(() => {
    const fetchPatients = async () => {
      if (user && (user.role === 'MEDECIN' || user.role === 'DOCTEUR') && !patientIdParam) {
        setRecordLoading(true);
        try {
          const medecin = await getMedecinByUserId(user.id);
          const uniquePatients: { [id: number]: PatientListItem } = {};
          (medecin?.appointments || []).forEach((a: { patient: PatientListItem }) => {
            if (a.patient && !uniquePatients[a.patient.id]) {
              uniquePatients[a.patient.id] = a.patient;
            }
          });
          setPatients(Object.values(uniquePatients));
        } catch {
          setPatients([]);
        } finally {
          setRecordLoading(false);
        }
      }
    };
    fetchPatients();
  }, [user, patientIdParam]);

  useEffect(() => {
    const fetchData = async () => {
      if (user && user.role === 'PATIENT') {
        setLoadingData(true);
        try {
          const [appts, prescs] = await Promise.all([
            getAppointments({ patientId: user.id }),
            getPrescriptions({ patientId: user.id })
          ]);
          setConsultations((appts || []).map(a => ({
            ...a,
            date: a.date ? String(a.date instanceof Date ? a.date.toISOString() : a.date) : '',
            reason: typeof a.reason === 'string' ? a.reason : undefined,
            medecin: {
              ...a.medecin,
              photo: a.medecin?.photo ?? undefined,
            }
          })));
          setPrescriptions((prescs || []).map(p => {
            const createdAt = p.createdAt ? String(p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt) : '';
            if (p.medecin) {
              return {
                ...p,
                createdAt,
                medecinId: p.medecin.id,
                medecin: {
                  id: p.medecin.id,
                  firstName: p.medecin.firstName,
                  lastName: p.medecin.lastName,
                  photo: p.medecin.photo ?? undefined
                }
              };
            } else {
              return {
                ...p,
                createdAt
              };
            }
          }) as Prescription[]);
        } catch {
          setConsultations([]);
          setPrescriptions([]);
        } finally {
          setLoadingData(false);
        }
      }
    };
    fetchData();
  }, [user]);

  // Chargement dynamique des données de santé côté patient
  useEffect(() => {
    const fetchHealth = async () => {
      if (user && user.role === 'PATIENT') {
        setLoadingHealthData(true);
        try {
          const data = await getHealthData(user.id);
          setHealthData((data || []).map(d => ({
            ...d,
            date: typeof d.date === 'string' ? d.date : (d.date && typeof (d.date as Date).toISOString === 'function' ? (d.date as Date).toISOString() : ''),
          })));
        } catch {
          setHealthData([]);
        } finally {
          setLoadingHealthData(false);
        }
      }
    };
    fetchHealth();
  }, [user]);

  const handleAddHealth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setAddingHealth(true);
    try {
      await addHealthData({
        patientId: user.id,
        label: newHealth.label,
        value: newHealth.value,
        status: newHealth.status,
        date: newHealth.date ? new Date(newHealth.date) : new Date(),
        icon: newHealth.icon || undefined,
      });
      setNewHealth({ label: '', value: '', status: 'normal', date: '', icon: '' });
      const data = await getHealthData(user.id);
      setHealthData((data || []).map(d => ({
        ...d,
        date: typeof d.date === 'string' ? d.date : (d.date && typeof (d.date as Date).toISOString === 'function' ? (d.date as Date).toISOString() : ''),
      })));
    } finally {
      setAddingHealth(false);
    }
  };

  // Ajoute les handlers de suppression
  const handleDeleteConsultation = async (id: number) => {
    await deleteAppointment(id);
    setConsultations(prev => prev.filter(c => c.id !== id));
  };
  const handleDeletePrescription = async (id: number) => {
    await deletePrescription(id);
    setPrescriptions(prev => prev.filter(p => p.id !== id));
  };
  const handleDeleteHealthData = async (id: number) => {
    await deleteHealthData(id);
    setHealthData(prev => prev.filter(d => d.id !== id));
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
    // Si un patientId est présent dans l'URL, afficher le dossier de ce patient
    if (patientIdParam) {
      if (recordLoading) {
        return (
          <section className="section-padding bg-base-100">
            <div className="container text-center py-16">
              <div className="loading loading-spinner loading-lg mx-auto"></div>
              <p className="mt-4">Chargement du dossier patient...</p>
            </div>
          </section>
        );
      }
      if (isCreatingRecord || !patientRecord) {
        return (
          <section className="section-padding bg-base-100">
            <div className="container text-center py-16">
              <div className="loading loading-spinner loading-lg mx-auto"></div>
              <p className="mt-4">Création du dossier patient...</p>
            </div>
          </section>
        );
      }
      // Affichage du dossier réel du patient
      return (
        <section className="section-padding bg-base-100">
          <div className="container">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="badge-lg mb-4">📋 Dossier médical</Badge>
              <h2 className="heading-responsive font-bold text-base-content mb-4">
                Dossier de {patientRecord.patient.firstName} {patientRecord.patient.lastName}
              </h2>
              <p className="text-responsive text-base-content/70 max-w-2xl mx-auto">
                Accédez à l&apos;historique médical, prescriptions et notes de ce patient.
              </p>
            </div>
            <Card className="card bg-base-100 shadow-md mb-8">
              <CardHeader>
                <CardTitle className="text-lg">Notes médicales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-base-content/80 whitespace-pre-line min-h-[80px]">
                  {patientRecord.notes || 'Aucune note enregistrée.'}
                </div>
              </CardContent>
            </Card>
            {/* On peut ajouter ici l'historique des consultations, prescriptions, etc. */}
          </div>
        </section>
      );
    }
    // Sinon, afficher la liste des patients du médecin
    if (recordLoading) {
      return (
        <section className="section-padding bg-base-100">
          <div className="container text-center py-16">
            <div className="loading loading-spinner loading-lg mx-auto"></div>
            <p className="mt-4">Chargement des patients...</p>
          </div>
        </section>
      );
    }
    return (
      <section className="section-padding bg-base-100">
        <div className="container">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="badge-lg mb-4">��️ Dossiers patients</Badge>
            <h2 className="heading-responsive font-bold text-base-content mb-4">
              Accès aux dossiers médicaux
            </h2>
            <p className="text-responsive text-base-content/70 max-w-2xl mx-auto">
              Retrouvez ici la liste de vos patients et accédez à leur dossier médical.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {patients.length === 0 ? (
              <div className="text-center col-span-2 text-base-content/70">Aucun patient trouvé.</div>
            ) : patients.map((patient) => (
              <Card key={patient.id} className="card bg-base-100 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-primary text-primary-content">
                        {patient.firstName.charAt(0)}{patient.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">{patient.firstName} {patient.lastName}</h3>
                      <p className="text-primary font-medium">Dossier médical</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/medical-records?patientId=${patient.id}`} className="btn btn-primary flex-1 text-center">Voir le dossier</Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // PATIENT : contenu existant
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'badge-success';
      case 'attention': return 'badge-warning';
      case 'critique': return 'badge-error';
      default: return 'badge-neutral';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal': return <CheckCircle className="w-4 h-4" />;
      case 'attention': return <AlertTriangle className="w-4 h-4" />;
      case 'critique': return <Activity className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  // Supprime les tableaux statiques healthData, securityFeatures, etc. s'ils existent encore

  // Fonction utilitaire pour traduire le statut
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'Confirmé';
      case 'PENDING': return 'En attente';
      case 'CANCELLED': return 'Annulé';
      case 'COMPLETED': return 'Terminé';
      default: return status;
    }
  };

  const healthTypes = [
    { label: 'Poids', icon: '⚖️' },
    { label: 'Tension artérielle', icon: '❤️' },
    { label: 'Glycémie', icon: '🩸' },
    { label: 'Cholestérol', icon: '🔬' },
    { label: 'Autre', icon: '❓' },
  ];
  const iconChoices = ['⚖️', '❤️', '🩸', '🔬', '🌡️', '🧬', '🦴', '🫀', '🧠', '❓'];

  return (
    <section className="section-padding bg-base-100">
      <div className="container">
        {/* Header Section */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="badge-lg mb-4 max-w-full break-words truncate">
            📋 Dossier médical
          </Badge>
          <h2 className="heading-responsive font-bold text-base-content mb-4 break-words max-w-full truncate">
            Votre profil santé numérique
          </h2>
          <p className="text-responsive text-base-content/70 max-w-full mx-auto break-words">
            Accédez à votre profil santé personnel et sécurisé avec l&apos;historique complet 
            de vos consultations, prescriptions et données de santé.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
          {/* Image - First on mobile, left on desktop */}
          <div className="lg:col-span-1 order-first lg:order-first">
            {/* Medical Records Image */}
            <Card className="card bg-base-100 shadow-xl overflow-hidden max-w-full">
              <Image
                src="/assets/5.jpeg"
                alt="Dossier médical numérique"
                width={600}
                height={400}
                className="w-full h-[250px] sm:h-[300px] lg:h-[350px] object-cover"
                priority
              />
              
              {/* Overlay Content */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                <div className="p-6 text-white break-words max-w-full">
                  <h3 className="text-xl font-bold mb-2 break-words max-w-full truncate">Dossier sécurisé</h3>
                  <p className="text-sm opacity-90 break-words max-w-full">
                    Vos données médicales sont protégées et accessibles 24h/24
                  </p>
                </div>
              </div>
            </Card>

            {/* Security Features */}
            <Card className="card bg-base-100 shadow-md mt-6">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Shield className="w-5 h-5 mr-2 text-primary" />
                  Sécurité des données
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* securityFeatures.map((feature, index) => ( */}
                  <div className="flex items-center space-x-3">
                    <div className="text-primary">
                      <Lock className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-base-content">Chiffrement end-to-end</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-primary">
                      <Shield className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-base-content">Authentification sécurisée</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-primary">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-base-content">Conformité RGPD</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-primary">
                      <Activity className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-base-content">Accès contrôlé</span>
                  </div>
                {/* ))} */}
              </CardContent>
            </Card>
          </div>

          {/* Right - Medical Records Content */}
          <div className="lg:col-span-2 space-y-6 order-2">
            <Tabs defaultValue="consultations" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="consultations">Consultations</TabsTrigger>
                <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
                <TabsTrigger value="donnees">Données de santé</TabsTrigger>
              </TabsList>

              {/* Consultations Tab */}
              <TabsContent value="consultations" className="space-y-4">
                <Card className="card bg-base-100 shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center text-lg">
                        <Calendar className="w-5 h-5 mr-2 text-primary" />
                        Historique des consultations
                      </span>
                      {/* Bouton Exporter supprimé */}
                    </CardTitle>
                  </CardHeader>
                  <CardContent ref={consultationsRef} className="bg-white" style={{background: '#fff'}}>
                    {loadingData ? (
                      <div className="text-center py-8 text-base-content/70">Chargement...</div>
                    ) : consultations.length === 0 ? (
                      <div className="text-center py-8 text-base-content/70">Aucune consultation trouvée.</div>
                    ) : (
                    <div className="space-y-4">
                      {consultations.map((consultation, index) => (
                        <div key={index} className="card bg-base-100 shadow-sm border border-base-300">
                          <div className="card-body p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-4 flex-1">
                                <Avatar className="w-10 h-10 border-2 border-primary/20">
                                  {consultation.medecin?.photo ? (
                                    <AvatarImage src={consultation.medecin.photo} alt="Photo de profil" />
                                  ) : (
                                    <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-primary-content font-bold">
                                      {consultation.medecin?.firstName?.charAt(0)}{consultation.medecin?.lastName?.charAt(0)}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <h4 className="font-semibold text-base-content text-lg">
                                        Dr. {consultation.medecin?.firstName} {consultation.medecin?.lastName}
                                    </h4>
                                      <Badge variant="outline">{consultation.medecin?.speciality?.name || 'Spécialité'}</Badge>
                                    </div>
                                    <p className="text-sm text-base-content/70 mb-2">
                                      {consultation.reason || 'Consultation'} - {new Date(consultation.date).toLocaleDateString('fr-FR')}
                                    </p>
                                    <p className="text-sm text-base-content">{getStatusLabel(consultation.status)}</p>
                                </div>
                              </div>
                              <Badge className="badge-success animate-pulse">
                                {consultation.status}
                              </Badge>
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" className="btn btn-outline btn-sm" onClick={() => { setSelectedConsultation(consultation); setShowConsultationModal(true); }}>
                                <Eye className="w-4 h-4 mr-2" />
                                Voir détails
                              </Button>
                              <Button className="btn btn-danger btn-sm" onClick={() => handleDeleteConsultation(consultation.id)}>
                                Supprimer
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Prescriptions Tab */}
              <TabsContent value="prescriptions" className="space-y-4">
                <Card className="card bg-base-100 shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center text-lg">
                        <FileText className="w-5 h-5 mr-2 text-primary" />
                        Prescriptions médicales
                      </span>
                      {/* Bouton Exporter supprimé */}
                    </CardTitle>
                  </CardHeader>
                  <CardContent ref={prescriptionsRef} className="bg-white" style={{background: '#fff'}}>
                    {loadingData ? (
                      <div className="text-center py-8 text-base-content/70">Chargement...</div>
                    ) : prescriptions.length === 0 ? (
                      <div className="text-center py-8 text-base-content/70">Aucune prescription trouvée.</div>
                    ) : (
                    <div className="space-y-4">
                      {prescriptions.map((prescription, index) => (
                        <div key={index} className="card bg-base-100 shadow-sm border border-base-300">
                          <div className="card-body p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-4 flex-1">
                                <Avatar className="w-10 h-10 border-2 border-primary/20">
                                  {prescription.medecin?.photo ? (
                                    <AvatarImage src={prescription.medecin.photo} alt="Photo de profil" />
                                  ) : (
                                    <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-primary-content font-bold">
                                      {prescription.medecin?.firstName?.charAt(0) || 'M'}{prescription.medecin?.lastName?.charAt(0) || 'D'}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-base-content mb-2 text-lg">
                                    {prescription.medication}
                                  </h4>
                                  <div className="space-y-1 text-sm text-base-content/70">
                                    <p>Posologie: {prescription.dosage}</p>
                                      <p>Prescrit par Dr. {prescription.medecin?.firstName} {prescription.medecin?.lastName} le {new Date(prescription.createdAt).toLocaleDateString('fr-FR')}</p>
                                    </div>
                                  </div>
                                </div>
                                <Badge variant={prescription.renewal ? "default" : "secondary"} className="animate-pulse">
                                  {prescription.renewal ? 'Renouvellement' : 'Initiale'}
                                </Badge>
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" className="btn btn-outline btn-sm" onClick={() => { setSelectedPrescription(prescription); setShowPrescriptionModal(true); }}>
                                <Eye className="w-4 h-4 mr-2" />
                                Voir ordonnance
                              </Button>
                              <Button className="btn btn-danger btn-sm" onClick={() => handleDeletePrescription(prescription.id)}>
                                Supprimer
                              </Button>
                              {!prescription.renewal && (
                                <Button
                                  className="btn btn-warning btn-sm"
                                  disabled={renewingId === prescription.id || renewedIds.includes(prescription.id) || !((prescription.medecin as { id?: number })?.id)}
                                  onClick={async () => {
                                    const medecinId: number | undefined = ((prescription.medecin as { id?: number })?.id);
                                    if (!medecinId) return;
                                    setRenewingId(prescription.id);
                                    try {
                                      await createPrescriptionRequest({
                                        patientId: user?.id,
                                        medecinId,
                                        motif: `Renouvellement de l'ordonnance ${prescription.medication}`
                                      });
                                      setRenewedIds(ids => [...ids, prescription.id]);
                                      toast({ title: 'Demande envoyée', description: 'Votre demande de renouvellement a été transmise au médecin.' });
                                    } catch {
                                      toast({ title: 'Erreur', description: 'Impossible d\'envoyer la demande.', variant: 'destructive' });
                                    } finally {
                                      setRenewingId(null);
                                    }
                                  }}
                                >
                                  Demander renouvellement
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="donnees" className="space-y-4">
                <Card className="card bg-base-100 shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center text-lg">
                        <Activity className="w-5 h-5 mr-2 text-primary" />
                        Données de santé
                      </span>
                      {/* Bouton Exporter supprimé */}
                    </CardTitle>
                  </CardHeader>
                  <CardContent ref={healthDataRef} className="bg-white" style={{background: '#fff'}}>
                    {/* Formulaire d'ajout */}
                    <Button className="btn btn-primary rounded-full mb-6" onClick={() => setShowHealthModal(true)}>
                      Ajouter une donnée
                    </Button>
                    {showHealthModal && (
                      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-base-200 relative animate-fade-in">
                          <div className="flex items-center justify-between p-6 border-b border-base-200 bg-base-100 rounded-t-2xl">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
                              <Activity className="w-6 h-6 text-primary" />
                              Nouvelle donnée de santé
                            </h3>
                            <Button variant="ghost" size="sm" onClick={() => setShowHealthModal(false)} className="h-8 w-8 p-0 rounded-full">X</Button>
                          </div>
                          <form className="p-6 space-y-6" onSubmit={handleAddHealth}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block mb-1 font-medium">Type</label>
                                <select
                                  className="select select-bordered w-full"
                                  value={newHealth.label}
                                  onChange={e => setNewHealth({ ...newHealth, label: e.target.value, icon: healthTypes.find(t => t.label === e.target.value)?.icon || '' })}
                                  required
                                >
                                  {healthTypes.map((t) => (
                                    <option key={t.label} value={t.label}>{t.label}</option>
                                  ))}
                                </select>
                                {newHealth.label === 'Autre' && (
                                  <input
                                    type="text"
                                    className="input input-bordered w-full mt-2"
                                    placeholder="Précisez le type"
                                    value={newHealth.icon === '❓' ? '' : newHealth.label}
                                    onChange={e => setNewHealth({ ...newHealth, label: e.target.value })}
                                  />
                                )}
                              </div>
                              <div>
                                <label className="block mb-1 font-medium">Valeur</label>
                                <input type="text" className="input input-bordered w-full" placeholder="Ex: 120/80 mmHg" value={newHealth.value} onChange={e => setNewHealth({ ...newHealth, value: e.target.value })} required />
                              </div>
                              <div>
                                <label className="block mb-1 font-medium">Statut</label>
                                <select className="select select-bordered w-full" value={newHealth.status} onChange={e => setNewHealth({ ...newHealth, status: e.target.value })}>
                                  <option value="normal">Normal</option>
                                  <option value="attention">Attention</option>
                                  <option value="critique">Critique</option>
                                </select>
                              </div>
                              <div>
                                <label className="block mb-1 font-medium">Date</label>
                                <input type="date" className="input input-bordered w-full" value={newHealth.date} onChange={e => setNewHealth({ ...newHealth, date: e.target.value })} required />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block mb-1 font-medium">Icône</label>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {iconChoices.map(icon => (
                                    <button
                                      type="button"
                                      key={icon}
                                      className={`text-2xl px-2 py-1 rounded-full border-2 ${newHealth.icon === icon ? 'border-primary bg-primary/10' : 'border-base-300 bg-base-100'} transition`}
                                      onClick={() => setNewHealth({ ...newHealth, icon })}
                                      aria-label={`Choisir l'icône ${icon}`}
                                    >
                                      {icon}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                              <Button variant="outline" onClick={() => setShowHealthModal(false)} className="rounded-full" type="button">Annuler</Button>
                              <Button className="btn btn-primary rounded-full" type="submit" disabled={addingHealth}>
                                {addingHealth ? 'Ajout...' : 'Ajouter'}
                              </Button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                    {/* Affichage dynamique */}
                    {loadingHealthData ? (
                      <div className="text-center py-8 text-base-content/70">Chargement...</div>
                    ) : healthData.length === 0 ? (
                      <div className="text-center py-8 text-base-content/70">Aucune donnée de santé trouvée.</div>
                    ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {healthData.map((data, index) => (
                        <div key={index} className="card bg-base-100 shadow-sm border border-base-300">
                          <div className="card-body p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{data.icon}</span>
                                <h4 className="font-semibold text-base-content">
                                  {data.label}
                                </h4>
                              </div>
                              <Badge className={`${getStatusColor(data.status)} animate-pulse flex items-center gap-1`}>
                                {getStatusIcon(data.status)}
                                {data.status}
                              </Badge>
                            </div>
                            <p className="text-2xl font-bold text-base-content mb-2">
                              {data.value}
                            </p>
                            <p className="text-sm text-base-content/70">
                                Dernière mesure: {new Date(data.date).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <Button className="btn btn-danger btn-sm" onClick={() => handleDeleteHealthData(data.id)}>
                            Supprimer
                          </Button>
                        </div>
                      ))}
                    </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      {showPrescriptionModal && selectedPrescription && (
        <Dialog open={showPrescriptionModal} onOpenChange={setShowPrescriptionModal}>
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full relative animate-fade-in border border-base-200">
              {/* Header coloré avec icône */}
              <div className="flex items-center gap-3 p-8 rounded-t-2xl bg-gradient-to-r from-primary to-secondary text-white">
                <FileText className="w-8 h-8" />
                <h2 className="text-3xl font-bold flex-1">Détails de l&apos;ordonnance</h2>
                <button onClick={() => setShowPrescriptionModal(false)} aria-label="Fermer" className="text-white/80 hover:text-white text-3xl font-bold focus:outline-none">&times;</button>
              </div>
              <div className="p-8 space-y-8">
                {/* Nom du médecin en haut */}
                <div className="flex items-center gap-4 mb-2">
                  <Avatar className="w-12 h-12 border-2 border-primary/30">
                    {selectedPrescription.medecin?.photo ? (
                      <AvatarImage src={selectedPrescription.medecin.photo} alt="Photo de profil" />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-primary-content font-bold">
                        {selectedPrescription.medecin?.firstName?.charAt(0)}{selectedPrescription.medecin?.lastName?.charAt(0)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <div className="font-bold text-xl text-primary">Dr. {selectedPrescription.medecin?.firstName} {selectedPrescription.medecin?.lastName}</div>
                    <div className="text-xs text-base-content/60">Médecin prescripteur</div>
                  </div>
                </div>
                {/* Médicament et dosage */}
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-xl">
                    {selectedPrescription.medication}
                  </span>
                  <span className="inline-block px-3 py-1 rounded bg-base-200 text-base-content/80 text-lg">
                    {selectedPrescription.dosage}
                  </span>
                  {selectedPrescription.renewal && (
                    <span className="ml-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-bold uppercase">Renouvellement</span>
                  )}
                </div>
                {/* Date de prescription */}
                <div className="flex items-center gap-2 text-base-content/70 text-lg">
                  <Calendar className="w-5 h-5" />
                  <span>Prescrit le <b>{new Date(selectedPrescription.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</b></span>
                </div>
                {/* Section supplémentaire (exemple) */}
                {/* <div className="pt-4 border-t border-base-200 text-base-content/80 text-lg">
                  Instructions ou notes complémentaires ici.
                </div> */}
              </div>
            </div>
          </div>
        </Dialog>
      )}
      {showConsultationModal && selectedConsultation && (
        <Dialog open={showConsultationModal} onOpenChange={setShowConsultationModal}>
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full relative animate-fade-in border border-base-200">
              <div className="flex items-center gap-3 p-8 rounded-t-2xl bg-gradient-to-r from-primary to-secondary text-white">
                <Calendar className="w-8 h-8" />
                <h2 className="text-3xl font-bold flex-1">Détails de la consultation</h2>
                <button onClick={() => setShowConsultationModal(false)} aria-label="Fermer" className="text-white/80 hover:text-white text-3xl font-bold focus:outline-none">&times;</button>
              </div>
              <div className="p-8 space-y-8">
                <div className="flex items-center gap-4 mb-2">
                  <Avatar className="w-12 h-12 border-2 border-primary/30">
                    {selectedConsultation.medecin?.photo ? (
                      <AvatarImage src={selectedConsultation.medecin.photo} alt="Photo de profil" />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-primary-content font-bold">
                        {selectedConsultation.medecin?.firstName?.charAt(0)}{selectedConsultation.medecin?.lastName?.charAt(0)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <div className="font-bold text-xl text-primary">Dr. {selectedConsultation.medecin?.firstName} {selectedConsultation.medecin?.lastName}</div>
                    <div className="text-xs text-base-content/60">Médecin consulté</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-xl">
                    {selectedConsultation.reason || 'Consultation'}
                  </span>
                  <span className="inline-block px-3 py-1 rounded bg-base-200 text-base-content/80 text-lg">
                    {new Date(selectedConsultation.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                  <span className="ml-2 px-3 py-1 rounded-full bg-base-200 text-base-content/80 text-lg">
                    Statut : {getStatusLabel(selectedConsultation.status)}
                  </span>
                </div>
                {/* Section supplémentaire (exemple) */}
                {/* <div className="pt-4 border-t border-base-200 text-base-content/80 text-lg">
                  Notes ou compte-rendu ici.
                </div> */}
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </section>
  );
};

export default MedicalRecordsSection;