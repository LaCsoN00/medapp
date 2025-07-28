'use client';

import { useAuth } from '../../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Calendar, User, FileText, Pill, CreditCard, Settings, LogOut, MapPin } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const RoleBasedNavigation = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  // Navigation pour les médecins
  if (user.role === 'MEDECIN' || user.role === 'DOCTEUR') {
    return (
      <nav className="bg-base-100 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/medecin/dashboard" className="text-xl font-bold text-primary">
                Dr. Dashboard
              </Link>
              
              <div className="hidden md:flex items-center gap-6">
                <Link href="/medecin/dashboard" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <User className="w-4 h-4" />
                  Tableau de bord
                </Link>
                <Link href="/appointment" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Calendar className="w-4 h-4" />
                  Rendez-vous
                </Link>
                <Link href="/medecin/dossier" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Pill className="w-4 h-4" />
                  Dossiers
                </Link>
                <Link href="/prescription" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <FileText className="w-4 h-4" />
                  Ordonnances
                </Link>
                <Link href="/location" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <MapPin className="w-4 h-4" />
                  Localisation
                </Link>
                <Link href="/medecin/profile" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Settings className="w-4 h-4" />
                  Profil
                </Link>
                <Link href="/medical-exams" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <FileText className="w-4 h-4" />
                  Examens médicaux
                </Link>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Avatar className="w-8 h-8 border-2 border-primary/30">
                {user.photo ? (
                  <AvatarImage src={user.photo} alt="Photo de profil" />
                ) : (
                  <AvatarFallback>
                    {user.firstName?.[0] || user.email[0] || "U"}
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="text-sm text-base-content/70">
                Dr. {user.firstName} {user.lastName}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // Navigation pour les patients
  if (user.role === 'PATIENT') {
    return (
      <nav className="bg-base-100 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/patient/dashboard" className="text-xl font-bold text-primary">
                Mon Santé
              </Link>
              
              <div className="hidden md:flex items-center gap-6">
                <Link href="/patient/dashboard" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <User className="w-4 h-4" />
                  Tableau de bord
                </Link>
                <Link href="/appointment" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Calendar className="w-4 h-4" />
                  Prendre RDV
                </Link>
                <Link href="/patient/dossier" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Pill className="w-4 h-4" />
                  Mon dossier
                </Link>
                <Link href="/prescription" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <FileText className="w-4 h-4" />
                  Ordonnances
                </Link>
                <Link href="/medical-exams" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <FileText className="w-4 h-4" />
                  Examens médicaux
                </Link>
                <Link href="/payment" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <CreditCard className="w-4 h-4" />
                  Paiements
                </Link>
                <Link href="/patient/profile" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Settings className="w-4 h-4" />
                  Profil
                </Link>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Avatar className="w-8 h-8 border-2 border-primary/30">
                {user.photo ? (
                  <AvatarImage src={user.photo} alt="Photo de profil" />
                ) : (
                  <AvatarFallback>
                    {user.firstName?.[0] || user.email[0] || "U"}
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="text-sm text-base-content/70">
                {user.firstName} {user.lastName}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return null;
};

export default RoleBasedNavigation; 