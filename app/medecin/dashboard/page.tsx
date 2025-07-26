'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, User, Phone, Mail, FileText, TrendingUp, Users, Edit, Trash2, Plus, CalendarDays, AlertTriangle, CheckCircle, XCircle, Clock as ClockIcon, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import ProtectedLayout from '@/components/ProtectedLayout';
import RoleBasedRedirect from '@/components/RoleBasedRedirect';
import { useAuth } from '../../../hooks/useAuth';
import { getMedecinByUserId, getAppointments, createMedecin, getSpecialities, setMedecinStatus, getMedecinStatus, getMedecinWorkingHours, createMedecinWorkingHour, updateMedecinWorkingHour, deleteMedecinWorkingHour } from '@/actions';
import toast from 'react-hot-toast';

interface Medecin {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  rating: number;
  reviews: number;
  experience?: string | null;
  speciality: {
    id: number;
    name: string;
    icon: string;
  };
  photo?: string | null; // Added photo to the Medecin interface
}

// Remplacer l'interface Appointment locale par une version compatible avec la structure retournée par getAppointments
interface Appointment {
  id: number;
  date: Date;
  reason?: string | null;
  status: string; // Peut être n'importe quelle string venant de la BDD
  patient: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    photo?: string | null;
  };
  medecin: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    photo?: string | null;
    speciality: {
      id: number;
      name: string;
      icon: string;
    };
  };
}

