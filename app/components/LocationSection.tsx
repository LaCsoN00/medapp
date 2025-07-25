import { MapPin, Navigation, Phone, Clock, Star, Share2, Copy, Settings, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '../../hooks/useAuth';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { getMedecinByUserId } from '@/actions';
import { Medecin as MedecinType, WorkingHour } from '@/types';

// Définition du type MedicalLocation si non importé
type MedicalLocation = {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: string;
  province?: string | null;
};

// Liste statique des provinces du Gabon
const GABON_PROVINCES: string[] = [
  'Estuaire',
  'Haut-Ogooué',
  'Moyen-Ogooué',
  'Ngounié',
  'Nyanga',
  'Ogooué-Ivindo',
  'Ogooué-Lolo',
  'Ogooué-Maritime',
  'Woleu-Ntem',
];

const LocationSection = () => {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  // Hooks pour médecin, toujours déclarés en haut
  const [medecin, setMedecin] = useState<MedecinType | null>(null);
  const [loadingMedecin, setLoadingMedecin] = useState(false);

  // Ajout pour établissements dynamiques
  const [locations, setLocations] = useState<MedicalLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [errorLocations, setErrorLocations] = useState(false);
  // Province sélectionnée et affichage du sélecteur
  const [selectedProvince, setSelectedProvince] = useState<string>('Estuaire');
  const [showProvinceSelector, setShowProvinceSelector] = useState<boolean>(false);

  useEffect(() => {
    if (user && (user.role === 'MEDECIN' || user.role === 'DOCTEUR')) {
      setLoadingMedecin(true);
      getMedecinByUserId(user.id)
        .then((data) => {
          if (!data) return setMedecin(null);
          setMedecin({
            ...data,
            phone: data.phone ?? undefined,
            address: data.address ?? undefined,
            city: data.city ?? undefined,
            photo: data.photo ?? undefined,
            experience: data.experience ?? undefined,
            education: data.education ?? undefined,
            about: data.about ?? undefined,
            languages: data.languages ?? undefined,
            speciality: data.speciality ? {
              ...data.speciality,
              description: data.speciality.description ?? undefined,
            } : undefined,
          });
        })
        .catch(() => setMedecin(null))
        .finally(() => setLoadingMedecin(false));
    }
    if (user?.role === 'PATIENT') {
      setLoadingLocations(true);
      fetch('/api/locations')
        .then(res => res.json())
        .then((data: MedicalLocation[]) => {
          setLocations(data);
          setErrorLocations(false);
        })
        .catch(() => {
          setLocations([]);
          setErrorLocations(true);
        })
        .finally(() => setLoadingLocations(false));
    }
  }, [user]);

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
    if (loadingMedecin) {
      return (
        <section className="section-padding bg-base-100">
          <div className="container">
            <div className="text-center">
              <div className="loading loading-spinner loading-lg"></div>
              <p className="mt-4">Chargement des informations du cabinet...</p>
            </div>
          </div>
        </section>
      );
    }
    if (!medecin) {
      return (
        <section className="section-padding bg-base-100">
          <div className="container text-center">
            <p className="text-red-500">Impossible de charger les informations du médecin.</p>
          </div>
        </section>
      );
    }

    const handleCopyAddress = () => {
      navigator.clipboard.writeText(medecin.address || 'Non renseigné');
      toast({
        title: "Adresse copiée !",
        description: "L'adresse a été copiée dans le presse-papier.",
      });
    };
    const handleShare = async () => {
      try {
        if (navigator.share) {
          await navigator.share({
            title: `Cabinet du Dr. ${medecin.firstName} ${medecin.lastName}`,
            text: "Retrouvez mon cabinet médical à cette adresse.",
            url: window.location.href,
          });
        } else {
          handleCopyAddress();
        }
      } catch (error) {
        console.error('Erreur lors du partage:', error);
      }
    };

    // Bloc horaires dynamiques
    const horaires = medecin.workingHours && medecin.workingHours.length > 0
      ? medecin.workingHours.map((h: WorkingHour) => `Jour ${h.dayOfWeek}: ${h.startTime} - ${h.endTime}`).join(', ')
      : 'Non renseigné';

    // Bloc services dynamiques
    const services = medecin.speciality?.description
      ? medecin.speciality.description.split(',').map((s: string) => s.trim())
      : ['Non renseigné'];

    // Actions rapides médecin
    const quickActionsMedecin = [
      { icon: <Copy className="w-4 h-4" />, text: "Copier l'adresse", color: 'btn-primary', onClick: handleCopyAddress },
      { icon: <Share2 className="w-4 h-4" />, text: 'Partager mon cabinet', color: 'btn-secondary', onClick: handleShare },
      { icon: <Settings className="w-4 h-4" />, text: 'Paramètres', color: 'btn-outline', onClick: () => window.location.href = '/medecin/settings' },
    ];

    return (
      <section className="section-padding bg-base-100">
        <div className="container">
          {/* Header médecin en haut */}
          <div className="flex flex-col items-center gap-2 mb-8">
            <Avatar className="w-20 h-20 shadow-lg border-4 border-primary/30">
              {medecin.photo ? (
                <AvatarImage src={medecin.photo} alt="Photo de profil" />
              ) : (
                <AvatarFallback className="bg-primary text-primary-content text-3xl font-bold">
                  {medecin.firstName?.[0] || medecin.lastName?.[0] || 'M'}
                </AvatarFallback>
              )}
            </Avatar>
            <span className="font-semibold text-lg text-base-content">Dr {medecin.firstName} {medecin.lastName}</span>
            <Badge variant="outline" className="text-xs px-3 py-1">{medecin.speciality?.name || 'Spécialité non renseignée'}</Badge>
          </div>
          {/* Header Section */}
          <div className="text-center mb-8">
            <Badge variant="secondary" className="badge-lg mb-4 max-w-full break-words truncate">
              📍 Mon cabinet
            </Badge>
            <h2 className="heading-responsive font-bold text-base-content mb-4 break-words max-w-full truncate">
              Présence en ligne de votre cabinet
            </h2>
            <p className="text-responsive text-base-content/70 max-w-full mx-auto break-words">
              Retrouvez et partagez facilement toutes les informations de votre cabinet médical avec vos patients.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
            {/* Colonne latérale médecin */}
            <div className="lg:col-span-1 order-first lg:order-first flex flex-col gap-6">
              {/* Position actuelle */}
              <Card className="card bg-base-100 shadow-md max-w-full">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <MapPin className="w-5 h-5 mr-2 text-primary" />
                    Adresse du cabinet
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 break-words max-w-full">
                    <div className="flex items-center text-sm text-base-content/70">
                      <MapPin className="w-4 h-4 mr-2" />
                      {medecin.address || 'Non renseignée'}
                    </div>
                    <Button className="btn btn-primary w-full" onClick={handleCopyAddress}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copier l&apos;adresse
                    </Button>
                  </div>
                </CardContent>
              </Card>
              {/* Actions rapides médecin */}
              <Card className="card bg-base-100 shadow-md max-w-full">
                <CardHeader>
                  <CardTitle className="text-lg">Actions rapides</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 break-words max-w-full">
                    {quickActionsMedecin.map((action, index) => (
                      <Button key={index} className={`btn ${action.color} w-full justify-start`} onClick={action.onClick}>
                        {action.icon}
                        <span className="ml-2">{action.text}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* Colonne principale médecin : fiche cabinet */}
            <div className="lg:col-span-2 space-y-6 order-2 max-w-full">
              <Card className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow max-w-full">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4 break-words max-w-full">
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar className="w-16 h-16 border-2 border-primary/20">
                        {medecin.photo ? (
                          <AvatarImage src={medecin.photo} alt="Photo de profil" />
                        ) : (
                          <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-primary-content font-bold">
                            {medecin.firstName?.[0] || medecin.lastName?.[0] || 'M'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-semibold text-base-content text-lg mb-1 flex items-center gap-2 break-words max-w-full truncate">
                          Dr {medecin.firstName} {medecin.lastName}
                          {medecin.speciality?.name && (
                            <Badge variant="outline" className="mb-0 ml-2 text-xs flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-primary" />
                              {medecin.speciality.name}
                            </Badge>
                          )}
                        </h4>
                        <div className="flex flex-col gap-1 mt-1">
                          <div className="flex items-center text-sm text-base-content/80 break-words max-w-full">
                            <MapPin className="w-4 h-4 mr-2 text-primary" />
                            <span>{medecin.address || 'Non renseignée'}</span>
                          </div>
                          <div className="flex items-center text-sm text-base-content/80 break-words max-w-full">
                            <Phone className="w-4 h-4 mr-2 text-primary" />
                            <span>{medecin.phone || 'Non renseigné'}</span>
                          </div>
                          <div className="flex items-center text-sm text-base-content/80 break-words max-w-full">
                            <Clock className="w-4 h-4 mr-2 text-primary" />
                            <span>{horaires}</span>
                          </div>
                          {medecin.email && (
                            <div className="flex items-center text-sm text-base-content/80 break-words max-w-full">
                              <Mail className="w-4 h-4 mr-2 text-primary" />
                              <span>{medecin.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Note par étoiles si rating dispo */}
                    {typeof medecin.rating === 'number' && (
                      <div className="flex flex-col items-end min-w-[70px]">
                        <div className="flex items-center gap-0.5 mb-1">
                          {[1,2,3,4,5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${medecin.rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} `}
                              fill={medecin.rating >= star ? '#facc15' : 'none'}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-base-content/70 font-medium">{medecin.rating.toFixed(1)} / 5</span>
                      </div>
                    )}
                  </div>
                  {/* Services proposés */}
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-base-content mb-2 flex items-center gap-2 break-words max-w-full">
                      <Badge variant="secondary" className="px-2 py-1"><Clock className="w-3 h-3 mr-1" />Services</Badge>
                      <span>proposés :</span>
                    </h5>
                    <div className="flex flex-wrap gap-1 break-words max-w-full">
                      {services.map((service: string, serviceIndex: number) => (
                        <Badge key={serviceIndex} variant="outline" className="text-xs flex items-center gap-1">
                          <span>•</span> {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {/* Accès et transports */}
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-base-content mb-2 flex items-center gap-2 break-words max-w-full">
                      <Badge variant="secondary" className="px-2 py-1"><Navigation className="w-3 h-3 mr-1" />Accès</Badge>
                      <span>et transports :</span>
                    </h5>
                    <div className="space-y-2 text-gray-600 break-words max-w-full">
                      <p>{medecin.city ? `Ville : ${medecin.city}` : 'Ville non renseignée'}</p>
                      <p>🚗 Parking {medecin.address ? 'disponible' : 'non renseigné'}</p>
                      <p>♿ Accès PMR</p>
                    </div>
                  </div>
                  {/* Boutons d'action */}
                  <div className="flex gap-2 mt-4 break-words max-w-full flex-wrap">
                    <Button className="btn btn-primary flex-1" onClick={handleShare}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Partager
                    </Button>
                    <Button variant="outline" className="btn btn-outline flex-1" onClick={handleCopyAddress}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copier l&apos;adresse
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          {/* Lien vers la carte complète */}
          <div className="text-center mt-8 break-words max-w-full">
            <Link href="/location">
              <Button className="btn btn-outline btn-lg" type="button">
                <MapPin className="w-5 h-5 mr-2" />
                Voir la carte des établissements
              </Button>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (user.role === 'PATIENT') {
    const quickActions = [
      { icon: <MapPin className="w-4 h-4" />, text: 'Urgences les plus proches', color: 'btn-error' },
      { icon: <Phone className="w-4 h-4" />, text: 'Pharmacies de garde', color: 'btn-warning' },
      { icon: <Clock className="w-4 h-4" />, text: 'Ouvert maintenant', color: 'btn-success' },
    ];

    // --- SOLUTION PROPRE (filtrage par province activé et types anglais inclus) ---
    const selectedProvinceUpper = selectedProvince.toUpperCase();
    // --- Filtrage séparé ---
    const hospitals = locations.filter((loc) => {
      const type = loc.type?.toUpperCase() || '';
      const province = (loc.province || '').toUpperCase();
      return (
        (type.includes('HOPITAL') || type.includes('HOSPITAL')) &&
        province === selectedProvinceUpper
      );
    });
    const clinics = locations.filter((loc) => {
      const type = loc.type?.toUpperCase() || '';
      const province = (loc.province || '').toUpperCase();
      return (
        (type.includes('CLINIQUE') || type.includes('CLINIC')) &&
        province === selectedProvinceUpper
      );
    });
    const pharmacies = locations.filter((loc) => {
      const type = loc.type?.toUpperCase() || '';
      const province = (loc.province || '').toUpperCase();
      return (
        (type.includes('PHARMACIE') || type.includes('PHARMACY')) &&
        province === selectedProvinceUpper
      );
    });

    return (
      <section className="section-padding bg-base-100">
        <div className="container">
          {/* Infos patient en haut */}
          <div className="flex flex-col items-center gap-2 mb-8">
            <Avatar className="w-20 h-20 shadow-lg border-4 border-primary/30">
              {user.photo ? (
                <AvatarImage src={user.photo} alt="Photo de profil" />
              ) : (
                <AvatarFallback className="bg-primary text-primary-content text-3xl font-bold">
                  {user.firstName?.[0] || user.lastName?.[0] || 'P'}
                </AvatarFallback>
              )}
            </Avatar>
            <span className="font-semibold text-lg text-base-content">{user.firstName} {user.lastName}</span>
            <Badge variant="outline" className="text-xs px-3 py-1">Patient</Badge>
          </div>

          {/* Header Section */}
          <div className="text-center mb-8">
            <Badge variant="secondary" className="badge-lg mb-4 max-w-full break-words truncate">
              📍 Géolocalisation
            </Badge>
            <h2 className="heading-responsive font-bold text-base-content mb-4 break-words max-w-full truncate">
              Structures de santé à proximité
            </h2>
            <p className="text-responsive text-base-content/70 max-w-full mx-auto break-words">
              Trouvez rapidement les cliniques, hôpitaux, pharmacies et laboratoires les plus proches avec leurs services disponibles.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
            {/* Bloc position et actions rapides */}
            <div className="lg:col-span-1 order-first lg:order-first flex flex-col gap-6">
              {/* Position actuelle */}
              <Card className="card bg-base-100 shadow-md max-w-full">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <MapPin className="w-5 h-5 mr-2 text-primary" />
                    Votre position
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 break-words max-w-full">
                    <div className="flex items-center text-sm text-base-content/70">
                      <MapPin className="w-4 h-4 mr-2" />
                      Libreville, Gabon
                    </div>
                    <Button className="btn btn-primary w-full" onClick={() => setShowProvinceSelector(true)}>
                      <Navigation className="w-4 h-4 mr-2" />
                      Actualiser ma position
                    </Button>
                    {/* Affichage de la province sélectionnée */}
                    <div className="mt-2 text-center">
                      <Badge variant="secondary">{selectedProvince}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions rapides */}
              <Card className="card bg-base-100 shadow-md max-w-full">
                <CardHeader>
                  <CardTitle className="text-lg">Recherche rapide</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 break-words max-w-full">
                    {/* Les actions rapides restent inchangées */}
                    {quickActions.map((action, index) => (
                      <Button key={index} className={`btn ${action.color} w-full justify-start`}>
                        {action.icon}
                        <span className="ml-2">{action.text}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Listes établissements dynamiques */}
            <div className="lg:col-span-2 space-y-6 order-2 max-w-full">
              <Tabs defaultValue="hospitals" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="hospitals">Hôpitaux</TabsTrigger>
                  <TabsTrigger value="pharmacies">Pharmacies</TabsTrigger>
                  <TabsTrigger value="clinics">Cliniques</TabsTrigger>
                </TabsList>

                {/* Bloc de chargement/erreur */}
                {loadingLocations ? (
                  <div className="text-center py-8 text-base-content/70">Chargement des établissements...</div>
                ) : errorLocations ? (
                  <div className="text-center py-8 text-red-500">Erreur lors du chargement des établissements.</div>
                ) : (
                  <>
                    <TabsContent value="hospitals" className="space-y-4">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold text-base-content">Hôpitaux et cliniques</h3>
                        <Badge variant="outline" className="animate-pulse">
                          {hospitals.length} établissements
                        </Badge>
                      </div>
                      <div className="space-y-4">
                        {hospitals.length === 0 ? (
                          <div className="text-base-content/60">Aucun hôpital ou clinique trouvé.</div>
                        ) : hospitals.map((hospital, index) => (
                          <Card key={hospital.id || index} className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow max-w-full">
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-4 break-words max-w-full">
                                <div className="flex items-center gap-4 flex-1">
                                  <Avatar className="w-12 h-12 border-2 border-primary/20">
                                    <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-primary-content font-bold">
                                      {hospital.name?.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-base-content text-lg mb-1 flex items-center gap-2 break-words max-w-full truncate">
                                      {hospital.name}
                                      {hospital.type && (
                                        <Badge variant="outline" className="mb-0 ml-2 text-xs flex items-center gap-1">
                                          <MapPin className="w-3 h-3 text-primary" />
                                          {hospital.type}
                                        </Badge>
                                      )}
                                    </h4>
                                    <div className="flex flex-col gap-1 mt-1">
                                      <div className="flex items-center text-sm text-base-content/80 break-words max-w-full">
                                        <MapPin className="w-4 h-4 mr-2 text-primary" />
                                        <span>{hospital.address}</span>
                                      </div>
                                      {/* Pas de distance ni d'heures dans la base, à adapter si besoin */}
                                      <div className="flex items-center text-sm text-secondary">
                                        <Navigation className="w-4 h-4 mr-2 text-secondary" />
                                        <span>-</span>
                                      </div>
                                      <div className="flex items-center text-sm text-base-content/80 break-words max-w-full">
                                        <Clock className="w-4 h-4 mr-2 text-primary" />
                                        <span className="font-medium">-</span>
                                      </div>
                                      {/* Pas de téléphone dans la base, à adapter si besoin */}
                                    </div>
                                  </div>
                                </div>
                                {/* Note par étoiles - à adapter si rating dispo */}
                              </div>
                              {/* Services proposés - à adapter si description/services dispo */}
                              <div className="mb-4">
                                <h5 className="text-sm font-medium text-base-content mb-2 flex items-center gap-2 break-words max-w-full">
                                  <Badge variant="secondary" className="px-2 py-1"><Clock className="w-3 h-3 mr-1" />Services</Badge>
                                  <span>disponibles :</span>
                                </h5>
                                <div className="flex flex-wrap gap-1 break-words max-w-full">
                                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                                    <span>•</span> -
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-2 break-words max-w-full flex-wrap">
                                <Button className="btn btn-primary flex-1">
                                  <Navigation className="w-4 h-4 mr-2" />
                                  Directions
                                </Button>
                                <Button variant="outline" className="btn btn-outline flex-1">
                                  <Phone className="w-4 h-4 mr-2" />
                                  Appeler
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>
                    <TabsContent value="pharmacies" className="space-y-4">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold text-base-content">Pharmacies</h3>
                        <Badge variant="outline" className="animate-pulse">
                          {pharmacies.length} pharmacies
                        </Badge>
                      </div>
                      <div className="space-y-4">
                        {pharmacies.length === 0 ? (
                          <div className="text-base-content/60">Aucune pharmacie trouvée.</div>
                        ) : pharmacies.map((pharmacy, index) => (
                          <Card key={pharmacy.id || index} className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow max-w-full">
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-4 break-words max-w-full">
                                <div className="flex items-center gap-4 flex-1">
                                  <Avatar className="w-12 h-12 border-2 border-primary/20">
                                    <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-primary-content font-bold">
                                      {pharmacy.name?.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-base-content text-lg mb-1 flex items-center gap-2 break-words max-w-full truncate">
                                      {pharmacy.name}
                                    </h4>
                                    <div className="flex flex-col gap-1 mt-1">
                                      <div className="flex items-center text-sm text-base-content/80 break-words max-w-full">
                                        <MapPin className="w-4 h-4 mr-2 text-primary" />
                                        <span>{pharmacy.address}</span>
                                      </div>
                                      <div className="flex items-center text-sm text-secondary">
                                        <Navigation className="w-4 h-4 mr-2 text-secondary" />
                                        <span>-</span>
                                      </div>
                                      <div className="flex items-center text-sm text-base-content/80 break-words max-w-full">
                                        <Clock className="w-4 h-4 mr-2 text-primary" />
                                        <span className="font-medium">-</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="mb-4">
                                <h5 className="text-sm font-medium text-base-content mb-2 flex items-center gap-2 break-words max-w-full">
                                  <Badge variant="secondary" className="px-2 py-1"><Clock className="w-3 h-3 mr-1" />Services</Badge>
                                  <span>disponibles :</span>
                                </h5>
                                <div className="flex flex-wrap gap-1 break-words max-w-full">
                                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                                    <span>•</span> -
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-2 break-words max-w-full flex-wrap">
                                <Button className="btn btn-primary flex-1">
                                  <Navigation className="w-4 h-4 mr-2" />
                                  Directions
                                </Button>
                                <Button variant="outline" className="btn btn-outline flex-1">
                                  <Phone className="w-4 h-4 mr-2" />
                                  Appeler
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>
                    <TabsContent value="clinics" className="space-y-4">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold text-base-content">Cliniques</h3>
                        <Badge variant="outline" className="animate-pulse">
                          {clinics.length} cliniques
                        </Badge>
                      </div>
                      <div className="space-y-4">
                        {clinics.length === 0 ? (
                          <div className="text-base-content/60">Aucune clinique trouvée.</div>
                        ) : clinics.map((clinic, index) => (
                          <Card key={clinic.id || index} className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow max-w-full">
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-4 break-words max-w-full">
                                <div className="flex items-center gap-4 flex-1">
                                  <Avatar className="w-12 h-12 border-2 border-primary/20">
                                    <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-primary-content font-bold">
                                      {clinic.name?.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-base-content text-lg mb-1 flex items-center gap-2 break-words max-w-full truncate">
                                      {clinic.name}
                                    </h4>
                                    <div className="flex flex-col gap-1 mt-1">
                                      <div className="flex items-center text-sm text-base-content/80 break-words max-w-full">
                                        <MapPin className="w-4 h-4 mr-2 text-primary" />
                                        <span>{clinic.address}</span>
                                      </div>
                                      <div className="flex items-center text-sm text-secondary">
                                        <Navigation className="w-4 h-4 mr-2 text-secondary" />
                                        <span>-</span>
                                      </div>
                                      <div className="flex items-center text-sm text-base-content/80 break-words max-w-full">
                                        <Clock className="w-4 h-4 mr-2 text-primary" />
                                        <span className="font-medium">-</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="mb-4">
                                <h5 className="text-sm font-medium text-base-content mb-2 flex items-center gap-2 break-words max-w-full">
                                  <Badge variant="secondary" className="px-2 py-1"><Clock className="w-3 h-3 mr-1" />Services</Badge>
                                  <span>disponibles :</span>
                                </h5>
                                <div className="flex flex-wrap gap-1 break-words max-w-full">
                                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                                    <span>•</span> -
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-2 break-words max-w-full flex-wrap">
                                <Button className="btn btn-primary flex-1">
                                  <Navigation className="w-4 h-4 mr-2" />
                                  Directions
                                </Button>
                                <Button variant="outline" className="btn btn-outline flex-1">
                                  <Phone className="w-4 h-4 mr-2" />
                                  Appeler
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>
                  </>
                )}
              </Tabs>
            </div>
          </div>
        </div>
        {/* Sélecteur de province (modal simple) */}
        {showProvinceSelector && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(30,41,59,0.25)',
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }} onClick={() => setShowProvinceSelector(false)}>
            <div style={{
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              padding: 32,
              minWidth: 280,
              maxWidth: '90vw',
              zIndex: 1400,
            }} onClick={e => e.stopPropagation()}>
              <h3 style={{fontWeight: 700, fontSize: 20, marginBottom: 18, textAlign: 'center'}}>Sélectionnez votre province</h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                {GABON_PROVINCES.map((province: string) => (
                  <Button
                    key={province}
                    className={`w-full ${selectedProvince === province ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => {
                      setSelectedProvince(province);
                      setShowProvinceSelector(false);
                    }}
                  >
                    {province}
                  </Button>
                ))}
              </div>
              <Button className="w-full mt-6" variant="outline" onClick={() => setShowProvinceSelector(false)}>Annuler</Button>
            </div>
          </div>
        )}
      </section>
    );
  }
};

export default LocationSection;