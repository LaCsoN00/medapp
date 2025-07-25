import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import type { Patient, Medecin } from '../app/types';

interface AppointmentWithMedecin {
  id: number;
  date: string;
  status: string;
  medecin: Medecin;
}

interface AppointmentWithPatient {
  id: number;
  date: string;
  status: string;
  patient: Patient;
}

export function useMessagingInterlocutor() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [interlocutor, setInterlocutor] = useState<Medecin | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      if (!user) {
        setLoading(false);
        return;
      }
      if (user.role === 'PATIENT') {
        // Récupérer le patient connecté
        const res = await fetch('/api/patient/current', {
          headers: { 'authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (data.patient && data.patient.appointments && data.patient.appointments.length > 0) {
          // Filtrer les rendez-vous confirmés, trier par date décroissante
          const confirmed = (data.patient.appointments as AppointmentWithMedecin[]).filter((a) => a.status === 'CONFIRMED');
          confirmed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          if (confirmed.length > 0) {
            setInterlocutor(confirmed[0].medecin);
          }
        }
      } else if (user.role === 'MEDECIN' || user.role === 'DOCTEUR') {
        // Récupérer le médecin connecté et ses rendez-vous
        const res = await fetch(`/api/medecin/current`, {
          headers: { 'authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (data.medecin && data.medecin.appointments) {
          // Extraire tous les patients uniques
          const uniquePatients: Record<string, Patient> = {};
          (data.medecin.appointments as AppointmentWithPatient[]).forEach((a) => {
            if (a.patient) uniquePatients[a.patient.id] = a.patient;
          });
          setPatients(Object.values(uniquePatients));
        }
      }
      setLoading(false);
    }
    fetchData();
  }, [user]);

  return { loading, interlocutor, patients };
} 