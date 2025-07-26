'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Shield, Clock, Star, Award, Settings, Camera, FileText } from 'lucide-react';
import { getUserProfile, updatePatientProfile, updateMedecinProfile, getSpecialities, updateProfilePhoto } from '@/actions';
import type { Patient, Medecin, Speciality, WorkingHour, Appointment, Prescription, HealthData, Review } from '@/types';

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  photo?: string;
  specialityId?: number;
  experience?: string;
  languages?: string;
  education?: string;
  about?: string;
}

interface ProfileData {
  id: number;
  email: string;
  role: 'PATIENT' | 'MEDECIN' | 'DOCTEUR';
  patient?: Patient | null;
  medecin?: Medecin | null;
}

// Type guard pour Medecin
function isMedecinProfile(profile: Patient | Medecin | null | undefined): profile is Medecin {
  return !!profile && (profile as Medecin).reviews_list !== undefined;
}

const ProfileSection = () => {
  const { user, login } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    photo: '',
    specialityId: undefined,
    experience: '',
    languages: '',
    education: '',
    about: ''
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (user?.id) {
        const result = await getUserProfile(user.id);
        if (result.success && result.profile) {
          setProfile(result.profile as ProfileData);
          const profileData = result.profile as ProfileData;
          const userData: Patient | Medecin | undefined = (profileData.patient && profileData.patient.id) ? profileData.patient : (profileData.medecin && profileData.medecin.id ? profileData.medecin : undefined);
          setFormData({
            firstName: userData?.firstName || '',
            lastName: userData?.lastName || '',
            email: userData?.email || '',
            phone: userData?.phone || '',
            address: userData?.address || '',
            city: userData?.city || '',
            photo: userData?.photo || '',
            specialityId: (userData as Medecin)?.specialityId,
            experience: (userData as Medecin)?.experience || '',
            languages: (userData as Medecin)?.languages || '',
            education: (userData as Medecin)?.education || '',
            about: (userData as Medecin)?.about || ''
          });
        }
      }
      setLoading(false);
    };

    const loadSpecialities = async () => {
      if (user?.role === 'MEDECIN' || user?.role === 'DOCTEUR') {
        const result = await getSpecialities();
        if (Array.isArray(result)) {
          setSpecialities(
            result.map((s) => ({
              id: s.id,
              name: s.name,
              icon: s.icon,
              description: s.description ?? undefined,
            }))
          );
        }
      }
    };

    loadProfile();
    loadSpecialities();
  }, [user]);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('[handlePhotoChange] Fichier sélectionné:', file);
    if (!file || !user?.id) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Choisir la bonne route d'upload selon le rôle
      const uploadUrl = user?.role === 'PATIENT' ? '/api/patient/upload' : '/api/upload';
      console.log(`[handlePhotoChange] Envoi du fichier à ${uploadUrl}...`);
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });
      console.log('[handlePhotoChange] Status réponse API:', uploadResponse.status);
      let uploadBody;
      try {
        uploadBody = await uploadResponse.clone().json();
        console.log('[handlePhotoChange] Body réponse API:', uploadBody);
      } catch (err) {
        console.log('[handlePhotoChange] Erreur parsing JSON réponse API:', err);
      }

      if (!uploadResponse.ok) throw new Error('Erreur lors de l\'upload');

      const { url } = uploadBody;
      console.log('[handlePhotoChange] URL reçue:', url);

      // Mettre à jour la photo dans la base de données
      const result = await updateProfilePhoto(user.id, url);
      console.log('[handlePhotoChange] Résultat updateProfilePhoto:', result);

      if (result.success) {
        setFormData(prev => ({ ...prev, photo: url }));
        toast({
          title: "Photo mise à jour",
          description: "Votre photo de profil a été mise à jour avec succès."
        });
        if (user) {
          login({ ...user, photo: url });
        }
        // Recharge le profil pour afficher la nouvelle photo
        const refreshed = await getUserProfile(user.id);
        if (refreshed.success && refreshed.profile) {
          setProfile(refreshed.profile as ProfileData);
        }
      } else {
        throw new Error(result.error);
      }
    } catch (e) {
      console.log('[handlePhotoChange] Erreur catchée:', e);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la photo de profil.",
        variant: "destructive"
      });
    }
  };

  const handleSpecialityChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      specialityId: value ? parseInt(value, 10) : undefined
    }));
  };

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      if (user.role === 'PATIENT') {
        result = await updatePatientProfile(user.id, formData);
      } else {
        result = await updateMedecinProfile(user.id, formData);
      }

      if (result.success) {
        toast({
          title: "Profil mis à jour",
          description: "Vos modifications ont été enregistrées avec succès."
        });
        // Recharge le profil complet après update
        const refreshed = await getUserProfile(user.id);
        if (refreshed.success && refreshed.profile) {
          setProfile(refreshed.profile as ProfileData);
        }
        setIsEditing(false);
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Une erreur est survenue lors de la mise à jour du profil.",
          variant: "destructive"
        });
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour du profil.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const isMedecin = user.role === 'MEDECIN' || user.role === 'DOCTEUR';
  const userProfile = profile?.patient || profile?.medecin;

  // Correction : on récupère le bon profil selon le rôle
  const patientProfile: Patient | undefined = !isMedecin && profile?.patient ? profile.patient : undefined;
  const medecinProfile: Medecin | undefined = isMedecinProfile(userProfile ?? undefined) ? (userProfile as Medecin) : undefined;
  const averageRating =
    isMedecin && medecinProfile && Array.isArray(medecinProfile.reviews_list) && medecinProfile.reviews_list.length
      ? medecinProfile.reviews_list.reduce((acc: number, review: Review) => acc + review.rating, 0) / medecinProfile.reviews_list.length
      : 0;

  // Correction : on choisit la source de la photo et des infos selon le rôle
  const profilePhoto = isMedecin ? medecinProfile?.photo : patientProfile?.photo;
  const profileFirstName = isMedecin ? medecinProfile?.firstName : patientProfile?.firstName;
  const profileLastName = isMedecin ? medecinProfile?.lastName : patientProfile?.lastName;
  const profileEmail = isMedecin ? medecinProfile?.email : patientProfile?.email;

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      {/* En-tête du profil */}
      <div className="text-center mb-10">
        <Badge variant="secondary" className="mb-4 max-w-full break-words truncate">
          {isMedecin ? '👨‍⚕️ Profil Médecin' : '👤 Profil Patient'}
        </Badge>
        <h1 className="text-3xl md:text-4xl font-extrabold text-primary mb-2 break-words max-w-full truncate">
          {isMedecin ? `Dr. ${medecinProfile?.firstName || ''} ${medecinProfile?.lastName || ''}` : `${patientProfile?.firstName || ''} ${patientProfile?.lastName || ''}`}
        </h1>
        <p className="text-muted-foreground break-words max-w-full">
          {isMedecin ? 'Gérez votre profil professionnel et vos informations de contact' : 'Gérez vos informations personnelles et préférences'}
        </p>
      </div>

      {/* Photo de profil et actions rapides */}
      <div className="flex flex-col md:flex-row gap-8 mb-8 max-w-full">
        <Card className="flex-1 max-w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 break-words max-w-full">
              <div className="relative group">
                <Avatar className="w-32 h-32 border-4 border-primary/10">
                  <AvatarImage src={profilePhoto || ''} alt="Photo de profil" />
                  <AvatarFallback className="bg-primary text-primary-content text-4xl">
                    {(profileFirstName?.[0] || '') + (profileLastName?.[0] || '')}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handlePhotoClick}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Camera className="w-6 h-6" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </div>
              <div className="text-center break-words max-w-full">
                <h2 className="text-xl font-semibold">{profileFirstName || ''} {profileLastName || ''}</h2>
                <p className="text-muted-foreground">{profileEmail || ''}</p>
              </div>
              <Badge variant="outline" className="text-base max-w-full break-words truncate">
                {user.role === 'PATIENT' ? 'Patient' : 'Médecin'}
              </Badge>
              {!isEditing && (
                <Button onClick={() => setIsEditing(true)} className="w-full break-words max-w-full">
                  <Settings className="w-4 h-4 mr-2" />
                  Modifier le profil
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Informations principales */}
        <Card className="flex-[2] max-w-full">
          <CardHeader>
            <CardTitle>Informations {isEditing ? 'à modifier' : 'personnelles'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 break-words max-w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Prénom</label>
                  <Input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Votre prénom"
                    className="break-words max-w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nom</label>
                  <Input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Votre nom"
                    className="break-words max-w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={true}
                    placeholder="votre@email.com"
                    className="break-words max-w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Téléphone</label>
                  <Input
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="+241 XX XX XX XX"
                    className="break-words max-w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Adresse</label>
                  <Input
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Votre adresse"
                    className="break-words max-w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ville</label>
                  <Input
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Votre ville"
                    className="break-words max-w-full"
                  />
                </div>
              </div>

              {isMedecin && (
                <>
                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-semibold mb-4">Informations professionnelles</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Spécialité</label>
                        <Select
                          name="specialityId"
                          value={formData.specialityId?.toString()}
                          onValueChange={handleSpecialityChange}
                          disabled={!isEditing}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez une spécialité" />
                          </SelectTrigger>
                          <SelectContent>
                            {specialities.map((spec) => (
                              <SelectItem key={spec.id} value={spec.id.toString()}>
                                {spec.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Expérience</label>
                        <Input
                          name="experience"
                          value={formData.experience}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          placeholder="Années d'expérience"
                          className="break-words max-w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Langues parlées</label>
                        <Input
                          name="languages"
                          value={formData.languages}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          placeholder="Ex: Français, Anglais"
                          className="break-words max-w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Formation</label>
                        <Input
                          name="education"
                          value={formData.education}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          placeholder="Votre formation"
                          className="break-words max-w-full"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">À propos</label>
                    <Textarea
                      name="about"
                      value={formData.about}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="Décrivez votre pratique et votre approche..."
                      rows={4}
                      className="break-words max-w-full"
                    />
                  </div>
                </>
              )}

              {isEditing && (
                <div className="flex gap-2 justify-end break-words max-w-full flex-wrap">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Enregistrement..." : "Enregistrer les modifications"}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Sections spécifiques selon le rôle */}
      {isMedecin ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <Card className="max-w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Horaires de consultation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {medecinProfile && medecinProfile.workingHours && medecinProfile.workingHours.map((hour: WorkingHour) => (
                  <p key={hour.id} className="text-sm">
                    {new Date(2024, 0, hour.dayOfWeek).toLocaleDateString('fr-FR', { weekday: 'long' })}: {hour.startTime} - {hour.endTime}
                  </p>
                )) || <p className="text-sm text-muted-foreground">Aucun horaire défini</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="max-w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Spécialisations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {medecinProfile && medecinProfile.speciality && (
                  <Badge>{medecinProfile.speciality.name}</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="max-w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Évaluations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                {medecinProfile && medecinProfile.reviews_list && (
                  <>
                    <p className="text-3xl font-bold text-primary">{averageRating.toFixed(1)}</p>
                    <p className="text-sm text-muted-foreground">
                      Basé sur {medecinProfile.reviews_list.length} avis
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <Card className="max-w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Prochains rendez-vous
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile?.patient?.appointments && profile.patient.appointments.length > 0 ? (
                <div className="space-y-2">
                  {profile.patient.appointments.slice(0, 3).map((apt: Appointment) => (
                    <div key={apt.id} className="text-sm">
                      <p className="font-medium">{new Date(apt.date).toLocaleDateString('fr-FR')}</p>
                      <p className="text-muted-foreground">{apt.reason || 'Consultation générale'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun rendez-vous prévu</p>
              )}
            </CardContent>
          </Card>

          <Card className="max-w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Ordonnances actives
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile?.patient?.prescriptions && profile.patient.prescriptions.length > 0 ? (
                <div className="space-y-2">
                  {profile.patient.prescriptions.slice(0, 3).map((presc: Prescription) => (
                    <div key={presc.id} className="text-sm">
                      <p className="font-medium">{presc.medication}</p>
                      <p className="text-muted-foreground">{presc.dosage}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune ordonnance active</p>
              )}
            </CardContent>
          </Card>

          <Card className="max-w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Données de santé
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile?.patient?.healthData && profile.patient.healthData.length > 0 ? (
                <div className="space-y-2">
                  {profile.patient.healthData.slice(0, 3).map((data: HealthData) => (
                    <div key={data.id} className="text-sm">
                      <p className="font-medium">{data.label}</p>
                      <p className="text-muted-foreground">{data.value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune donnée de santé enregistrée</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProfileSection; 