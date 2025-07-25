'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, MapPin, Search, Filter, Star, Phone, Mail, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '../../hooks/use-toast';
import ReviewModal from '@/components/ReviewModal';
import Image from 'next/image';
import { getSpecialities, getMedecins, createAppointment, getPatientByUserId, getAppointments, getMedecinWorkingHours } from '@/actions';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';

// @ts-expect-error: Pas de types pour html2pdf.js, usage dynamique côté client
declare module 'html2pdf.js';

interface Speciality {
  id: number;
  name: string;
  icon: string;
  description?: string | null;
  _count: {
    medecins: number;
  };
}

interface Appointment {
  id: number;
  date: string;
  reason?: string | null;
  status: string;
  patientId?: number;
  patient?: {
    firstName: string;
    lastName: string;
  };
}

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
  languages?: string | null;
  speciality: {
    id: number;
    name: string;
    icon: string;
  };
  status: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
  statusMode: 'AUTO' | 'MANUAL';
  _count: {
    appointments: number;
  };
}

const AppointmentSection = () => {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [medecins, setMedecins] = useState<Medecin[]>([]);
  const [filteredMedecins, setFilteredMedecins] = useState<Medecin[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [selectedSpeciality, setSelectedSpeciality] = useState<number | null>(null);
  const [showAllSpecialities, setShowAllSpecialities] = useState(false);
  
  // Modal de réservation
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedMedecin, setSelectedMedecin] = useState<Medecin | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingReason, setBookingReason] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Modal de notation
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewMedecin, setReviewMedecin] = useState<Medecin | null>(null);
  const [patientId, setPatientId] = useState<number | null>(null);

  // Pour la vue médecin
  const [doctorAppointments, setDoctorAppointments] = useState<Appointment[]>([]);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const router = useRouter();

  // Ajout : horaires de travail du médecin sélectionné
  const [medecinWorkingHours, setMedecinWorkingHours] = useState<{ dayOfWeek: number; startTime: string; endTime: string }[]>([]);

  // Ajout : spécialités actives (au moins un médecin)
  const activeSpecialities = specialities.filter(s => s._count.medecins > 0);

  const filterMedecins = useCallback(() => {
    let filtered = [...medecins];

    // Filtre par spécialité
    if (selectedSpeciality) {
      filtered = filtered.filter(medecin => medecin.speciality.id === selectedSpeciality);
    }

    // Filtre par recherche
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(medecin => 
        medecin.firstName.toLowerCase().includes(searchLower) ||
        medecin.lastName.toLowerCase().includes(searchLower) ||
        medecin.speciality.name.toLowerCase().includes(searchLower) ||
        medecin.city?.toLowerCase().includes(searchLower)
      );
    }

    // Filtre par localisation
    if (locationFilter) {
      const locationLower = locationFilter.toLowerCase();
      filtered = filtered.filter(medecin => 
        medecin.city?.toLowerCase().includes(locationLower)
      );
    }

    setFilteredMedecins(filtered);
  }, [medecins, searchTerm, locationFilter, selectedSpeciality]);

  useEffect(() => {
    loadData();
  }, []);

  // Rafraîchissement automatique toutes les 3 secondes côté patient
  useEffect(() => {
    if (user && user.role === 'PATIENT') {
      const interval = setInterval(() => {
        loadData();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    filterMedecins();
  }, [filterMedecins]);

  // Chargement des rendez-vous du médecin
  useEffect(() => {
    const fetchDoctorAppointments = async () => {
      if (user && (user.role === 'MEDECIN' || user.role === 'DOCTEUR')) {
        setDoctorLoading(true);
        try {
          // On suppose que user.id est le userId, il faut récupérer le medecinId
          const medecinData = await import('@/actions').then(m => m.getMedecinByUserId(user.id));
          if (medecinData && medecinData.id) {
            const appointmentsRaw = await getAppointments({ medecinId: medecinData.id });
            // On mappe pour correspondre à l'interface Appointment
            const appointments: Appointment[] = (appointmentsRaw as unknown[]).map((a) => {
              const appt = a as {
                id: number;
                date: string | Date;
                reason?: string | null;
                status: string;
                patientId?: number;
                patient?: { firstName: string; lastName: string };
              };
              return {
                id: appt.id,
                date: typeof appt.date === 'string' ? appt.date : appt.date.toISOString(),
                reason: appt.reason,
                status: appt.status,
                patientId: appt.patientId,
                patient: appt.patient ? {
                  firstName: appt.patient.firstName,
                  lastName: appt.patient.lastName
                } : undefined
              };
            });
            setDoctorAppointments(appointments);
          }
        } catch {
          setDoctorAppointments([]);
        } finally {
          setDoctorLoading(false);
        }
      }
    };
    fetchDoctorAppointments();
  }, [user]);

  const loadData = async () => {
    try {
      const [specialitiesData, medecinsData] = await Promise.all([
        getSpecialities(),
        getMedecins()
      ]);
      
      // Initialiser les notes des médecins si nécessaire
      const { initializeMedecinRatings } = await import('@/actions');
      await initializeMedecinRatings();
      
      setSpecialities(specialitiesData);
      setMedecins(medecinsData);
      setFilteredMedecins(medecinsData);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      // nothing needed here
    }
  };

  const handleSpecialityClick = (specialityId: number) => {
    setSelectedSpeciality(selectedSpeciality === specialityId ? null : specialityId);
  };

  const handleSearch = () => {
    filterMedecins();
  };

  // Lorsqu'on ouvre le modal, on charge les horaires du médecin
  const handleBookAppointment = async (medecin: Medecin) => {
    if (!user) {
      toast({
        title: "🔒 Connexion requise",
        description: "Vous devez être connecté pour réserver un rendez-vous",
        variant: "destructive",
      });
      return;
    }
    try {
      const patient = await getPatientByUserId(user.id);
      if (!patient) {
        toast({
          title: "👤 Profil patient manquant",
          description: "Veuillez créer votre profil patient d'abord",
          variant: "destructive",
        });
        return;
      }
      setSelectedMedecin(medecin);
      // Charger les horaires de travail du médecin
      const workingHours = await getMedecinWorkingHours(medecin.id);
      setMedecinWorkingHours(workingHours);
      setIsBookingModalOpen(true);
    } catch (error) {
      console.error('Erreur lors de la récupération du profil patient:', error);
      toast({
        title: "⚠️ Erreur",
        description: "Impossible de récupérer vos informations",
        variant: "destructive",
      });
    }
  };

  const handleSubmitBooking = async () => {
    if (!selectedMedecin || !bookingDate || !bookingTime) {
      toast({
        title: "📝 Informations manquantes",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    try {
      setBookingLoading(true);
      
      const appointmentDate = new Date(`${bookingDate}T${bookingTime}`);
      
      await createAppointment({
        patientId: (await getPatientByUserId(user!.id))!.id,
        medecinId: selectedMedecin.id,
        date: appointmentDate,
        reason: bookingReason || undefined
      });

      toast({
        title: "✅ Rendez-vous réservé !",
        description: `Votre rendez-vous avec Dr. ${selectedMedecin.lastName} a été confirmé`,
        duration: 5000,
      });

      // Réinitialiser le formulaire
      setBookingDate('');
      setBookingTime('');
      setBookingReason('');
      setIsBookingModalOpen(false);
      setSelectedMedecin(null);
      
      // Recharger les données
      await reloadData();
    } catch (error) {
      console.error('Erreur lors de la réservation:', error);
      toast({
        title: "❌ Erreur de réservation",
        description: "Impossible de réserver le rendez-vous. Veuillez réessayer.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setBookingLoading(false);
    }
  };

  const handleReviewClick = async (medecin: Medecin) => {
    if (!user) {
      toast({
        title: "🔒 Connexion requise",
        description: "Vous devez être connecté pour noter un médecin",
        variant: "destructive",
      });
      return;
    }

    // Vérifier que l'utilisateur est un patient
    if (user.role !== 'PATIENT') {
      toast({
        title: "❌ Accès refusé",
        description: "Seuls les patients peuvent noter les médecins",
        variant: "destructive",
      });
      return;
    }

    try {
      // Récupérer l'ID du patient
      const patient = await getPatientByUserId(user.id);
      if (!patient) {
        toast({
          title: "👤 Profil manquant",
          description: "Veuillez créer votre profil patient d'abord",
          variant: "destructive",
        });
        return;
      }

      setPatientId(patient.id);
      setReviewMedecin(medecin);
      setIsReviewModalOpen(true);
    } catch (error) {
      console.error('Erreur lors de la récupération du profil patient:', error);
      toast({
        title: "⚠️ Erreur",
        description: "Impossible de récupérer vos informations",
        variant: "destructive",
      });
    }
  };

  // Fonction pour recharger les données après une action
  const reloadData = async () => {
    try {
      console.log('🔄 Début du rechargement des données...');
      const [specialitiesData, medecinsData] = await Promise.all([
        getSpecialities(),
        getMedecins()
      ]);
      
      console.log('📊 Données des médecins rechargées:', medecinsData);
      
      setSpecialities(specialitiesData);
      setMedecins(medecinsData);
      setFilteredMedecins(medecinsData);
      
      console.log('✅ Données rechargées avec succès');
    } catch (error) {
      console.error('❌ Erreur lors du rechargement des données:', error);
    } finally {
      // nothing needed here
    }
  };

  // Fonction pour gérer la fermeture du modal de notation avec rechargement
  const handleReviewModalClose = async (shouldReload: boolean = false) => {
    setIsReviewModalOpen(false);
    setReviewMedecin(null);
    setPatientId(null);
    
    if (shouldReload) {
      await reloadData();
    }
  };

  // Renvoie les dates où le médecin travaille (prochains 14 jours)
  const getAvailableDates = () => {
    if (!selectedMedecin || medecinWorkingHours.length === 0) return [];
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay(); // 0=dimanche, 1=lundi...
      if (medecinWorkingHours.some(h => h.dayOfWeek === dayOfWeek)) {
        dates.push(date.toISOString().split('T')[0]);
      }
    }
    return dates;
  };
  // Renvoie les créneaux horaires valides pour le jour sélectionné
  const getAvailableTimeSlots = (selectedDate?: string): string[] => {
    if (!selectedMedecin || medecinWorkingHours.length === 0 || !selectedDate) return [];
    const slots: string[] = [];
    const dateObj = new Date(selectedDate);
    const dayOfWeek = dateObj.getDay();
    const workingHour = medecinWorkingHours.find(h => h.dayOfWeek === dayOfWeek);
    if (!workingHour) return [];
    // Créneaux de 30min entre startTime et endTime
    const [startHour, startMinute] = workingHour.startTime.split(':').map(Number);
    const [endHour, endMinute] = workingHour.endTime.split(':').map(Number);
    // eslint-disable-next-line prefer-const
    let currentSlot = new Date(dateObj);
    currentSlot.setHours(startHour, startMinute, 0, 0);
    const end = new Date(dateObj);
    end.setHours(endHour, endMinute, 0, 0);
    while (currentSlot < end) {
      // Si la date sélectionnée est aujourd'hui, ne proposer que les créneaux futurs
      const nowSlot = new Date();
      if (selectedDate === nowSlot.toISOString().split('T')[0]) {
        if (currentSlot <= nowSlot) {
          currentSlot.setMinutes(currentSlot.getMinutes() + 30);
          continue;
        }
      }
      const time = `${currentSlot.getHours().toString().padStart(2, '0')}:${currentSlot.getMinutes().toString().padStart(2, '0')}`;
      slots.push(time);
      currentSlot.setMinutes(currentSlot.getMinutes() + 30);
    }
    return slots;
  };

  const formatLanguages = (languages?: string | null) => {
    if (!languages) return 'Français';
    try {
      const langArray = JSON.parse(languages);
      return Array.isArray(langArray) ? langArray.join(', ') : 'Français';
    } catch {
      return 'Français';
    }
  };

  const getNextSlot = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    }) + ' à ' + tomorrow.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Fonction pour confirmer un rendez-vous (médecin)
  const handleConfirmAppointment = async (appointmentId: number) => {
    try {
      await import('@/actions').then(m => m.updateAppointment(appointmentId, { status: 'CONFIRMED' }));
      setDoctorAppointments((prev) => prev.map(a => a.id === appointmentId ? { ...a, status: 'CONFIRMED' } : a));
      toast({ title: 'Rendez-vous confirmé', description: 'Le rendez-vous a été confirmé.', duration: 3000 });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de confirmer le rendez-vous.', variant: 'destructive' });
    }
  };

  // Traduction du statut
  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'En attente';
      case 'CONFIRMED': return 'Confirmé';
      case 'CANCELLED': return 'Annulé';
      case 'COMPLETED': return 'Terminé';
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

  if (!user) {
    return null;
  }

  if (user.role === 'MEDECIN' || user.role === 'DOCTEUR') {
    return (
      <section className="section-padding bg-base-100">
        <div className="container">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="badge-lg mb-4">
              📅 Gestion des rendez-vous
            </Badge>
            <h2 className="heading-responsive font-bold text-base-content mb-4">
              Vos rendez-vous à venir
            </h2>
            <p className="text-responsive text-base-content/70 max-w-2xl mx-auto">
              Retrouvez ici la liste de vos prochains rendez-vous avec vos patients.
            </p>
          </div>
          {doctorLoading ? (
            <div className="text-center py-8">
              <div className="loading loading-spinner loading-lg mx-auto"></div>
              <p className="mt-4">Chargement des rendez-vous...</p>
            </div>
          ) : doctorAppointments.length === 0 ? (
            <div className="text-center py-8 text-base-content/70">Aucun rendez-vous à venir.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {doctorAppointments.map((appointment) => (
                <Card key={appointment.id} className="card bg-white shadow-xl rounded-2xl border border-base-200 hover:shadow-2xl transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar className="w-14 h-14 shadow-md">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-content text-xl font-bold">
                          {appointment.patient?.firstName?.charAt(0)}{appointment.patient?.lastName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">
                          {appointment.patient ? `${appointment.patient.firstName} ${appointment.patient.lastName}` : 'Patient inconnu'}
                        </h3>
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="text-base-content/80">
                            {new Date(appointment.date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-secondary" />
                          <span className="text-base-content/70">{appointment.reason || 'Consultation'}</span>
                        </div>
                        <Badge className={`mt-1 ${appointment.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : appointment.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{getStatusText(appointment.status)}</Badge>
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-2 pt-2">
                      <Button className="btn btn-primary flex-1" onClick={() => appointment.patientId && router.push(`/medical-records?patientId=${appointment.patientId}`)}>
                        Voir le dossier
                      </Button>
                      <Button variant="outline" className="btn btn-outline flex-1" onClick={() => {/* TODO: action contacter */}}>
                        Contacter
                      </Button>
                     {appointment.status === 'PENDING' && (
                       <Button className="btn btn-success flex-1" onClick={() => handleConfirmAppointment(appointment.id)}>
                         Confirmer
                       </Button>
                     )}
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

  // PATIENT : contenu existant
  return (
    <section className="section-padding bg-base-100">
      <div className="container">
        {/* Header Section */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="badge-lg mb-4 max-w-full break-words truncate">
            📅 Prise de rendez-vous
          </Badge>
          <h2 className="heading-responsive font-bold text-base-content mb-4 break-words max-w-full truncate">
            Trouvez votre médecin
          </h2>
          <p className="text-responsive text-base-content/70 max-w-full mx-auto break-words">
            Réservez instantanément un rendez-vous avec un médecin selon sa spécialité, 
            sa disponibilité ou sa localisation.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
          {/* Image - First on mobile, right on desktop */}
          <div className="lg:col-span-1 order-first lg:order-last">
            <Card className="card bg-base-100 shadow-xl overflow-hidden max-w-full">
              <Image
                src="/assets/appointment-booking.jpg"
                alt="Prise de rendez-vous médical"
                width={600}
                height={400}
                className="w-full h-full object-cover min-h-[300px] sm:min-h-[400px] lg:min-h-[500px]"
                priority
              />
              
              {/* Overlay Content */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                <div className="p-6 text-white break-words max-w-full">
                  <h3 className="text-xl font-bold mb-2 break-words max-w-full truncate">Consultation en ligne</h3>
                  <p className="text-sm opacity-90 break-words max-w-full">
                    Prenez rendez-vous en quelques clics et recevez une confirmation instantanée
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Left - Search and Filters */}
          <div className="lg:col-span-1 space-y-6 order-2">
            {/* Search Card */}
            <Card className="card bg-base-100 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Search className="w-5 h-5 mr-2 text-primary" />
                  Rechercher un médecin
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="form-control">
                  <div className="input-group">
                    <span className="btn btn-square btn-ghost">
                      <Search className="w-4 h-4" />
                    </span>
                    <Input
                      placeholder="Spécialité, nom du médecin..."
                      className="input input-bordered w-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                </div>
                
                <div className="form-control">
                  <div className="input-group">
                    <span className="btn btn-square btn-ghost">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <Input
                      placeholder="Localisation"
                      className="input input-bordered w-full"
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                </div>

                <Button className="btn btn-primary w-full" onClick={handleSearch}>
                  <Filter className="w-4 h-4 mr-2" />
                  Filtrer les résultats
                </Button>
              </CardContent>
            </Card>

            {/* Specialties Card */}
            <Card className="card bg-base-100 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Spécialités disponibles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(showAllSpecialities ? activeSpecialities : activeSpecialities.slice(0, 6)).map((speciality) => {
                    // Calcul du statut global de la spécialité
                    const medecinsOfSpeciality = medecins.filter(m => m.speciality.id === speciality.id);
                    const hasAvailable = medecinsOfSpeciality.some(m => m.status === 'AVAILABLE');
                    const hasBusy = medecinsOfSpeciality.some(m => m.status === 'BUSY');
                    let badgeLabel = 'Indisponible';
                    let badgeVariant: 'default' | 'secondary' | 'outline' = 'secondary';
                    if (hasAvailable) {
                      badgeLabel = 'Disponible';
                      badgeVariant = 'default';
                    } else if (hasBusy) {
                      badgeLabel = 'Occupé';
                      badgeVariant = 'outline';
                    }
                    return (
                      <div 
                        key={speciality.id} 
                        className={`flex items-center justify-between p-4 hover:bg-base-200 rounded-lg cursor-pointer transition-colors ${
                          selectedSpeciality === speciality.id ? 'bg-primary/10 border border-primary/20' : ''
                        }`}
                        onClick={() => handleSpecialityClick(speciality.id)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{speciality.icon}</span>
                          <div>
                            <div className="font-medium text-base-content">
                              {speciality.name}
                            </div>
                            <div className="text-sm text-base-content/70">
                              {speciality._count.medecins} médecins
                            </div>
                          </div>
                        </div>
                        <Badge 
                          variant={badgeVariant}
                          className="animate-pulse"
                        >
                          {badgeLabel}
                        </Badge>
                      </div>
                    );
                  })}
                  {activeSpecialities.length > 6 && (
                    <button
                      type="button"
                      className="w-full flex items-center justify-center mt-2 text-primary focus:outline-none transition-transform"
                      onClick={() => setShowAllSpecialities((v) => !v)}
                      aria-label={showAllSpecialities ? 'Réduire la liste' : 'Afficher toutes les spécialités'}
                    >
                      <svg
                        className={`w-5 h-5 transition-transform duration-300 ${showAllSpecialities ? 'rotate-180' : 'rotate-0'}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center - Doctors List */}
          <div className="lg:col-span-1 space-y-4 order-3">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-base-content">Médecins disponibles</h3>
              <Badge variant="outline" className="animate-pulse">
                {filteredMedecins.length} résultats
              </Badge>
            </div>

            {filteredMedecins.length === 0 ? (
              <Card className="card bg-base-100 shadow-md">
                <CardContent className="p-6 text-center">
                  <p className="text-base-content/70">Aucun médecin trouvé avec ces critères.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setSearchTerm('');
                      setLocationFilter('');
                      setSelectedSpeciality(null);
                    }}
                  >
                    Réinitialiser les filtres
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredMedecins.map((medecin) => (
                <Card key={medecin.id} className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    {/* Doctor Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-primary text-primary-content">
                            {medecin.firstName.charAt(0)}{medecin.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-lg">
                            Dr. {medecin.firstName} {medecin.lastName}
                          </h3>
                          <p className="text-primary font-medium">{medecin.speciality.name}</p>
                          {/* Badge statut médecin */}
                          <Badge variant={medecin.status === 'AVAILABLE' ? 'default' : medecin.status === 'BUSY' ? 'outline' : 'secondary'} className="mt-1">
                            {medecin.status === 'AVAILABLE' ? 'Disponible' : medecin.status === 'BUSY' ? 'Occupé' : 'Indisponible'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          {medecin.rating > 0 && (
                            <span className="font-semibold">
                              {medecin.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {medecin.reviews > 0 ? `${medecin.reviews} avis` : 'Aucun avis'}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Doctor Details */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center text-sm text-base-content/70">
                        <MapPin className="w-4 h-4 mr-2" />
                        {medecin.city || 'Localisation non spécifiée'}
                      </div>
                      <div className="flex items-center text-sm text-secondary">
                        <Clock className="w-4 h-4 mr-2" />
                        Prochain créneau: {getNextSlot()}
                      </div>
                      {medecin.experience && (
                        <div className="flex items-center text-sm text-base-content/70">
                          <span className="mr-2">👨‍⚕️</span>
                          {medecin.experience} d&apos;expérience
                        </div>
                      )}
                      <div className="flex items-center text-sm text-base-content/70">
                        <span className="mr-2">🌍</span>
                        {formatLanguages(medecin.languages)}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button 
                        className="btn btn-primary flex-1 rounded-full px-3 py-2 text-sm shadow-md"
                        onClick={() => handleBookAppointment(medecin)}
                        disabled={medecin.status !== 'AVAILABLE'}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Réserver
                      </Button>
                      {user?.role === 'PATIENT' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleReviewClick(medecin)}
                          className="btn btn-outline btn-sm rounded-full px-2 py-1 text-sm"
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                      )}
                      {medecin.phone && (
                        <Button variant="outline" size="sm" className="btn btn-outline btn-sm rounded-full px-2 py-1 text-sm">
                          <Phone className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="btn btn-outline btn-sm rounded-full px-2 py-1 text-sm">
                        <Mail className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Modal de notation */}
        {isReviewModalOpen && reviewMedecin && patientId && (
          <ReviewModal
            isOpen={isReviewModalOpen}
            onClose={() => handleReviewModalClose()}
            medecin={reviewMedecin}
            patientId={patientId}
          />
        )}

        {/* Modal de réservation */}
        {isBookingModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-base-200 relative animate-fade-in px-0 sm:px-2">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-base-200 bg-base-100 rounded-t-2xl">
                <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
                  <Calendar className="w-6 h-6 text-primary" />
                  Réserver un rendez-vous
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsBookingModalOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              {selectedMedecin && (
                <div className="p-6 space-y-8 w-full">
                  {/* Informations du médecin */}
                  <div className="flex items-center gap-4 p-4 bg-base-200/60 rounded-xl shadow-sm border border-base-300 w-full">
                    <Avatar className="w-14 h-14 shadow-md">
                      <AvatarFallback className="bg-primary text-primary-content text-xl font-bold">
                        {selectedMedecin.firstName.charAt(0)}{selectedMedecin.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-lg text-base-content truncate">
                        Dr. {selectedMedecin.firstName} {selectedMedecin.lastName}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-primary text-sm font-medium">
                        <span>{selectedMedecin.speciality.name}</span>
                        <span className="text-base-content/50">•</span>
                        <span>{selectedMedecin.city}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-base-content/70 text-xs">
                        <Star className="w-4 h-4 text-yellow-500" />
                        {selectedMedecin.rating > 0 ? selectedMedecin.rating.toFixed(1) : 'Nouveau'}
                      </div>
                    </div>
                  </div>

                  <div className="divider my-0">Choix du créneau</div>

                  {/* Formulaire de réservation */}
                  <div className="space-y-6 w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
                      <div className="w-full">
                        <label className="text-sm font-medium mb-2 block">Date</label>
                        <Select value={bookingDate} onValueChange={setBookingDate}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sélectionner une date" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableDates().map((date) => (
                              <SelectItem key={date} value={date}>
                                {new Date(date).toLocaleDateString('fr-FR', {
                                  weekday: 'long',
                                  day: 'numeric',
                                  month: 'long'
                                })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-full">
                        <label className="text-sm font-medium mb-2 block">Heure</label>
                        <Select value={bookingTime} onValueChange={setBookingTime}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sélectionner une heure" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableTimeSlots(bookingDate).map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="w-full">
                      <label className="text-sm font-medium mb-2 block">Motif de consultation <span className="text-base-content/50">(optionnel)</span></label>
                      <Textarea
                        placeholder="Décrivez brièvement le motif de votre consultation..."
                        value={bookingReason}
                        onChange={(e) => setBookingReason(e.target.value)}
                        rows={3}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="divider my-0" />

                  {/* Actions alignées à droite */}
                  <div className="flex justify-end gap-3 pt-2 w-full">
                    <Button
                      variant="outline"
                      onClick={() => setIsBookingModalOpen(false)}
                      className=""
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={handleSubmitBooking}
                      disabled={!bookingDate || !bookingTime || bookingLoading}
                      className="btn btn-primary shadow-md"
                    >
                      {bookingLoading ? (
                        <>
                          <div className="loading loading-spinner loading-sm mr-2"></div>
                          Réservation...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Confirmer
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default AppointmentSection;