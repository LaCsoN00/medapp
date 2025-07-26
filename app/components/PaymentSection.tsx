import { Sparkles, Calendar, CheckCircle, CreditCard, Smartphone, Banknote, Lock, Shield, Zap, Clock, User, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Image from 'next/image';
import { useAuth } from '../../hooks/useAuth';
import { useEffect, useState } from 'react';
import { getPatientByUserId, getPayments, createPayment } from '@/actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

// Type local pour Payment (à harmoniser avec le backend si besoin)
type Payment = {
  id: number;
  amount: number;
  method: string;
  date: Date | string;
};

const PAYMENT_METHODS = [
  { key: 'Mobile Money', label: 'Mobile Money' },
  { key: 'Carte bancaire', label: 'Carte bancaire' },
  { key: 'Virement', label: 'Virement' },
];

const SERVICE_LIST = [
  {
    key: 'appointment',
    label: 'Prise de rendez-vous',
    description: 'Réservez une consultation avec un médecin',
    amount: 500,
  },
  {
    key: 'prescription',
    label: 'Renouvellement d\'ordonnance',
    description: 'Demandez le renouvellement de votre ordonnance',
    amount: 500,
  },
  {
    key: 'results',
    label: 'Téléchargement des résultats d\'examen',
    description: 'Téléchargez vos résultats d\'analyses',
    amount: 500,
  },
];

const PaymentSection = () => {
  const { user, isLoading } = useAuth();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const [patientId, setPatientId] = useState<number | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [selectedService, setSelectedService] = useState<string>(SERVICE_LIST[0].key);
  const [selectedMethod, setSelectedMethod] = useState<string>(PAYMENT_METHODS[0].key);
  const [message, setMessage] = useState<string | null>(null);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [formValid, setFormValid] = useState(false);
  const [subscriptionSuccess, setSubscriptionSuccess] = useState(false);

  // Lecture des paramètres d'URL pour le paiement d'abonnement
  let amount = null, months = null, structureId = null;
  if (typeof window !== 'undefined' && searchParams) {
    amount = searchParams.get('amount');
    months = searchParams.get('months');
    structureId = searchParams.get('structureId');
  }

  // Efface le message après 3 secondes
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Validation dynamique selon la méthode
  useEffect(() => {
    if (selectedMethod === 'Mobile Money') {
      setFormValid(!!formFields.phone && /^\d{8,15}$/.test(formFields.phone));
    } else if (selectedMethod === 'Carte bancaire') {
      setFormValid(
        !!formFields.cardNumber && /^\d{16}$/.test(formFields.cardNumber) &&
        !!formFields.expiry && /^\d{2}\/\d{2}$/.test(formFields.expiry) &&
        !!formFields.cvc && /^\d{3,4}$/.test(formFields.cvc)
      );
    } else if (selectedMethod === 'Virement') {
      setFormValid(!!formFields.iban && /^([A-Z0-9]{15,34})$/.test(formFields.iban));
    } else {
      setFormValid(false);
    }
  }, [formFields, selectedMethod]);

  const handleFieldChange = (field: string, value: string) => {
    setFormFields((prev) => ({ ...prev, [field]: value }));
  };

  // Nouvelle fonction de paiement d'abonnement
  const handleSubscriptionPay = async () => {
    if (!formValid || !patientId || !structureId || !amount || !user) return;
    setPaying(true);
    setMessage(null);
    try {
      // 1. Effectuer le paiement (enregistrement)
      await createPayment({
        patientId,
        amount: Number(amount),
        method: selectedMethod,
        details: JSON.stringify(formFields).slice(0, 200),
      });
      // 2. Créer la souscription
      await fetch('/api/patient/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, medicalLocationId: Number(structureId), endDate: null })
      });
      setMessage('Abonnement activé avec succès !');
      setSubscriptionSuccess(true);
    } catch (e) {
      setMessage("Erreur lors du paiement ou de la souscription. " + ((e as Error)?.message || ''));
      setSubscriptionSuccess(false);
    }
    setPaying(false);
  };

  // Remettre la fonction handleModalPay pour le paiement classique :
  const handleModalPay = async () => {
    if (!formValid) return;
    if (typeof patientId !== 'number') return;
    setPaying(true);
    setMessage(null);
    try {
      await createPayment({
        patientId: patientId as number,
        amount: 500,
        method: selectedMethod,
        details: JSON.stringify(formFields).slice(0, 200),
      });
      setMessage('Paiement effectué avec succès !');
      setModalOpen(false); // Ferme la modale après succès
      // Recharge l'historique
      const payts = await getPayments({ patientId });
      setPayments((payts as Payment[]).map((p) => ({ ...p, date: p.date?.toString?.() ?? p.date })));
    } catch (e) {
      setMessage("Erreur lors du paiement. " + ((e as Error)?.message || ''));
      console.error(e);
    }
    setPaying(false);
  };

  const openPaymentModal = () => {
    setFormFields({});
    setModalOpen(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== 'PATIENT') return;
      setLoading(true);
      const patient = await getPatientByUserId(user.id);
      if (patient) {
        setPatientId(patient.id);
        const payts = await getPayments({ patientId: patient.id });
        setPayments((payts as Payment[]).map((p) => ({ ...p, date: p.date?.toString?.() ?? p.date })));
      }
      setLoading(false);
    };
    if (!isLoading && user && user.role === 'PATIENT') {
      fetchData();
    }
  }, [user, isLoading]);

  if (isLoading || loading) {
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

  if (!user || user.role !== 'PATIENT') {
    return null;
  }

  // Fonctions utilitaires pour l'affichage
  const getServiceLabel = (method: string) => {
    const found = SERVICE_LIST.find(s => s.key === method);
    return found ? found.label : method;
  };
  const getStatusColor = () => {
    return 'badge-success';
  };
  const getStatusIcon = () => {
    return <CheckCircle className="w-4 h-4" />;
  };

  // Données statiques pour la colonne de gauche et droite
  const paymentMethods = [
    {
      name: 'Mobile Money',
      icon: <Smartphone className="w-8 h-8" />, description: 'Airtel Money, Moov Money, Gabon Telecom',
      features: ['Paiement instantané', 'Sécurisé', 'Sans frais supplémentaires'],
      popular: true, color: 'text-success', bgColor: 'bg-success/10',
    },
    {
      name: 'Carte bancaire',
      icon: <CreditCard className="w-8 h-8" />, description: 'Visa, Mastercard, cartes locales',
      features: ['Paiement sécurisé', 'Sauvegarde possible', 'Remboursement facile'],
      popular: false, color: 'text-primary', bgColor: 'bg-primary/10',
    },
    {
      name: 'Virement bancaire',
      icon: <Banknote className="w-8 h-8" />, description: 'Banques gabonaises partenaires',
      features: ['Paiement différé', 'Gros montants', 'Traçabilité complète'],
      popular: false, color: 'text-secondary', bgColor: 'bg-secondary/10',
    },
  ];
  const securityFeatures = [
    { icon: <Lock className="w-4 h-4" />, text: 'Chiffrement SSL 256-bit' },
    { icon: <Shield className="w-4 h-4" />, text: 'Conformité PCI DSS' },
    { icon: <CheckCircle className="w-4 h-4" />, text: 'Authentification 3D Secure' },
    { icon: <User className="w-4 h-4" />, text: 'Partenaires bancaires agréés' },
  ];
  const advantages = [
    { icon: <Zap className="w-5 h-5" />, title: 'Gain de temps', description: 'Plus besoin de faire la queue', color: 'text-success' },
    { icon: <Shield className="w-5 h-5" />, title: 'Sécurité renforcée', description: 'Transactions chiffrées et traçables', color: 'text-primary' },
    { icon: <Clock className="w-5 h-5" />, title: 'Disponibilité 24/7', description: 'Payez à tout moment', color: 'text-secondary' },
  ];

  // Affichage conditionnel :
  if (amount && months && structureId && !subscriptionSuccess) {
    // Formulaire dédié abonnement
    return (
      <section className="section-padding bg-gradient-to-br from-base-100 to-base-200 min-h-screen flex flex-col items-center justify-center">
        <div className="container max-w-lg mx-auto">
          <div className="flex flex-col items-center mb-8">
            <div className="rounded-full bg-primary/10 p-4 mb-4 animate-fade-in">
              <Sparkles className="w-10 h-10 text-primary animate-bounce" />
            </div>
            <h1 className="text-3xl font-extrabold text-primary mb-2 text-center">Validez votre abonnement</h1>
            <p className="text-base-content/70 text-center mb-2">Récapitulatif de votre forfait</p>
            <div className="bg-base-100 rounded-xl shadow-lg p-4 flex flex-col items-center gap-2 border border-primary/20 w-full mb-4">
              <div className="flex items-center gap-2 text-lg font-semibold text-base-content mb-1">
                <Calendar className="w-5 h-5 text-primary" />
                {months} mois
              </div>
              <div className="text-2xl font-bold text-primary mb-1">{Number(amount).toLocaleString()} FCFA</div>
            </div>
          </div>
          {/* Timeline d'étapes */}
          <ol className="relative border-l border-primary/30 mb-8">
            <li className="mb-6 ml-6">
              <span className="absolute flex items-center justify-center w-8 h-8 bg-primary rounded-full -left-4 ring-4 ring-base-100">
                <CreditCard className="w-5 h-5 text-white" />
              </span>
              <h3 className="font-semibold text-base-content">1. Paiement sécurisé</h3>
              <p className="text-base-content/70 text-sm">Choisissez votre méthode et validez le paiement.</p>
            </li>
            <li className="mb-6 ml-6">
              <span className="absolute flex items-center justify-center w-8 h-8 bg-primary rounded-full -left-4 ring-4 ring-base-100">
                <CheckCircle className="w-5 h-5 text-white" />
              </span>
              <h3 className="font-semibold text-base-content">2. Activation immédiate</h3>
              <p className="text-base-content/70 text-sm">Votre abonnement est activé dès la validation du paiement.</p>
            </li>
          </ol>
          <Card className="card bg-base-100 shadow-md max-w-full">
            <CardHeader>
              <CardTitle className="text-lg">Paiement de l&apos;abonnement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 break-words max-w-full">
              {message && (
                <div className={`alert ${message.includes('succès') ? 'alert-success' : 'alert-error'} mb-4 animate-fade-in`}>{message}</div>
              )}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-base-content">Méthode de paiement</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={selectedMethod}
                  onChange={e => setSelectedMethod(e.target.value)}
                >
                  {PAYMENT_METHODS.map(method => (
                    <option key={method.key} value={method.key}>{method.label}</option>
                  ))}
                </select>
              </div>
              {/* Champs dynamiques selon la méthode */}
              {selectedMethod === 'Mobile Money' && (
                <div className="space-y-2">
                  <label className="block font-medium text-base mb-1">Numéro Mobile Money</label>
                  <Input
                    type="tel"
                    placeholder="Ex: 077123456"
                    value={formFields.phone || ''}
                    onChange={e => setFormFields(f => ({ ...f, phone: e.target.value }))}
                    maxLength={15}
                    className={formFields.phone && !/^\d{8,15}$/.test(formFields.phone) ? 'border-red-500' : ''}
                  />
                  {formFields.phone && !/^\d{8,15}$/.test(formFields.phone) && (
                    <p className="text-xs text-red-500 mt-1">Numéro invalide (8 à 15 chiffres).</p>
                  )}
                </div>
              )}
              {selectedMethod === 'Carte bancaire' && (
                <div className="space-y-2">
                  <label className="block font-medium text-base mb-1">Numéro de carte</label>
                  <Input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={formFields.cardNumber || ''}
                    onChange={e => setFormFields(f => ({ ...f, cardNumber: e.target.value.replace(/\D/g, '') }))}
                    maxLength={16}
                    className={formFields.cardNumber && !/^\d{16}$/.test(formFields.cardNumber) ? 'border-red-500' : ''}
                  />
                  {formFields.cardNumber && !/^\d{16}$/.test(formFields.cardNumber) && (
                    <p className="text-xs text-red-500 mt-1">Numéro de carte invalide (16 chiffres).</p>
                  )}
                  <label className="block font-medium text-base mb-1 mt-2">Date d&apos;expiration (MM/AA)</label>
                  <Input
                    type="text"
                    placeholder="MM/AA"
                    value={formFields.expiry || ''}
                    onChange={e => setFormFields(f => ({ ...f, expiry: e.target.value }))}
                    maxLength={5}
                    className={formFields.expiry && !/^\d{2}\/\d{2}$/.test(formFields.expiry) ? 'border-red-500' : ''}
                  />
                  {formFields.expiry && !/^\d{2}\/\d{2}$/.test(formFields.expiry) && (
                    <p className="text-xs text-red-500 mt-1">Format attendu : MM/AA</p>
                  )}
                  <label className="block font-medium text-base mb-1 mt-2">CVC</label>
                  <Input
                    type="text"
                    placeholder="123"
                    value={formFields.cvc || ''}
                    onChange={e => setFormFields(f => ({ ...f, cvc: e.target.value.replace(/\D/g, '') }))}
                    maxLength={4}
                    className={formFields.cvc && !/^\d{3,4}$/.test(formFields.cvc) ? 'border-red-500' : ''}
                  />
                  {formFields.cvc && !/^\d{3,4}$/.test(formFields.cvc) && (
                    <p className="text-xs text-red-500 mt-1">CVC invalide (3 ou 4 chiffres).</p>
                  )}
                </div>
              )}
              {selectedMethod === 'Virement' && (
                <div className="space-y-2">
                  <label className="block font-medium text-base mb-1">IBAN</label>
                  <Input
                    type="text"
                    placeholder="FR76 3000 6000 0112 3456 7890 189"
                    value={formFields.iban || ''}
                    onChange={e => setFormFields(f => ({ ...f, iban: e.target.value.toUpperCase() }))}
                    maxLength={34}
                    className={formFields.iban && !/^([A-Z0-9]{15,34})$/.test(formFields.iban) ? 'border-red-500' : ''}
                  />
                  {formFields.iban && !/^([A-Z0-9]{15,34})$/.test(formFields.iban) && (
                    <p className="text-xs text-red-500 mt-1">IBAN invalide.</p>
                  )}
                </div>
              )}
              <Button className="btn btn-primary btn-lg w-full mt-4 shadow-xl hover:scale-105 transition-transform" onClick={handleSubscriptionPay} disabled={paying}>
                {paying ? 'Paiement en cours...' : 'Valider et activer mon abonnement'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }
  if (amount && months && structureId && subscriptionSuccess) {
    // Message de succès après paiement et souscription
    return (
      <section className="section-padding bg-base-100">
        <div className="container max-w-lg mx-auto text-center mt-16">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-success">Abonnement activé !</h2>
          <p className="text-base-content/70 mb-6">Votre paiement a bien été reçu et votre abonnement est maintenant actif.</p>
          <Button className="btn btn-primary" onClick={() => window.location.href = '/patient/dashboard'}>Accéder à mon espace</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding bg-base-100">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
          {/* Colonne gauche : Méthodes, stats, fonctionnalités */}
          <div className="lg:col-span-1 space-y-6 order-2 max-w-full">
            <Card className="card bg-base-100 shadow-md max-w-full">
              <CardHeader>
                <CardTitle className="text-lg">Méthodes de paiement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 w-full">
                  {paymentMethods.map((method, idx) => (
                    <Button key={idx} className="btn btn-outline justify-start h-12 text-sm w-full">
                      {method.icon}
                      <div className="text-left ml-3">
                        <div className="font-medium">{method.name}</div>
                        <div className="text-xs opacity-70">{method.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
            {/* Statistiques fictives, à adapter si besoin */}
            <Card className="card bg-base-100 shadow-md max-w-full">
              <CardHeader>
                <CardTitle className="text-lg">Statistiques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{payments.length}</div>
                    <div className="text-sm text-base-content/70">Paiements effectués</div>
                  </div>
                  <div className="text-center p-4 bg-secondary/10 rounded-lg">
                    <div className="text-2xl font-bold text-secondary">{payments.reduce((acc, p) => acc + (p.amount || 0), 0)} FCFA</div>
                    <div className="text-sm text-base-content/70">Total payé</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card bg-base-100 shadow-md max-w-full">
              <CardHeader>
                <CardTitle className="text-lg">Fonctionnalités</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentMethods.map((method, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-base-200/50 rounded-lg">
                      <div className="text-primary">{method.icon}</div>
                      <div className="flex-1">
                        <h4 className="font-medium text-base-content">{method.name}</h4>
                        <p className="text-sm text-base-content/70">{method.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonne centrale : Tabs (transactions, paiement) */}
          <div className="lg:col-span-1 space-y-6 order-3 max-w-full">
            <Tabs defaultValue="transactions" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="transactions">Mes transactions</TabsTrigger>
                <TabsTrigger value="payment">Nouveau paiement</TabsTrigger>
              </TabsList>

              {/* Historique réel */}
              <TabsContent value="transactions" className="space-y-4">
                <Card className="card bg-base-100 shadow-md max-w-full">
                  <CardHeader>
                    <CardTitle className="text-lg">Historique des paiements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {payments.length === 0 ? (
                      <div className="text-center text-base-content/70 py-8">Aucun paiement effectué pour l&apos;instant.</div>
                    ) : (
                      <>
                        <div className="space-y-4 break-words max-w-full">
                          {(showAllTransactions ? payments : payments.slice(0, 4)).map((payment, index) => (
                            <div key={index} className="card bg-base-100 shadow-sm border border-base-300">
                              <div className="card-body p-6">
                                <div className="flex items-start justify-between mb-4 break-words max-w-full flex-wrap">
                                  <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <Avatar className="w-10 h-10 border-2 border-primary/20 flex-shrink-0">
                                      <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-primary-content font-bold">
                                        {getServiceLabel(payment.method).substring(0,2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0 break-words max-w-full">
                                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <h4 className="font-semibold text-base-content text-lg truncate break-words max-w-full">
                                          {getServiceLabel(payment.method)}
                                        </h4>
                                        <Badge variant="outline" className="flex-shrink-0 text-xs break-words max-w-full">
                                          {payment.method}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-base-content/70 mb-1 break-words max-w-full">
                                        {new Date(payment.date).toLocaleDateString()} à {new Date(payment.date).toLocaleTimeString()}
                                      </p>
                                      <p className="text-xl font-bold text-base-content break-words max-w-full">
                                        {payment.amount} FCFA
                                      </p>
                                    </div>
                                  </div>
                                  <Badge className={`${getStatusColor()} animate-pulse flex items-center gap-1 flex-shrink-0 text-xs ml-2 break-words max-w-full`}>
                                    {getStatusIcon()}
                                    Payé
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {payments.length > 4 && !showAllTransactions && (
                          <div className="flex justify-center mt-4">
                            <button
                              className="btn btn-ghost flex items-center gap-2"
                              onClick={() => setShowAllTransactions(true)}
                              aria-label="Voir plus de transactions"
                            >
                              <ChevronDown className="w-5 h-5" />
                              Voir plus
                            </button>
                          </div>
                        )}
                        {payments.length > 4 && showAllTransactions && (
                          <div className="flex justify-center mt-4">
                            <button
                              className="btn btn-ghost flex items-center gap-2"
                              onClick={() => setShowAllTransactions(false)}
                              aria-label="Réduire les transactions"
                            >
                              <ChevronDown className="w-5 h-5 rotate-180" />
                              Réduire
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Formulaire de paiement */}
              <TabsContent value="payment" className="space-y-4">
                <Card className="card bg-base-100 shadow-md max-w-full">
                  <CardHeader>
                    <CardTitle className="text-lg">Effectuer un paiement</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 break-words max-w-full">
                    {message && (
                      <div className={`alert ${message.includes('succès') ? 'alert-success' : 'alert-error'} mb-4`}>{message}</div>
                    )}
                    <div className="grid md:grid-cols-2 gap-4 w-full">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium text-base-content">Type de service</span>
                        </label>
                        <select
                          className="select select-bordered w-full"
                          value={selectedService}
                          onChange={e => setSelectedService(e.target.value)}
                        >
                          {SERVICE_LIST.map(service => (
                            <option key={service.key} value={service.key}>{service.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium text-base-content">Montant</span>
                        </label>
                        <Input
                          type="text"
                          value={SERVICE_LIST.find(s => s.key === selectedService)?.amount || 500}
                          disabled
                          className="input input-bordered w-full break-words max-w-full"
                        />
                      </div>
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium text-base-content">Méthode de paiement</span>
                      </label>
                      <select
                        className="select select-bordered w-full"
                        value={selectedMethod}
                        onChange={e => setSelectedMethod(e.target.value)}
                      >
                        {PAYMENT_METHODS.map(method => (
                          <option key={method.key} value={method.key}>{method.label}</option>
                        ))}
                      </select>
                    </div>
                    <Button className="btn btn-primary w-full break-words max-w-full" onClick={openPaymentModal} disabled={paying}>
                      {paying ? 'Paiement en cours...' : 'Payer'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Colonne droite : Image, sécurité, avantages */}
          <div className="lg:col-span-1 order-first lg:order-last max-w-full">
            <Card className="card bg-base-100 shadow-xl overflow-hidden max-w-full">
              <Image
                src="/assets/mobile-payment.jpg"
                alt="Paiement mobile sécurisé"
                width={600}
                height={400}
                className="w-full h-[250px] sm:h-[300px] lg:h-[350px] object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                <div className="p-6 text-white break-words max-w-full">
                  <h3 className="text-xl font-bold mb-2 break-words max-w-full truncate">Paiement mobile</h3>
                  <p className="text-sm opacity-90 break-words max-w-full">Payez en toute sécurité depuis votre téléphone</p>
                </div>
              </div>
            </Card>
            <Card className="card bg-base-100 shadow-md mt-6 max-w-full">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Shield className="w-5 h-5 mr-2 text-primary" />
                  Sécurité des paiements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {securityFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="text-primary">{feature.icon}</div>
                    <span className="text-sm font-medium text-base-content">{feature.text}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="card bg-base-100 shadow-md mt-6 max-w-full">
              <CardHeader>
                <CardTitle className="text-lg">Avantages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {advantages.map((advantage, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className={`${advantage.color} mt-0.5`}>{advantage.icon}</div>
                      <div>
                        <h4 className="font-medium text-base-content">{advantage.title}</h4>
                        <p className="text-sm text-base-content/70">{advantage.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modale de paiement selon la méthode */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-white shadow-2xl rounded-2xl p-6">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-2xl font-bold text-center mb-1">Paiement - {selectedMethod}</DialogTitle>
            <p className="text-center text-base-content/70 text-sm mb-2">Veuillez remplir les informations pour finaliser votre paiement.</p>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Interface Mobile Money */}
            {selectedMethod === 'Mobile Money' && (
              <div className="space-y-2">
                <label className="block font-medium text-base mb-1">Numéro Mobile Money</label>
                <Input
                  type="tel"
                  placeholder="Ex: 077123456"
                  value={formFields.phone || ''}
                  onChange={e => handleFieldChange('phone', e.target.value)}
                  maxLength={15}
                  className={formFields.phone && !/^\d{8,15}$/.test(formFields.phone) ? 'border-red-500' : ''}
                />
                {formFields.phone && !/^\d{8,15}$/.test(formFields.phone) && (
                  <p className="text-xs text-red-500 mt-1">Numéro invalide (8 à 15 chiffres).</p>
                )}
              </div>
            )}
            {/* Interface Carte bancaire */}
            {selectedMethod === 'Carte bancaire' && (
              <div className="space-y-2">
                <label className="block font-medium text-base mb-1">Numéro de carte</label>
                <Input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={formFields.cardNumber || ''}
                  onChange={e => handleFieldChange('cardNumber', e.target.value.replace(/\D/g, ''))}
                  maxLength={16}
                  className={formFields.cardNumber && !/^\d{16}$/.test(formFields.cardNumber) ? 'border-red-500' : ''}
                />
                {formFields.cardNumber && !/^\d{16}$/.test(formFields.cardNumber) && (
                  <p className="text-xs text-red-500 mt-1">Numéro de carte invalide (16 chiffres).</p>
                )}
                <label className="block font-medium text-base mb-1 mt-2">Date d&apos;expiration (MM/AA)</label>
                <Input
                  type="text"
                  placeholder="MM/AA"
                  value={formFields.expiry || ''}
                  onChange={e => handleFieldChange('expiry', e.target.value)}
                  maxLength={5}
                  className={formFields.expiry && !/^\d{2}\/\d{2}$/.test(formFields.expiry) ? 'border-red-500' : ''}
                />
                {formFields.expiry && !/^\d{2}\/\d{2}$/.test(formFields.expiry) && (
                  <p className="text-xs text-red-500 mt-1">Format attendu : MM/AA</p>
                )}
                <label className="block font-medium text-base mb-1 mt-2">CVC</label>
                <Input
                  type="text"
                  placeholder="123"
                  value={formFields.cvc || ''}
                  onChange={e => handleFieldChange('cvc', e.target.value.replace(/\D/g, ''))}
                  maxLength={4}
                  className={formFields.cvc && !/^\d{3,4}$/.test(formFields.cvc) ? 'border-red-500' : ''}
                />
                {formFields.cvc && !/^\d{3,4}$/.test(formFields.cvc) && (
                  <p className="text-xs text-red-500 mt-1">CVC invalide (3 ou 4 chiffres).</p>
                )}
              </div>
            )}
            {/* Interface Virement */}
            {selectedMethod === 'Virement' && (
              <div className="space-y-2">
                <label className="block font-medium text-base mb-1">IBAN</label>
                <Input
                  type="text"
                  placeholder="FR76 3000 6000 0112 3456 7890 189"
                  value={formFields.iban || ''}
                  onChange={e => handleFieldChange('iban', e.target.value.toUpperCase())}
                  maxLength={34}
                  className={formFields.iban && !/^([A-Z0-9]{15,34})$/.test(formFields.iban) ? 'border-red-500' : ''}
                />
                {formFields.iban && !/^([A-Z0-9]{15,34})$/.test(formFields.iban) && (
                  <p className="text-xs text-red-500 mt-1">IBAN invalide.</p>
                )}
              </div>
            )}
          </div>
          <div className="border-t pt-4 mt-4">
            <DialogFooter>
              <Button className="btn btn-primary w-full flex items-center justify-center gap-2 hover:shadow-lg hover:bg-primary/90 transition" onClick={handleModalPay} disabled={!formValid || paying}>
                {paying && <Loader2 className="w-4 h-4 animate-spin" />}
                {paying ? 'Paiement en cours...' : 'Valider le paiement'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default PaymentSection;