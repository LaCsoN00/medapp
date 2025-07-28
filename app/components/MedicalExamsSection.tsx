import { FileText, Plus, Calendar, Eye, Download, Upload, User, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '../../hooks/useAuth';
import { useEffect, useState, useRef } from 'react';
import { getMedicalExams, createMedicalExam, updateMedicalExam, deleteMedicalExam, createExamResult, getMedecinByUserId, getPatientByUserId, getPatientById, canAccessFeature, billMedicalExam } from '@/actions';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

interface MedicalExam {
  id: number;
  name: string;
  description: string;
  status: string;
  date: string | Date;
  patientId: number;
  medecinId: number;
  patient?: {
    firstName: string;
    lastName: string;
    photo?: string;
  };
  medecin?: {
    firstName: string;
    lastName: string;
    photo?: string;
    speciality?: {
      name: string;
    };
  };
  results?: ExamResult[];
}

interface ExamResult {
  id: number;
  examId: number;
  title: string;
  content: string;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  createdAt: string | Date;
}

const MedicalExamsSection = () => {
  const { user, isLoading } = useAuth();
  const [exams, setExams] = useState<MedicalExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<MedicalExam | null>(null);
  const [newExam, setNewExam] = useState({
    name: '',
    description: '',
    patientId: 0
  });
  const [newResult, setNewResult] = useState({
    title: '',
    content: '',
    fileUrl: '',
    fileType: '',
    fileName: ''
  });
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [patients, setPatients] = useState<{ id: number; firstName: string; lastName: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const patientIdParam = searchParams.get('patientId');
  const [currentPatient, setCurrentPatient] = useState<{ id: number; firstName: string; lastName: string } | null>(null);
  const [canAccess, setCanAccess] = useState<boolean>(true);

  // État pour suivre quand un nouvel examen est créé
  const [examCreated, setExamCreated] = useState(false);

  // Vérification de l'abonnement
  useEffect(() => {
    const checkSubscription = async () => {
      if (user && user.role === 'PATIENT') {
        const patient = await getPatientByUserId(user.id);
        if (patient) {
          // Vérifier si le patient peut accéder aux examens
          const canAccessExams = await canAccessFeature(patient.id, 'medical_exams');
          setCanAccess(canAccessExams);
        }
      } else {
        // Les médecins ont toujours accès
        setCanAccess(true);
      }
    };
    
    checkSubscription();
  }, [user]);

  // Chargement des examens
  useEffect(() => {
    const fetchExams = async () => {
      if (!user || !canAccess) return;
      
      setLoading(true);
      try {
        // Si un patientId est spécifié dans l'URL, on filtre par ce patient
        if (patientIdParam) {
          const patientId = parseInt(patientIdParam);
          const patientExams = await getMedicalExams({ patientId });
          setExams(patientExams as MedicalExam[]);
          
          // Récupérer les informations du patient
          const patient = await getPatientById(patientId);
          if (patient) {
            setCurrentPatient({
              id: patient.id,
              firstName: patient.firstName,
              lastName: patient.lastName
            });
            
            // Préremplir le formulaire de création d'examen avec ce patient
            setNewExam(prev => ({ ...prev, patientId }));
          }
        } else if (user.role === 'PATIENT') {
          const patient = await getPatientByUserId(user.id);
          if (patient) {
            setCurrentPatient({
              id: patient.id,
              firstName: patient.firstName,
              lastName: patient.lastName
            });
            const patientExams = await getMedicalExams({ patientId: patient.id });
            setExams(patientExams as MedicalExam[]);
          }
        } else if (user.role === 'MEDECIN' || user.role === 'DOCTEUR') {
          const medecin = await getMedecinByUserId(user.id);
          if (medecin) {
            const medecinExams = await getMedicalExams({ medecinId: medecin.id });
            setExams(medecinExams as MedicalExam[]);
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des examens:", error);
        setExams([]);
      } finally {
        setLoading(false);
        // Réinitialiser l'état après le chargement
        if (examCreated) setExamCreated(false);
      }
    };
    
    if (canAccess) {
      fetchExams();
    }
  }, [user, patientIdParam, canAccess, examCreated]);

  // Pour les médecins: chargement de la liste des patients
  useEffect(() => {
    const fetchPatients = async () => {
      if (!user || !(user.role === 'MEDECIN' || user.role === 'DOCTEUR')) return;
      
      try {
        const medecin = await getMedecinByUserId(user.id);
        if (!medecin) return;
        
        // Récupérer les patients uniques à partir des rendez-vous
        const uniquePatients = new Map();
        
        if (medecin.appointments) {
          medecin.appointments.forEach((appointment: { patient?: { id: number; firstName: string; lastName: string } }) => {
            if (appointment.patient && !uniquePatients.has(appointment.patient.id)) {
              uniquePatients.set(appointment.patient.id, {
                id: appointment.patient.id,
                firstName: appointment.patient.firstName,
                lastName: appointment.patient.lastName
              });
            }
          });
        }
        
        setPatients(Array.from(uniquePatients.values()));
      } catch (error) {
        console.error("Erreur lors du chargement des patients:", error);
      }
    };
    
    fetchPatients();
  }, [user]);

  // Gestion de la création d'un examen
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newExam.name || !newExam.description || !newExam.patientId) return;
    
    setSubmitting(true);
    try {
      const medecin = await getMedecinByUserId(user.id);
      if (!medecin) throw new Error("Médecin non trouvé");
      
      // Créer l'examen médical
      const exam = await createMedicalExam({
        patientId: newExam.patientId,
        medecinId: medecin.id,
        name: newExam.name,
        description: newExam.description
      });
      
      // Facturer automatiquement l'examen
      await billMedicalExam(newExam.patientId, exam.id);
      
      // Déclencher le rechargement des examens
      setExamCreated(true);
      
      setShowCreateModal(false);
      setNewExam({ name: '', description: '', patientId: 0 });
      toast({
        title: "Examen créé",
        description: "Le bon d'examen a été créé et facturé avec succès",
        variant: "default"
      });
    } catch (error) {
      console.error("Erreur lors de la création de l'examen:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le bon d'examen",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Gestion de l'upload d'image
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'upload du fichier');
      }
      
      const data = await response.json();
      setUploadedImage(data.url);
      setNewResult(prev => ({ 
        ...prev, 
        fileUrl: data.url,
        fileType: data.fileType,
        fileName: data.fileName
      }));
      
      toast({
        title: "Fichier téléchargé",
        description: "Le fichier a été téléchargé avec succès",
        variant: "default"
      });
    } catch (error) {
      console.error("Erreur lors de l'upload:", error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le fichier",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  // Fonction pour supprimer l'image
  const handleRemoveImage = () => {
    setUploadedImage(null);
    setNewResult(prev => ({ ...prev, fileUrl: '', fileType: '', fileName: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Gestion de l'ajout d'un résultat
  const handleAddResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam || !newResult.title || !newResult.content) return;
    
    setSubmitting(true);
    try {
      await createExamResult({
        examId: selectedExam.id,
        title: newResult.title,
        content: newResult.content,
        fileUrl: newResult.fileUrl || undefined,
        fileType: newResult.fileType || undefined,
        fileName: newResult.fileName || undefined
      });
      
      // Mettre à jour le statut de l'examen
      await updateMedicalExam(selectedExam.id, { status: 'COMPLETED' });
      
      // Déclencher le rechargement des examens
      setExamCreated(true);
      
      setShowResultModal(false);
      setNewResult({ title: '', content: '', fileUrl: '', fileType: '', fileName: '' });
      setUploadedImage(null);
      toast({
        title: "Résultat ajouté",
        description: "Le résultat d'examen a été ajouté avec succès",
        variant: "default"
      });
    } catch (error) {
      console.error("Erreur lors de l'ajout du résultat:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le résultat d'examen",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Afficher les détails d'un examen
  const handleViewExam = async (exam: MedicalExam) => {
    setSelectedExam(exam);
    setShowDetailsModal(true);
  };

  // Ajouter un résultat à un examen
  const handleOpenResultModal = (exam: MedicalExam) => {
    setSelectedExam(exam);
    setNewResult({ title: '', content: '', fileUrl: '', fileType: '', fileName: '' });
    setShowResultModal(true);
  };

  // Supprimer un examen
  const handleDeleteExam = async (id: number) => {
    try {
      await deleteMedicalExam(id);
      
      // Déclencher le rechargement des examens
      setExamCreated(true);
      
      toast({
        title: "Examen supprimé",
        description: "Le bon d'examen a été supprimé avec succès",
        variant: "default"
      });
    } catch (error) {
      console.error("Erreur lors de la suppression de l'examen:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le bon d'examen",
        variant: "destructive"
      });
    }
  };

  // Fonction pour obtenir la couleur du badge selon le statut
  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Fonction pour obtenir le libellé du statut
  const getStatusLabel = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING': return 'En attente';
      case 'COMPLETED': return 'Complété';
      case 'CANCELLED': return 'Annulé';
      default: return status;
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

  if (!user) return null;

  // Dans le rendu, afficher un message si le patient n'a pas d'abonnement
  if (!canAccess) {
    return (
      <section className="section-padding bg-base-100">
        <div className="container">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="badge-lg mb-4">🔬 Examens médicaux</Badge>
            <h2 className="heading-responsive font-bold text-base-content mb-4">
              Accès limité
            </h2>
            <p className="text-responsive text-base-content/70 max-w-2xl mx-auto">
              Cette fonctionnalité est disponible pour les patients avec un abonnement actif.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center py-16">
            <div className="bg-base-200 rounded-xl p-8 max-w-md text-center">
              <h3 className="text-xl font-bold mb-4">Abonnement requis</h3>
              <p className="mb-6">Pour accéder à toutes les fonctionnalités sans restriction, veuillez souscrire à un abonnement.</p>
              <Button className="btn btn-primary" onClick={() => window.location.href = '/payment/subscribe'}>
                Voir les abonnements
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding bg-base-100">
      <div className="container">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="badge-lg mb-4">🔬 Examens médicaux</Badge>
          <h2 className="heading-responsive font-bold text-base-content mb-4">
            {currentPatient 
              ? `Examens médicaux de ${currentPatient.firstName} ${currentPatient.lastName}`
              : user.role === 'PATIENT' 
                ? 'Vos examens médicaux' 
                : 'Gestion des examens médicaux'}
          </h2>
          <p className="text-responsive text-base-content/70 max-w-2xl mx-auto">
            {currentPatient
              ? `Consultez et gérez les examens médicaux de ${currentPatient.firstName} ${currentPatient.lastName}.`
              : user.role === 'PATIENT' 
                ? 'Consultez vos bons d&apos;examens et résultats prescrits par vos médecins.'
                : 'Prescrivez des examens médicaux et consultez les résultats de vos patients.'}
          </p>
        </div>

        {/* Actions pour médecins */}
        {(user.role === 'MEDECIN' || user.role === 'DOCTEUR') && (
          <div className="flex justify-end mb-6">
            <Button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {currentPatient 
                ? `Prescrire un examen à ${currentPatient.firstName}`
                : 'Nouvelle prescription d&apos;examen'}
            </Button>
          </div>
        )}

        {/* Liste des examens */}
        {loading ? (
          <div className="text-center py-8">
            <div className="loading loading-spinner loading-lg mx-auto"></div>
            <p className="mt-4">Chargement des examens...</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-8 text-base-content/70">
            {user.role === 'PATIENT' 
              ? 'Vous n\'avez aucun examen médical prescrit pour le moment.'
              : 'Vous n\'avez prescrit aucun examen médical pour le moment.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exams.map((exam) => (
              <Card key={exam.id} className="card bg-base-100 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-base-200">
                <div className="bg-gradient-to-r from-primary/10 to-secondary/5 px-6 py-3 border-b border-base-200">
                  <Badge className={`${getStatusColor(exam.status)} float-right`}>
                    {getStatusLabel(exam.status)}
                  </Badge>
                  <h4 className="font-semibold text-base-content text-lg truncate pr-20">
                    {exam.name}
                  </h4>
                </div>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="w-12 h-12 border-2 border-primary/20 rounded-lg">
                        {user.role === 'PATIENT' && exam.medecin?.photo ? (
                          <AvatarImage src={exam.medecin.photo} alt="Photo du médecin" />
                        ) : user.role !== 'PATIENT' && exam.patient?.photo ? (
                          <AvatarImage src={exam.patient.photo} alt="Photo du patient" />
                        ) : (
                          <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-primary-content font-bold">
                            {user.role === 'PATIENT' 
                              ? `${exam.medecin?.firstName?.charAt(0) || 'M'}${exam.medecin?.lastName?.charAt(0) || 'D'}`
                              : `${exam.patient?.firstName?.charAt(0) || 'P'}${exam.patient?.lastName?.charAt(0) || 'T'}`}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <div className="space-y-1 text-sm text-base-content/70">
                          {user.role === 'PATIENT' ? (
                          <div className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-primary/70" />
                            <p>Dr. {exam.medecin?.firstName} {exam.medecin?.lastName}</p>
                          </div>
                          ) : (
                          <div className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-primary/70" />
                            <p>{exam.patient?.firstName} {exam.patient?.lastName}</p>
                          </div>
                          )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-primary/70" />
                          <p>{new Date(exam.date).toLocaleDateString('fr-FR')}</p>
                        </div>
                        {exam.medecin?.speciality && (
                          <div className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-primary/70" />
                            <p>{exam.medecin.speciality.name}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-base-200/30 p-3 rounded-lg mb-4">
                    <p className="text-sm text-base-content/80 line-clamp-3">
                    {exam.description}
                  </p>
                  </div>
                  
                  {exam.results && exam.results.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span className="text-sm font-medium">{exam.results.length} résultat(s) disponible(s)</span>
                      </div>
                      <div className="text-xs text-base-content/60">
                        Dernier résultat: {new Date(exam.results[exam.results.length - 1].createdAt).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-2 pt-2 border-t border-base-200">
                    <Button variant="outline" className="btn btn-outline btn-sm" onClick={() => handleViewExam(exam)}>
                      <Eye className="w-4 h-4 mr-2" />
                      Voir détails
                    </Button>
                    {(user.role === 'MEDECIN' || user.role === 'DOCTEUR') && exam.status === 'PENDING' && (
                      <Button className="btn btn-primary btn-sm" onClick={() => handleOpenResultModal(exam)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Ajouter résultat
                      </Button>
                    )}
                    {(user.role === 'MEDECIN' || user.role === 'DOCTEUR') && (
                      <Button variant="destructive" className="btn btn-danger btn-sm" onClick={() => handleDeleteExam(exam.id)}>
                        Supprimer
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modale de création d'examen */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-base-100 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-base-300 relative animate-fade-in">
              <div className="flex items-center justify-between p-6 border-b border-base-200 bg-base-100 rounded-t-2xl">
                <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
                  <FileText className="w-6 h-6 text-primary" />
                  Prescrire un examen
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)} className="h-8 w-8 p-0 rounded-full">X</Button>
              </div>
              <form className="p-6 space-y-6" onSubmit={handleCreateExam}>
                <div>
                  <label className="block mb-1 font-medium">Patient</label>
                  <select 
                    className="select select-bordered w-full"
                    value={newExam.patientId}
                    onChange={e => setNewExam({...newExam, patientId: Number(e.target.value)})}
                    required
                  >
                    <option value="">Sélectionnez un patient</option>
                    {patients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.firstName} {patient.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-medium">Nom de l&apos;examen</label>
                  <input 
                    type="text" 
                    className="input input-bordered w-full" 
                    value={newExam.name}
                    onChange={e => setNewExam({...newExam, name: e.target.value})}
                    placeholder="Ex: Analyse sanguine, Radiographie..."
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Description</label>
                  <textarea 
                    className="textarea textarea-bordered w-full" 
                    rows={3}
                    value={newExam.description}
                    onChange={e => setNewExam({...newExam, description: e.target.value})}
                    placeholder="Détails de l&apos;examen à réaliser..."
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowCreateModal(false)} className="rounded-full" type="button">Annuler</Button>
                  <Button className="btn btn-primary rounded-full" type="submit" disabled={submitting}>
                    {submitting ? 'Création...' : 'Prescrire l&apos;examen'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modale d'ajout de résultat */}
        {showResultModal && selectedExam && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-base-100 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-base-300 relative animate-fade-in">
              <div className="flex items-center justify-between p-6 border-b border-base-200 bg-base-100 rounded-t-2xl">
                <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
                  <Upload className="w-6 h-6 text-primary" />
                  Ajouter un résultat
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowResultModal(false)} className="h-8 w-8 p-0 rounded-full">X</Button>
              </div>
              <form className="p-6 space-y-6" onSubmit={handleAddResult}>
                <div className="bg-base-200/60 rounded-xl p-4">
                  <h4 className="font-semibold text-base-content mb-2">{selectedExam.name}</h4>
                  <p className="text-sm text-base-content/70">{selectedExam.description}</p>
                  <p className="text-xs text-base-content/50 mt-2">
                    Patient: {selectedExam.patient?.firstName} {selectedExam.patient?.lastName}
                  </p>
                </div>
                <div>
                  <label className="block mb-1 font-medium">Titre du résultat</label>
                  <input 
                    type="text" 
                    className="input input-bordered w-full" 
                    value={newResult.title}
                    onChange={e => setNewResult({...newResult, title: e.target.value})}
                    placeholder="Ex: Résultats d'analyse sanguine"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Contenu</label>
                  <textarea 
                    className="textarea textarea-bordered w-full" 
                    rows={5}
                    value={newResult.content}
                    onChange={e => setNewResult({...newResult, content: e.target.value})}
                    placeholder="Détails des résultats..."
                    required
                  />
                </div>
                
                {/* Section d'upload d'image */}
                <div>
                  <label className="block mb-1 font-medium">Ajouter une image ou un document</label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                  <input 
                        type="file" 
                        className="hidden" 
                        onChange={handleFileChange}
                        accept="image/*,.pdf,.doc,.docx"
                        ref={fileInputRef}
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full flex items-center justify-center gap-2"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <>
                            <div className="spinner-border w-4 h-4 animate-spin"></div>
                            <span>Téléchargement...</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-4 h-4" />
                            <span>Choisir un fichier</span>
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {uploadedImage && (
                      <div className="relative border rounded-lg overflow-hidden">
                        {newResult.fileType.startsWith('image/') ? (
                          <div className="relative w-full h-48">
                            <Image 
                              src={uploadedImage} 
                              alt="Aperçu du résultat" 
                              fill
                              className="object-contain"
                            />
                          </div>
                        ) : (
                          <div className="bg-base-200 p-6 flex flex-col items-center justify-center">
                            {newResult.fileType.includes('pdf') ? (
                              <FileText className="w-12 h-12 text-red-500 mb-2" />
                            ) : newResult.fileType.includes('word') || newResult.fileType.includes('msword') ? (
                              <FileText className="w-12 h-12 text-blue-700 mb-2" />
                            ) : newResult.fileType.includes('excel') || newResult.fileType.includes('sheet') ? (
                              <FileText className="w-12 h-12 text-green-600 mb-2" />
                            ) : (
                              <FileText className="w-12 h-12 text-gray-500 mb-2" />
                            )}
                            <span className="text-sm font-medium">{newResult.fileName || "Document"}</span>
                          </div>
                        )}
                        <Button 
                          type="button"
                          variant="destructive" 
                          size="sm"
                          className="absolute top-2 right-2 w-8 h-8 rounded-full p-0"
                          onClick={handleRemoveImage}
                        >
                          X
                        </Button>
                        <div className="p-2 text-xs text-center text-base-content/70 bg-base-200">
                          {newResult.fileName || uploadedImage.split('/').pop()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowResultModal(false)} className="rounded-full" type="button">Annuler</Button>
                  <Button className="btn btn-primary rounded-full" type="submit" disabled={submitting || isUploading}>
                    {submitting ? 'Ajout...' : 'Ajouter le résultat'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modale de détails d'examen */}
        {showDetailsModal && selectedExam && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-base-100 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-base-300 relative animate-fade-in">
              <div className="flex items-center justify-between p-6 border-b border-base-200 bg-base-100 rounded-t-2xl">
                <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
                  <FileText className="w-6 h-6 text-primary" />
                  Détails de l&apos;examen
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowDetailsModal(false)} className="h-8 w-8 p-0 rounded-full">X</Button>
              </div>
              <div className="p-6 space-y-6">
                <div className="bg-base-200/60 rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-base-content text-lg">{selectedExam.name}</h4>
                      <p className="text-sm text-base-content/70">{selectedExam.description}</p>
                    </div>
                    <Badge className={getStatusColor(selectedExam.status)}>
                      {getStatusLabel(selectedExam.status)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="text-sm text-base-content/70">
                        {new Date(selectedExam.date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    {user.role === 'PATIENT' ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="bg-primary text-primary-content text-xs">
                            {selectedExam.medecin?.firstName?.charAt(0)}{selectedExam.medecin?.lastName?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-base-content/70">
                          Dr. {selectedExam.medecin?.firstName} {selectedExam.medecin?.lastName}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="bg-primary text-primary-content text-xs">
                            {selectedExam.patient?.firstName?.charAt(0)}{selectedExam.patient?.lastName?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-base-content/70">
                          {selectedExam.patient?.firstName} {selectedExam.patient?.lastName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Résultats */}
                <div>
                  <h4 className="font-semibold text-base-content mb-4">Résultats</h4>
                  {!selectedExam.results || selectedExam.results.length === 0 ? (
                    <div className="text-center py-4 text-base-content/70 bg-base-200/30 rounded-xl">
                      {selectedExam.status === 'PENDING' 
                        ? 'Les résultats ne sont pas encore disponibles.'
                        : 'Aucun résultat n&apos;a été ajouté pour cet examen.'}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedExam.results.map((result) => (
                        <div key={result.id} className="bg-base-200/30 rounded-xl p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-semibold text-base-content">{result.title}</h5>
                            <span className="text-xs text-base-content/50">
                              {new Date(result.createdAt).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          <div className="text-sm text-base-content/80 whitespace-pre-line">
                            {result.content}
                          </div>
                          {result.fileUrl && (
                            <div className="mt-4 border rounded-lg overflow-hidden">
                              {result.fileType?.startsWith('image/') ? (
                                <div className="relative w-full h-64 border-b">
                                  <Image 
                                    src={result.fileUrl} 
                                    alt="Image du résultat" 
                                    fill
                                    className="object-contain"
                                  />
                                </div>
                              ) : (
                                <div className="bg-base-200/50 p-6 flex flex-col items-center justify-center border-b">
                                  {result.fileType?.includes('pdf') ? (
                                    <FileText className="w-16 h-16 text-red-500 mb-2" />
                                  ) : result.fileType?.includes('word') || result.fileType?.includes('msword') ? (
                                    <FileText className="w-16 h-16 text-blue-700 mb-2" />
                                  ) : result.fileType?.includes('excel') || result.fileType?.includes('sheet') ? (
                                    <FileText className="w-16 h-16 text-green-600 mb-2" />
                                  ) : (
                                    <FileText className="w-16 h-16 text-gray-500 mb-2" />
                                  )}
                                  <span className="text-base font-medium">{result.fileName || "Document"}</span>
                                </div>
                              )}
                              <div className="p-3 bg-base-100 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-base-content/70">
                                  <FileText className="w-4 h-4" />
                                  <span>{result.fileName || result.fileUrl.split('/').pop()}</span>
                                </div>
                              <a 
                                href={result.fileUrl} 
                                  download={result.fileName || result.fileUrl.split('/').pop()}
                                target="_blank" 
                                rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-md text-sm transition-colors"
                              >
                                <Download className="w-4 h-4" />
                                  <span>Télécharger</span>
                              </a>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowDetailsModal(false)} className="rounded-full">Fermer</Button>
                  {(user.role === 'MEDECIN' || user.role === 'DOCTEUR') && selectedExam.status === 'PENDING' && (
                    <Button className="btn btn-primary rounded-full" onClick={() => {
                      setShowDetailsModal(false);
                      setShowResultModal(true);
                    }}>
                      <Upload className="w-4 h-4 mr-2" />
                      Ajouter un résultat
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default MedicalExamsSection; 