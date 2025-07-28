'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getPatientByUserId, getMedicalDocumentsByPatientId, getPrescriptions, getMedicalExams, getAppointments } from '@/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, FileText, Pill, Activity, Shield, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface MedicalDocument {
  id: number;
  type: string;
  title: string;
  description: string | null;
  fileUrl: string;
  createdAt: Date;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Prescription = { [key: string]: any };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MedicalExam = { [key: string]: any };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Appointment = { [key: string]: any };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Patient = { [key: string]: any };

const PatientDossierOverview = () => {
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [medicalExams, setMedicalExams] = useState<MedicalExam[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('consultations');

  useEffect(() => {
    const loadPatientData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const patientData = await getPatientByUserId(user.id);
        if (patientData) {
          setPatient(patientData);
          // Récupérer toutes les données en parallèle
          const [docs, presc, exams, apps] = await Promise.all([
            getMedicalDocumentsByPatientId(patientData.id),
            getPrescriptions({ patientId: patientData.id }),
            getMedicalExams({ patientId: patientData.id }),
            getAppointments({ patientId: patientData.id })
          ]);
          
          setDocuments(docs);
          setPrescriptions(presc as Prescription[]);
          setMedicalExams(exams as MedicalExam[]);
          setAppointments(apps as Appointment[]);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPatientData();
  }, [user]);

  const getConsultations = () => {
    return appointments.filter(app => app.status === 'COMPLETED');
  };

  const getPendingAppointments = () => {
    return appointments.filter(app => app.status === 'PENDING' || app.status === 'CONFIRMED');
  };

  const getRecentPrescriptions = () => {
    return prescriptions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  };

  const getRecentExams = () => {
    return medicalExams
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'success';
      case 'PENDING': return 'warning';
      case 'CANCELLED': return 'error';
      case 'COMPLETED': return 'info';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'Confirmé';
      case 'PENDING': return 'En attente';
      case 'CANCELLED': return 'Annulé';
      case 'COMPLETED': return 'Terminé';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="loading loading-spinner loading-lg"></div>
        <p className="mt-4 text-base-content/70">Chargement du dossier médical...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header - Pattern des pages protégées */}
      <div className="mb-8">
        <div className="flex flex-col items-center gap-2 mb-4 max-w-full">
          <Avatar className="w-20 h-20 border-4 border-primary/20 mb-2">
            {patient?.photo ? (
              <AvatarImage src={patient.photo} alt="Photo de profil" />
            ) : (
              <AvatarFallback className="text-3xl">{patient?.firstName?.[0] || patient?.email?.[0] || 'U'}</AvatarFallback>
            )}
          </Avatar>
          <h1 className="text-2xl font-bold text-base-content text-center break-words max-w-full truncate">
            {patient?.firstName} {patient?.lastName}
          </h1>
          <p className="text-base-content/70 text-center mb-2">Dossier médical</p>
          <div className="flex items-center gap-4 mt-1 flex-wrap justify-center">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm break-words max-w-full">{appointments.length} rendez-vous</span>
            </div>
            <div className="flex items-center gap-1">
              <Pill className="w-4 h-4 text-info" />
              <span className="text-sm break-words max-w-full">{prescriptions.length} prescriptions</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="w-4 h-4 text-warning" />
              <span className="text-sm break-words max-w-full">{medicalExams.length} examens</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-8 w-full overflow-x-auto">
        <Card className="card bg-base-100 shadow-md max-w-full">
          <CardContent className="p-4 min-h-[90px]">
            <div className="flex items-center justify-between break-words max-w-full">
              <div>
                <p className="text-base-content/70 text-sm">Consultations</p>
                <p className="text-2xl font-bold text-primary">{getConsultations().length}</p>
              </div>
              <Calendar className="w-8 h-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="card bg-base-100 shadow-md max-w-full">
          <CardContent className="p-4 min-h-[90px]">
            <div className="flex items-center justify-between break-words max-w-full">
              <div>
                <p className="text-base-content/70 text-sm">Prescriptions</p>
                <p className="text-2xl font-bold text-info">{prescriptions.length}</p>
              </div>
              <Pill className="w-8 h-8 text-info/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="card bg-base-100 shadow-md max-w-full">
          <CardContent className="p-4 min-h-[90px]">
            <div className="flex items-center justify-between break-words max-w-full">
              <div>
                <p className="text-base-content/70 text-sm">Examens</p>
                <p className="text-2xl font-bold text-warning">{medicalExams.length}</p>
              </div>
              <Activity className="w-8 h-8 text-warning/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="card bg-base-100 shadow-md max-w-full">
          <CardContent className="p-4 min-h-[90px]">
            <div className="flex items-center justify-between break-words max-w-full">
              <div>
                <p className="text-base-content/70 text-sm">RDV à venir</p>
                <p className="text-2xl font-bold text-success">{getPendingAppointments().length}</p>
              </div>
              <Clock className="w-8 h-8 text-success/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Security Info */}
          <Card className="card bg-base-100 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-success" />
                <h3 className="font-semibold">Sécurité</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-base-content/70">Chiffrement de bout en bout</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-base-content/70">Conformité RGPD</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-base-content/70">Accès sécurisé</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="card bg-base-100 shadow-md">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Actions rapides</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  Nouveau RDV
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Ajouter document
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Pill className="w-4 h-4 mr-2" />
                  Demande prescription
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Tabs */}
        <div className="lg:col-span-3">
          <Card className="card bg-base-100 shadow-md">
            <CardContent className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-base-200">
                  <TabsTrigger value="consultations" className="data-[state=active]:bg-primary data-[state=active]:text-primary-content">
                    <Calendar className="w-4 h-4 mr-2" />
                    Consultations
                  </TabsTrigger>
                  <TabsTrigger value="prescriptions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-content">
                    <Pill className="w-4 h-4 mr-2" />
                    Prescriptions
                  </TabsTrigger>
                  <TabsTrigger value="exams" className="data-[state=active]:bg-primary data-[state=active]:text-primary-content">
                    <Activity className="w-4 h-4 mr-2" />
                    Examens
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="data-[state=active]:bg-primary data-[state=active]:text-primary-content">
                    <FileText className="w-4 h-4 mr-2" />
                    Documents
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="consultations" className="mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-lg">Historique des consultations</h3>
                  </div>
                  {getConsultations().length > 0 ? (
                    <div className="space-y-4">
                      {getConsultations().map((consultation) => (
                        <Card key={consultation.id} className="card bg-base-100 shadow-md border border-base-300">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10">
                                  <AvatarFallback className="bg-primary/10 text-primary">
                                    {consultation.medecin?.firstName?.[0]}{consultation.medecin?.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h4 className="font-medium">
                                    Dr. {consultation.medecin?.firstName} {consultation.medecin?.lastName}
                                  </h4>
                                  <p className="text-base-content/70 text-sm">
                                    {consultation.medecin?.speciality?.name}
                                  </p>
                                </div>
                              </div>
                              <Badge variant={getStatusColor(consultation.status) as "default" | "secondary" | "destructive" | "outline"}>
                                {getStatusText(consultation.status)}
                              </Badge>
                            </div>
                            {consultation.reason && (
                              <p className="text-base-content/70 text-sm mb-2">
                                <span className="font-medium">Motif:</span> {consultation.reason}
                              </p>
                            )}
                            <p className="text-base-content/50 text-xs">
                              {new Date(consultation.date).toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <AlertCircle className="w-12 h-12 text-base-content/30 mx-auto mb-4" />
                      <p className="text-base-content/70">Aucune consultation terminée trouvée.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="prescriptions" className="mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Pill className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-lg">Prescriptions récentes</h3>
                  </div>
                  {getRecentPrescriptions().length > 0 ? (
                    <div className="space-y-4">
                      {getRecentPrescriptions().map((prescription) => (
                        <Card key={prescription.id} className="card bg-base-100 shadow-md border border-base-300">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10">
                                  <AvatarFallback className="bg-info/10 text-info">
                                    {prescription.medecin?.firstName?.[0]}{prescription.medecin?.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h4 className="font-medium">{prescription.medication}</h4>
                                  <p className="text-base-content/70 text-sm">
                                    Dr. {prescription.medecin?.firstName} {prescription.medecin?.lastName}
                                  </p>
                                </div>
                              </div>
                              {prescription.renewal && (
                                <Badge variant="outline" className="text-xs">
                                  Renouvellement
                                </Badge>
                              )}
                            </div>
                            <p className="text-base-content/70 text-sm mb-2">
                              <span className="font-medium">Dosage:</span> {prescription.dosage}
                            </p>
                            <p className="text-base-content/50 text-xs">
                              {new Date(prescription.createdAt).toLocaleDateString('fr-FR')}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <AlertCircle className="w-12 h-12 text-base-content/30 mx-auto mb-4" />
                      <p className="text-base-content/70">Aucune prescription trouvée.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="exams" className="mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-lg">Examens médicaux</h3>
                  </div>
                  {getRecentExams().length > 0 ? (
                    <div className="space-y-4">
                      {getRecentExams().map((exam) => (
                        <Card key={exam.id} className="card bg-base-100 shadow-md border border-base-300">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10">
                                  <AvatarFallback className="bg-warning/10 text-warning">
                                    {exam.medecin?.firstName?.[0]}{exam.medecin?.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h4 className="font-medium">{exam.name}</h4>
                                  <p className="text-base-content/70 text-sm">
                                    Dr. {exam.medecin?.firstName} {exam.medecin?.lastName}
                                  </p>
                                </div>
                              </div>
                              <Badge variant={exam.status === 'COMPLETED' ? 'default' : exam.status === 'PENDING' ? 'secondary' : 'outline'}>
                                {exam.status === 'COMPLETED' ? 'Terminé' : exam.status === 'PENDING' ? 'En attente' : exam.status}
                              </Badge>
                            </div>
                            <p className="text-base-content/70 text-sm mb-2">
                              {exam.description}
                            </p>
                            <p className="text-base-content/50 text-xs">
                              {new Date(exam.date).toLocaleDateString('fr-FR')}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <AlertCircle className="w-12 h-12 text-base-content/30 mx-auto mb-4" />
                      <p className="text-base-content/70">Aucun examen médical trouvé.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="documents" className="mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-lg">Documents médicaux</h3>
                  </div>
                  {documents.length > 0 ? (
                    <div className="space-y-4">
                      {documents.map((document) => (
                        <Card key={document.id} className="card bg-base-100 shadow-md border border-base-300">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10">
                                  <AvatarFallback className="bg-secondary/10 text-secondary">
                                    <FileText className="w-5 h-5" />
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h4 className="font-medium">{document.title}</h4>
                                  {document.description && (
                                    <p className="text-base-content/70 text-sm">{document.description}</p>
                                  )}
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {document.type}
                              </Badge>
                            </div>
                            <p className="text-base-content/50 text-xs">
                              {new Date(document.createdAt).toLocaleDateString('fr-FR')}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <AlertCircle className="w-12 h-12 text-base-content/30 mx-auto mb-4" />
                      <p className="text-base-content/70">Aucun document médical trouvé.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PatientDossierOverview; 