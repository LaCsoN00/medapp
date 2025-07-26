'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BadgeCheck, Calendar, TrendingUp, FileText, Shield, Clock, CheckCircle, MessageCircle, UserCheck, History } from 'lucide-react';

const PRICES = [
  { label: 'Mensuel', months: 1, price: 60000, color: 'from-primary to-blue-400', icon: <Calendar className="w-8 h-8 text-primary" /> },
  { label: 'Semestriel', months: 6, price: 60000 * 6, color: 'from-green-400 to-emerald-600', icon: <TrendingUp className="w-8 h-8 text-green-600" /> },
  { label: 'Annuel', months: 12, price: 60000 * 12, color: 'from-yellow-400 to-orange-500', icon: <BadgeCheck className="w-8 h-8 text-yellow-600" /> },
];

const SERVICES = [
  { icon: <Calendar className="w-6 h-6 text-primary" />, label: 'Prise de rendez-vous', desc: 'Réservez une consultation avec un médecin en quelques clics.' },
  { icon: <FileText className="w-6 h-6 text-primary" />, label: 'Renouvellement d ordonnance', desc: 'Demandez et suivez vos renouvellements d ordonnance.' },
  { icon: <UserCheck className="w-6 h-6 text-primary" />, label: 'Accès sécurisé à vos données', desc: 'Consultez et gérez vos données médicales en toute sécurité.' },
  { icon: <Shield className="w-6 h-6 text-primary" />, label: 'Données certifiées RGPD', desc: 'Vos informations sont protégées et confidentielles.' },
  { icon: <Clock className="w-6 h-6 text-primary" />, label: 'Plateforme 24/7', desc: 'Accès à tout moment, où que vous soyez.' },
  { icon: <CheckCircle className="w-6 h-6 text-primary" />, label: 'Support prioritaire', desc: 'Une équipe dédiée pour répondre à vos besoins.' },
  { icon: <History className="w-6 h-6 text-primary" />, label: 'Historique complet', desc: 'Retrouvez tous vos paiements, rendez-vous et prescriptions.' },
  { icon: <MessageCircle className="w-6 h-6 text-primary" />, label: 'Messagerie sécurisée', desc: 'Discutez avec les professionnels de santé en toute confidentialité.' },
];

// Composant enfant qui utilise useSearchParams
function SubscribeContent() {
  const router = useRouter();
  const params = useSearchParams();
  const structureId = params.get('structureId');
  const [selected, setSelected] = useState<number | null>(null);

  const forfait = selected !== null ? PRICES[selected] : null;

  return (
    <div className="max-w-6xl mx-auto pt-24 pb-20 w-full px-2 sm:px-4">
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-base-100 to-base-200 p-4 relative">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2 text-center text-base-content">Choisissez votre forfait d&apos;abonnement</h1>
        <p className="text-base-content/70 mb-8 text-center max-w-xl">Profitez de tous les services MedApp en toute sérénité. Choisissez la durée qui vous convient et bénéficiez d&apos;un accès sécurisé à votre structure de santé.</p>
        <div className="w-full max-w-3xl mb-12">
          <h2 className="text-xl font-bold mb-4 text-base-content">Services inclus dans l&apos;abonnement</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SERVICES.map((s, i) => (
              <div key={i} className="flex items-start gap-4 bg-base-100 rounded-lg shadow-sm p-4 border border-base-200 hover:shadow-md transition">
                <div className="flex-shrink-0">{s.icon}</div>
                <div>
                  <div className="font-semibold text-base-content mb-1">{s.label}</div>
                  <div className="text-base-content/70 text-sm">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl mb-12">
          {PRICES.map((f, i) => (
            <Card
              key={f.label}
              className={`relative group p-8 flex flex-col items-center border-2 transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl bg-gradient-to-br ${f.color} ${selected === i ? 'border-primary scale-105 ring-2 ring-primary' : 'border-base-300'} ${selected === i ? 'z-10' : ''}`}
              onClick={() => setSelected(i)}
              style={{ minHeight: 280 }}
            >
              <div className="absolute top-4 right-4">
                {selected === i && <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded bg-primary text-white animate-bounce"><BadgeCheck className="w-4 h-4 mr-1" />Choisi</span>}
              </div>
              <div className="mb-4">{f.icon}</div>
              <div className="text-2xl font-bold mb-2 text-base-content group-hover:text-primary transition-colors">{f.label}</div>
              <div className="text-4xl font-extrabold mb-2 text-primary drop-shadow">{f.price.toLocaleString()} FCFA</div>
              <div className="text-base-content/70 mb-2">{f.months} mois d&apos;accès</div>
              {f.months === 12 && <span className="inline-block mt-2 px-3 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 font-semibold">Économisez 2 mois</span>}
              {f.months === 6 && <span className="inline-block mt-2 px-3 py-1 text-xs rounded-full bg-green-100 text-green-700 font-semibold">Populaire</span>}
            </Card>
          ))}
        </div>
        {/* Résumé dynamique */}
        {forfait && (
          <div className="mb-8 w-full max-w-lg mx-auto bg-base-100 rounded-xl shadow-lg p-6 flex flex-col items-center gap-2 border border-primary/20 animate-fade-in">
            <div className="text-lg font-semibold text-base-content mb-2">Récapitulatif</div>
            <div className="flex items-center gap-3 text-base-content/80">
              <span className="font-bold text-primary text-xl">{forfait.label}</span>
              <span className="text-base-content/60">|</span>
              <span>{forfait.months} mois</span>
              <span className="text-base-content/60">|</span>
              <span className="font-bold text-2xl text-primary">{forfait.price.toLocaleString()} FCFA</span>
            </div>
          </div>
        )}
        {/* Bouton sticky mobile */}
        <div className="fixed bottom-0 left-0 w-full flex justify-center bg-gradient-to-t from-base-200/90 to-transparent py-4 z-50 md:static md:bg-none md:py-0">
          <Button
            className="btn btn-primary btn-lg w-full max-w-xs shadow-xl"
            disabled={selected === null}
            onClick={() => {
              if (selected === null) return;
              const forfait = PRICES[selected];
              router.push(`/payment?structureId=${structureId}&months=${forfait.months}&amount=${forfait.price}`);
            }}
          >
            Valider et payer
          </Button>
        </div>
      </div>
    </div>
  );
}

// Composant de fallback pour le Suspense
function SubscribeFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-base-100 to-base-200 p-4">
      <div className="text-center">
        <div className="loading loading-spinner loading-lg text-primary"></div>
        <p className="mt-4 text-base-content/70">Chargement de la page d&apos;abonnement...</p>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={<SubscribeFallback />}>
      <SubscribeContent />
    </Suspense>
  );
} 