'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { Calendar, FileText, MapPin, LayoutDashboard, FolderOpen, User, CreditCard, Microscope } from 'lucide-react';
import { useScrollVisibility } from '../../hooks/useScrollVisibility';

const BottomNavBar = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const isVisible = useScrollVisibility();

  // Navigation pour les médecins
  if (user?.role === 'MEDECIN' || user?.role === 'DOCTEUR') {
    const medecinNavItems = [
      { href: '/medecin/dashboard', icon: <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6" />, label: 'Dashboard' },
      { href: '/appointment', icon: <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />, label: 'Rendez-vous' },
      { href: '/medecin/dossier', icon: <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6" />, label: 'Dossiers' },
      { href: '/prescription', icon: <FileText className="w-5 h-5 sm:w-6 sm:h-6" />, label: 'Ordonnances' },
      { href: '/location', icon: <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />, label: 'Localisation' },
      { href: '/medecin/profile', icon: <User className="w-5 h-5 sm:w-6 sm:h-6" />, label: 'Profil' },
    ];

    return (
      <nav className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[98vw] sm:w-auto transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}>
        <div className="flex bg-base-100/90 shadow-lg rounded-full px-3 sm:px-4 py-3 sm:py-2 gap-3 sm:gap-6 border border-base-300 items-center backdrop-blur-md transition-all justify-center">
          {medecinNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center px-2 sm:px-2 py-1 rounded-lg transition-colors duration-200 ${pathname === item.href ? 'text-blue-600 font-bold' : 'text-gray-500'}`}
            >
              {item.icon}
              <span className="text-xs mt-1 hidden sm:block">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    );
  }

  // Navigation pour les patients (par défaut)
  const patientNavItems = [
    { href: '/patient/dashboard', icon: <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6" />, label: 'Dashboard' },
    { href: '/appointment', icon: <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />, label: 'Rendez-vous' },
    { href: '/patient/dossier', icon: <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6" />, label: 'Mon dossier' },
    { href: '/prescription', icon: <FileText className="w-5 h-5 sm:w-6 sm:h-6" />, label: 'Ordonnances' },
    { href: '/medical-exams', icon: <Microscope className="w-5 h-5 sm:w-6 sm:h-6" />, label: 'Examens' },
    { href: '/location', icon: <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />, label: 'Localisation' },
    { href: '/payment', icon: <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />, label: 'Paiement' },
    { href: '/patient/profile', icon: <User className="w-5 h-5 sm:w-6 sm:h-6" />, label: 'Profil' },
  ];

  return (
    <nav className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[98vw] sm:w-auto transition-all duration-300 ease-in-out ${
      isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
    }`}>
              <div className="flex bg-base-100/90 shadow-lg rounded-full px-3 sm:px-4 py-3 sm:py-2 gap-3 sm:gap-6 border border-base-300 items-center backdrop-blur-md transition-all justify-center">
        {patientNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center px-2 sm:px-2 py-1 rounded-lg transition-colors duration-200 ${pathname === item.href ? 'text-blue-600 font-bold' : 'text-gray-500'}`}
          >
            {item.icon}
            <span className="text-xs mt-1 hidden sm:block">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default BottomNavBar; 