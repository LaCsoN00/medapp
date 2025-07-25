'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Shield, Stethoscope, Heart } from 'lucide-react';
import { registerUser, createPatient, createMedecin, getSpecialities } from '@/actions';
import toast from 'react-hot-toast';

interface Speciality {
  id: number;
  name: string;
  icon: string;
  description: string | null;
  _count?: {
    medecins: number;
  };
}

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: null as 'PATIENT' | 'MEDECIN' | null,
    // Champs spécifiques au médecin
    specialityId: '',
    experience: '',
    city: '',
    address: '',
    languages: ''
  });
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Charger les spécialités au montage du composant
  useEffect(() => {
    const loadSpecialities = async () => {
      try {
        const specialitiesData = await getSpecialities();
        setSpecialities(specialitiesData);
      } catch (error) {
        console.error('Erreur lors du chargement des spécialités:', error);
      }
    };
    loadSpecialities();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    // Validation pour les champs numériques
    if (field === 'phone' || field === 'experience') {
      // Permettre seulement les chiffres, espaces, tirets, parenthèses et +
      const numericRegex = /^[0-9\s\-\(\)\+]*$/;
      if (!numericRegex.test(value)) {
        return; // Ne pas mettre à jour si caractère non autorisé
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.role) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (formData.role === 'MEDECIN' && !formData.specialityId) {
      toast.error('Veuillez sélectionner une spécialité.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Créer l'utilisateur
      const userResult = await registerUser({
        email: formData.email,
        password: formData.password,
        role: formData.role
      });

      if (userResult.success && userResult.user) {
        // Créer le profil selon le rôle
        if (formData.role === 'PATIENT') {
          await createPatient({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone || undefined,
            userId: userResult.user.id
          });
        } else if (formData.role === 'MEDECIN') {
          await createMedecin({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone || undefined,
            city: formData.city || undefined,
            address: formData.address || undefined,
            experience: formData.experience || undefined,
            languages: formData.languages || undefined,
            specialityId: parseInt(formData.specialityId),
            userId: userResult.user.id
          });
        }

        toast.success('Inscription réussie ! Votre compte a été créé avec succès.');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        toast.error(userResult.error || 'Erreur lors de l\'inscription');
      }
    } catch {
      toast.error('Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    {
      value: 'PATIENT' as const,
      label: 'Patient',
      icon: Heart,
      color: 'text-blue-600'
    },
    {
      value: 'MEDECIN' as const,
      label: 'Médecin',
      icon: Stethoscope,
      color: 'text-green-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 w-full">
      <div className="w-full max-w-md">
        <Card className="card bg-base-100 shadow-xl max-w-full">
          <CardHeader className="text-center pb-3 break-words max-w-full">
            <div className="mx-auto w-10 h-10 bg-primary rounded-full flex items-center justify-center mb-2">
              <Shield className="w-5 h-5 text-primary-content" />
            </div>
            <CardTitle className="text-lg font-bold text-base-content break-words max-w-full truncate">
              Inscription
            </CardTitle>
            <p className="text-xs text-base-content/70 break-words max-w-full">
              Créez votre compte Gabon Santé Digital
            </p>
          </CardHeader>
          
          <CardContent className="space-y-3 break-words max-w-full">
            <form onSubmit={handleSubmit} className="space-y-3 break-words max-w-full">
              {/* Sélection du rôle */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-base-content break-words max-w-full">
                  Je suis un :
                </label>
                <div className="grid grid-cols-2 gap-2 w-full">
                  {roleOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleInputChange('role', option.value)}
                      className={`p-3 border-2 rounded-lg text-center transition-all break-words max-w-full ${
                        formData.role === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-base-300 hover:border-primary/50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1 break-words max-w-full">
                        <option.icon className={`w-5 h-5 ${option.color}`} />
                        <span className="text-sm font-medium text-base-content break-words max-w-full">
                          {option.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Informations de base */}
              <div className="grid grid-cols-2 gap-3 w-full">
                <div>
                  <label className="text-xs font-medium text-base-content break-words max-w-full">
                    Prénom *
                  </label>
                  <Input
                    type="text"
                    placeholder="Prénom"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="mt-1 h-8 break-words max-w-full"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-base-content break-words max-w-full">
                    Nom *
                  </label>
                  <Input
                    type="text"
                    placeholder="Nom"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="mt-1 h-8 break-words max-w-full"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-base-content break-words max-w-full">
                  Email *
                </label>
                <Input
                  type="email"
                  placeholder="votre@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="mt-1 h-8 break-words max-w-full"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-base-content break-words max-w-full">
                  Téléphone
                </label>
                <Input
                  type="tel"
                  placeholder="+241 01 23 45 67"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="mt-1 h-8 break-words max-w-full"
                  pattern="[0-9\s\-\(\)\+]*"
                  title="Seuls les chiffres, espaces, tirets, parenthèses et + sont autorisés"
                />
                <p className="text-xs text-base-content/50 mt-1 break-words max-w-full">
                  Format: +241 01 23 45 67 ou 01 23 45 67
                </p>
              </div>

              {/* Champs spécifiques au médecin */}
              {formData.role === 'MEDECIN' && (
                <>
                  <div>
                    <label className="text-xs font-medium text-base-content break-words max-w-full">
                      Spécialité *
                    </label>
                    <Select value={formData.specialityId} onValueChange={(value: string) => handleInputChange('specialityId', value)}>
                      <SelectTrigger className="mt-1 h-8 break-words max-w-full">
                        <SelectValue placeholder="Choisir une spécialité" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-300 shadow-lg break-words max-w-full">
                        {specialities.map((speciality) => (
                          <SelectItem key={speciality.id} value={speciality.id.toString()} className="break-words max-w-full">
                            <div className="flex items-center gap-2 break-words max-w-full">
                              <span>{speciality.icon}</span>
                              <span>{speciality.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <div>
                      <label className="text-xs font-medium text-base-content break-words max-w-full">
                        Ville
                      </label>
                      <Input
                        type="text"
                        placeholder="Libreville"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className="mt-1 h-8 break-words max-w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-base-content break-words max-w-full">
                        Expérience
                      </label>
                      <Input
                        type="text"
                        placeholder="5"
                        value={formData.experience}
                        onChange={(e) => handleInputChange('experience', e.target.value)}
                        className="mt-1 h-8 break-words max-w-full"
                        pattern="[0-9\s]*"
                        title="Seuls les chiffres et espaces sont autorisés"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-base-content break-words max-w-full">
                      Adresse
                    </label>
                    <Input
                      type="text"
                      placeholder="123 Avenue de la Paix"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="mt-1 h-8 break-words max-w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-base-content break-words max-w-full">
                      Langues parlées
                    </label>
                    <Input
                      type="text"
                      placeholder="Français, Anglais"
                      value={formData.languages}
                      onChange={(e) => handleInputChange('languages', e.target.value)}
                      className="mt-1 h-8 break-words max-w-full"
                    />
                    <p className="text-xs text-base-content/50 mt-1 break-words max-w-full">
                      Exemple: Français, Anglais, Espagnol
                    </p>
                  </div>
                </>
              )}

              {/* Mots de passe */}
              <div className="grid grid-cols-2 gap-3 w-full">
                <div>
                  <label className="text-xs font-medium text-base-content break-words max-w-full">
                    Mot de passe *
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="mt-1 h-8 break-words max-w-full"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-base-content break-words max-w-full">
                    Confirmer *
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="mt-1 h-8 break-words max-w-full"
                    required
                  />
                </div>
              </div>

              {/* Message d'erreur */}
              {error && (
                <div className="p-2 bg-error/10 border border-error/20 rounded-lg break-words max-w-full">
                  <p className="text-error text-xs break-words max-w-full">{error}</p>
                </div>
              )}

              {/* Bouton d'inscription */}
              <Button
                type="submit"
                className="w-full h-9 break-words max-w-full"
                disabled={loading || !formData.role}
              >
                {loading ? (
                  <div className="loading loading-spinner loading-sm mr-2"></div>
                ) : (
                  <User className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Inscription...' : "S'inscrire"}
              </Button>
            </form>

            {/* Lien de connexion */}
            <div className="text-center pt-2 border-t border-base-300 break-words max-w-full">
              <p className="text-xs text-base-content/70 break-words max-w-full">
                Déjà un compte ?{' '}
                <button 
                  onClick={() => router.push('/login')}
                  className="text-primary hover:underline font-medium break-words max-w-full"
                >
                  Se connecter
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage; 