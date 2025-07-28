'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, User, Calendar, Eye, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProtectedLayout from '@/components/ProtectedLayout';
import RoleBasedRedirect from '@/components/RoleBasedRedirect';
import { useAuth } from '../../../hooks/useAuth';
import { getMedecinByUserId, getAppointments } from '@/actions';

interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  photo?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  bloodType?: string | null;
  allergies?: string[];
  chronicConditions?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

const MedecinDossierPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder] = useState<'asc' | 'desc'>('asc');

  // Fonction pour charger les patients du médecin
  const loadPatients = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log('Chargement des patients pour le médecin:', user.id);
      
      // Récupérer le médecin connecté
      const medecin = await getMedecinByUserId(user.id);
      if (!medecin) {
        console.log('Aucun médecin trouvé pour userId:', user.id);
        return;
      }
      
      // Récupérer les patients via les rendez-vous du médecin
      const appointments = await getAppointments({ medecinId: medecin.id });
      
      // Extraire les patients uniques
      const uniquePatients = new Map();
      appointments.forEach(appointment => {
        if (appointment.patient && !uniquePatients.has(appointment.patient.id)) {
          uniquePatients.set(appointment.patient.id, {
            id: appointment.patient.id,
            firstName: appointment.patient.firstName,
            lastName: appointment.patient.lastName,
            email: appointment.patient.email,
            phone: appointment.patient.phone,
            photo: appointment.patient.photo,
            address: appointment.patient.address,
            city: appointment.patient.city,
            // Données temporaires pour les champs manquants
            dateOfBirth: null,
            gender: null,
            bloodType: null,
            allergies: [],
            chronicConditions: [],
            emergencyContact: undefined
          });
        }
      });
      
      const patientsList = Array.from(uniquePatients.values());
      console.log('Patients récupérés:', patientsList);
      setPatients(patientsList);
    } catch (error) {
      console.error('Erreur lors du chargement des patients:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Charger les patients au montage du composant
  useEffect(() => {
    if (authLoading) return;
    
    if (user && (user.role === 'MEDECIN' || user.role === 'DOCTEUR')) {
      loadPatients();
    }
  }, [user, authLoading, loadPatients]);

  // Fonction pour filtrer et trier les patients
  const filteredAndSortedPatients = patients
    .filter(patient => {
      const matchesSearch = patient.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           patient.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           patient.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (filterStatus === 'all') return matchesSearch;
      if (filterStatus === 'recent') {
        // Filtrer les patients avec des rendez-vous récents (7 derniers jours)
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 7);
        return matchesSearch; // TODO: Implémenter la logique de filtrage par date
      }
      if (filterStatus === 'active') {
        // Filtrer les patients actifs (avec des rendez-vous confirmés)
        return matchesSearch; // TODO: Implémenter la logique de filtrage par statut
      }
      return matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          break;
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'recent':
          // TODO: Implémenter le tri par date de dernier rendez-vous
          comparison = 0;
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  return (
    <RoleBasedRedirect allowedRoles={['MEDECIN', 'DOCTEUR']}>
      <ProtectedLayout>
        <div className="max-w-6xl mx-auto pt-24 pb-20 w-full px-2 sm:px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col items-center gap-2 mb-4 max-w-full">
              <h1 className="text-3xl font-bold text-base-content text-center break-words max-w-full truncate">
                Dossiers Patients
              </h1>
              <p className="text-base-content/70 text-center mb-4">Consultez et gérez les dossiers de vos patients</p>
              <div className="flex items-center gap-6 mt-2 flex-wrap justify-center">
                <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
                  <User className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-primary">{patients.length} patients</span>
                </div>
                <div className="flex items-center gap-2 bg-info/10 px-4 py-2 rounded-full">
                  <Calendar className="w-5 h-5 text-info" />
                  <span className="text-sm font-medium text-info">Gestion des dossiers</span>
                </div>
              </div>
            </div>
          </div>

          {/* Barre de recherche et filtres */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50 w-4 h-4" />
                <Input
                  placeholder="Rechercher un patient..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les patients</SelectItem>
                  <SelectItem value="active">Patients actifs</SelectItem>
                  <SelectItem value="recent">Consultations récentes</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nom</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="recent">Récents</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Liste des patients */}
          {loading ? (
            <div className="text-center py-20">
              <div className="loading loading-spinner loading-lg text-primary"></div>
              <p className="mt-4 text-base-content/70">Chargement des patients...</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedPatients.map((patient) => (
                <Card key={patient.id} className="group bg-gradient-to-br from-base-100 to-base-200/50 border border-base-300/50 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02]">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="relative flex-shrink-0">
                        <Avatar className="w-14 h-14 border-4 border-primary/20 shadow-lg">
                          {patient.photo && patient.photo.startsWith('http') ? (
                            <AvatarImage src={patient.photo} alt="Photo patient" className="object-cover" />
                          ) : (
                            <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-primary to-primary/80 text-primary-content">
                              {patient.firstName[0]}{patient.lastName[0]}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-success rounded-full border-2 border-base-100"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-base-content mb-1 break-words max-w-full truncate">
                          {patient.firstName} {patient.lastName}
                        </h3>
                        <p className="text-base-content/70 text-sm break-words max-w-full truncate mb-2">
                          {patient.email}
                        </p>
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="default" className="text-xs font-medium">
                            {patient.gender === 'M' ? 'Homme' : 'Femme'}
                          </Badge>
                          {patient.bloodType && (
                            <Badge variant="secondary" className="text-xs font-medium">
                              {patient.bloodType}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-base-content/60 break-words max-w-full">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{patient.address || 'Adresse non renseignée'}</span>
                        </div>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => router.push(`/medecin/dossier/${patient.id}`)}
                        className="flex-shrink-0 shadow-md hover:shadow-lg transition-all duration-200"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Voir dossier
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredAndSortedPatients.length === 0 && !loading && (
                <Card className="bg-gradient-to-br from-base-100 to-base-200/50 border border-base-300/50 shadow-lg">
                  <CardContent className="p-12 text-center">
                    <div className="w-20 h-20 bg-base-300/30 rounded-full flex items-center justify-center mx-auto mb-6">
                      <User className="w-10 h-10 text-base-content/40" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-base-content">Aucun patient trouvé</h3>
                    <p className="text-base-content/70 text-lg">
                      {searchTerm ? 'Aucun patient ne correspond à votre recherche.' : 'Vous n&apos;avez pas encore de patients assignés.'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </ProtectedLayout>
    </RoleBasedRedirect>
  );
};

export default MedecinDossierPage; 