'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getPatientByUserId, getMedicalRecordByPatientId, canAccessFeature, getMedicalDocumentsByPatientId, createMedicalDocument } from '@/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Upload, Download, Search, Lock, Calendar, User, Eye, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface MedicalRecord {
  id: number;
  type: string;
  title: string;
  description: string;
  date: string;
  fileUrl?: string;
}

const MedicalRecordsSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [canAccess, setCanAccess] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // États pour le formulaire d'upload
  const [uploadForm, setUploadForm] = useState({
    type: '',
    title: '',
    description: '',
    file: null as File | null
  });
  const [uploading, setUploading] = useState(false);

  const loadRecords = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Si l'utilisateur est un médecin, accès direct sans vérification d'abonnement
      if (user.role === 'MEDECIN' || user.role === 'DOCTEUR') {
        setCanAccess(true);
        // Pour les médecins, on peut charger les dossiers de leurs patients
        // ou afficher un message indiquant qu'ils doivent sélectionner un patient
        setRecords([]);
        return;
      }
      
      // Pour les patients, vérifier l'accès aux dossiers médicaux
      const patient = await getPatientByUserId(user.id);
      if (!patient) return;

      const hasAccess = await canAccessFeature(patient.id, 'medical_records');
      setCanAccess(hasAccess);

      if (hasAccess) {
        // Charger les vrais documents médicaux
        const documentsData = await getMedicalDocumentsByPatientId(patient.id);
        if (documentsData && documentsData.length > 0) {
          const formattedRecords = documentsData.map(doc => ({
            id: doc.id,
            type: doc.type,
            title: doc.title,
            description: doc.description || 'Document médical',
            date: doc.createdAt.toISOString(),
            fileUrl: doc.fileUrl
          }));
          setRecords(formattedRecords);
        } else {
          // Fallback sur l'ancien système si pas de documents
          const recordsData = await getMedicalRecordByPatientId(patient.id);
          if (recordsData) {
            setRecords([{
              id: recordsData.id,
              type: 'medical_record',
              title: 'Dossier médical',
              description: recordsData.notes || 'Dossier médical du patient',
              date: recordsData.createdAt.toISOString(),
              fileUrl: undefined
            }]);
          } else {
            setRecords([]);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des dossiers:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les dossiers médicaux",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const filteredRecords = records.filter(record =>
    record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fonction pour télécharger un document
  const handleDownload = (record: MedicalRecord) => {
    if (!record.fileUrl) {
      toast({
        title: "Information",
        description: "Aucun fichier disponible pour ce document",
        variant: "default"
      });
      return;
    }

    // Créer un lien temporaire pour le téléchargement
    const link = document.createElement('a');
    link.href = record.fileUrl;
    link.download = `${record.title}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Téléchargement",
      description: "Le document est en cours de téléchargement",
      variant: "default"
    });
  };

  // Fonction pour voir un document
  const handleView = (record: MedicalRecord) => {
    if (!record.fileUrl) {
      toast({
        title: "Information",
        description: "Aucun fichier disponible pour ce document",
        variant: "default"
      });
      return;
    }

    // Ouvrir le document dans un nouvel onglet
    window.open(record.fileUrl, '_blank');
  };

  // Fonction pour gérer le changement de fichier
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadForm(prev => ({ ...prev, file }));
    }
  };

  // Fonction pour soumettre le formulaire d'upload
  const handleUploadSubmit = async () => {
    if (!uploadForm.type || !uploadForm.title || !uploadForm.file || !user) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      // Upload du fichier
      const formData = new FormData();
      formData.append('file', uploadForm.file);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Erreur lors de l\'upload du fichier');
      }

      const uploadResult = await uploadResponse.json();
      const fileUrl = uploadResult.url;

      // Récupérer le patient
      const patient = await getPatientByUserId(user.id);
      if (!patient) {
        throw new Error('Patient non trouvé');
      }

      // Créer le document médical en base de données
      const result = await createMedicalDocument({
        patientId: patient.id,
        type: uploadForm.type,
        title: uploadForm.title,
        description: uploadForm.description,
        fileUrl: fileUrl
      });

      if (!result.success || !result.document) {
        throw new Error(result.error || 'Erreur lors de la création du document');
      }

      // Ajouter le nouveau document à la liste
      const newRecord: MedicalRecord = {
        id: result.document.id,
        type: uploadForm.type,
        title: uploadForm.title,
        description: uploadForm.description || 'Document médical',
        date: result.document.createdAt.toISOString(),
        fileUrl: fileUrl
      };

      setRecords(prev => [newRecord, ...prev]);
      
      // Réinitialiser le formulaire
      setUploadForm({
        type: '',
        title: '',
        description: '',
        file: null
      });
      
      setShowUploadModal(false);
      
      toast({
        title: "Succès",
        description: "Document ajouté avec succès",
        variant: "default"
      });
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le document",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  // Fonction pour réinitialiser le formulaire
  const handleCancelUpload = () => {
    setUploadForm({
      type: '',
      title: '',
      description: '',
      file: null
    });
    setShowUploadModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-base-content/70">Chargement des dossiers médicaux...</p>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    // Si l'utilisateur est un médecin, afficher un message différent
    if (user?.role === 'MEDECIN' || user?.role === 'DOCTEUR') {
      return (
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Dossiers médicaux</h1>
            <p className="text-base-content/70">Accédez aux dossiers de vos patients</p>
          </div>

          <Card>
            <CardContent className="p-8 text-center">
              <User className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sélectionnez un patient</h3>
              <p className="text-base-content/70 mb-4">
                Pour consulter les dossiers médicaux, veuillez sélectionner un patient depuis votre tableau de bord.
              </p>
              <Button onClick={() => router.push('/medecin/dossier')}>
                Aller aux dossiers patients
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Pour les patients, afficher le message d'abonnement
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Dossiers médicaux</h1>
          <p className="text-base-content/70">Accédez à vos documents médicaux en toute sécurité</p>
        </div>

        <Card>
          <CardContent className="p-8 text-center">
            <Lock className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Accès restreint</h3>
            <p className="text-base-content/70 mb-4">
              Cette fonctionnalité nécessite un abonnement pour accéder à vos dossiers médicaux.
            </p>
            <Button onClick={() => window.location.href = '/payment/subscribe'}>
              S&apos;abonner pour débloquer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Dossiers médicaux</h1>
        <p className="text-base-content/70">
          {user?.role === 'MEDECIN' || user?.role === 'DOCTEUR' 
            ? 'Accédez aux dossiers de vos patients' 
            : 'Accédez à vos documents médicaux en toute sécurité'
          }
        </p>
      </div>

      {/* Barre de recherche et actions */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50 w-4 h-4" />
            <Input
              placeholder={
                user?.role === 'MEDECIN' || user?.role === 'DOCTEUR'
                  ? "Rechercher dans les dossiers patients..."
                  : "Rechercher dans vos dossiers..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {user?.role === 'MEDECIN' || user?.role === 'DOCTEUR' ? (
              <Button variant="outline" onClick={() => router.push('/medecin/dossier')}>
                <FolderOpen className="w-4 h-4 mr-2" />
                Voir dossiers patients
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => router.push('/patient/dossier')}>
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Voir dossier
                </Button>
                <Button onClick={() => setShowUploadModal(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Ajouter un document
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Liste des dossiers */}
      {filteredRecords.length > 0 ? (
        <div className="grid gap-4">
          {filteredRecords.map((record) => (
            <Card key={record.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{record.title}</h3>
                      <p className="text-base-content/70 mb-2">{record.description}</p>
                      <div className="flex items-center gap-4 text-sm text-base-content/60">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(record.date).toLocaleDateString('fr-FR')}
                        </span>
                        <Badge variant="outline">{record.type}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.fileUrl && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDownload(record)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleView(record)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-16 h-16 text-base-content/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun dossier</h3>
            <p className="text-base-content/70 mb-4">
              {user?.role === 'MEDECIN' || user?.role === 'DOCTEUR'
                ? 'Aucun dossier patient disponible. Sélectionnez un patient pour voir ses dossiers.'
                : searchTerm 
                  ? 'Aucun dossier ne correspond à votre recherche.' 
                  : 'Vous n\'avez pas encore de dossiers médicaux.'
              }
            </p>
            {user?.role !== 'MEDECIN' && user?.role !== 'DOCTEUR' && !searchTerm && (
              <Button onClick={() => setShowUploadModal(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Ajouter votre premier document
              </Button>
            )}
            {(user?.role === 'MEDECIN' || user?.role === 'DOCTEUR') && (
              <Button onClick={() => router.push('/medecin/dossier')}>
                <FolderOpen className="w-4 h-4 mr-2" />
                Aller aux dossiers patients
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal d'upload */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un document médical</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Type de document *</label>
              <select 
                className="w-full p-2 border rounded-md"
                value={uploadForm.type}
                onChange={(e) => setUploadForm(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="">Sélectionner un type</option>
                <option value="prescription">Ordonnance</option>
                <option value="exam">Résultat d&apos;examen</option>
                <option value="report">Compte-rendu</option>
                <option value="certificate">Certificat médical</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Titre *</label>
              <Input 
                placeholder="Titre du document" 
                value={uploadForm.title}
                onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea 
                className="w-full p-2 border rounded-md" 
                rows={3}
                placeholder="Description du document..."
                value={uploadForm.description}
                onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Fichier *</label>
              <div className="border-2 border-dashed border-base-content/20 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-base-content/40 mx-auto mb-2" />
                <p className="text-sm text-base-content/70">
                  {uploadForm.file ? uploadForm.file.name : "Glissez-déposez votre fichier ici ou cliquez pour sélectionner"}
                </p>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  className="hidden" 
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Sélectionner un fichier
                </Button>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleCancelUpload}>
                Annuler
              </Button>
              <Button 
                onClick={handleUploadSubmit}
                disabled={uploading || !uploadForm.type || !uploadForm.title || !uploadForm.file}
              >
                {uploading ? 'Ajout en cours...' : 'Ajouter le document'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MedicalRecordsSection; 