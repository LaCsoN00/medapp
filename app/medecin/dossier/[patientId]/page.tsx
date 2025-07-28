'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Calendar, FileText, Pill, Phone, Mail, MapPin, CreditCard, Activity, ArrowLeft, Plus, Trash2, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import ProtectedLayout from '@/components/ProtectedLayout';
import RoleBasedRedirect from '@/components/RoleBasedRedirect';
import { useAuth } from '../../../../hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getMedecinByUserId, getAppointments, getPrescriptions, getHealthData, getMedicalExams, getPayments, getPrescriptionRequests, createPrescription, createPayment, getPatientById, createMedicalExam, updateAppointment, deleteAppointment } from '@/actions';

interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  photo?: string | null;
  address?: string | null;
  city?: string | null;
}

interface Appointment {
  id: number;
  date: string;
  time: string;
  status: string;
  type: string;
  notes?: string;
  patient: Patient;
}

interface Prescription {
  id: number;
  medication: string;
  dosage: string;
  instructions: string;
  renewal: boolean;
  createdAt: string;
  patient: Patient;
}

// interface MedicalRecord {
//   id: number;
//   type: string;
//   title: string;
//   description: string;
//   date: string;
//   fileUrl?: string;
//   patient: Patient;
// }

interface MedicalExam {
  id: number;
  type: string;
  name: string;
  date: string;
  status: string;
  results?: string;
  fileUrl?: string;
  patient: Patient;
}

interface Payment {
  id: number;
  amount: number;
  method: string;
  date: string;
  details?: string;
  patient: Patient;
}

interface PrescriptionRequest {
  id: number;
  motif: string;
  status: string;
  createdAt: string;
  patient: Patient;
  prescription?: {
    medication: string;
    dosage: string;
    createdAt: string;
  };
}

interface HealthData {
  id: number;
  label: string;
  value: string;
  status: string;
  date: string;
  icon?: string;
  patient: Patient;
}

const PatientDossierPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const patientId = params.patientId as string;

  // États pour les données du patient
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  // const [medicalRecords] = useState<MedicalRecord[]>([]);
  const [medicalExams, setMedicalExams] = useState<MedicalExam[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  // const [prescriptionRequests, setPrescriptionRequests] = useState<PrescriptionRequest[]>([]);
  const [healthData, setHealthData] = useState<HealthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // États pour les modals
  const [showCreatePrescriptionModal, setShowCreatePrescriptionModal] = useState(false);
  const [showCreatePaymentModal, setShowCreatePaymentModal] = useState(false);
  const [showCreateExamModal, setShowCreateExamModal] = useState(false);
  // const [showCreateDocumentModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // États pour les formulaires
  const [newPrescription, setNewPrescription] = useState({
    medication: '',
    dosage: '',
    instructions: '',
    renewal: false
  });

  const [newPayment, setNewPayment] = useState({
    amount: 0,
    method: '',
    details: ''
  });

  const [newExam, setNewExam] = useState({
    name: '',
    description: '',
    status: 'PENDING'
  });

  // const [newDocument] = useState({
  //   type: '',
  //   title: '',
  //   description: '',
  //   file: null as File | null
  // });

  // Charger les données du patient
  const loadPatientData = useCallback(async () => {
    if (!user || !patientId) return;
    
    try {
      setLoading(true);
      console.log('Chargement des données pour le patient:', patientId);
      
      // Récupérer le médecin connecté
      const medecin = await getMedecinByUserId(user.id);
      if (!medecin) return;
      
      // Récupérer les informations du patient
      const patientData = await getPatientById(parseInt(patientId));
      if (!patientData) {
        toast({
          title: "Patient non trouvé",
          description: "Ce patient n'existe pas ou vous n'avez pas accès à son dossier.",
          variant: "destructive"
        });
        router.push('/medecin/dossier');
        return;
      }

      // Transformer les données du patient
      const transformedPatient: Patient = {
        id: patientData.id,
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        email: patientData.email,
        phone: patientData.phone,
        photo: patientData.photo,
        address: patientData.address,
        city: patientData.city
      };
      
      setPatient(transformedPatient);
      
      // Récupérer toutes les données du patient en parallèle
      const [
        appointmentsData,
        prescriptionsData,
        healthData,
        medicalExamsData,
        paymentsData,
        prescriptionRequestsData
      ] = await Promise.all([
        getAppointments({ patientId: parseInt(patientId), medecinId: medecin.id }),
        getPrescriptions({ patientId: parseInt(patientId), medecinId: medecin.id }),
        getHealthData(parseInt(patientId)),
        getMedicalExams({ patientId: parseInt(patientId) }),
        getPayments({ patientId: parseInt(patientId) }),
        getPrescriptionRequests({ patientId: parseInt(patientId), medecinId: medecin.id })
      ]);
      
      // Transformer les données
      const transformedAppointments: Appointment[] = appointmentsData.map(appointment => ({
        id: appointment.id,
        date: typeof appointment.date === 'string' ? appointment.date : appointment.date.toISOString(),
        time: new Date(appointment.date).toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        status: appointment.status,
        type: appointment.reason || 'Consultation',
        notes: appointment.reason || undefined,
        patient: transformedPatient
      }));
      
      const transformedPrescriptions: Prescription[] = prescriptionsData.map(prescription => ({
        id: prescription.id,
        medication: prescription.medication,
        dosage: prescription.dosage,
        instructions: prescription.dosage,
        renewal: prescription.renewal,
        createdAt: typeof prescription.createdAt === 'string' ? prescription.createdAt : prescription.createdAt.toISOString(),
        patient: transformedPatient
      }));
      
      const transformedMedicalExams: MedicalExam[] = medicalExamsData.map(exam => ({
        id: exam.id,
        type: exam.name,
        name: exam.name,
        date: typeof exam.date === 'string' ? exam.date : exam.date.toISOString(),
        status: exam.status,
        results: exam.description,
        patient: transformedPatient
      }));
      
      const transformedPayments: Payment[] = paymentsData.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        method: payment.method,
        date: typeof payment.date === 'string' ? payment.date : payment.date.toISOString(),
        details: payment.details || undefined,
        patient: transformedPatient
      }));
      
      const transformedPrescriptionRequests: PrescriptionRequest[] = prescriptionRequestsData.map(request => ({
        id: request.id,
        motif: request.motif,
        status: request.status,
        createdAt: typeof request.createdAt === 'string' ? request.createdAt : request.createdAt.toISOString(),
        patient: transformedPatient,
        prescription: request.prescription ? {
          medication: request.prescription.medication,
          dosage: request.prescription.dosage,
          createdAt: typeof request.prescription.createdAt === 'string' ? request.prescription.createdAt : request.prescription.createdAt.toISOString()
        } : undefined
      }));
      
      const transformedHealthData: HealthData[] = healthData.map(data => ({
        id: data.id,
        label: data.label,
        value: data.value,
        status: data.status,
        date: data.date,
        icon: data.icon,
        patient: transformedPatient
      }));
      
      setAppointments(transformedAppointments);
      setPrescriptions(transformedPrescriptions);
      setMedicalExams(transformedMedicalExams);
      setPayments(transformedPayments);
      setPrescriptionRequests(transformedPrescriptionRequests);
      setHealthData(transformedHealthData);
      
      console.log('Données patient chargées:', {
        appointments: transformedAppointments.length,
        prescriptions: transformedPrescriptions.length,
        medicalExams: transformedMedicalExams.length,
        healthData: transformedHealthData.length,
        payments: transformedPayments.length,
        prescriptionRequests: transformedPrescriptionRequests.length
      });
    } catch (error) {
      console.error('Erreur lors du chargement des données patient:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du patient",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, patientId, toast, router]);

  // Charger les données au montage du composant
  useEffect(() => {
    if (authLoading) return;
    
    if (user && (user.role === 'MEDECIN' || user.role === 'DOCTEUR')) {
      loadPatientData();
    }
  }, [user, authLoading, loadPatientData]);

  // Fonctions pour les actions
  const handleCreatePrescription = async () => {
    if (!user || !patient || !newPrescription.medication || !newPrescription.dosage) return;
    
    setActionLoading(true);
    try {
      const medecin = await getMedecinByUserId(user.id);
      if (!medecin) throw new Error("Médecin non trouvé");
      
      await createPrescription({
        patientId: patient.id,
        medecinId: medecin.id,
        medication: newPrescription.medication,
        dosage: newPrescription.dosage,
        renewal: newPrescription.renewal
      });
      
      toast({
        title: "Ordonnance créée",
        description: "L'ordonnance a été créée avec succès",
        variant: "default"
      });
      
      setShowCreatePrescriptionModal(false);
      setNewPrescription({ medication: '', dosage: '', instructions: '', renewal: false });
      await loadPatientData(); // Recharger les données
    } catch (error) {
      console.error('Erreur lors de la création de l\'ordonnance:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'ordonnance",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePayment = async () => {
    if (!user || !patient || !newPayment.amount || !newPayment.method) return;
    
    setActionLoading(true);
    try {
      await createPayment({
        patientId: patient.id,
        amount: newPayment.amount,
        method: newPayment.method,
        details: newPayment.details
      });
      
      toast({
        title: "Paiement créé",
        description: "Le paiement a été créé avec succès",
        variant: "default"
      });
      
      setShowCreatePaymentModal(false);
      setNewPayment({ amount: 0, method: '', details: '' });
      await loadPatientData(); // Recharger les données
    } catch (error) {
      console.error('Erreur lors de la création du paiement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le paiement",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateExam = async () => {
    if (!user || !patient || !newExam.name) return;
    
    setActionLoading(true);
    try {
      const medecin = await getMedecinByUserId(user.id);
      if (!medecin) throw new Error("Médecin non trouvé");
      
      await createMedicalExam({
        patientId: patient.id,
        medecinId: medecin.id,
        name: newExam.name,
        description: newExam.description,
        status: newExam.status
      });
      
      toast({
        title: "Examen créé",
        description: "L'examen a été créé avec succès",
        variant: "default"
      });
      
      setShowCreateExamModal(false);
      setNewExam({ name: '', description: '', status: 'PENDING' });
      await loadPatientData(); // Recharger les données
    } catch (error) {
      console.error('Erreur lors de la création de l\'examen:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'examen",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateAppointmentStatus = async (appointmentId: number, newStatus: string) => {
    try {
      await updateAppointment(appointmentId, { status: newStatus as 'CONFIRMED' | 'PENDING' | 'CANCELLED' });
      toast({
        title: "Statut mis à jour",
        description: "Le statut du rendez-vous a été mis à jour",
        variant: "default"
      });
      await loadPatientData(); // Recharger les données
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAppointment = async (appointmentId: number) => {
    try {
      await deleteAppointment(appointmentId);
      toast({
        title: "Rendez-vous supprimé",
        description: "Le rendez-vous a été supprimé avec succès",
        variant: "default"
      });
      await loadPatientData(); // Recharger les données
    } catch (error) {
      console.error('Erreur lors de la suppression du rendez-vous:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le rendez-vous",
        variant: "destructive"
      });
    }
  };

  if (authLoading || loading) {
    return (
      <RoleBasedRedirect allowedRoles={['MEDECIN', 'DOCTEUR']}>
        <ProtectedLayout>
          <div className="max-w-6xl mx-auto pt-24 pb-20 w-full px-2 sm:px-4">
            <div className="text-center py-20">
              <div className="loading loading-spinner loading-lg text-primary"></div>
              <p className="mt-4 text-base-content/70">Chargement du dossier patient...</p>
            </div>
          </div>
        </ProtectedLayout>
      </RoleBasedRedirect>
    );
  }

  if (!patient) {
    return (
      <RoleBasedRedirect allowedRoles={['MEDECIN', 'DOCTEUR']}>
        <ProtectedLayout>
          <div className="max-w-6xl mx-auto pt-24 pb-20 w-full px-2 sm:px-4">
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold mb-4">Patient non trouvé</h2>
              <p className="text-base-content/70 mb-6">Ce patient n&apos;existe pas ou vous n&apos;avez pas accès à son dossier.</p>
              <Button onClick={() => router.push('/medecin/dossier')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour aux dossiers
              </Button>
            </div>
          </div>
        </ProtectedLayout>
      </RoleBasedRedirect>
    );
  }

  return (
    <RoleBasedRedirect allowedRoles={['MEDECIN', 'DOCTEUR']}>
      <ProtectedLayout>
        <div className="max-w-6xl mx-auto pt-24 pb-20 w-full px-2 sm:px-4">
          {/* Header avec informations du patient */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <Button variant="outline" onClick={() => router.push('/medecin/dossier')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <div className="flex items-center gap-4 flex-1">
                <Avatar className="w-16 h-16 border-4 border-primary/20 shadow-lg">
                  {patient.photo && patient.photo.startsWith('http') ? (
                    <AvatarImage src={patient.photo} alt="Photo patient" className="object-cover" />
                  ) : (
                    <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/80 text-primary-content">
                      {patient.firstName[0]}{patient.lastName[0]}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h1 className="text-3xl font-bold text-base-content">
                    {patient.firstName} {patient.lastName}
                  </h1>
                  <p className="text-base-content/70">{patient.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="default">
                      Patient
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Informations de contact */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="w-4 h-4 text-primary" />
                    <span className="font-medium">Téléphone</span>
                  </div>
                  <p className="text-base-content/70">{patient.phone || 'Non renseigné'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <span className="font-medium">Email</span>
                  </div>
                  <p className="text-base-content/70">{patient.email}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-medium">Adresse</span>
                  </div>
                  <p className="text-base-content/70">{patient.address || 'Non renseignée'}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Onglets principaux */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
              <TabsTrigger value="appointments">Rendez-vous</TabsTrigger>
              <TabsTrigger value="prescriptions">Ordonnances</TabsTrigger>
              <TabsTrigger value="exams">Examens</TabsTrigger>
              <TabsTrigger value="payments">Paiements</TabsTrigger>
              <TabsTrigger value="health">Santé</TabsTrigger>
            </TabsList>

            {/* Vue d'ensemble */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-8 h-8 text-primary" />
                      <div>
                        <p className="text-2xl font-bold">{appointments.length}</p>
                        <p className="text-sm text-base-content/70">Rendez-vous</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <Pill className="w-8 h-8 text-info" />
                      <div>
                        <p className="text-2xl font-bold">{prescriptions.length}</p>
                        <p className="text-sm text-base-content/70">Ordonnances</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-success" />
                      <div>
                        <p className="text-2xl font-bold">{medicalExams.length}</p>
                        <p className="text-sm text-base-content/70">Examens</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-8 h-8 text-warning" />
                      <div>
                        <p className="text-2xl font-bold">{payments.length}</p>
                        <p className="text-sm text-base-content/70">Paiements</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Derniers rendez-vous */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Derniers rendez-vous
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {appointments.slice(0, 5).map((appointment) => (
                      <div key={appointment.id} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                        <div>
                          <p className="font-medium">{appointment.type}</p>
                          <p className="text-sm text-base-content/70">
                            {new Date(appointment.date).toLocaleDateString('fr-FR')} à {appointment.time}
                          </p>
                        </div>
                        <Badge variant={appointment.status === 'CONFIRMED' ? 'default' : appointment.status === 'PENDING' ? 'secondary' : 'outline'}>
                          {appointment.status}
                        </Badge>
                      </div>
                    ))}
                    {appointments.length === 0 && (
                      <p className="text-center text-base-content/70 py-4">Aucun rendez-vous</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Dernières ordonnances */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Pill className="w-5 h-5" />
                    Dernières ordonnances
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {prescriptions.slice(0, 5).map((prescription) => (
                      <div key={prescription.id} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                        <div>
                          <p className="font-medium">{prescription.medication}</p>
                          <p className="text-sm text-base-content/70">{prescription.dosage}</p>
                        </div>
                        <Badge variant="outline">
                          {new Date(prescription.createdAt).toLocaleDateString('fr-FR')}
                        </Badge>
                      </div>
                    ))}
                    {prescriptions.length === 0 && (
                      <p className="text-center text-base-content/70 py-4">Aucune ordonnance</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Rendez-vous */}
            <TabsContent value="appointments" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Rendez-vous</h3>
                <Button onClick={() => router.push('/appointment')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau rendez-vous
                </Button>
              </div>
              
              <div className="space-y-4">
                {appointments.map((appointment) => (
                  <Card key={appointment.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-lg">{appointment.type}</h4>
                          <p className="text-base-content/70">
                            {new Date(appointment.date).toLocaleDateString('fr-FR')} à {appointment.time}
                          </p>
                          {appointment.notes && (
                            <p className="text-sm text-base-content/70 mt-1">{appointment.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={appointment.status === 'CONFIRMED' ? 'default' : appointment.status === 'PENDING' ? 'secondary' : 'outline'}>
                            {appointment.status}
                          </Badge>
                          <div className="flex gap-1">
                            {appointment.status === 'PENDING' && (
                              <Button size="sm" onClick={() => handleUpdateAppointmentStatus(appointment.id, 'CONFIRMED')}>
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => handleDeleteAppointment(appointment.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {appointments.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Calendar className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Aucun rendez-vous</h3>
                      <p className="text-base-content/70 mb-4">Ce patient n&apos;a pas encore de rendez-vous.</p>
                      <Button onClick={() => router.push('/appointment')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Prendre rendez-vous
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Ordonnances */}
            <TabsContent value="prescriptions" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Ordonnances</h3>
                <Button onClick={() => setShowCreatePrescriptionModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle ordonnance
                </Button>
              </div>
              
              <div className="space-y-4">
                {prescriptions.map((prescription) => (
                  <Card key={prescription.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-lg">{prescription.medication}</h4>
                          <p className="text-base-content/70">{prescription.dosage}</p>
                          {prescription.instructions && (
                            <p className="text-sm text-base-content/70 mt-1">{prescription.instructions}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {new Date(prescription.createdAt).toLocaleDateString('fr-FR')}
                          </Badge>
                          {prescription.renewal && (
                            <Badge variant="secondary">Renouvelable</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {prescriptions.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Pill className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Aucune ordonnance</h3>
                      <p className="text-base-content/70 mb-4">Ce patient n&apos;a pas encore d&apos;ordonnances.</p>
                      <Button onClick={() => setShowCreatePrescriptionModal(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Créer une ordonnance
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Examens */}
            <TabsContent value="exams" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Examens médicaux</h3>
                <Button onClick={() => setShowCreateExamModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvel examen
                </Button>
              </div>
              
              <div className="space-y-4">
                {medicalExams.map((exam) => (
                  <Card key={exam.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-lg">{exam.name}</h4>
                          <p className="text-base-content/70">{exam.results}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={exam.status === 'COMPLETED' ? 'default' : exam.status === 'PENDING' ? 'secondary' : 'outline'}>
                            {exam.status}
                          </Badge>
                          <Badge variant="outline">
                            {new Date(exam.date).toLocaleDateString('fr-FR')}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {medicalExams.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <FileText className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Aucun examen</h3>
                      <p className="text-base-content/70 mb-4">Ce patient n&apos;a pas encore d&apos;examens médicaux.</p>
                      <Button onClick={() => setShowCreateExamModal(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Créer un examen
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Paiements */}
            <TabsContent value="payments" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Paiements</h3>
                <Button onClick={() => setShowCreatePaymentModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau paiement
                </Button>
              </div>
              
              <div className="space-y-4">
                {payments.map((payment) => (
                  <Card key={payment.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-lg">{payment.amount.toFixed(2)} €</h4>
                          <p className="text-base-content/70">{payment.method}</p>
                          {payment.details && (
                            <p className="text-sm text-base-content/70 mt-1">{payment.details}</p>
                          )}
                        </div>
                        <Badge variant="outline">
                          {new Date(payment.date).toLocaleDateString('fr-FR')}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {payments.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <CreditCard className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Aucun paiement</h3>
                      <p className="text-base-content/70 mb-4">Ce patient n&apos;a pas encore de paiements.</p>
                      <Button onClick={() => setShowCreatePaymentModal(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Créer un paiement
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Santé */}
            <TabsContent value="health" className="space-y-6">
              <h3 className="text-xl font-semibold">Données de santé</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {healthData.map((data) => (
                  <Card key={data.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <Activity className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{data.label}</h4>
                          <p className="text-2xl font-bold text-primary">{data.value}</p>
                          <Badge variant={data.status === 'normal' ? 'default' : 'secondary'}>
                            {data.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {healthData.length === 0 && (
                  <Card className="md:col-span-2">
                    <CardContent className="p-8 text-center">
                      <Activity className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Aucune donnée de santé</h3>
                      <p className="text-base-content/70">Ce patient n&apos;a pas encore de données de santé enregistrées.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Modals pour créer de nouveaux éléments */}
          
          {/* Modal création ordonnance */}
          <Dialog open={showCreatePrescriptionModal} onOpenChange={setShowCreatePrescriptionModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle ordonnance</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Médicament</label>
                  <Input
                    value={newPrescription.medication}
                    onChange={(e) => setNewPrescription({...newPrescription, medication: e.target.value})}
                    placeholder="Nom du médicament"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Dosage</label>
                  <Input
                    value={newPrescription.dosage}
                    onChange={(e) => setNewPrescription({...newPrescription, dosage: e.target.value})}
                    placeholder="Dosage et posologie"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Instructions</label>
                  <Textarea
                    value={newPrescription.instructions}
                    onChange={(e) => setNewPrescription({...newPrescription, instructions: e.target.value})}
                    placeholder="Instructions spéciales"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="renewal"
                    checked={newPrescription.renewal}
                    onChange={(e) => setNewPrescription({...newPrescription, renewal: e.target.checked})}
                  />
                  <label htmlFor="renewal" className="text-sm">Renouvelable</label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreatePrescription} disabled={actionLoading}>
                    {actionLoading ? 'Création...' : 'Créer'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreatePrescriptionModal(false)}>
                    Annuler
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Modal création paiement */}
          <Dialog open={showCreatePaymentModal} onOpenChange={setShowCreatePaymentModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau paiement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Montant (€)</label>
                  <Input
                    type="number"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({...newPayment, amount: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Méthode de paiement</label>
                  <Select value={newPayment.method} onValueChange={(value) => setNewPayment({...newPayment, method: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une méthode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Espèces</SelectItem>
                      <SelectItem value="CARD">Carte bancaire</SelectItem>
                      <SelectItem value="TRANSFER">Virement</SelectItem>
                      <SelectItem value="CHECK">Chèque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Détails</label>
                  <Textarea
                    value={newPayment.details}
                    onChange={(e) => setNewPayment({...newPayment, details: e.target.value})}
                    placeholder="Détails du paiement"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreatePayment} disabled={actionLoading}>
                    {actionLoading ? 'Création...' : 'Créer'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreatePaymentModal(false)}>
                    Annuler
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Modal création examen */}
          <Dialog open={showCreateExamModal} onOpenChange={setShowCreateExamModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvel examen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Nom de l&apos;examen</label>
                  <Input
                    value={newExam.name}
                    onChange={(e) => setNewExam({...newExam, name: e.target.value})}
                    placeholder="Nom de l'examen"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={newExam.description}
                    onChange={(e) => setNewExam({...newExam, description: e.target.value})}
                    placeholder="Description de l'examen"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Statut</label>
                  <Select value={newExam.status} onValueChange={(value) => setNewExam({...newExam, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">En attente</SelectItem>
                      <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                      <SelectItem value="COMPLETED">Terminé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateExam} disabled={actionLoading}>
                    {actionLoading ? 'Création...' : 'Créer'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateExamModal(false)}>
                    Annuler
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </ProtectedLayout>
    </RoleBasedRedirect>
  );
};

export default PatientDossierPage; 