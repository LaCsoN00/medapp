'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Appointment {
  id: number;
  date: Date;
  reason?: string | null;
  status: string;
  patient: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    photo?: string | null;
  };
  medecin: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    photo?: string | null;
    speciality: {
      id: number;
      name: string;
      icon: string;
    };
  };
}

interface ValidationNotificationProps {
  pendingAppointments: Appointment[];
  onValidateAll: () => void;
  onValidateOne: (appointmentId: number) => void;
}

const ValidationNotification = ({ 
  pendingAppointments, 
  onValidateAll, 
  onValidateOne 
}: ValidationNotificationProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Afficher la notification si il y a des consultations à valider
    setIsVisible(pendingAppointments.length > 0);
  }, [pendingAppointments.length]);

  if (!isVisible) return null;

  return (
    <Card className="mb-6 bg-warning/10 border-warning/20 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-warning-content">
          <AlertTriangle className="w-5 h-5" />
          Consultations à valider
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-warning-content/80">
            Vous avez {pendingAppointments.length} consultation(s) confirmée(s) qui nécessitent une validation.
          </p>
          
          <div className="space-y-2">
            {pendingAppointments.slice(0, 3).map((appointment) => (
              <div key={appointment.id} className="flex items-center justify-between p-3 bg-base-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-warning" />
                  <div>
                    <p className="font-medium text-sm">
                      {appointment.patient.firstName} {appointment.patient.lastName}
                    </p>
                    <p className="text-xs text-base-content/70">
                      {new Date(appointment.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    À valider
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => onValidateOne(appointment.id)}
                    className="bg-success hover:bg-success-focus text-success-content"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Valider
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {pendingAppointments.length > 3 && (
            <p className="text-sm text-warning-content/70">
              ... et {pendingAppointments.length - 3} autre(s) consultation(s)
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              onClick={onValidateAll}
              className="bg-success hover:bg-success-focus text-success-content"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Valider toutes ({pendingAppointments.length})
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsVisible(false)}
              className="text-warning-content"
            >
              Fermer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ValidationNotification; 