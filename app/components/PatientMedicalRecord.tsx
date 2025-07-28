'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getPatientByUserId, getMedicalDocumentsByPatientId } from '@/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Lock, Shield, CheckCircle, AlertCircle, X, Pill, Activity, Stethoscope } from 'lucide-react';
import Image from 'next/image';

interface MedicalDocument {
  id: number;
  type: string;
  title: string;
  description: string | null;
  fileUrl: string;
  createdAt: Date;
}

const PatientMedicalRecord = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('consultations');

  useEffect(() => {
    const loadDocuments = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const patient = await getPatientByUserId(user.id);
        if (patient) {
          const docs = await getMedicalDocumentsByPatientId(patient.id);
          setDocuments(docs);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des documents:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [user]);

  const getConsultations = () => {
    return documents.filter(doc => doc.type === 'consultation' || doc.type === 'report');
  };

  const getPrescriptions = () => {
    return documents.filter(doc => doc.type === 'prescription');
  };

  const getHealthData = () => {
    return documents.filter(doc => doc.type === 'exam' || doc.type === 'certificate');
  };

  const getMedicalNotes = () => {
    return documents.filter(doc => doc.type === 'other');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-white/70">Chargement du dossier médical...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="text-center pt-8 pb-6">
        <Badge className="bg-pink-500 text-white mb-4">Dossier médical</Badge>
        <h1 className="text-4xl font-bold mb-4">Votre profil santé numérique</h1>
        <p className="text-white/70 max-w-2xl mx-auto">
          Accédez à votre profil santé personnel et sécurisé avec l&apos;historique complet de vos consultations, prescriptions et données de santé
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 flex gap-8">
        {/* Left Panel */}
        <div className="w-80 space-y-6">
          {/* Image Card */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-0">
              <div className="relative">
                <Image 
                  src="/assets/hero-medical.jpg" 
                  alt="Hôpital" 
                  width={320}
                  height={192}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
                <div className="absolute inset-0 bg-black/20 rounded-t-lg"></div>
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-lg mb-2">Dossier sécurisé</h3>
                <p className="text-white/70 text-sm">
                  Vos données médicales sont protégées et accessibles 24h/24
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Security Section */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4">Sécurité des données</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-pink-500" />
                  <span className="text-sm">Chiffrement end-to-end</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-pink-500" />
                  <span className="text-sm">Authentification sécurisée</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-pink-500" />
                  <span className="text-sm">Conformité RGPD</span>
                </div>
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-pink-500" />
                  <span className="text-sm">Accès contrôlé</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Main Content */}
        <div className="flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-800 border-gray-700">
              <TabsTrigger 
                value="consultations" 
                className="data-[state=active]:bg-pink-500 data-[state=active]:text-white"
              >
                Consultations
              </TabsTrigger>
              <TabsTrigger 
                value="prescriptions" 
                className="data-[state=active]:bg-pink-500 data-[state=active]:text-white"
              >
                Prescriptions
              </TabsTrigger>
              <TabsTrigger 
                value="health-data" 
                className="data-[state=active]:bg-pink-500 data-[state=active]:text-white"
              >
                Données de santé
              </TabsTrigger>
              <TabsTrigger 
                value="medical-notes" 
                className="data-[state=active]:bg-pink-500 data-[state=active]:text-white"
              >
                Notes médicales
              </TabsTrigger>
            </TabsList>

            <TabsContent value="consultations" className="mt-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-pink-500" />
                    <h3 className="font-semibold text-lg">Historique des consultations</h3>
                  </div>
                  {getConsultations().length > 0 ? (
                    <div className="space-y-4">
                      {getConsultations().map((consultation) => (
                        <div key={consultation.id} className="p-4 bg-gray-700 rounded-lg">
                          <h4 className="font-medium">{consultation.title}</h4>
                          <p className="text-white/70 text-sm mt-1">{consultation.description}</p>
                          <p className="text-white/50 text-xs mt-2">
                            {new Date(consultation.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-white/70">Aucune consultation trouvée.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="prescriptions" className="mt-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Pill className="w-5 h-5 text-pink-500" />
                    <h3 className="font-semibold text-lg">Historique des prescriptions</h3>
                  </div>
                  {getPrescriptions().length > 0 ? (
                    <div className="space-y-4">
                      {getPrescriptions().map((prescription) => (
                        <div key={prescription.id} className="p-4 bg-gray-700 rounded-lg">
                          <h4 className="font-medium">{prescription.title}</h4>
                          <p className="text-white/70 text-sm mt-1">{prescription.description}</p>
                          <p className="text-white/50 text-xs mt-2">
                            {new Date(prescription.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-white/70">Aucune prescription trouvée.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="health-data" className="mt-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-pink-500" />
                    <h3 className="font-semibold text-lg">Données de santé</h3>
                  </div>
                  {getHealthData().length > 0 ? (
                    <div className="space-y-4">
                      {getHealthData().map((data) => (
                        <div key={data.id} className="p-4 bg-gray-700 rounded-lg">
                          <h4 className="font-medium">{data.title}</h4>
                          <p className="text-white/70 text-sm mt-1">{data.description}</p>
                          <p className="text-white/50 text-xs mt-2">
                            {new Date(data.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-white/70">Aucune donnée de santé trouvée.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="medical-notes" className="mt-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Stethoscope className="w-5 h-5 text-pink-500" />
                    <h3 className="font-semibold text-lg">Notes médicales</h3>
                  </div>
                  {getMedicalNotes().length > 0 ? (
                    <div className="space-y-4">
                      {getMedicalNotes().map((note) => (
                        <div key={note.id} className="p-4 bg-gray-700 rounded-lg">
                          <h4 className="font-medium">{note.title}</h4>
                          <p className="text-white/70 text-sm mt-1">{note.description}</p>
                          <p className="text-white/50 text-xs mt-2">
                            {new Date(note.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-white/70">Aucune note médicale trouvée.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Close Button */}
      <Button 
        variant="ghost" 
        size="sm" 
        className="fixed bottom-4 left-4 text-red-500 hover:text-red-400"
        onClick={() => window.history.back()}
      >
        <X className="w-5 h-5" />
      </Button>
    </div>
  );
};

export default PatientMedicalRecord; 