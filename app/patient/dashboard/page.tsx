'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, FileText, Pill, CreditCard, MapPin, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import ProtectedLayout from '@/components/ProtectedLayout';
import RoleBasedRedirect from '@/components/RoleBasedRedirect';
import { useAuth } from '../../../hooks/useAuth';
import { getPatientByUserId, getAppointments, getPrescriptions, getPayments } from '@/actions';

interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  photo?: string | null; // Added photo to the interface
}

interface Appointment {
  id: number;
  date: Date;
  reason?: string | null;
  status: string;
  medecin: {
    id: number;
    firstName: string;
    lastName: string;
    speciality: {
      name: string;
      icon: string;
    };
  };
}

interface Prescription {
  id: number;
  medication: string;
  dosage: string;
  renewal: boolean;
  createdAt: Date;
}

interface Payment {
  id: number;
  amount: number;
  method: string;
  date: Date;
}

const PatientDashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPatientData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Chargement des données patient pour userId:', user!.id);
      
      // Récupérer les informations du patient connecté
      const patientData = await getPatientByUserId(user!.id);
      console.log('Données patient récupérées:', patientData);

      if (patientData) {
        setPatient(patientData);
        
        // Récupérer les données du patient
        const [appointmentsData, prescriptionsData, paymentsData] = await Promise.all([
          getAppointments({ patientId: patientData.id }),
          getPrescriptions({ patientId: patientData.id }),
          getPayments({ patientId: patientData.id })
        ]);
        
        console.log('Données récupérées:', {
          appointments: appointmentsData.length,
          prescriptions: prescriptionsData.length,
          payments: paymentsData.length
        });
        
        setAppointments(appointmentsData);
        setPrescriptions(prescriptionsData);
        setPayments(paymentsData);
      } else {
        console.log('Aucun patient trouvé pour userId:', user!.id);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    
    if (user && user.role === 'PATIENT') {
      loadPatientData();
    } else if (user && user.role !== 'PATIENT') {
      console.log('Utilisateur connecté avec un rôle différent:', user.role);
      setLoading(false);
    }
  }, [user, authLoading, loadPatientData]);

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

  const getUpcomingAppointments = () => {
    const now = new Date();
    return appointments
      .filter(appointment => new Date(appointment.date) > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);
  };

  const getRecentPrescriptions = () => {
    return prescriptions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'appointment':
        router.push('/appointment');
        break;
      case 'medical-records':
        router.push('/medical-records');
        break;
      case 'location':
        router.push('/location');
        break;
      case 'emergency':
        // Pour les urgences, on pourrait ouvrir un modal ou rediriger vers une page d'urgence
        window.open('tel:15', '_blank');
        break;
      default:
        break;
    }
  };

  if (authLoading) {
    return (
      <ProtectedLayout>
        <div className="text-center py-20">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4 text-gray-600">Chargement de l&apos;authentification...</p>
        </div>
      </ProtectedLayout>
    );
  }

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="text-center py-20">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4 text-gray-600">Chargement du tableau de bord...</p>
        </div>
      </ProtectedLayout>
    );
  }

  if (!patient) {
    return (
      <ProtectedLayout>
        <div className="text-center py-20">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded max-w-md mx-auto">
            <h3 className="font-bold mb-2">Profil non trouvé</h3>
            <p>Aucun profil patient trouvé pour cet utilisateur</p>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  // DEBUG LOGS pour diagnostic affichage Avatar
  console.log('DEBUG patient:', patient);
  console.log('DEBUG user:', user);
  console.log('DEBUG patient.photo:', patient?.photo);
  console.log('DEBUG user.photo:', user?.photo);
  console.log('DEBUG patient.firstName:', patient?.firstName);
  console.log('DEBUG patient.lastName:', patient?.lastName);

  const upcomingAppointments = getUpcomingAppointments();
  const recentPrescriptions = getRecentPrescriptions();
  const pendingAppointments = appointments.filter(a => a.status === 'PENDING');
  const totalSpent = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <RoleBasedRedirect allowedRoles={['PATIENT']}>
      <ProtectedLayout>
        <div className="max-w-6xl mx-auto pt-24 pb-20 w-full px-2 sm:px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col items-center gap-2 mb-4 max-w-full">
              <Avatar className="w-20 h-20 border-4 border-primary/20 mb-2">
                {patient.photo ? (
                  <AvatarImage src={patient.photo} alt="Photo de profil" />
                ) : (
                  <AvatarFallback className="text-3xl">{patient.firstName?.[0] || patient.email[0] || 'U'}</AvatarFallback>
                )}
              </Avatar>
              <h1 className="text-2xl font-bold text-base-content text-center break-words max-w-full truncate">
                {patient.firstName} {patient.lastName}
              </h1>
              <p className="text-base-content/70 text-center mb-2">Patient</p>
              <div className="flex items-center gap-4 mt-1 flex-wrap justify-center">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-sm break-words max-w-full">{appointments.length} rendez-vous</span>
                </div>
                <div className="flex items-center gap-1">
                  <Pill className="w-4 h-4 text-info" />
                  <span className="text-sm break-words max-w-full">{prescriptions.length} prescriptions</span>
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
                    <p className="text-xs text-base-content/70">Prochains RDV</p>
                    <p className="text-2xl font-bold text-primary">{upcomingAppointments.length}</p>
                  </div>
                  <Calendar className="w-7 h-7 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="card bg-base-100 shadow-md max-w-full">
              <CardContent className="p-4 min-h-[90px]">
                <div className="flex items-center justify-between break-words max-w-full">
                  <div>
                    <p className="text-xs text-base-content/70">En attente</p>
                    <p className="text-2xl font-bold text-warning">{pendingAppointments.length}</p>
                  </div>
                  <Clock className="w-7 h-7 text-warning" />
                </div>
              </CardContent>
            </Card>

            <Card className="card bg-base-100 shadow-md max-w-full">
              <CardContent className="p-4 min-h-[90px]">
                <div className="flex items-center justify-between break-words max-w-full">
                  <div>
                    <p className="text-xs text-base-content/70">Prescriptions</p>
                    <p className="text-2xl font-bold text-success">{prescriptions.length}</p>
                  </div>
                  <Pill className="w-7 h-7 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card className="card bg-base-100 shadow-md max-w-full">
              <CardContent className="p-4 min-h-[90px]">
                <div className="flex items-center justify-between break-words max-w-full">
                  <div>
                    <p className="text-xs text-base-content/70">Total dépensé</p>
                    <p className="text-2xl font-bold text-info">{totalSpent.toFixed(0)} FCFA</p>
                  </div>
                  <CreditCard className="w-7 h-7 text-info" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 w-full">
            {/* Prochains rendez-vous */}
            <Card className="card bg-base-100 shadow-md max-w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 break-words max-w-full truncate">
                  <Calendar className="w-5 h-5" />
                  Prochains rendez-vous
                </CardTitle>
              </CardHeader>
              <CardContent className="break-words max-w-full min-h-[220px]">
                {upcomingAppointments.length === 0 ? (
                  <p className="text-center text-base-content/70 py-8">
                    Aucun rendez-vous à venir
                  </p>
                ) : (
                  <div className="space-y-4">
                    {upcomingAppointments.map((appointment) => (
                      <div key={appointment.id} className="flex items-center justify-between p-4 bg-base-200 rounded-lg break-words max-w-full flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{appointment.medecin.speciality.icon}</div>
                          <div>
                            <p className="font-medium">
                              Dr. {appointment.medecin.firstName} {appointment.medecin.lastName}
                            </p>
                            <p className="text-sm text-base-content/70">
                              {appointment.medecin.speciality.name}
                            </p>
                            <p className="text-sm text-base-content/70">
                              {new Date(appointment.date).toLocaleDateString("fr-FR", { 
                                weekday: "long", 
                                day: "numeric", 
                                month: "long",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </p>
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

            {/* Prescriptions récentes */}
            <Card className="card bg-base-100 shadow-md max-w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 break-words max-w-full truncate">
                  <Pill className="w-5 h-5" />
                  Prescriptions récentes
                </CardTitle>
              </CardHeader>
              <CardContent className="break-words max-w-full min-h-[220px]">
                {recentPrescriptions.length === 0 ? (
                  <p className="text-center text-base-content/70 py-8">
                    Aucune prescription récente
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recentPrescriptions.map((prescription) => (
                      <div key={prescription.id} className="p-4 bg-base-200 rounded-lg break-words max-w-full flex-wrap">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{prescription.medication}</p>
                          {prescription.renewal && (
                            <Badge variant="outline" className="text-xs break-words max-w-full truncate">
                              Renouvellement
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-base-content/70 mb-2">
                          Dosage: {prescription.dosage}
                        </p>
                        <p className="text-xs text-base-content/50">
                          Prescrit le {new Date(prescription.createdAt).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Actions rapides */}
          <div className="mt-8 w-full">
            <Card className="card bg-base-100 shadow-md max-w-full">
              <CardContent className="break-words max-w-full p-4">
                <div className="font-semibold text-base mb-2">Actions rapides</div>
                <div className="grid grid-cols-2 gap-2 w-full">
                  <Button 
                    className="w-full justify-start break-words max-w-full py-2 px-2 text-sm h-10" 
                    variant="outline"
                    onClick={() => handleQuickAction('appointment')}
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    Prendre RDV
                  </Button>
                  <Button 
                    className="w-full justify-start break-words max-w-full py-2 px-2 text-sm h-10" 
                    variant="outline"
                    onClick={() => handleQuickAction('medical-records')}
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Dossier
                  </Button>
                  <Button 
                    className="w-full justify-start break-words max-w-full py-2 px-2 text-sm h-10" 
                    variant="outline"
                    onClick={() => handleQuickAction('location')}
                  >
                    <MapPin className="w-5 h-5 mr-2" />
                    Médecin
                  </Button>
                  <Button 
                    className="w-full justify-start break-words max-w-full py-2 px-2 text-sm h-10" 
                    variant="outline"
                    onClick={() => handleQuickAction('emergency')}
                  >
                    <Phone className="w-5 h-5 mr-2" />
                    Urgences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedLayout>
    </RoleBasedRedirect>
  );
};

export default PatientDashboard; 