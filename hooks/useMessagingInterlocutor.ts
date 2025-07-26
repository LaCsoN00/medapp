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
        console.log('🔍 Recherche du médecin référent pour le patient:', user.id);
        // Récupérer le patient connecté
        const res = await fetch('/api/patient/current', {
          headers: { 'authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        console.log('📋 Données patient récupérées:', data);
        
        if (data.patient && data.patient.appointments && data.patient.appointments.length > 0) {
          console.log('📅 Rendez-vous trouvés:', data.patient.appointments.length);
          
          // Priorité 1: Rendez-vous confirmés
          const confirmed = (data.patient.appointments as AppointmentWithMedecin[]).filter((a) => a.status === 'CONFIRMED');
          confirmed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          console.log('✅ Rendez-vous confirmés:', confirmed.length);
          
          if (confirmed.length > 0) {
            console.log('👨‍⚕️ Médecin référent trouvé (confirmé):', confirmed[0].medecin);
            setInterlocutor(confirmed[0].medecin);
          } else {
            // Priorité 2: Rendez-vous en attente
            const pending = (data.patient.appointments as AppointmentWithMedecin[]).filter((a) => a.status === 'PENDING');
            pending.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            console.log('⏳ Rendez-vous en attente:', pending.length);
            
            if (pending.length > 0) {
              console.log('👨‍⚕️ Médecin référent trouvé (en attente):', pending[0].medecin);
              setInterlocutor(pending[0].medecin);
            } else {
              // Priorité 3: Rendez-vous terminés
              const completed = (data.patient.appointments as AppointmentWithMedecin[]).filter((a) => a.status === 'COMPLETED');
              completed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              console.log('✅ Rendez-vous terminés:', completed.length);
              
              if (completed.length > 0) {
                console.log('👨‍⚕️ Médecin référent trouvé (terminé):', completed[0].medecin);
                setInterlocutor(completed[0].medecin);
              } else {
                console.log('❌ Aucun médecin référent trouvé');
              }
            }
          }
        } else {
          console.log('❌ Aucun rendez-vous trouvé pour le patient');
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