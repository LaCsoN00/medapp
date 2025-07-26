'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Shield, Stethoscope, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { loginUser } from '@/actions';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'PATIENT' | 'MEDECIN' | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !role) {
      toast.error('Veuillez remplir tous les champs et sélectionner un rôle.', { position: 'top-center' });
      return;
    }

    setLoading(true);

    try {
      const result = await loginUser({ email, password });
      
      if (result.success && result.user && result.token) {
        // Vérifier que le rôle correspond
        if (result.user.role !== role) {
          toast.error('Le rôle sélectionné ne correspond pas à votre compte.', { position: 'top-center' });
          return;
        }

        // Stocker le token JWT
        localStorage.setItem('token', result.token);
        
        login({ ...result.user, role: result.user.role as "PATIENT" | "MEDECIN" | "DOCTEUR" });
        
        // Redirection automatique via RoleBasedRedirect
        router.push('/');
      } else {
        toast.error(result.error || 'Erreur de connexion', { position: 'top-center' });
      }
    } catch {
      toast.error('Erreur lors de la connexion', { position: 'top-center' });
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    {
      value: 'PATIENT' as const,
      label: 'Patient',
      icon: Heart,
      color: 'text-primary'
    },
    {
      value: 'MEDECIN' as const,
      label: 'Médecin',
      icon: Stethoscope,
      color: 'text-secondary'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto pt-24 pb-20 w-full px-2 sm:px-4">
      <div className="min-h-screen bg-base-100 flex items-center justify-center p-4 w-full">
        <div className="w-full max-w-sm">
          <Card className="card bg-base-100 shadow-xl max-w-full">
            <CardHeader className="text-center pb-4 break-words max-w-full">
              <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-3">
                <Shield className="w-6 h-6 text-primary-content" />
              </div>
              <CardTitle className="text-xl font-bold text-base-content break-words max-w-full truncate">
                Connexion
              </CardTitle>
              <p className="text-sm text-base-content/70 break-words max-w-full">
                Gabon Santé Digital
              </p>
            </CardHeader>
            
            <CardContent className="space-y-4 break-words max-w-full">
              <form onSubmit={handleSubmit} className="space-y-4 break-words max-w-full">
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
                        onClick={() => setRole(option.value)}
                        className={`p-3 border-2 rounded-lg text-center transition-all break-words max-w-full ${
                          role === option.value
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

                {/* Champs de connexion */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-base-content break-words max-w-full">
                      Email
                    </label>
                    <Input
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 h-10 break-words max-w-full"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-base-content break-words max-w-full">
                      Mot de passe
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 h-10 break-words max-w-full"
                      required
                    />
                  </div>
                </div>

                {/* Bouton de connexion */}
                <Button
                  type="submit"
                  className="w-full h-10 break-words max-w-full"
                  disabled={loading || !role}
                >
                  {loading ? (
                    <div className="loading loading-spinner loading-sm mr-2"></div>
                  ) : (
                    <User className="w-4 h-4 mr-2" />
                  )}
                  Se connecter
                </Button>
              </form>

              {/* Lien vers l'inscription */}
              <div className="text-center">
                <p className="text-sm text-base-content/70">
                  Pas encore de compte ?{' '}
                  <button
                    onClick={() => router.push('/register')}
                    className="text-primary hover:underline font-medium"
                  >
                    S&apos;inscrire
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 