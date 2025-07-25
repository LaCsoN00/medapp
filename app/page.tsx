import Hero from '@/components/Hero';
import RoleBasedRedirect from '@/components/RoleBasedRedirect';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gabon Santé Digital - Votre santé au bout des doigts',
  description: 'Plateforme médicale innovante au Gabon. Prenez rendez-vous, gérez vos ordonnances et accédez à vos données médicales en toute sécurité.',
  keywords: 'santé, médecine, Gabon, rendez-vous, ordonnances, dossier médical',
};

const HomePage = () => {
  return (
    <RoleBasedRedirect>
      <div className="min-h-screen bg-base-100">
        <Hero />
      </div>
    </RoleBasedRedirect>
  );
};

export default HomePage;