// Définition du type pour les horaires de travail
interface MedecinWorkingHour {
  id: number;
  medecinId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

// Type pour une exception d'indisponibilité
interface MedecinException {
  id: string;
  startDate: string; // format YYYY-MM-DD
  endDate: string;   // format YYYY-MM-DD
  reason?: string;
}

const MedecinDashboard = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [medecin, setMedecin] = useState<Medecin | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [status, setStatus] = useState<'AVAILABLE' | 'BUSY' | 'UNAVAILABLE'>('AVAILABLE');
  const [statusMode, setStatusMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [statusLoading, setStatusLoading] = useState(false);

  const createDefaultMedecinProfile = async () => {
    try {
      setCreatingProfile(true);
      console.log('Création du profil médecin par défaut pour userId:', user!.id);
      
      // Récupérer les spécialités disponibles
      const specialities = await getSpecialities();
      const defaultSpeciality = specialities.find(s => s.name === 'Médecine générale') || specialities[0];
      
      if (!defaultSpeciality) {
        throw new Error('Aucune spécialité disponible');
      }

      // Créer le profil médecin par défaut
      const newMedecin = await createMedecin({
        firstName: user!.firstName || 'Médecin',
        lastName: user!.lastName || 'Général',
        email: user!.email,
        phone: user!.phone || '',
        address: '',
        city: '',
        experience: 'Médecine générale',
        languages: 'Français',
        specialityId: defaultSpeciality.id,
        userId: user!.id
      });

      console.log('Profil médecin créé:', newMedecin);
      setMedecin(newMedecin);
      
      // Recharger les données
      await loadMedecinData();
    } catch (error) {
      console.error('Erreur lors de la création du profil médecin:', error);
    } finally {
      setCreatingProfile(false);
    }
  };

  const loadMedecinData = useCallback(async () => {
    try {
      setLoading(true);
      // Récupérer les informations du médecin connecté
      const medecinData = await getMedecinByUserId(user!.id);
      if (medecinData) {
        setMedecin(medecinData);
        
        // Récupérer les rendez-vous du médecin
        const appointmentsData = await getAppointments({ medecinId: medecinData.id });
        setAppointments(appointmentsData);
      } else {
        console.log('Aucun profil médecin trouvé pour userId:', user!.id);
        // Le profil n'existe pas, on ne le crée pas automatiquement ici
        // L'utilisateur devra cliquer sur le bouton pour le créer
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Charger le statut du médecin
  const loadStatus = useCallback(async (medecinId: number) => {
    try {
      const res = await getMedecinStatus(medecinId);
      if (res) {
        setStatus(res.status as 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE');
        setStatusMode(res.statusMode as 'AUTO' | 'MANUAL');
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (user && user.role === 'MEDECIN') {
      loadMedecinData();
    } else if (user && user.role !== 'MEDECIN') {
      console.log('Utilisateur connecté avec un rôle différent:', user.role);
      setLoading(false);
    }
  }, [user, loadMedecinData]);

  useEffect(() => {
    if (medecin) {
      loadStatus(medecin.id);
    }
  }, [medecin, loadStatus]);

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      return appointmentDate.toDateString() === date.toDateString();
    });
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

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'medical-records':
        router.push('/medical-records');
        break;
      case 'appointment':
        router.push('/appointment');
        break;
      case 'calls':
        // Pour les appels en attente, on pourrait ouvrir un modal ou une page dédiée
        toast('Fonctionnalité d\'appels en attente à implémenter', { position: 'top-center' });
        break;
      case 'messages':
        // Pour les messages patients, on pourrait ouvrir un modal ou une page dédiée
        toast('Fonctionnalité de messages patients à implémenter', { position: 'top-center' });
        break;
      default:
        break;
    }
  };

  const handleStatusChange = async (newStatus: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE', newMode: 'AUTO' | 'MANUAL') => {
    if (!medecin) return;
    setStatusLoading(true);
    try {
      await setMedecinStatus(medecin.id, newStatus, newMode);
      setStatus(newStatus);
      setStatusMode(newMode);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAutoMode = async () => {
    if (!medecin) return;
    setStatusLoading(true);
    try {
      await setMedecinStatus(medecin.id, 'AVAILABLE', 'AUTO');
      setStatus('AVAILABLE');
      setStatusMode('AUTO');
    } finally {
      setStatusLoading(false);
    }
  };

  const daysOfWeek = [
    'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'
  ];

  const [workingHours, setWorkingHours] = useState<MedecinWorkingHour[]>([]);
  const [whLoading, setWhLoading] = useState(false);
  const [whError, setWhError] = useState<string | null>(null);
  const [whEdit, setWhEdit] = useState<{id?: number, dayOfWeek: number, startTime: string, endTime: string} | null>(null);

  // Charger les horaires de travail du médecin
  const loadWorkingHours = useCallback(async () => {
    if (!medecin) return;
    setWhLoading(true);
    setWhError(null);
    try {
      const res = await getMedecinWorkingHours(medecin.id);
      setWorkingHours(res);
    } catch {
      setWhError("Erreur lors du chargement des horaires");
    } finally {
      setWhLoading(false);
    }
  }, [medecin]);

  useEffect(() => { if (medecin) loadWorkingHours(); }, [medecin, loadWorkingHours]);

  const handleWhSave = async () => {
    if (!medecin || !whEdit) return;
    setWhLoading(true);
    setWhError(null);
    try {
      if (whEdit.id) {
        await updateMedecinWorkingHour(whEdit.id, { dayOfWeek: whEdit.dayOfWeek, startTime: whEdit.startTime, endTime: whEdit.endTime });
      } else {
        await createMedecinWorkingHour({ medecinId: medecin.id, dayOfWeek: whEdit.dayOfWeek, startTime: whEdit.startTime, endTime: whEdit.endTime });
      }
      setWhEdit(null);
      await loadWorkingHours();
    } catch {
      setWhError("Erreur lors de l'enregistrement");
    } finally {
      setWhLoading(false);
    }
  };
  const handleWhDelete = async (id: number) => {
    setWhLoading(true);
    setWhError(null);
    try {
      await deleteMedecinWorkingHour(id);
      await loadWorkingHours();
    } catch {
      setWhError("Erreur lors de la suppression");
    } finally {
      setWhLoading(false);
    }
  };

  // Regrouper les créneaux par jour de la semaine
  const workingHoursByDay: { [day: number]: MedecinWorkingHour[] } = {};
  workingHours.forEach((wh) => {
    if (!workingHoursByDay[wh.dayOfWeek]) workingHoursByDay[wh.dayOfWeek] = [];
    workingHoursByDay[wh.dayOfWeek].push(wh);
  });

  const [exceptions, setExceptions] = useState<MedecinException[]>([]);
  const [exceptionEdit, setExceptionEdit] = useState<{startDate: string, endDate: string, reason: string}>({startDate: '', endDate: '', reason: ''});
  const [exceptionError, setExceptionError] = useState<string | null>(null);

  // Fonction utilitaire pour générer un id unique simple
  function generateId() {
    return Math.random().toString(36).substr(2, 9) + Date.now();
  }

  const handleAddException = () => {
    setExceptionError(null);
    if (!exceptionEdit.startDate || !exceptionEdit.endDate) {
      setExceptionError("Veuillez renseigner une date de début et de fin.");
      return;
    }
    if (exceptionEdit.endDate < exceptionEdit.startDate) {
      setExceptionError("La date de fin doit être après la date de début.");
      return;
    }
    setExceptions([
      ...exceptions,
      { id: generateId(), startDate: exceptionEdit.startDate, endDate: exceptionEdit.endDate, reason: exceptionEdit.reason }
    ]);
    setExceptionEdit({startDate: '', endDate: '', reason: ''});
  };
  const handleDeleteException = (id: string) => {
    setExceptions(exceptions.filter(e => e.id !== id));
  };

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4 text-gray-600">Chargement du tableau de bord...</p>
        </div>
      </ProtectedLayout>
    );
  }

  if (!medecin) {
    return (
      <ProtectedLayout>
        <div className="max-w-2xl mx-auto text-center py-20">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-6 py-8 rounded-lg">
            <h3 className="text-xl font-bold mb-4">Profil médecin non trouvé</h3>
            <p className="mb-6">
              Votre profil médecin n&apos;a pas encore été créé. Veuillez créer votre profil pour accéder au tableau de bord.
            </p>
            <Button 
              onClick={createDefaultMedecinProfile}
              disabled={creatingProfile}
              className="bg-primary text-primary-content hover:bg-primary-focus"
            >
              {creatingProfile ? (
                <>
                  <div className="loading loading-spinner loading-sm mr-2"></div>
                  Création en cours...
                </>
              ) : (
                'Créer mon profil médecin'
              )}
            </Button>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  const todayAppointments = getAppointmentsForDate(new Date());
  const pendingAppointments = appointments.filter(a => a.status === 'PENDING');
  const confirmedAppointments = appointments.filter(a => a.status === 'CONFIRMED');

  return (
    <RoleBasedRedirect allowedRoles={['MEDECIN', 'DOCTEUR']}>
      <ProtectedLayout>
        <div className="max-w-6xl mx-auto pt-24 pb-20 w-full px-2 sm:px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col items-center gap-2 mb-4 max-w-full">
              <Avatar className="w-20 h-20 border-4 border-primary/20 mb-2">
                {medecin.photo ? (
                  <AvatarImage src={medecin.photo} alt="Photo de profil" />
                ) : (
                  <AvatarFallback className="text-3xl">{medecin.firstName?.[0] || medecin.email[0] || 'D'}</AvatarFallback>
                )}
              </Avatar>
              <h1 className="text-2xl font-bold text-base-content text-center break-words max-w-full truncate">
                Dr. {medecin.firstName} {medecin.lastName}
              </h1>
              <p className="text-primary font-medium text-lg text-center mb-2 break-words max-w-full truncate">{medecin.speciality.name}</p>
              <div className="flex items-center gap-4 mt-1 flex-wrap justify-center">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-warning" />
                  <span className="text-sm break-words max-w-full">{medecin.rating}/5 ({medecin.reviews} avis)</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-info" />
                  <span className="text-sm break-words max-w-full">{appointments.length} patients</span>
                </div>
              </div>
            </div>
          </div>

          {/* Statut du médecin - Version modernisée */}
          {medecin && (
            <div className="mb-6">
              {/* Statut principal - Version desktop */}
              <div className="hidden md:flex items-center justify-between gap-4 w-full mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    {status === 'AVAILABLE' ? (
                      <div className="flex items-center gap-3 bg-green-100 border border-green-200 rounded-full px-6 py-3">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <span className="text-green-800 font-semibold text-lg">Disponible</span>
                      </div>
                    ) : status === 'BUSY' ? (
                      <div className="flex items-center gap-3 bg-orange-100 border border-orange-200 rounded-full px-6 py-3">
                        <ClockIcon className="w-6 h-6 text-orange-600" />
                        <span className="text-orange-800 font-semibold text-lg">Occupé</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 bg-red-100 border border-red-200 rounded-full px-6 py-3">
                        <XCircle className="w-6 h-6 text-red-600" />
                        <span className="text-red-800 font-semibold text-lg">Indisponible</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600 text-sm">Mode : {statusMode === 'AUTO' ? 'Automatique' : 'Manuel'}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    disabled={statusLoading || (status === 'AVAILABLE' && statusMode === 'MANUAL')} 
                    onClick={() => handleStatusChange('AVAILABLE', 'MANUAL')}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Disponible
                  </Button>
                  <Button 
                    size="sm" 
                    disabled={statusLoading || (status === 'BUSY' && statusMode === 'MANUAL')} 
                    onClick={() => handleStatusChange('BUSY', 'MANUAL')}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <ClockIcon className="w-4 h-4" />
                    Occupé
                  </Button>
                  <Button 
                    size="sm" 
                    disabled={statusLoading || (status === 'UNAVAILABLE' && statusMode === 'MANUAL')} 
                    onClick={() => handleStatusChange('UNAVAILABLE', 'MANUAL')}
                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white"
                  >
                    <XCircle className="w-4 h-4" />
                    Indisponible
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    disabled={statusLoading || statusMode === 'AUTO'} 
                    onClick={handleAutoMode}
                    className="flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Mode automatique
                  </Button>
                </div>
              </div>

              {/* Version mobile - Statut principal */}
              <div className="md:hidden mb-4">
                <div className="flex items-center justify-center mb-3">
                  {status === 'AVAILABLE' ? (
                    <div className="flex items-center gap-2 bg-green-100 border border-green-200 rounded-full px-4 py-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-800 font-semibold">Disponible</span>
                    </div>
                  ) : status === 'BUSY' ? (
                    <div className="flex items-center gap-2 bg-orange-100 border border-orange-200 rounded-full px-4 py-2">
                      <ClockIcon className="w-5 h-5 text-orange-600" />
                      <span className="text-orange-800 font-semibold">Occupé</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-red-100 border border-red-200 rounded-full px-4 py-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="text-red-800 font-semibold">Indisponible</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Settings className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600 text-sm">Mode : {statusMode === 'AUTO' ? 'Automatique' : 'Manuel'}</span>
                </div>
              </div>

              {/* Version mobile - Boutons d'action */}
              <div className="md:hidden">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Button 
                    size="sm" 
                    disabled={statusLoading || (status === 'AVAILABLE' && statusMode === 'MANUAL')} 
                    onClick={() => handleStatusChange('AVAILABLE', 'MANUAL')}
                    className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white h-12"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm">Disponible</span>
                  </Button>
                  <Button 
                    size="sm" 
                    disabled={statusLoading || (status === 'BUSY' && statusMode === 'MANUAL')} 
                    onClick={() => handleStatusChange('BUSY', 'MANUAL')}
                    className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white h-12"
                  >
                    <ClockIcon className="w-5 h-5" />
                    <span className="text-sm">Occupé</span>
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    size="sm" 
                    disabled={statusLoading || (status === 'UNAVAILABLE' && statusMode === 'MANUAL')} 
                    onClick={() => handleStatusChange('UNAVAILABLE', 'MANUAL')}
                    className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white h-12"
                  >
                    <XCircle className="w-5 h-5" />
                    <span className="text-sm">Indisponible</span>
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    disabled={statusLoading || statusMode === 'AUTO'} 
                    onClick={handleAutoMode}
                    className="flex items-center justify-center gap-2 h-12"
                  >
                    <Settings className="w-5 h-5" />
                    <span className="text-sm">Auto</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-8 w-full overflow-x-auto">
            <Card className="card bg-base-100 shadow-md max-w-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between break-words max-w-full">
                  <div>
                    <p className="text-sm text-base-content/70">Rendez-vous aujourd&apos;hui</p>
                    <p className="text-2xl font-bold text-primary">{todayAppointments.length}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="card bg-base-100 shadow-md max-w-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between break-words max-w-full">
                  <div>
                    <p className="text-sm text-base-content/70">En attente</p>
                    <p className="text-2xl font-bold text-warning">{pendingAppointments.length}</p>
                  </div>
                  <Clock className="w-8 h-8 text-warning" />
                </div>
              </CardContent>
            </Card>

            <Card className="card bg-base-100 shadow-md max-w-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between break-words max-w-full">
                  <div>
                    <p className="text-sm text-base-content/70">Confirmés</p>
                    <p className="text-2xl font-bold text-success">{confirmedAppointments.length}</p>
                  </div>
                  <User className="w-8 h-8 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card className="card bg-base-100 shadow-md max-w-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between break-words max-w-full">
                  <div>
                    <p className="text-sm text-base-content/70">Note moyenne</p>
                    <p className="text-2xl font-bold text-info">{medecin.rating}/5</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-info" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rendez-vous du jour */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 w-full">
            <Card className="card bg-base-100 shadow-md max-w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 break-words max-w-full truncate">
                  <Calendar className="w-5 h-5" />
                  Rendez-vous du {new Date().toLocaleDateString("fr-FR", { 
                    weekday: "long", 
                    day: "numeric", 
                    month: "long" 
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent className="break-words max-w-full">
                {todayAppointments.length === 0 ? (
                  <p className="text-center text-base-content/70 py-8">
                    Aucun rendez-vous aujourd&apos;hui
                  </p>
                ) : (
                  <div className="space-y-4">
                    {todayAppointments.map((appointment) => (
                      <div key={appointment.id} className="flex items-center justify-between p-4 bg-base-200 rounded-lg break-words max-w-full flex-wrap">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-primary text-primary-content">
                              {appointment.patient.firstName.charAt(0)}{appointment.patient.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {appointment.patient.firstName} {appointment.patient.lastName}
                            </p>
                            <p className="text-sm text-base-content/70">
                              {new Date(appointment.date).toLocaleTimeString('fr-FR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                            {appointment.reason && (
                              <p className="text-sm text-base-content/70">{appointment.reason}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant={getStatusColor(appointment.status) as "default" | "secondary" | "destructive" | "outline"} className="break-words max-w-full truncate">
                          {getStatusText(appointment.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions rapides */}
            <Card className="card bg-base-100 shadow-md max-w-full">
              <CardHeader>
                <CardTitle className="break-words max-w-full truncate">Actions rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 break-words max-w-full">
                <Button className="w-full justify-start break-words max-w-full py-2 px-2 text-sm h-10" variant="outline" onClick={() => handleQuickAction('medical-records')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Consulter mes dossiers
                </Button>
                <Button className="w-full justify-start break-words max-w-full py-2 px-2 text-sm h-10" variant="outline" onClick={() => handleQuickAction('appointment')}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Gérer mon planning
                </Button>
                <Button className="w-full justify-start break-words max-w-full py-2 px-2 text-sm h-10" variant="outline" onClick={() => handleQuickAction('calls')}>
                  <Phone className="w-4 h-4 mr-2" />
                  Appels en attente
                </Button>
                <Button className="w-full justify-start break-words max-w-full py-2 px-2 text-sm h-10" variant="outline" onClick={() => handleQuickAction('messages')}>
                  <Mail className="w-4 h-4 mr-2" />
                  Messages patients
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* SECTION GESTION HORAIRES MULTI-CRÉNEAUX */}
          {medecin && (
            <Card className="my-8 bg-base-100 shadow-md max-w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg break-words max-w-full truncate">
                  <Clock className="w-5 h-5 text-primary" />
                  Gestion des horaires de travail
                </CardTitle>
                <p className="text-base-content/70 text-sm mt-2 break-words max-w-full">Définissez vos jours et créneaux de travail pour la prise de rendez-vous en ligne. Plusieurs créneaux par jour possibles.</p>
              </CardHeader>
              <CardContent>
                {whError && toast.error(whError, { position: 'top-center' })}
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead>
                      <tr>
                        <th className="text-left px-6 py-3">Jour</th>
                        <th className="text-left px-6 py-3">Créneaux</th>
                        <th className="text-right px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daysOfWeek.map((day, dayIdx) => (
                        <tr key={dayIdx} className="align-top hover:bg-base-200/60 transition-all">
                          <td className="font-semibold px-6 py-3 w-1/5">{day}</td>
                          <td className="px-6 py-3 w-3/5">
                            <div className="flex flex-wrap gap-2 items-center min-h-[32px]">
                              {(workingHoursByDay[dayIdx] || []).length === 0 && <span className="text-base-content/50 text-sm">Aucun créneau</span>}
                              {(workingHoursByDay[dayIdx] || []).map((wh) => (
                                <div key={wh.id} className="flex items-center gap-2 bg-base-100 border border-base-300 rounded-lg px-2 py-1">
                                  <span className="badge badge-outline bg-base-100">{wh.startTime} - {wh.endTime}</span>
                                  <Button size="sm" variant="outline" onClick={() => setWhEdit({id: wh.id, dayOfWeek: wh.dayOfWeek, startTime: wh.startTime, endTime: wh.endTime})} className="hidden md:flex">
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleWhDelete(wh.id)} className="hidden md:flex">
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                  {/* Version mobile avec icônes */}
                                  <Button size="sm" variant="outline" onClick={() => setWhEdit({id: wh.id, dayOfWeek: wh.dayOfWeek, startTime: wh.startTime, endTime: wh.endTime})} className="md:hidden">
                                    ✏️
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleWhDelete(wh.id)} className="md:hidden">
                                    🗑️
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-3 w-1/5 text-right">
                            <Button size="sm" className="btn btn-primary hidden md:flex" onClick={() => setWhEdit({dayOfWeek: dayIdx, startTime: '09:00', endTime: '17:00'})}>
                              <Plus className="w-3 h-3 mr-1" />
                              Ajouter un créneau
                            </Button>
                            <Button size="sm" className="btn btn-primary md:hidden" onClick={() => setWhEdit({dayOfWeek: dayIdx, startTime: '09:00', endTime: '17:00'})}>
                              <Plus className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Formulaire d'ajout/modif */}
                {whEdit && (
                  <div className="mt-6 p-4 bg-base-200 rounded-lg">
                    <form
                      className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end"
                      onSubmit={e => { e.preventDefault(); handleWhSave(); }}
                    >
                      <div className="flex flex-col">
                        <label className="block mb-1 font-medium">Jour</label>
                        <select className="select select-bordered w-full" value={whEdit.dayOfWeek} onChange={e => setWhEdit({...whEdit, dayOfWeek: Number(e.target.value)})}>
                          {daysOfWeek.map((d, i) => <option key={i} value={i}>{d}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col">
                        <label className="block mb-1 font-medium">Début</label>
                        <input type="time" className="input input-bordered w-full" value={whEdit.startTime} onChange={e => setWhEdit({...whEdit, startTime: e.target.value})} />
                      </div>
                      <div className="flex flex-col">
                        <label className="block mb-1 font-medium">Fin</label>
                        <input type="time" className="input input-bordered w-full" value={whEdit.endTime} onChange={e => setWhEdit({...whEdit, endTime: e.target.value})} />
                      </div>
                      <div className="flex gap-2 justify-end md:col-span-2">
                        <Button className="btn btn-success" type="submit" disabled={whLoading}>
                          {whLoading ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
                        <Button className="btn btn-outline" type="button" onClick={() => setWhEdit(null)} disabled={whLoading}>Annuler</Button>
                      </div>
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* SECTION EXCEPTIONS */}
          <Card className="my-8 bg-base-100 shadow-md max-w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg break-words max-w-full truncate">
                <AlertTriangle className="w-5 h-5 text-error" />
                Absences, vacances et exceptions
              </CardTitle>
              <p className="text-base-content/70 text-sm mt-2 break-words max-w-full">Ajoutez vos périodes d&apos;indisponibilité (vacances, absences, jours fériés, etc.). Ces exceptions primeront sur vos créneaux récurrents.</p>
            </CardHeader>
            <CardContent>
              {exceptionError && toast.error(exceptionError, { position: 'top-center' })}
              {/* Formulaire d'ajout d'exception - version mobile améliorée */}
              <div className="flex flex-col gap-4 items-end mb-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                  <div>
                    <label className="block mb-1 font-medium">Début</label>
                    <input type="date" className="input input-bordered w-full" value={exceptionEdit.startDate} onChange={e => setExceptionEdit({...exceptionEdit, startDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Fin</label>
                    <input type="date" className="input input-bordered w-full" value={exceptionEdit.endDate} onChange={e => setExceptionEdit({...exceptionEdit, endDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Motif (optionnel)</label>
                    <input type="text" className="input input-bordered w-full" placeholder="Vacances, Congé, ..." value={exceptionEdit.reason} onChange={e => setExceptionEdit({...exceptionEdit, reason: e.target.value})} />
                  </div>
                  <div className="flex items-end">
                    <Button className="btn btn-error w-full md:w-auto" onClick={handleAddException}>
                      <Plus className="w-4 h-4 mr-1 hidden md:inline" />
                      Ajouter
                    </Button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th className="text-left px-6 py-3">Période</th>
                      <th className="text-left px-6 py-3">Motif</th>
                      <th className="text-right px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exceptions.length === 0 && (
                      <tr><td colSpan={3} className="text-base-content/50 text-sm px-6 py-3">Aucune exception définie</td></tr>
                    )}
                    {exceptions.map((ex) => (
                      <tr key={ex.id} className="hover:bg-base-200/60 transition-all">
                        <td className="px-6 py-3 w-2/5">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-primary hidden md:inline" />
                            {ex.startDate} → {ex.endDate}
                          </div>
                        </td>
                        <td className="px-6 py-3 w-2/5">{ex.reason || '-'}</td>
                        <td className="px-6 py-3 w-1/5 text-right">
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteException(ex.id)} className="hidden md:flex">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteException(ex.id)} className="md:hidden">
                            🗑️
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </ProtectedLayout>
    </RoleBasedRedirect>
  );
};

export default MedecinDashboard; 