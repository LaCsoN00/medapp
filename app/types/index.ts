export interface User {
  id: number;
  email: string;
  role: 'PATIENT' | 'MEDECIN' | 'DOCTEUR';
  patient?: Patient;
  medecin?: Medecin;
}

export interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  photo?: string;
  userId?: number;
  appointments?: Appointment[];
  prescriptions?: Prescription[];
  healthData?: HealthData[];
}

export interface Medecin {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  photo?: string;
  rating: number;
  reviews: number;
  experience?: string;
  education?: string;
  about?: string;
  languages?: string;
  specialityId: number;
  speciality?: Speciality;
  userId: number;
  workingHours?: WorkingHour[];
  reviews_list?: Review[];
}

export interface Speciality {
  id: number;
  name: string;
  icon: string;
  description?: string;
}

export interface WorkingHour {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  medecinId: number;
}

export interface Appointment {
  id: number;
  date: Date;
  reason?: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
}

export interface Prescription {
  id: number;
  medication: string;
  dosage: string;
  renewal: boolean;
  createdAt: Date;
  medecinId: number;
  medecin: Medecin;
}

export interface HealthData {
  id: number;
  label: string;
  value: string;
  status: string;
  date: Date;
}

export interface Review {
  id: number;
  rating: number;
  comment?: string;
  createdAt: Date;
} 