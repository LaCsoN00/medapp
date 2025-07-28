import React from 'react';
import { FileText, RefreshCw, Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { useAuth } from '../../hooks/useAuth';
import { useEffect, useState, useRef } from 'react';
import { getMedecinByUserId, getPatientByUserId, createPrescription, getMedecins, createPrescriptionRequest, canAccessFeature, getPrescriptionRequests } from '@/actions';
import { useToast } from '../../hooks/use-toast';

interface PrescriptionDoctorView {
  id: number;
  medication: string;
  dosage: string;
  renewal: boolean;
  createdAt: string | Date;
  pendingDeletion?: boolean; // Nouveau champ pour marquer les ordonnances en attente de suppression
  patient: {
    firstName: string;
    lastName: string;
    photo?: string;
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
  pendingDeletion?: boolean; // Nouveau champ pour marquer les ordonnances en attente de suppression
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

// Définition du type pour les demandes de renouvellement
interface PrescriptionRenewalRequest {
  id: number;
  patientId: number;
  medecinId: number;
  motif: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  prescriptionId?: number;
  createdAt: string;
  updatedAt: string;
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
  const [selectedPatientId, setSelectedPatientId] = useState<number | "">("");
  const [patients, setPatients] = useState<{ id: number; firstName: string; lastName: string }[]>([]);
  const [isRenewal, setIsRenewal] = useState(false);
  const [creatingPrescription, setCreatingPrescription] = useState(false);
  const [canAccess, setCanAccess] = useState<boolean>(true);

  // État pour suivre quand une nouvelle ordonnance est créée
  const [prescriptionCreated, setPrescriptionCreated] = useState(false);

  // États pour la modal de détails des médecins
  const [showDoctorDetailsModal, setShowDoctorDetailsModal] = useState(false);
  const [selectedDoctorPrescription, setSelectedDoctorPrescription] = useState<PrescriptionDoctorView | null>(null);
  const [currentMedecin, setCurrentMedecin] = useState<{ firstName: string; lastName: string; speciality?: { name: string } } | null>(null);

  // Ajout pour gestion des demandes de renouvellement
  const [renewalRequests, setRenewalRequests] = useState<PrescriptionRenewalRequest[]>([]);
  const [, setLoadingRenewalRequests] = useState(false);

  // États pour la suppression d'ordonnance
  const [deletingPrescription, setDeletingPrescription] = useState<number | null>(null);
  const [confirmingDeletion, setConfirmingDeletion] = useState<number | null>(null);

  // Surveiller les changements d'état de la modal
  useEffect(() => {
    console.log("=== useEffect modal ===");
    console.log("showDoctorDetailsModal changé:", showDoctorDetailsModal);
    console.log("selectedDoctorPrescription changé:", selectedDoctorPrescription);
    console.log("=== FIN useEffect modal ===");
  }, [showDoctorDetailsModal, selectedDoctorPrescription]);

  // Vérification de l'abonnement
  useEffect(() => {
    const checkSubscription = async () => {
      if (user && user.role === 'PATIENT') {
        const patient = await getPatientByUserId(user.id);
        if (patient) {
          // Vérifier si le patient peut accéder aux prescriptions
          const canAccessPrescriptions = await canAccessFeature(patient.id, 'prescriptions');
          setCanAccess(canAccessPrescriptions);
        }
      } else {
        // Les médecins ont toujours accès
        setCanAccess(true);
      }
    };
    
    checkSubscription();
  }, [user]);

  // Chargement dynamique des ordonnances du médecin
  useEffect(() => {
    const fetchDoctorPrescriptions = async () => {
      if (user && (user.role === 'MEDECIN' || user.role === 'DOCTEUR')) {
        try {
          setDoctorLoading(true);
          const token = localStorage.getItem('token');
          if (!token) {
            toast({
              title: "Erreur d'authentification",
              description: "Veuillez vous reconnecter",
              variant: "destructive"
            });
            return;
          }

          const response = await fetch('/api/prescriptions', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            throw new Error('Erreur lors de la récupération des ordonnances');
          }

          const data = await response.json();
          console.log('Données des prescriptions médecin récupérées:', data);
          
          // Mapper les données avec le champ pendingDeletion
          const prescriptionsWithPendingDeletion = data.map((prescription: { id: number; medication: string; dosage: string; renewal: boolean; createdAt: string | Date; patient: { firstName: string; lastName: string; photo?: string }; pendingDeletion?: boolean }) => ({
            ...prescription,
            pendingDeletion: prescription.pendingDeletion || false
          }));
          
          console.log('Prescriptions médecin après mapping:', prescriptionsWithPendingDeletion);
          setDoctorPrescriptions(prescriptionsWithPendingDeletion);
        } catch (error) {
          console.error('Erreur lors de la récupération des ordonnances médecin:', error);
          toast({
            title: "Erreur",
            description: "Impossible de récupérer les ordonnances",
            variant: "destructive"
          });
        } finally {
          setDoctorLoading(false);
        }
      }
    };
    
    fetchDoctorPrescriptions();
  }, [user, canAccess, prescriptionCreated, toast]);

  // Chargement dynamique des prescriptions du patient
  useEffect(() => {
    const fetchPatientPrescriptions = async () => {
      if (user && user.role === 'PATIENT' && canAccess) {
        try {
          setPatientLoading(true);
          const token = localStorage.getItem('token');
          if (!token) {
            toast({
              title: "Erreur d'authentification",
              description: "Veuillez vous reconnecter",
              variant: "destructive"
            });
            return;
          }

          const response = await fetch('/api/prescriptions', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            throw new Error('Erreur lors de la récupération des ordonnances');
          }

          const data = await response.json();
          console.log('Données des prescriptions patient récupérées:', data);
          
          // Mapper les données avec le champ pendingDeletion
          const prescriptionsWithPendingDeletion = data.map((prescription: { id: number; medication: string; dosage: string; renewal: boolean; createdAt: string | Date; patientId: number; medecinId?: number; medecin?: { id?: number; firstName?: string; lastName?: string; photo?: string; speciality?: { name: string } }; pendingDeletion?: boolean }) => ({
            ...prescription,
            pendingDeletion: prescription.pendingDeletion || false
          }));
          
          console.log('Prescriptions patient après mapping:', prescriptionsWithPendingDeletion);
          setPatientPrescriptions(prescriptionsWithPendingDeletion);
        } catch (error) {
          console.error('Erreur lors de la récupération des ordonnances patient:', error);
          toast({
            title: "Erreur",
            description: "Impossible de récupérer les ordonnances",
            variant: "destructive"
          });
        } finally {
          setPatientLoading(false);
        }
      }
    };
    
    fetchPatientPrescriptions();
  }, [user, canAccess, toast]);

  // Chargement des patients pour le médecin
  useEffect(() => {
    const fetchPatients = async () => {
      if (user && (user.role === 'MEDECIN' || user.role === 'DOCTEUR')) {
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
      }
    };
    
    fetchPatients();
  }, [user]);

  // Ajout : charger les demandes de renouvellement du patient
  useEffect(() => {
    const fetchRenewalRequests = async () => {
      if (user && user.role === 'PATIENT') {
        setLoadingRenewalRequests(true);
        try {
          const requests = await getPrescriptionRequests({ patientId: user.id });
          setRenewalRequests(
            requests.map(r => ({
              ...r,
              status: r.status as 'PENDING' | 'APPROVED' | 'REJECTED',
              prescriptionId: r.prescriptionId ?? undefined,
              createdAt: typeof r.createdAt === 'string' ? r.createdAt : r.createdAt.toISOString(),
              updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : r.updatedAt.toISOString(),
            }))
          );
        } catch {
          setRenewalRequests([]);
        } finally {
          setLoadingRenewalRequests(false);
        }
      }
    };
    fetchRenewalRequests();
  }, [user]);

  // Remplace handleRenew
  const handleRenew = async (prescription: PatientPrescription) => {
    try {
      if (!user) return;
      await createPrescriptionRequest({
        patientId: prescription.patientId,
        medecinId: prescription.medecinId,
        motif: `Renouvellement de l'ordonnance #${prescription.id}`
      });
      toast({ title: 'Demande envoyée', description: 'Votre demande de renouvellement est en attente de validation du médecin.', duration: 4000 });
      // Recharger les demandes
      const requests = await getPrescriptionRequests({ patientId: user.id });
      setRenewalRequests(
        requests.map(r => ({
          ...r,
          status: r.status as 'PENDING' | 'APPROVED' | 'REJECTED',
          prescriptionId: r.prescriptionId ?? undefined,
          createdAt: typeof r.createdAt === 'string' ? r.createdAt : r.createdAt.toISOString(),
          updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : r.updatedAt.toISOString(),
        }))
      );
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de demander le renouvellement.', variant: 'destructive' });
    }
  };

  // Fonction de suppression d'ordonnance côté patient
  const handlePatientDeletePrescription = async (prescription: PatientPrescription) => {
    if (!user) return;
    
    console.log('handlePatientDeletePrescription appelé avec:', prescription);
    setDeletingPrescription(prescription.id);
    try {
      // Récupérer le token JWT depuis localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Erreur d'authentification",
          description: "Veuillez vous reconnecter",
          variant: "destructive"
        });
        return;
      }

      console.log('Appel API pour marquer la suppression...');
      // Appel à l'API pour marquer l'ordonnance comme en attente de suppression
      const response = await fetch(`/api/prescriptions/${prescription.id}/mark-for-deletion`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pendingDeletion: true
        }),
      });

      console.log('Réponse API:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erreur API:', errorData);
        throw new Error(errorData.error || 'Erreur lors de la suppression');
      }
      
      const result = await response.json();
      console.log('Résultat API:', result);
      
      toast({
        title: "Demande de suppression envoyée",
        description: "Votre demande de suppression a été transmise au médecin pour validation.",
        variant: "default"
      });
      
      // Mettre à jour l'état local
      setPatientPrescriptions(prev => 
        prev.map(p => 
          p.id === prescription.id 
            ? { ...p, pendingDeletion: true }
            : p
        )
      );
      
      setConfirmingDeletion(null);
    } catch (error) {
      console.error("Erreur lors de la suppression de l'ordonnance:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer l'ordonnance",
        variant: "destructive"
      });
    } finally {
      setDeletingPrescription(null);
    }
  };

  // Fonction de suppression définitive côté médecin
  const handleDoctorDeletePrescription = async (prescription: PrescriptionDoctorView) => {
    if (!user) return;
    
    console.log('handleDoctorDeletePrescription appelé avec:', prescription);
    setDeletingPrescription(prescription.id);
    try {
      // Récupérer le token JWT depuis localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Erreur d'authentification",
          description: "Veuillez vous reconnecter",
          variant: "destructive"
        });
        return;
      }

      console.log('Appel API pour supprimer définitivement...');
      // Appel à l'API pour supprimer définitivement l'ordonnance
      const response = await fetch(`/api/prescriptions/${prescription.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      console.log('Réponse API:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erreur API:', errorData);
        throw new Error(errorData.error || 'Erreur lors de la suppression');
      }
      
      const result = await response.json();
      console.log('Résultat API:', result);
      
      toast({
        title: "Ordonnance supprimée",
        description: "L'ordonnance a été supprimée définitivement.",
        variant: "default"
      });
      
      // Retirer l'ordonnance de la liste
      setDoctorPrescriptions(prev => 
        prev.filter(p => p.id !== prescription.id)
      );
      
    } catch (error) {
      console.error("Erreur lors de la suppression de l'ordonnance:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer l'ordonnance",
        variant: "destructive"
      });
    } finally {
      setDeletingPrescription(null);
    }
  };

  // Fonction d'affichage des détails pour les médecins
  const handleShowDoctorDetails = async (prescription: PrescriptionDoctorView) => {
    setSelectedDoctorPrescription(prescription);
    setShowDoctorDetailsModal(true);
    
    // Récupérer les informations du médecin si elles ne sont pas déjà disponibles
    if (!currentMedecin && user) {
      try {
        const medecin = await getMedecinByUserId(user.id);
        console.log('Médecin récupéré dans handleShowDoctorDetails:', medecin);
        
        if (medecin) {
          setCurrentMedecin({
            firstName: medecin.firstName,
            lastName: medecin.lastName,
            speciality: medecin.speciality
          });
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du médecin:', error);
      }
    }
  };

  const handleCloseDoctorDetails = () => {
    setShowDoctorDetailsModal(false);
    setSelectedDoctorPrescription(null);
  };

  // Fonction d'affichage des détails pour les patients
  const handleShowDetails = (prescription: PatientPrescription) => {
    setSelectedPrescription(prescription);
    setShowDetailsModal(true);
  };
  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedPrescription(null);
  };

  // Action rapide : Planifier renouvellement (non utilisée pour le moment)
  // const handleQuickRenew = () => {
  //   if (listRef.current) listRef.current.scrollIntoView({ behavior: 'smooth' });
  //   toast({ title: 'Renouvellement', description: 'Sélectionnez une ordonnance à renouveler dans la liste.' });
  // };

  // Action rapide : Historique (non utilisée pour le moment)
  // const handleQuickHistory = () => {
  //   if (listRef.current) listRef.current.scrollIntoView({ behavior: 'smooth' });
  //   toast({ title: 'Historique', description: 'Voici l\'historique de vos ordonnances.' });
  // };

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

  const handleCreatePrescription = async () => {
    if (!user || !selectedPatientId || !newMed || !newDosage) return;
    setCreatingPrescription(true);
    try {
      // Récupérer le médecin connecté
      const medecin = await getMedecinByUserId(user.id);
      if (!medecin) {
        throw new Error("Médecin non trouvé");
      }

      // Créer l'ordonnance
      await createPrescription({
        patientId: selectedPatientId,
        medecinId: medecin.id, // Utiliser l'ID du médecin, pas de l'utilisateur
        medication: newMed,
        dosage: newDosage,
        renewal: isRenewal
      });
      
      // Facturer automatiquement l'ordonnance (fonctionnalité à implémenter)
      // await billPrescription(selectedPatientId, prescription.id);
      
      toast({ title: "Ordonnance créée", description: "Votre ordonnance a été créée avec succès.", duration: 4000 });
      setShowCreateModal(false);
      setNewMed("");
      setNewDosage("");
      setIsRenewal(false);
      setSelectedPatientId("");
      
      // Déclencher le rechargement des ordonnances
      setPrescriptionCreated(true);
    } catch (err: unknown) {
      let errorMsg = "Erreur inconnue";
      if (err && typeof err === 'object' && 'message' in err) errorMsg = (err as { message: string }).message;
      else if (typeof err === 'string') errorMsg = err;
      else errorMsg = JSON.stringify(err);
      toast({ title: "Erreur lors de la création", description: errorMsg, variant: "destructive", style: { background: '#dc2626', color: '#fff' } });
    } finally {
      setCreatingPrescription(false);
    }
  };

  // Fonction pour modifier une ordonnance
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPrescription, setEditPrescription] = useState<{
    id: number;
    medication: string;
    dosage: string;
    renewal: boolean;
  } | null>(null);

  const handleEditPrescription = (prescription: PrescriptionDoctorView) => {
    setEditPrescription({
      id: prescription.id,
      medication: prescription.medication,
      dosage: prescription.dosage,
      renewal: prescription.renewal
    });
    setShowEditModal(true);
  };

  const handleUpdatePrescription = async () => {
    if (!editPrescription) return;
    
    try {
      // Récupérer le token JWT depuis localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Erreur d'authentification",
          description: "Veuillez vous reconnecter",
          variant: "destructive"
        });
        return;
      }

      // Appel à l'API pour mettre à jour l'ordonnance
      const response = await fetch(`/api/prescriptions/${editPrescription.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          medication: editPrescription.medication,
          dosage: editPrescription.dosage,
          renewal: editPrescription.renewal
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la mise à jour');
      }
      
      toast({
        title: "Ordonnance modifiée",
        description: "L'ordonnance a été mise à jour avec succès",
        variant: "default"
      });
      
      setShowEditModal(false);
      // Déclencher le rechargement des ordonnances
      setPrescriptionCreated(true);
    } catch (error) {
      console.error("Erreur lors de la modification de l'ordonnance:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de modifier l'ordonnance",
        variant: "destructive"
      });
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

  // Afficher un message si le patient n'a pas d'abonnement
  if (user.role === 'PATIENT' && !canAccess) {
    return (
      <section className="section-padding bg-base-100">
        <div className="container">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="badge-lg mb-4">💊 Ordonnances</Badge>
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

          {/* Actions rapides pour médecins */}
          <div className="flex justify-end mb-6">
            <Button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle ordonnance
            </Button>
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
                <Card key={prescription.id} className="card bg-base-100 shadow-xl rounded-2xl border border-base-300 hover:shadow-2xl transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar className="w-14 h-14 shadow-md">
                        {prescription.patient?.photo ? (
                          <AvatarImage src={prescription.patient.photo} alt="Photo du patient" />
                        ) : (
                          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-content text-xl font-bold">
                            {prescription.patient?.firstName?.charAt(0)}{prescription.patient?.lastName?.charAt(0)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">
                          {prescription.patient ? `${prescription.patient.firstName} ${prescription.patient.lastName}` : 'Patient inconnu'}
                        </h3>
                        {prescription.pendingDeletion && (
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Demande de suppression
                            </Badge>
                          </div>
                        )}
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
                      <Button className="btn btn-primary flex-1" onClick={() => {
                        console.log("Bouton 'Voir l'ordonnance' cliqué");
                        handleShowDoctorDetails(prescription);
                      }}>
                        Voir l&apos;ordonnance
                      </Button>
                      <Button variant="outline" className="btn btn-outline flex-1" onClick={() => {
                        handleEditPrescription(prescription);
                      }}>
                        Modifier
                      </Button>
                      <Button variant="outline" className="btn btn-outline flex-1" onClick={() => {
                        // Préremplir le formulaire avec les données de cette prescription
                        setNewMed(prescription.medication);
                        setNewDosage(prescription.dosage);
                        setIsRenewal(prescription.renewal);
                        setSelectedPatientId(0); // Sera mis à jour avec le bon ID
                        setShowCreateModal(true);
                      }} disabled={!prescription.renewal}>
                        Renouveler
                      </Button>
                      {prescription.pendingDeletion && (
                        <Button 
                          variant="outline" 
                          className="btn btn-outline flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            console.log('Bouton Supprimer définitivement cliqué pour prescription:', prescription.id);
                            handleDoctorDeletePrescription(prescription);
                          }}
                          disabled={deletingPrescription === prescription.id}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          {deletingPrescription === prescription.id ? 'Suppression...' : 'Supprimer définitivement'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}



          {/* Modale de création d'ordonnance pour médecin */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-base-100 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-base-300 relative animate-fade-in">
                <div className="flex items-center justify-between p-6 border-b border-base-200 bg-base-100 rounded-t-2xl">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
                    <FileText className="w-6 h-6 text-primary" />
                    Nouvelle ordonnance
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)} className="h-8 w-8 p-0 rounded-full">X</Button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block mb-1 font-medium">Patient</label>
                    <select className="select select-bordered w-full" value={selectedPatientId} onChange={(e) => setSelectedPatientId(Number(e.target.value))}>
                      <option value="">Sélectionnez un patient</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.firstName} {patient.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Médicament</label>
                    <input type="text" className="input input-bordered w-full" value={newMed} onChange={e => setNewMed(e.target.value)} />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Posologie</label>
                    <input type="text" className="input input-bordered w-full" value={newDosage} onChange={e => setNewDosage(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      className="checkbox checkbox-primary" 
                      id="renewal" 
                      checked={isRenewal} 
                      onChange={(e) => setIsRenewal(e.target.checked)} 
                    />
                    <label htmlFor="renewal" className="cursor-pointer">Ordonnance renouvelable</label>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">Annuler</Button>
                    <Button 
                      className="btn btn-primary flex-1" 
                      onClick={handleCreatePrescription}
                      disabled={!selectedPatientId || !newMed || !newDosage || creatingPrescription}
                    >
                      {creatingPrescription ? 'Création...' : 'Créer l\'ordonnance'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modale d'édition d'ordonnance */}
          {showEditModal && editPrescription && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-base-100 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-base-300 relative animate-fade-in">
                <div className="flex items-center justify-between p-6 border-b border-base-200 bg-base-100 rounded-t-2xl">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
                    <FileText className="w-6 h-6 text-primary" />
                    Modifier l&apos;ordonnance
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)} className="h-8 w-8 p-0 rounded-full">X</Button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block mb-1 font-medium">Médicament</label>
                    <input 
                      type="text" 
                      className="input input-bordered w-full" 
                      value={editPrescription.medication} 
                      onChange={e => setEditPrescription({...editPrescription, medication: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Posologie</label>
                    <input 
                      type="text" 
                      className="input input-bordered w-full" 
                      value={editPrescription.dosage} 
                      onChange={e => setEditPrescription({...editPrescription, dosage: e.target.value})} 
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      className="checkbox checkbox-primary" 
                      id="edit-renewal" 
                      checked={editPrescription.renewal} 
                      onChange={(e) => setEditPrescription({...editPrescription, renewal: e.target.checked})} 
                    />
                    <label htmlFor="edit-renewal" className="cursor-pointer">Ordonnance renouvelable</label>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={() => setShowEditModal(false)} className="flex-1">Annuler</Button>
                    <Button className="btn btn-primary flex-1" onClick={handleUpdatePrescription}>
                      Mettre à jour
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal de détails pour les médecins */}
          {showDoctorDetailsModal && selectedDoctorPrescription && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* En-tête de l'ordonnance */}
                <div className="bg-white border-b border-gray-200 p-6 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center shadow-sm">
                        <Image src="/assets/logo-medapp.png" alt="MedApp" width={32} height={32} className="w-8 h-8 rounded-lg" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-800">MedApp</h2>
                        <p className="text-gray-600 text-sm">Plateforme de santé connectée</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleCloseDoctorDetails} className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  </div>
                </div>

                {/* Contenu de l'ordonnance */}
                <div className="p-8">
                  {/* Titre */}
                  <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">ORDONNANCE MÉDICALE</h1>
                    <div className="w-24 h-1 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full"></div>
                  </div>

                  {/* Informations du médecin */}
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          Dr. {currentMedecin?.firstName || 'Médecin'} {currentMedecin?.lastName || 'Général'}
                        </h3>
                        <p className="text-gray-600">{currentMedecin?.speciality?.name || 'Médecin généraliste'}</p>
                        <p className="text-sm text-gray-500">N° RPPS: {currentMedecin ? `${currentMedecin.firstName}${currentMedecin.lastName}${Date.now().toString().slice(-6)}` : '12345678901'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Date de prescription</p>
                        <p className="font-semibold text-gray-800">{new Date(selectedDoctorPrescription.createdAt).toLocaleDateString('fr-FR', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}</p>
                      </div>
                    </div>
                  </div>

                  {/* Informations du patient */}
                  <div className="bg-blue-50 rounded-lg p-6 mb-6">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Informations du patient
                    </h4>
                    <div className="flex items-center gap-4">
                      <Avatar className="w-16 h-16 border-4 border-white shadow-lg">
                        {selectedDoctorPrescription.patient?.photo ? (
                          <AvatarImage src={selectedDoctorPrescription.patient.photo} alt="Photo du patient" />
                        ) : (
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xl font-bold">
                            {selectedDoctorPrescription.patient?.firstName?.charAt(0)}{selectedDoctorPrescription.patient?.lastName?.charAt(0)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <h5 className="text-xl font-bold text-gray-800">
                          {selectedDoctorPrescription.patient ? `${selectedDoctorPrescription.patient.firstName} ${selectedDoctorPrescription.patient.lastName}` : 'Patient inconnu'}
                        </h5>
                        <p className="text-gray-600">Patient</p>
                      </div>
                    </div>
                  </div>

                  {/* Prescription */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-6">
                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Prescription médicale
                    </h4>
                    
                    <div className="space-y-4">
                      <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-bold text-green-800 text-lg mb-2">
                              {selectedDoctorPrescription.medication}
                            </h5>
                            <p className="text-green-700 font-medium">
                              {selectedDoctorPrescription.dosage}
                            </p>
                          </div>
                          <Badge className={`ml-4 ${selectedDoctorPrescription.renewal ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                            {selectedDoctorPrescription.renewal ? 'Renouvelable' : 'Non renouvelable'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg mb-6">
                    <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      Instructions importantes
                    </h4>
                    <ul className="text-yellow-800 text-sm space-y-1">
                      <li>• Respectez strictement la posologie prescrite</li>
                      <li>• Ne partagez pas vos médicaments</li>
                      <li>• Consultez votre médecin en cas d&apos;effets indésirables</li>
                      <li>• Conservez cette ordonnance en lieu sûr</li>
                    </ul>
                  </div>

                  {/* Signature */}
                  <div className="border-t-2 border-gray-200 pt-6">
                    <div className="flex justify-between items-end">
                      <div className="text-center">
                        <div className="w-40 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-blue-200 flex items-center justify-center mb-2 relative overflow-hidden">
                          {/* Signature numérique stylisée */}
                          <svg className="w-32 h-12" viewBox="0 0 128 48" fill="none">
                            <path 
                              d="M15 25 Q20 20, 25 25 T35 25 Q40 20, 45 25 T55 25 Q60 20, 65 25 T75 25 Q80 20, 85 25 T95 25 Q100 20, 105 25 T115 25" 
                              stroke="#1e40af" 
                              strokeWidth="2" 
                              fill="none"
                              strokeLinecap="round"
                            />
                            <path 
                              d="M20 30 Q25 25, 30 30 T40 30 Q45 25, 50 30 T60 30 Q65 25, 70 30 T80 30 Q85 25, 90 30 T100 30 Q105 25, 110 30" 
                              stroke="#1e40af" 
                              strokeWidth="1.5" 
                              fill="none"
                              strokeLinecap="round"
                            />
                            <path 
                              d="M25 35 Q30 30, 35 35 T45 35 Q50 30, 55 35 T65 35 Q70 30, 75 35 T85 35 Q90 30, 95 35 T105 35" 
                              stroke="#1e40af" 
                              strokeWidth="1" 
                              fill="none"
                              strokeLinecap="round"
                            />
                            {/* Points de signature */}
                            <circle cx="30" cy="20" r="1" fill="#1e40af" />
                            <circle cx="60" cy="18" r="1" fill="#1e40af" />
                            <circle cx="90" cy="22" r="1" fill="#1e40af" />
                            <circle cx="45" cy="35" r="0.8" fill="#1e40af" />
                            <circle cx="75" cy="33" r="0.8" fill="#1e40af" />
                          </svg>
                          {/* Filigrane de sécurité */}
                          <div className="absolute inset-0 opacity-10">
                            <div className="w-full h-full bg-gradient-to-br from-blue-200 to-transparent"></div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 font-medium">Signature du médecin</p>
                        <p className="text-xs text-gray-500">Dr. {currentMedecin?.firstName || 'Médecin'} {currentMedecin?.lastName || 'Général'}</p>
                      </div>
                      <div className="text-center">
                        <div className="w-40 h-16 bg-gradient-to-br from-red-50 to-red-100 rounded-full border-4 border-red-300 flex items-center justify-center mb-2 relative overflow-hidden shadow-lg">
                          {/* Cachet médical réaliste */}
                          <div className="w-36 h-12 bg-white rounded-full border-2 border-red-400 flex items-center justify-center relative">
                            {/* Cercle extérieur du cachet */}
                            <div className="w-32 h-8 bg-red-500 rounded-full flex items-center justify-center">
                              <div className="w-28 h-6 bg-white rounded-full flex items-center justify-center">
                                <div className="text-center">
                                  <div className="text-xs font-bold text-red-600 tracking-wider">CABINET</div>
                                  <div className="text-xs font-bold text-red-600 tracking-wider">MÉDICAL</div>
                                </div>
                              </div>
                            </div>
                            {/* Croix médicale au centre */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-6 h-6 relative">
                                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-600 transform -translate-y-1/2"></div>
                                <div className="absolute left-1/2 top-0 w-0.5 h-full bg-red-600 transform -translate-x-1/2"></div>
                              </div>
                            </div>
                            {/* Points de sécurité */}
                            <div className="absolute top-1 right-2 w-1 h-1 bg-red-600 rounded-full"></div>
                            <div className="absolute bottom-1 left-2 w-1 h-1 bg-red-600 rounded-full"></div>
                            <div className="absolute top-1/2 left-1 w-0.5 h-0.5 bg-red-600 rounded-full transform -translate-y-1/2"></div>
                            <div className="absolute top-1/2 right-1 w-0.5 h-0.5 bg-red-600 rounded-full transform -translate-y-1/2"></div>
                          </div>
                          {/* Effet de relief */}
                          <div className="absolute inset-0 bg-gradient-to-br from-red-200/30 to-transparent rounded-full"></div>
                        </div>
                        <p className="text-sm text-gray-600 font-medium">Cachet officiel</p>
                        <p className="text-xs text-gray-500">N° {currentMedecin ? `${currentMedecin.firstName}${currentMedecin.lastName}${Date.now().toString().slice(-6)}` : '12345678901'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
                    <Button 
                      className="flex-1 bg-primary text-white hover:bg-primary/90"
                      onClick={() => {
                        // Créer une nouvelle fenêtre pour l'impression
                        const printWindow = window.open('', '_blank', 'width=800,height=600');
                        if (!printWindow) {
                          toast({
                            title: "Erreur",
                            description: "Veuillez autoriser les popups pour imprimer l'ordonnance",
                            variant: "destructive"
                          });
                          return;
                        }

                        // Contenu HTML de l'ordonnance pour l'impression
                        const printContent = `
                          <!DOCTYPE html>
                          <html lang="fr">
                          <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Ordonnance - ${selectedDoctorPrescription.patient ? `${selectedDoctorPrescription.patient.firstName} ${selectedDoctorPrescription.patient.lastName}` : 'Patient'}</title>
                            <style>
                              @media print {
                                body { margin: 0; padding: 20px; }
                                .no-print { display: none !important; }
                              }
                              body {
                                font-family: 'Arial', sans-serif;
                                line-height: 1.6;
                                color: #000;
                                background: #fff;
                                margin: 0;
                                padding: 20px;
                              }
                              .ordonnance {
                                max-width: 800px;
                                margin: 0 auto;
                                background: #fff;
                                padding: 40px;
                                border: 2px solid #000;
                              }
                              .header {
                                text-align: center;
                                margin-bottom: 30px;
                                border-bottom: 2px solid #000;
                                padding-bottom: 20px;
                              }
                              .logo {
                                font-size: 24px;
                                font-weight: bold;
                                margin-bottom: 10px;
                                color: #1e40af;
                              }
                              .logo-img {
                                width: 60px;
                                height: 60px;
                                margin: 0 auto 10px;
                                display: block;
                              }
                              .title {
                                font-size: 28px;
                                font-weight: bold;
                                margin: 20px 0;
                                text-transform: uppercase;
                                color: #1e40af;
                              }
                              .info-section {
                                margin: 20px 0;
                                padding: 15px;
                                border: 1px solid #000;
                              }
                              .info-title {
                                font-weight: bold;
                                font-size: 16px;
                                margin-bottom: 10px;
                                text-transform: uppercase;
                                color: #1e40af;
                              }
                              .medecin-info {
                                background: #eff6ff;
                                padding: 15px;
                                margin: 20px 0;
                                border: 1px solid #3b82f6;
                              }
                              .patient-info {
                                background: #f0f9ff;
                                padding: 15px;
                                margin: 20px 0;
                                border: 1px solid #0ea5e9;
                              }
                              .prescription-box {
                                border: 2px solid #22c55e;
                                padding: 20px;
                                margin: 20px 0;
                                background: #f0fdf4;
                              }
                              .medication {
                                font-size: 18px;
                                font-weight: bold;
                                margin-bottom: 10px;
                                color: #166534;
                              }
                              .dosage {
                                font-size: 16px;
                                margin-bottom: 10px;
                                color: #166534;
                              }
                              .renewal-badge {
                                display: inline-block;
                                padding: 5px 10px;
                                background: #22c55e;
                                color: #fff;
                                font-size: 12px;
                                font-weight: bold;
                                text-transform: uppercase;
                                border-radius: 4px;
                              }
                              .renewal-badge.non-renewable {
                                background: #6b7280;
                              }
                              .signature-section {
                                margin-top: 40px;
                                display: flex;
                                justify-content: space-between;
                                align-items: flex-end;
                              }
                              .signature-box {
                                width: 200px;
                                height: 80px;
                                border: 1px solid #000;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                background: #f8fafc;
                              }
                              .stamp-box {
                                width: 120px;
                                height: 120px;
                                border: 2px solid #dc2626;
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                background: #fff;
                                position: relative;
                              }
                              .stamp-content {
                                text-align: center;
                                font-size: 10px;
                                font-weight: bold;
                                color: #dc2626;
                              }
                              .stamp-cross {
                                position: absolute;
                                top: 50%;
                                left: 50%;
                                transform: translate(-50%, -50%);
                                width: 20px;
                                height: 20px;
                              }
                              .stamp-cross::before,
                              .stamp-cross::after {
                                content: '';
                                position: absolute;
                                background: #dc2626;
                              }
                              .stamp-cross::before {
                                width: 2px;
                                height: 20px;
                                left: 9px;
                                top: 0;
                              }
                              .stamp-cross::after {
                                width: 20px;
                                height: 2px;
                                left: 0;
                                top: 9px;
                              }
                              .date {
                                font-size: 14px;
                                margin-top: 10px;
                                color: #374151;
                              }
                              .instructions {
                                margin: 20px 0;
                                padding: 15px;
                                border-left: 4px solid #f59e0b;
                                background: #fefce8;
                              }
                              .instructions h4 {
                                margin: 0 0 10px 0;
                                font-size: 16px;
                                font-weight: bold;
                                color: #92400e;
                              }
                              .instructions ul {
                                margin: 0;
                                padding-left: 20px;
                                color: #92400e;
                              }
                              .instructions li {
                                margin: 5px 0;
                                font-size: 14px;
                              }
                              .accent-color {
                                color: #1e40af;
                              }
                              .success-color {
                                color: #166534;
                              }
                              .warning-color {
                                color: #92400e;
                              }
                              .danger-color {
                                color: #dc2626;
                              }
                            </style>
                          </head>
                          <body>
                            <div class="ordonnance">
                              <div class="header">
                                <div class="logo">
                                  <svg class="logo-img" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect width="60" height="60" rx="8" fill="#1e40af"/>
                                    <path d="M15 20h30v4H15v-4zm0 8h30v4H15v-4zm0 8h20v4H15v-4z" fill="white"/>
                                    <circle cx="45" cy="28" r="3" fill="#22c55e"/>
                                    <circle cx="45" cy="36" r="3" fill="#22c55e"/>
                                  </svg>
                                  MedApp
                                </div>
                                <div>Plateforme de santé connectée</div>
                              </div>
                              
                              <div class="title">Ordonnance Médicale</div>
                              
                              <div class="medecin-info">
                                <div class="info-title">Médecin Prescripteur</div>
                                <div><strong>Dr. ${currentMedecin?.firstName || 'Médecin'} ${currentMedecin?.lastName || 'Général'}</strong></div>
                                <div>${currentMedecin?.speciality?.name || 'Médecin généraliste'}</div>
                                <div>N° RPPS: ${currentMedecin ? `${currentMedecin.firstName}${currentMedecin.lastName}${Date.now().toString().slice(-6)}` : '12345678901'}</div>
                              </div>
                              
                              <div class="patient-info">
                                <div class="info-title">Informations du Patient</div>
                                <div><strong>${selectedDoctorPrescription.patient ? `${selectedDoctorPrescription.patient.firstName} ${selectedDoctorPrescription.patient.lastName}` : 'Patient inconnu'}</strong></div>
                                <div>Patient</div>
                              </div>
                              
                              <div class="prescription-box">
                                <div class="info-title">Prescription Médicale</div>
                                <div class="medication">${selectedDoctorPrescription.medication}</div>
                                <div class="dosage">${selectedDoctorPrescription.dosage}</div>
                                <div class="renewal-badge ${selectedDoctorPrescription.renewal ? '' : 'non-renewable'}">${selectedDoctorPrescription.renewal ? 'Renouvelable' : 'Non renouvelable'}</div>
                              </div>
                              
                              <div class="instructions">
                                <h4>Instructions importantes</h4>
                                <ul>
                                  <li>Respectez strictement la posologie prescrite</li>
                                  <li>Ne partagez pas vos médicaments</li>
                                  <li>Consultez votre médecin en cas d'effets indésirables</li>
                                  <li>Conservez cette ordonnance en lieu sûr</li>
                                </ul>
                              </div>
                              
                              <div class="signature-section">
                                <div>
                                  <div class="signature-box">
                                    <div style="font-size: 12px; text-align: center;">
                                      <div style="margin-bottom: 5px;">Signature du médecin</div>
                                      <div>Dr. ${currentMedecin?.firstName || 'Médecin'} ${currentMedecin?.lastName || 'Général'}</div>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <div class="stamp-box">
                                    <div class="stamp-cross"></div>
                                    <div class="stamp-content">
                                      <div>CABINET</div>
                                      <div>MÉDICAL</div>
                                    </div>
                                  </div>
                                  <div style="text-align: center; margin-top: 5px; font-size: 12px;">Cachet officiel</div>
                                </div>
                              </div>
                              
                              <div class="date">
                                <strong>Date de prescription :</strong> ${new Date(selectedDoctorPrescription.createdAt).toLocaleDateString('fr-FR', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </div>
                            </div>
                            
                            <script>
                              // Impression automatique
                              window.onload = function() {
                                window.print();
                                // Fermer la fenêtre après impression (optionnel)
                                // setTimeout(() => window.close(), 1000);
                              };
                            </script>
                          </body>
                          </html>
                        `;

                        // Écrire le contenu dans la nouvelle fenêtre
                        printWindow.document.write(printContent);
                        printWindow.document.close();
                      }}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Télécharger l&apos;ordonnance
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={handleCloseDoctorDetails}
                    >
                      Fermer
                    </Button>
                  </div>
                </div>
              </div>
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

          {renewalRequests.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Demandes de renouvellement en attente</h3>
              {renewalRequests.filter(r => r.status === 'PENDING').map((req, idx) => (
                <Card key={req.id || idx} className="mb-2 bg-yellow-50 border-l-4 border-yellow-400">
                  <CardContent className="p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800">En attente de validation du médecin</Badge>
                      <span className="text-base-content/80">{req.motif}</span>
                    </div>
                    <div className="text-xs text-base-content/60">Envoyée le {new Date(req.createdAt).toLocaleDateString('fr-FR')}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

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
              <div className="flex justify-end mb-6">
                    <Button className="btn btn-primary" onClick={handleOpenRequestModal}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle demande
                    </Button>
                  </div>

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
                      {patientPrescriptions.filter(p => {
                        // Si une demande de renouvellement PENDING existe pour cette prescription, on ne l'affiche pas comme renouvelée
                        const pendingRenewal = renewalRequests.some(r => r.motif.includes(`#${p.id}`) && r.status === 'PENDING');
                        return !pendingRenewal;
                      }).map((prescription) => (
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
                                <Button 
                                  variant="outline" 
                                  className="btn btn-outline btn-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    console.log('Bouton Supprimer cliqué pour prescription:', prescription.id);
                                    console.log('État confirmingDeletion avant:', confirmingDeletion);
                                    setConfirmingDeletion(prescription.id);
                                    console.log('État confirmingDeletion après:', prescription.id);
                                  }}
                                  disabled={prescription.pendingDeletion}
                                >
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  {prescription.pendingDeletion ? 'En attente' : 'Supprimer'}
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
                  <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-base-300 relative animate-fade-in">
                    {/* En-tête de l'ordonnance */}
                    <div className="bg-white border-b border-gray-200 p-6 rounded-t-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center shadow-sm">
                            <Image src="/assets/logo-medapp.png" alt="MedApp" width={32} height={32} className="w-8 h-8 rounded-lg" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-gray-800">MedApp</h2>
                            <p className="text-gray-600 text-sm">Plateforme de santé connectée</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleCloseDetails} className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </Button>
                      </div>
                    </div>

                    {/* Contenu de l'ordonnance */}
                    <div className="p-8">
                      {/* Titre */}
                      <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">ORDONNANCE MÉDICALE</h1>
                        <div className="w-24 h-1 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full"></div>
                      </div>

                      {/* Informations du médecin */}
                      <div className="bg-gray-50 rounded-lg p-6 mb-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">
                              Dr. {selectedPrescription.medecin?.firstName || 'Médecin'} {selectedPrescription.medecin?.lastName || 'Général'}
                            </h3>
                            <p className="text-gray-600">{selectedPrescription.medecin?.speciality?.name || 'Médecin généraliste'}</p>
                            <p className="text-sm text-gray-500">N° RPPS: {selectedPrescription.medecin ? `${selectedPrescription.medecin.firstName}${selectedPrescription.medecin.lastName}${Date.now().toString().slice(-6)}` : '12345678901'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Date de prescription</p>
                            <p className="font-semibold text-gray-800">{new Date(selectedPrescription.createdAt).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}</p>
                          </div>
                        </div>
                      </div>

                      {/* Informations du patient */}
                      <div className="bg-blue-50 rounded-lg p-6 mb-6">
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Informations du patient
                        </h4>
                        <div className="flex items-center gap-4">
                          <Avatar className="w-16 h-16 border-4 border-white shadow-lg">
                            {user?.photo ? (
                              <AvatarImage src={user.photo} alt="Photo du patient" />
                            ) : (
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xl font-bold">
                                {user?.firstName?.charAt(0) ?? ''}{user?.lastName?.charAt(0) ?? (user?.firstName ? '' : 'P')}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                            <h5 className="text-xl font-bold text-gray-800">
                              Vous-même
                            </h5>
                            <p className="text-gray-600">Patient</p>
                          </div>
                          </div>
                        </div>

                      {/* Prescription */}
                      <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-6">
                        <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Prescription médicale
                        </h4>
                        <div className="space-y-4">
                          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-bold text-green-800 text-lg mb-2">
                                  {selectedPrescription.medication}
                                </h5>
                                <p className="text-green-700 font-medium">
                                  {selectedPrescription.dosage}
                                </p>
                      </div>
                              <Badge className={`ml-4 ${selectedPrescription.renewal ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                                {selectedPrescription.renewal ? 'Renouvelable' : 'Non renouvelable'}
                              </Badge>
                    </div>
                        </div>
                      </div>
                        </div>

                      {/* Instructions */}
                      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg mb-6">
                        <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          Instructions importantes
                        </h4>
                        <ul className="text-yellow-800 text-sm space-y-1">
                          <li>• Respectez strictement la posologie prescrite</li>
                          <li>• Ne partagez pas vos médicaments</li>
                          <li>• Consultez votre médecin en cas d&apos;effets indésirables</li>
                          <li>• Conservez cette ordonnance en lieu sûr</li>
                        </ul>
                      </div>

                      {/* Signature et cachet */}
                      <div className="flex justify-between items-end border-t-2 border-gray-200 pt-6">
                        <div className="text-center">
                          <div className="w-40 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-blue-200 flex items-center justify-center mb-2 relative overflow-hidden">
                            {/* Signature numérique stylisée */}
                            <svg className="w-32 h-12" viewBox="0 0 128 48" fill="none">
                              <path d="M15 25 Q20 20, 25 25 T35 25 Q40 20, 45 25 T55 25 Q60 20, 65 25 T75 25 Q80 20, 85 25 T95 25 Q100 20, 105 25 T115 25" stroke="#1e40af" strokeWidth="2" fill="none" strokeLinecap="round" />
                              <path d="M20 30 Q25 25, 30 30 T40 30 Q45 25, 50 30 T60 30 Q65 25, 70 30 T80 30 Q85 25, 90 30 T100 30 Q105 25, 110 30" stroke="#1e40af" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                              <path d="M25 35 Q30 30, 35 35 T45 35 Q50 30, 55 35 T65 35 Q70 30, 75 35 T85 35 Q90 30, 95 35 T105 35" stroke="#1e40af" strokeWidth="1" fill="none" strokeLinecap="round" />
                              <circle cx="30" cy="20" r="1" fill="#1e40af" />
                              <circle cx="60" cy="18" r="1" fill="#1e40af" />
                              <circle cx="90" cy="22" r="1" fill="#1e40af" />
                              <circle cx="45" cy="35" r="0.8" fill="#1e40af" />
                              <circle cx="75" cy="33" r="0.8" fill="#1e40af" />
                            </svg>
                            <div className="absolute inset-0 opacity-10">
                              <div className="w-full h-full bg-gradient-to-br from-blue-200 to-transparent"></div>
                          </div>
                          </div>
                          <p className="text-sm text-gray-600 font-medium">Signature du médecin</p>
                          <p className="text-xs text-gray-500">Dr. {selectedPrescription.medecin?.firstName || 'Médecin'} {selectedPrescription.medecin?.lastName || 'Général'}</p>
                        </div>
                        <div className="text-center">
                          <div className="w-40 h-16 bg-gradient-to-br from-red-50 to-red-100 rounded-full border-4 border-red-300 flex items-center justify-center mb-2 relative overflow-hidden shadow-lg">
                            <div className="w-36 h-12 bg-white rounded-full border-2 border-red-400 flex items-center justify-center relative">
                              <div className="w-32 h-8 bg-red-500 rounded-full flex items-center justify-center">
                                <div className="w-28 h-6 bg-white rounded-full flex items-center justify-center">
                                  <div className="text-center">
                                    <div className="text-xs font-bold text-red-600 tracking-wider">CABINET</div>
                                    <div className="text-xs font-bold text-red-600 tracking-wider">MÉDICAL</div>
                                  </div>
                                </div>
                              </div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-6 h-6 relative">
                                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-600 transform -translate-y-1/2"></div>
                                  <div className="absolute left-1/2 top-0 w-0.5 h-full bg-red-600 transform -translate-x-1/2"></div>
                                </div>
                              </div>
                              <div className="absolute top-1 right-2 w-1 h-1 bg-red-600 rounded-full"></div>
                              <div className="absolute bottom-1 left-2 w-1 h-1 bg-red-600 rounded-full"></div>
                              <div className="absolute top-1/2 left-1 w-0.5 h-0.5 bg-red-600 rounded-full transform -translate-y-1/2"></div>
                              <div className="absolute top-1/2 right-1 w-0.5 h-0.5 bg-red-600 rounded-full transform -translate-y-1/2"></div>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-br from-red-200/30 to-transparent rounded-full"></div>
                          </div>
                          <p className="text-sm text-gray-600 font-medium">Cachet officiel</p>
                          <p className="text-xs text-gray-500">N° {selectedPrescription.medecin ? `${selectedPrescription.medecin.firstName}${selectedPrescription.medecin.lastName}${Date.now().toString().slice(-6)}` : '12345678901'}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
                        <Button 
                          className="flex-1 bg-primary text-white hover:bg-primary/90"
                          onClick={() => {
                            // Créer une nouvelle fenêtre pour l'impression
                            const printWindow = window.open('', '_blank', 'width=800,height=600');
                            if (!printWindow) {
                              toast({
                                title: "Erreur",
                                description: "Veuillez autoriser les popups pour imprimer l'ordonnance",
                                variant: "destructive"
                              });
                              return;
                            }
                            const printContent = `
                              <!DOCTYPE html>
                              <html lang=\"fr\">
                              <head>
                                <meta charset=\"UTF-8\">
                                <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
                                <title>Ordonnance - Patient</title>
                                <style>
                                  @media print { body { margin: 0; padding: 20px; } .no-print { display: none !important; } }
                                  body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #000; background: #fff; margin: 0; padding: 20px; }
                                  .ordonnance { max-width: 800px; margin: 0 auto; background: #fff; padding: 40px; border: 2px solid #000; }
                                  .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
                                  .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; color: #1e40af; }
                                  .logo-img { width: 60px; height: 60px; margin: 0 auto 10px; display: block; }
                                  .title { font-size: 28px; font-weight: bold; margin: 20px 0; text-transform: uppercase; color: #1e40af; }
                                  .info-section { margin: 20px 0; padding: 15px; border: 1px solid #000; }
                                  .info-title { font-weight: bold; font-size: 16px; margin-bottom: 10px; text-transform: uppercase; color: #1e40af; }
                                  .medecin-info { background: #eff6ff; padding: 15px; margin: 20px 0; border: 1px solid #3b82f6; }
                                  .patient-info { background: #f0f9ff; padding: 15px; margin: 20px 0; border: 1px solid #0ea5e9; }
                                  .prescription-box { border: 2px solid #22c55e; padding: 20px; margin: 20px 0; background: #f0fdf4; }
                                  .medication { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #166534; }
                                  .dosage { font-size: 16px; margin-bottom: 10px; color: #166534; }
                                  .renewal-badge { display: inline-block; padding: 5px 10px; background: #22c55e; color: #fff; font-size: 12px; font-weight: bold; text-transform: uppercase; border-radius: 4px; }
                                  .renewal-badge.non-renewable { background: #6b7280; }
                                  .signature-section { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
                                  .signature-box { width: 200px; height: 80px; border: 1px solid #000; display: flex; align-items: center; justify-content: center; background: #f8fafc; }
                                  .stamp-box { width: 120px; height: 120px; border: 2px solid #dc2626; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #fff; position: relative; }
                                  .stamp-content { text-align: center; font-size: 10px; font-weight: bold; color: #dc2626; }
                                  .stamp-cross { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 20px; height: 20px; }
                                  .stamp-cross::before, .stamp-cross::after { content: ''; position: absolute; background: #dc2626; }
                                  .stamp-cross::before { width: 2px; height: 20px; left: 9px; top: 0; }
                                  .stamp-cross::after { width: 20px; height: 2px; left: 0; top: 9px; }
                                  .date { font-size: 14px; margin-top: 10px; color: #374151; }
                                  .instructions { margin: 20px 0; padding: 15px; border-left: 4px solid #f59e0b; background: #fefce8; }
                                  .instructions h4 { margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #92400e; }
                                  .instructions ul { margin: 0; padding-left: 20px; color: #92400e; }
                                  .instructions li { margin: 5px 0; font-size: 14px; }
                                  .accent-color { color: #1e40af; }
                                  .success-color { color: #166534; }
                                  .warning-color { color: #92400e; }
                                  .danger-color { color: #dc2626; }
                                </style>
                              </head>
                              <body>
                                <div class="ordonnance">
                                  <div class="header">
                                    <div class="logo">
                                      <svg class="logo-img" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect width="60" height="60" rx="8" fill="#1e40af"/>
                                        <path d="M15 20h30v4H15v-4zm0 8h30v4H15v-4zm0 8h20v4H15v-4z" fill="white"/>
                                        <circle cx="45" cy="28" r="3" fill="#22c55e"/>
                                        <circle cx="45" cy="36" r="3" fill="#22c55e"/>
                                      </svg>
                                      MedApp
                      </div>
                                    <div>Plateforme de santé connectée</div>
                    </div>
                                  <div class="title">Ordonnance Médicale</div>
                                  <div class="medecin-info">
                                    <div class="info-title">Médecin Prescripteur</div>
                                    <div><strong>Dr. ${selectedPrescription.medecin?.firstName || 'Médecin'} ${selectedPrescription.medecin?.lastName || 'Général'}</strong></div>
                                    <div>${selectedPrescription.medecin?.speciality?.name || 'Médecin généraliste'}</div>
                                    <div>N° RPPS: ${selectedPrescription.medecin ? `${selectedPrescription.medecin.firstName}${selectedPrescription.medecin.lastName}${Date.now().toString().slice(-6)}` : '12345678901'}</div>
                                  </div>
                                  <div class="patient-info">
                                    <div class="info-title">Informations du Patient</div>
                                    <div><strong>Vous-même</strong></div>
                                    <div>Patient</div>
                                  </div>
                                  <div class="prescription-box">
                                    <div class="info-title">Prescription Médicale</div>
                                    <div class="medication">${selectedPrescription.medication}</div>
                                    <div class="dosage">${selectedPrescription.dosage}</div>
                                    <div class="renewal-badge ${selectedPrescription.renewal ? '' : 'non-renewable'}">${selectedPrescription.renewal ? 'Renouvelable' : 'Non renouvelable'}</div>
                                  </div>
                                  <div class="instructions">
                                    <h4>Instructions importantes</h4>
                                    <ul>
                                      <li>Respectez strictement la posologie prescrite</li>
                                      <li>Ne partagez pas vos médicaments</li>
                                      <li>Consultez votre médecin en cas d'effets indésirables</li>
                                      <li>Conservez cette ordonnance en lieu sûr</li>
                                    </ul>
                                  </div>
                                  <div class="signature-section">
                                    <div>
                                      <div class="signature-box">
                                        <div style="font-size: 12px; text-align: center;">
                                          <div style="margin-bottom: 5px;">Signature du médecin</div>
                                          <div>Dr. ${selectedPrescription.medecin?.firstName || 'Médecin'} ${selectedPrescription.medecin?.lastName || 'Général'}</div>
                                        </div>
                                      </div>
                                    </div>
                                    <div>
                                      <div class="stamp-box">
                                        <div class="stamp-cross"></div>
                                        <div class="stamp-content">
                                          <div>CABINET</div>
                                          <div>MÉDICAL</div>
                                        </div>
                                      </div>
                                      <div style="text-align: center; margin-top: 5px; font-size: 12px;">Cachet officiel</div>
                                    </div>
                                  </div>
                                  <div class="date">
                                    <strong>Date de prescription :</strong> ${new Date(selectedPrescription.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                                  </div>
                                </div>
                                <script>
                                  window.onload = function() {
                                    window.print();
                                  };
                                </script>
                              </body>
                              </html>
                            `;
                            printWindow.document.write(printContent);
                            printWindow.document.close();
                          }}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Télécharger l&apos;ordonnance
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={handleCloseDetails}
                        >
                          Fermer
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modale de création d'ordonnance */}
              {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-base-100 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between p-6 border-b border-base-300">
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
                  <div className="bg-base-100 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between p-6 border-b border-base-300">
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

              {/* Modal de confirmation de suppression côté patient */}
              {confirmingDeletion && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
                  <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">Confirmer la suppression</h3>
                      <p className="text-gray-600">
                        Êtes-vous sûr de vouloir demander la suppression de cette ordonnance ? 
                        Cette demande sera transmise à votre médecin pour validation.
                      </p>
                      <p className="text-sm text-gray-500 mt-2">ID de prescription: {confirmingDeletion}</p>
                    </div>
                    
                    <div className="flex gap-3">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          console.log('Modal de confirmation fermée');
                          setConfirmingDeletion(null);
                        }}
                      >
                        Annuler
                      </Button>
                      <Button 
                        className="flex-1 bg-red-600 hover:bg-red-700"
                        onClick={() => {
                          console.log('Confirmation de suppression pour prescription:', confirmingDeletion);
                          const prescription = patientPrescriptions.find(p => p.id === confirmingDeletion);
                          if (prescription) {
                            console.log('Prescription trouvée pour suppression:', prescription);
                            handlePatientDeletePrescription(prescription);
                          } else {
                            console.error('Prescription non trouvée pour ID:', confirmingDeletion);
                          }
                        }}
                        disabled={deletingPrescription === confirmingDeletion}
                      >
                        {deletingPrescription === confirmingDeletion ? 'Suppression...' : 'Confirmer'}
                      </Button>
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