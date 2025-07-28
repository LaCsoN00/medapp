"use client";

import { useAuth } from "@/../hooks/useAuth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedLayout from "@/components/ProtectedLayout";
import RoleBasedRedirect from "@/components/RoleBasedRedirect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Check, Users, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getMedicalLocations, getPatientByUserId } from "@/actions";
import { Input } from "@/components/ui/input";

interface MedicalLocation {
  id: number;
  name: string;
  address: string;
  type: string;
}

export default function SubscribePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [locations, setLocations] = useState<MedicalLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'semiannual' | 'annual'>('monthly');
  const [selectedType, setSelectedType] = useState<'INDIVIDUAL' | 'FAMILY' | 'STRUCTURE'>('INDIVIDUAL');
  const [subscribing, setSubscribing] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const locs = await getMedicalLocations();
        setLocations(locs);
      } catch (error) {
        console.error("Erreur lors du chargement des établissements:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  // Remplissage automatique du détail de la structure
  useEffect(() => {
    if (selectedLocationId) {
      const found = locations.find(l => l.id === selectedLocationId);
      if (found) {
        // setStructureDetails(`${found.name} - ${found.address}`); // This line is removed
      }
    }
  }, [selectedLocationId, locations]);

  const handleSubscribe = async () => {
    if (!selectedLocationId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un établissement",
        variant: "destructive"
      });
      return;
    }

    setSubscribing(true);
    try {
      // Calculer la date de fin en fonction du plan
      const endDate: Date | null = new Date();
      if (selectedPlan === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (selectedPlan === 'semiannual') {
        endDate.setMonth(endDate.getMonth() + 6);
      } else if (selectedPlan === 'annual') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const patient = await getPatientByUserId(user!.id);
      if (!patient) {
        throw new Error("Patient non trouvé");
      }

      // Préparer les données spécifiques au type d'abonnement
      let familyMembersArray: number[] | undefined;
      if (selectedType === 'FAMILY' && familyMembers.trim()) {
        try {
          // Format attendu: "123, 456, 789" (IDs séparés par des virgules)
          familyMembersArray = familyMembers
            .split(',')
            .map(id => id.trim())
            .filter(id => id)
            .map(id => parseInt(id, 10));
            } catch {
      throw new Error("Format des membres de famille invalide. Utilisez des IDs séparés par des virgules.");
    }
      }

      // Appeler l'API pour créer l'abonnement
      const response = await fetch('/api/patient/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user!.id,
          medicalLocationId: selectedLocationId,
          type: selectedType,
          endDate: endDate.toISOString(),
          familyMembers: familyMembersArray
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la souscription");
      }

      toast({
        title: "Abonnement réussi",
        description: "Votre abonnement a été activé avec succès",
        variant: "default"
      });

      // Rediriger vers le tableau de bord
      setTimeout(() => {
        router.push("/patient/dashboard");
      }, 2000);
    } catch (error: unknown) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de la souscription",
        variant: "destructive"
      });
    } finally {
      setSubscribing(false);
    }
  };

  const planFeatures = {
    monthly: {
      price: {
        INDIVIDUAL: "10 000 FCFA",
        FAMILY: "25 000 FCFA",
        STRUCTURE: "50 000 FCFA"
      },
      duration: "1 mois",
      features: {
        INDIVIDUAL: [
          "Accès illimité aux dossiers médicaux",
          "Gestion des ordonnances",
          "Examens médicaux",
          "Suivi des données de santé"
        ],
        FAMILY: [
          "Tous les avantages de l'abonnement individuel",
          "Jusqu'à 5 membres de famille",
          "Gestion centralisée des dossiers",
          "Partage des résultats entre membres"
        ],
        STRUCTURE: [
          "Tous les avantages de l'abonnement famille",
          "Jusqu'à 20 membres",
          "Tableau de bord administratif",
          "Support prioritaire"
        ]
      }
    },
    semiannual: {
      price: {
        INDIVIDUAL: "50 000 FCFA",
        FAMILY: "120 000 FCFA",
        STRUCTURE: "250 000 FCFA"
      },
      duration: "6 mois",
      features: {
        INDIVIDUAL: [
          "Accès illimité aux dossiers médicaux",
          "Gestion des ordonnances",
          "Examens médicaux",
          "Suivi des données de santé",
          "Économie de 16% sur l'abonnement mensuel"
        ],
        FAMILY: [
          "Tous les avantages de l'abonnement individuel",
          "Jusqu'à 5 membres de famille",
          "Gestion centralisée des dossiers",
          "Partage des résultats entre membres",
          "Économie de 20% sur l'abonnement mensuel"
        ],
        STRUCTURE: [
          "Tous les avantages de l'abonnement famille",
          "Jusqu'à 20 membres",
          "Tableau de bord administratif",
          "Support prioritaire",
          "Économie de 16% sur l'abonnement mensuel"
        ]
      }
    },
    annual: {
      price: {
        INDIVIDUAL: "90 000 FCFA",
        FAMILY: "220 000 FCFA",
        STRUCTURE: "450 000 FCFA"
      },
      duration: "1 an",
      features: {
        INDIVIDUAL: [
          "Accès illimité aux dossiers médicaux",
          "Gestion des ordonnances",
          "Examens médicaux",
          "Suivi des données de santé",
          "Économie de 25% sur l'abonnement mensuel"
        ],
        FAMILY: [
          "Tous les avantages de l'abonnement individuel",
          "Jusqu'à 5 membres de famille",
          "Gestion centralisée des dossiers",
          "Partage des résultats entre membres",
          "Économie de 26% sur l'abonnement mensuel"
        ],
        STRUCTURE: [
          "Tous les avantages de l'abonnement famille",
          "Jusqu'à 20 membres",
          "Tableau de bord administratif",
          "Support prioritaire",
          "Économie de 25% sur l'abonnement mensuel"
        ]
      }
    }
  };

  // Regroupement des établissements par type
  const groupedLocations = locations.reduce((acc: Record<string, MedicalLocation[]>, loc) => {
    if (!acc[loc.type]) acc[loc.type] = [];
    acc[loc.type].push(loc);
    return acc;
  }, {});

  const categoryIcons: Record<string, string> = {
    hospital: '🏥',
    clinic: '🏨',
    doctors: '🩺',
  };

  // Afficher un loader pendant la vérification d'authentification
  if (isLoading) {
    return (
      <ProtectedLayout>
        <div className="text-center py-20">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4 text-base-content/70">Chargement...</p>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <RoleBasedRedirect allowedRoles={['PATIENT']}>
      <ProtectedLayout>
        <div className="pt-24 pb-24">
          <section className="section-padding bg-base-100">
            <div className="container">
              <div className="text-center mb-12">
                <Badge variant="secondary" className="badge-lg mb-4">💳 Abonnement</Badge>
                <h2 className="heading-responsive font-bold text-base-content mb-4">
                  Souscrivez à un abonnement
                </h2>
                <p className="text-responsive text-base-content/70 max-w-2xl mx-auto">
                  Accédez à toutes les fonctionnalités sans restriction avec un abonnement adapté à vos besoins.
                </p>
              </div>

              {/* Type d'abonnement */}
              <div className="mb-12">
                <h3 className="text-2xl font-bold text-center mb-8">Choisissez votre type d&apos;abonnement</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Abonnement individuel */}
                  <Card className={`bg-base-100 shadow-md transition-all ${selectedType === 'INDIVIDUAL' ? 'ring-2 ring-primary' : ''}`}>
                    <CardHeader className="text-center pb-2">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle>Individuel</CardTitle>
                      <CardDescription>
                        Pour un seul patient
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-base-content/70 text-center mb-4">
                        Idéal pour un usage personnel avec un accès complet aux fonctionnalités.
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        className={`w-full ${selectedType === 'INDIVIDUAL' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setSelectedType('INDIVIDUAL')}
                      >
                        {selectedType === 'INDIVIDUAL' ? 'Sélectionné' : 'Choisir'}
                      </Button>
                    </CardFooter>
                  </Card>

                  {/* Abonnement famille */}
                  <Card className={`bg-base-100 shadow-md transition-all ${selectedType === 'FAMILY' ? 'ring-2 ring-primary' : ''}`}>
                    <CardHeader className="text-center pb-2">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle>Famille</CardTitle>
                      <CardDescription>
                        Jusqu&apos;à 5 membres
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-base-content/70 text-center mb-4">
                        Parfait pour les familles souhaitant gérer ensemble leurs dossiers médicaux.
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        className={`w-full ${selectedType === 'FAMILY' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setSelectedType('FAMILY')}
                      >
                        {selectedType === 'FAMILY' ? 'Sélectionné' : 'Choisir'}
                      </Button>
                    </CardFooter>
                  </Card>

                  {/* Abonnement structure */}
                  <Card className={`bg-base-100 shadow-md transition-all ${selectedType === 'STRUCTURE' ? 'ring-2 ring-primary' : ''}`}>
                    <CardHeader className="text-center pb-2">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <Building className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle>Structure</CardTitle>
                      <CardDescription>
                        Pour entreprises et organisations
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-base-content/70 text-center mb-4">
                        Solution complète pour les entreprises gérant la santé de leurs employés.
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        className={`w-full ${selectedType === 'STRUCTURE' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setSelectedType('STRUCTURE')}
                      >
                        {selectedType === 'STRUCTURE' ? 'Sélectionné' : 'Choisir'}
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </div>

              {/* Informations spécifiques au type d'abonnement */}
              {selectedType === 'FAMILY' && (
                <div className="mb-8">
                  <h4 className="text-lg font-semibold mb-2">Membres de la famille</h4>
                  <p className="text-sm text-base-content/70 mb-2">
                    Entrez les identifiants des membres de votre famille (maximum 5), séparés par des virgules.
                  </p>
                  <Input
                    type="text"
                    placeholder="Ex: 123, 456, 789"
                    value={familyMembers}
                    onChange={(e) => setFamilyMembers(e.target.value)}
                    className="mb-2"
                  />
                  <p className="text-xs text-base-content/50">
                    Vous pouvez trouver les identifiants dans les profils des membres de votre famille.
                  </p>
                </div>
              )}

              {/* Plans d'abonnement */}
              <h3 className="text-2xl font-bold text-center mb-8">Choisissez votre plan</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {/* Plan mensuel */}
                <Card className={`bg-base-100 shadow-md transition-all ${selectedPlan === 'monthly' ? 'ring-2 ring-primary' : ''}`}>
                  <CardHeader className="text-center pb-2">
                    <CardTitle>Mensuel</CardTitle>
                    <CardDescription>
                      <span className="text-3xl font-bold text-primary">{planFeatures.monthly.price[selectedType]}</span>
                      <span className="text-base-content/70"> / mois</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {planFeatures.monthly.features[selectedType].map((feature: string, index: number) => (
                        <li key={index} className="flex items-center gap-2">
                          <Check className="w-5 h-5 text-green-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className={`w-full ${selectedPlan === 'monthly' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setSelectedPlan('monthly')}
                    >
                      {selectedPlan === 'monthly' ? 'Sélectionné' : 'Choisir'}
                    </Button>
                  </CardFooter>
                </Card>

                {/* Plan semestriel */}
                <Card className={`bg-base-100 shadow-md transition-all ${selectedPlan === 'semiannual' ? 'ring-2 ring-primary' : ''}`}>
                  <CardHeader className="text-center pb-2">
                    <CardTitle>Semestriel</CardTitle>
                    <Badge className="bg-blue-500 mt-2 inline-block">Populaire</Badge>
                    <CardDescription>
                      <span className="text-3xl font-bold text-primary">{planFeatures.semiannual.price[selectedType]}</span>
                      <span className="text-base-content/70"> / 6 mois</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {planFeatures.semiannual.features[selectedType].map((feature: string, index: number) => (
                        <li key={index} className="flex items-center gap-2">
                          <Check className="w-5 h-5 text-green-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className={`w-full ${selectedPlan === 'semiannual' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setSelectedPlan('semiannual')}
                    >
                      {selectedPlan === 'semiannual' ? 'Sélectionné' : 'Choisir'}
                    </Button>
                  </CardFooter>
                </Card>

                {/* Plan annuel */}
                <Card className={`bg-base-100 shadow-md transition-all ${selectedPlan === 'annual' ? 'ring-2 ring-primary' : ''}`}>
                  <CardHeader className="text-center pb-2">
                    <CardTitle>Annuel</CardTitle>
                    <Badge className="bg-green-500 mt-2 inline-block">Meilleure valeur</Badge>
                    <CardDescription>
                      <span className="text-3xl font-bold text-primary">{planFeatures.annual.price[selectedType]}</span>
                      <span className="text-base-content/70"> / an</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {planFeatures.annual.features[selectedType].map((feature: string, index: number) => (
                        <li key={index} className="flex items-center gap-2">
                          <Check className="w-5 h-5 text-green-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className={`w-full ${selectedPlan === 'annual' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setSelectedPlan('annual')}
                    >
                      {selectedPlan === 'annual' ? 'Sélectionné' : 'Choisir'}
                    </Button>
                  </CardFooter>
                </Card>
              </div>

              {/* Sélection de l'établissement */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4">Sélectionnez un établissement</h3>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="loading loading-spinner loading-lg mx-auto"></div>
                    <p className="mt-4">Chargement des établissements...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedLocations)
                      .filter(([type]) => type.toLowerCase() !== 'pharmacy' && type.toLowerCase() !== 'pharmacie')
                      .map(([type, locs]) => (
                        <div key={type} className="mb-8">
                          <h4 className="font-semibold text-lg text-primary flex items-center gap-2 mb-2 mt-4">
                            <span className="text-2xl">{categoryIcons[type.toLowerCase()] || '🏢'}</span>
                            <span className="capitalize">{type}</span>
                          </h4>
                          <select
                            className="select select-bordered w-full mb-2 rounded-xl shadow focus:ring-2 focus:ring-primary/50 focus:border-primary px-4 py-3 text-base bg-white text-gray-900 transition-all duration-150"
                            value={selectedLocationId ?? ''}
                            onChange={e => setSelectedLocationId(Number(e.target.value))}
                          >
                            <option value="" disabled className="text-gray-400">Sélectionner un établissement</option>
                            {locs.map(location => (
                              <option key={location.id} value={location.id} className="text-base py-2 text-gray-900 bg-white whitespace-normal break-words">
                                {location.name} - {location.address}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Bouton de souscription */}
              <div className="flex justify-center mt-8">
                <Button 
                  className="btn btn-primary btn-lg px-8" 
                  onClick={handleSubscribe}
                  disabled={!selectedLocationId || subscribing}
                >
                  {subscribing ? 'Traitement en cours...' : 'Souscrire maintenant'}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </ProtectedLayout>
    </RoleBasedRedirect>
  );
} 