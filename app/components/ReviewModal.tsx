'use client';

import { useState } from 'react';
import { Star, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '../../hooks/use-toast';
import { createReview } from '@/actions';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: (shouldReload?: boolean) => void;
  medecin: {
    id: number;
    firstName: string;
    lastName: string;
    speciality: {
      name: string;
      icon: string;
    };
  };
  patientId: number;
  appointmentId?: number;
}

const ReviewModal = ({ isOpen, onClose, medecin, patientId, appointmentId }: ReviewModalProps) => {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "⭐ Note manquante",
        description: "Veuillez sélectionner une note entre 1 et 5 étoiles",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      await createReview({
        patientId,
        medecinId: medecin.id,
        rating,
        comment: comment.trim() || undefined,
        appointmentId
      });

      toast({
        title: "🎉 Avis envoyé !",
        description: `Merci pour votre évaluation du Dr. ${medecin.lastName}`,
        duration: 4000,
      });

      // Réinitialiser le formulaire
      setRating(0);
      setComment('');
      
      // Fermer le modal et indiquer qu'il faut recharger les données
      onClose(true);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'avis:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible d'envoyer votre avis. Veuillez réessayer.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Réinitialiser le formulaire
    setRating(0);
    setComment('');
    onClose(false);
  };

  const handleClose = () => {
    // Réinitialiser le formulaire
    setRating(0);
    setComment('');
    onClose(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-base-100 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Évaluer le médecin
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Informations du médecin */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-primary text-primary-content">
                {medecin.firstName.charAt(0)}{medecin.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-semibold">
                Dr. {medecin.firstName} {medecin.lastName}
              </h4>
              <p className="text-primary">{medecin.speciality.name}</p>
            </div>
          </div>

          {/* Système de notation */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-3 block">
                Votre note (obligatoire)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-colors"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= (hoveredRating || rating)
                          ? 'text-yellow-500 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {rating === 0 && "Sélectionnez une note"}
                {rating === 1 && "Très mauvais"}
                {rating === 2 && "Mauvais"}
                {rating === 3 && "Moyen"}
                {rating === 4 && "Bon"}
                {rating === 5 && "Excellent"}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Votre commentaire (optionnel)
              </label>
              <Textarea
                placeholder="Partagez votre expérience avec ce médecin..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {comment.length}/500 caractères
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={rating === 0 || loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <div className="loading loading-spinner loading-sm mr-2"></div>
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal; 