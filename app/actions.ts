"use server"

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

type Role = 'PATIENT' | 'MEDECIN' | 'DOCTEUR';

// --- AUTHENTIFICATION ---
export async function registerUser({ email, password, role }: { email: string; password: string; role: Role }) {
  if (!email || !password || !role) {
    return { success: false, error: 'Champs manquants.' };
  }
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { success: false, error: 'Email déjà utilisé.' };
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashedPassword, role },
  });
  return { success: true, user: { id: user.id, email: user.email, role: user.role } };
}

export async function loginUser({ email, password }: { email: string; password: string }) {
  if (!email || !password) {
    return { success: false, error: 'Champs manquants.' };
  }
  const user = await prisma.user.findUnique({ 
    where: { email },
    include: {
      patient: true,
      medecin: true
    }
  });
  if (!user) {
    return { success: false, error: 'Utilisateur non trouvé.' };
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return { success: false, error: 'Mot de passe incorrect.' };
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  // Mettre à jour le statut du médecin à la connexion
  if ((user.role === 'MEDECIN' || user.role === 'DOCTEUR') && user.medecin) {
    await setMedecinStatus(user.medecin.id, 'AVAILABLE', 'AUTO');
  }
  // Inclure les informations du profil selon le rôle
  const userWithProfile = {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.patient?.firstName || user.medecin?.firstName || '',
    lastName: user.patient?.lastName || user.medecin?.lastName || '',
    phone: user.patient?.phone || user.medecin?.phone || '',
    photo: user.patient?.photo || user.medecin?.photo || ''
  };
  return { success: true, token, user: userWithProfile };
}

// Action de logout pour mettre à jour le statut du médecin
export async function logoutUser(userId: number, role: Role) {
  if (role === 'MEDECIN' || role === 'DOCTEUR') {
    const medecin = await prisma.medecin.findUnique({ where: { userId } });
    if (medecin) {
      await setMedecinStatus(medecin.id, 'UNAVAILABLE', 'AUTO');
    }
  }
  // Ici, tu peux aussi gérer la suppression du token côté client si besoin
  return { success: true };
}

// --- PATIENTS ---
export async function createPatient(data: { firstName: string; lastName: string; email: string; phone?: string; userId?: number }) {
  return prisma.patient.create({ data });
}
export async function getPatientById(id: number) {
  return prisma.patient.findUnique({ where: { id }, include: { medicalRecord: true, appointments: true, prescriptions: true, payments: true } });
}

export async function getPatientByUserId(userId: number) {
  console.log('getPatientByUserId: Recherche patient pour userId:', userId);
  const patient = await prisma.patient.findUnique({ 
    where: { userId }, 
    include: { medicalRecord: true, appointments: true, prescriptions: true, payments: true } 
  });
  console.log('getPatientByUserId: Patient trouvé:', patient);
  return patient;
}
export async function getPatients() {
  return prisma.patient.findMany();
}
export async function updatePatient(id: number, data: Partial<{ firstName: string; lastName: string; email: string; phone?: string; userId?: number }>) {
  return prisma.patient.update({ where: { id }, data });
}
export async function deletePatient(id: number) {
  return prisma.patient.delete({ where: { id } });
}

// --- SPECIALITIES ---
export async function getSpecialities() {
  // Vérifier s'il y a des spécialités, sinon en créer
  const existingSpecialities = await prisma.speciality.findMany();
  
  if (existingSpecialities.length === 0) {
    console.log('Aucune spécialité trouvée, création des spécialités de base...');
    
    const defaultSpecialities = [
      {
        name: 'Médecine générale',
        icon: '👨‍⚕️',
        description: 'Médecine générale et soins primaires'
      },
      {
        name: 'Cardiologie',
        icon: '❤️',
        description: 'Spécialité du cœur et des vaisseaux sanguins'
      },
      {
        name: 'Dermatologie',
        icon: '🩺',
        description: 'Spécialité de la peau et des muqueuses'
      },
      {
        name: 'Gynécologie',
        icon: '👩‍⚕️',
        description: 'Spécialité de la santé féminine'
      },
      {
        name: 'Pédiatrie',
        icon: '👶',
        description: 'Spécialité des enfants et adolescents'
      },
      {
        name: 'Orthopédie',
        icon: '🦴',
        description: 'Spécialité des os et articulations'
      },
      {
        name: 'Neurologie',
        icon: '🧠',
        description: 'Spécialité du système nerveux'
      },
      {
        name: 'Psychiatrie',
        icon: '🧠',
        description: 'Spécialité de la santé mentale'
      },
      {
        name: 'Ophtalmologie',
        icon: '👁️',
        description: 'Spécialité des yeux et de la vision'
      },
      {
        name: 'Dentisterie',
        icon: '🦷',
        description: 'Spécialité de la santé bucco-dentaire'
      }
    ];

    for (const speciality of defaultSpecialities) {
      await prisma.speciality.create({
        data: speciality
      });
    }
    
    console.log('Spécialités de base créées avec succès');
  }

  return prisma.speciality.findMany({
    include: {
      _count: {
        select: { medecins: true }
      }
    },
    orderBy: { name: 'asc' }
  });
}

export async function getSpecialityById(id: number) {
  return prisma.speciality.findUnique({ 
    where: { id },
    include: { medecins: true }
  });
}

// --- MEDECINS ---
export async function createMedecin(data: { 
  firstName: string; 
  lastName: string; 
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  experience?: string;
  languages?: string;
  specialityId: number;
  userId: number;
}) {
  // Vérifier si la spécialité existe, sinon créer "Médecine générale"
  let specialityId = data.specialityId;
  
  try {
    const speciality = await prisma.speciality.findUnique({
      where: { id: specialityId }
    });
    
    if (!speciality) {
      // Créer "Médecine générale" par défaut
      const defaultSpeciality = await prisma.speciality.upsert({
        where: { name: 'Médecine générale' },
        update: {},
        create: {
          name: 'Médecine générale',
          icon: '👨‍⚕️',
          description: 'Médecine générale et soins primaires'
        }
      });
      specialityId = defaultSpeciality.id;
    }
  } catch (error) {
    console.error('Erreur lors de la vérification/création de la spécialité:', error);
  }

  return prisma.medecin.create({ 
    data: { ...data, specialityId },
    include: { speciality: true }
  });
}

export async function getMedecinById(id: number) {
  return prisma.medecin.findUnique({ 
    where: { id }, 
    include: { 
      user: true,
      speciality: true,
      appointments: {
        include: { patient: true }
      }
    }
  });
}

export async function getMedecinByUserId(userId: number) {
  console.log('getMedecinByUserId: Recherche médecin pour userId:', userId);
  const medecin = await prisma.medecin.findUnique({ 
    where: { userId }, 
    include: { 
      user: true,
      speciality: true,
      appointments: {
        include: { 
          patient: {
            include: {
              prescriptions: true
            }
          } 
        }
      },
      prescriptions: {
        include: {
          patient: true
        }
      }
    }
  });
  console.log('getMedecinByUserId: Médecin trouvé:', medecin);
  return medecin;
}

// Définition du type Medecin pour usage interne
type MedecinWithStatus = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  rating: number;
  reviews: number;
  experience?: string | null;
  languages?: string | null;
  speciality: {
    id: number;
    name: string;
    icon: string;
  };
  status: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
  statusMode: 'AUTO' | 'MANUAL';
  _count: {
    appointments: number;
  };
};

// Fonction utilitaire pour mettre à jour le statut AUTO des médecins
async function updateMedecinAutoStatus(medecin: MedecinWithStatus) {
  if (medecin.statusMode !== 'AUTO') return medecin;
  // Chercher le prochain rendez-vous confirmé
  const now = new Date();
  const appointments = await prisma.appointment.findMany({
    where: {
      medecinId: medecin.id,
      status: 'CONFIRMED',
      date: {
        lte: new Date(now.getTime() + 30 * 60000), // dans les 30 prochaines minutes
        gte: new Date(now.getTime() - 30 * 60000)  // dans les 30 dernières minutes
      }
    }
  });
  let newStatus: 'AVAILABLE' | 'BUSY' = 'AVAILABLE';
  if (appointments.length > 0) {
    newStatus = 'BUSY';
  }
  if (medecin.status !== newStatus) {
    await prisma.medecin.update({ where: { id: medecin.id }, data: { status: newStatus } });
    medecin.status = newStatus;
  }
  return medecin;
}

export async function getMedecins(filters?: {
  specialityId?: number;
  city?: string;
  search?: string;
}) {
  const where: {
    specialityId?: number;
    city?: { contains: string; mode: 'insensitive' };
    OR?: Array<{
      firstName?: { contains: string; mode: 'insensitive' };
      lastName?: { contains: string; mode: 'insensitive' };
      speciality?: { name: { contains: string; mode: 'insensitive' } };
    }>;
  } = {};
  
  if (filters?.specialityId) {
    where.specialityId = filters.specialityId;
  }
  
  if (filters?.city) {
    where.city = { contains: filters.city, mode: 'insensitive' };
  }
  
  if (filters?.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
      { speciality: { name: { contains: filters.search, mode: 'insensitive' } } }
    ];
  }

  const medecins = await prisma.medecin.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      rating: true,
      reviews: true,
      experience: true,
      languages: true,
      speciality: {
        select: {
          id: true,
          name: true,
          icon: true
        }
      },
      status: true,
      statusMode: true,
      _count: {
        select: { appointments: true }
      }
    },
    orderBy: { rating: 'desc' }
  });
  // Mettre à jour le statut AUTO si besoin
  const medecinsWithStatus = await Promise.all(
    medecins.map(m => updateMedecinAutoStatus({
      ...m,
      status: m.status as "AVAILABLE" | "BUSY" | "UNAVAILABLE",
      statusMode: m.statusMode as "AUTO" | "MANUAL"
    }))
  );
  return medecinsWithStatus;
}

export async function updateMedecin(id: number, data: Partial<{ 
  firstName: string; 
  lastName: string; 
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  rating?: number;
  reviews?: number;
  experience?: string;
  languages?: string;
  specialityId?: number;
}>) {
  return prisma.medecin.update({ 
    where: { id }, 
    data,
    include: { speciality: true }
  });
}

export async function deleteMedecin(id: number) {
  return prisma.medecin.delete({ where: { id } });
}

// --- APPOINTMENTS ---
export async function createAppointment(data: { 
  patientId: number; 
  medecinId: number;
  date: Date; 
  reason?: string; 
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
}) {
  return prisma.appointment.create({ 
    data,
    include: { 
      patient: true,
      medecin: {
        include: { speciality: true }
      }
    }
  });
}

export async function getAppointmentById(id: number) {
  return prisma.appointment.findUnique({ 
    where: { id }, 
    include: { 
      patient: true,
      medecin: {
        include: { speciality: true }
      }
    }
  });
}

export async function getAppointments(filters?: {
  patientId?: number;
  medecinId?: number;
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
}) {
  const where: {
    patientId?: number;
    medecinId?: number;
    status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  } = {};
  
  if (filters?.patientId) {
    where.patientId = filters.patientId;
  }
  
  if (filters?.medecinId) {
    where.medecinId = filters.medecinId;
  }
  
  if (filters?.status) {
    where.status = filters.status;
  }

  return prisma.appointment.findMany({
    where,
    include: { 
      patient: true,
      medecin: {
        include: { speciality: true }
      }
    },
    orderBy: { date: 'asc' }
  });
}

export async function updateAppointment(id: number, data: Partial<{ 
  date: Date; 
  reason?: string; 
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
}>) {
  return prisma.appointment.update({ 
    where: { id }, 
    data,
    include: { 
      patient: true,
      medecin: {
        include: { speciality: true }
      }
    }
  });
}

// Suppression d'une consultation
export async function deleteAppointment(id: number) {
  await prisma.appointment.delete({ where: { id } });
}

// --- PRESCRIPTIONS ---
export async function createPrescription(data: { patientId: number; medecinId: number; medication: string; dosage: string; renewal?: boolean }) {
  return prisma.prescription.create({ data });
}
export async function getPrescriptionById(id: number) {
  return prisma.prescription.findUnique({ where: { id }, include: { patient: true, medecin: true } });
}
export async function getPrescriptions(filters?: { patientId?: number; medecinId?: number }) {
  const where: { patientId?: number; medecinId?: number } = {};
  if (filters?.patientId) where.patientId = filters.patientId;
  if (filters?.medecinId) where.medecinId = filters.medecinId;
  
  return prisma.prescription.findMany({
    where,
    include: {
      medecin: {
        include: {
          speciality: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}
export async function updatePrescription(id: number, data: Partial<{ medication: string; dosage: string; renewal?: boolean }>) {
  return prisma.prescription.update({ where: { id }, data });
}

// Suppression d'une prescription
export async function deletePrescription(id: number) {
  await prisma.prescription.delete({ where: { id } });
}

// --- PRESCRIPTION REQUESTS ---
// Déclare manuellement l'enum si elle n'est pas générée par Prisma
export type PrescriptionRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'; // adapte selon ton schéma

export async function createPrescriptionRequest(data: { patientId: number; medecinId: number; motif: string }) {
  return prisma.prescriptionRequest.create({
    data,
    include: { patient: true, medecin: true }
  });
}

export async function getPrescriptionRequests(filters?: { patientId?: number; medecinId?: number; status?: PrescriptionRequestStatus }) {
  const where: {
    patientId?: number;
    medecinId?: number;
    status?: PrescriptionRequestStatus;
  } = {};
  if (filters?.patientId) where.patientId = filters.patientId;
  if (filters?.medecinId) where.medecinId = filters.medecinId;
  if (filters?.status) where.status = filters.status;
  return prisma.prescriptionRequest.findMany({
    where,
    include: { patient: true, medecin: true, prescription: true },
    orderBy: { createdAt: 'desc' }
  });
}

export async function updatePrescriptionRequest(id: number, data: Partial<{ status: PrescriptionRequestStatus; prescriptionId: number }>) {
  return prisma.prescriptionRequest.update({
    where: { id },
    data,
    include: { patient: true, medecin: true, prescription: true }
  });
}

// --- PAYMENTS ---
export async function createPayment(data: { patientId: number; amount: number; method: string; date?: Date; details?: string }) {
  return prisma.payment.create({ data });
}
export async function getPaymentById(id: number) {
  return prisma.payment.findUnique({ where: { id }, include: { patient: true } });
}
export async function getPayments(filters?: { patientId?: number }) {
  const where: { patientId?: number } = {};
  
  if (filters?.patientId) {
    where.patientId = filters.patientId;
  }

  return prisma.payment.findMany({ 
    where,
    include: { patient: true },
    orderBy: { date: 'desc' }
  });
}
export async function updatePayment(id: number, data: Partial<{ amount: number; method: string; date?: Date }>) {
  return prisma.payment.update({ where: { id }, data });
}
export async function deletePayment(id: number) {
  return prisma.payment.delete({ where: { id } });
}

// --- MEDICAL RECORDS ---
export async function createMedicalRecord(data: { patientId: number; notes?: string }) {
  return prisma.medicalRecord.create({ data });
}
export async function getMedicalRecordByPatientId(patientId: number) {
  return prisma.medicalRecord.findUnique({ 
    where: { patientId }, 
    include: { 
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          photo: true
        }
      } 
    }
  });
}
export async function updateMedicalRecord(id: number, data: Partial<{ notes?: string }>) {
  return prisma.medicalRecord.update({ where: { id }, data });
}
export async function deleteMedicalRecord(id: number) {
  return prisma.medicalRecord.delete({ where: { id } });
}

// --- MEDICAL LOCATIONS ---
export async function createMedicalLocation(data: { name: string; address: string; latitude: number; longitude: number; type: string }) {
  return prisma.medicalLocation.create({ data });
}
export async function getMedicalLocationById(id: number) {
  return prisma.medicalLocation.findUnique({ where: { id } });
}
export async function getMedicalLocations() {
  return prisma.medicalLocation.findMany();
}
export async function updateMedicalLocation(id: number, data: Partial<{ name: string; address: string; latitude: number; longitude: number; type: string }>) {
  return prisma.medicalLocation.update({ where: { id }, data });
}
export async function deleteMedicalLocation(id: number) {
  return prisma.medicalLocation.delete({ where: { id } });
} 

// --- REVIEWS & RATINGS ---
export async function initializeMedecinRatings() {
  try {
    // Mettre à jour tous les médecins avec des valeurs par défaut
    const result = await prisma.medecin.updateMany({
      where: {
        OR: [
          { rating: { equals: 0 } },
          { reviews: { equals: 0 } }
        ]
      },
      data: {
        rating: 0,
        reviews: 0
      }
    });

    console.log(`${result.count} médecins initialisés avec des valeurs par défaut`);
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des notes:', error);
  }
}

export async function createReview(data: { 
  patientId: number; 
  medecinId: number; 
  rating: number; 
  comment?: string; 
  appointmentId?: number;
}) {
  try {
    console.log('🔍 Création d\'avis avec les données:', data);
    
    // Créer l'avis
    const review = await prisma.review.create({
      data: {
        patientId: data.patientId,
        medecinId: data.medecinId,
        rating: data.rating,
        comment: data.comment,
        appointmentId: data.appointmentId
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    console.log('✅ Avis créé avec succès:', review);

    // Mettre à jour la note moyenne du médecin
    console.log('🔄 Mise à jour de la note moyenne pour le médecin:', data.medecinId);
    await updateMedecinRating(data.medecinId);

    // Vérifier la mise à jour
    const updatedMedecin = await prisma.medecin.findUnique({
      where: { id: data.medecinId },
      select: { rating: true, reviews: true }
    });
    console.log('📊 Médecin mis à jour:', updatedMedecin);

    return review;
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'avis:', error);
    throw error;
  }
}

export async function getReviewsByMedecinId(medecinId: number) {
  return prisma.review.findMany({
    where: { medecinId },
    include: {
      patient: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getReviewByPatientAndMedecin(patientId: number, medecinId: number) {
  return prisma.review.findFirst({
    where: { 
      patientId,
      medecinId
    }
  });
}

export async function updateMedecinRating(medecinId: number) {
  try {
    console.log('🔄 Début de la mise à jour de la note pour le médecin:', medecinId);
    
    // Calculer la nouvelle note moyenne
    const reviews = await prisma.review.findMany({
      where: { medecinId },
      select: { rating: true }
    });

    console.log('📝 Avis trouvés pour ce médecin:', reviews);

    if (reviews.length === 0) {
      console.log('⚠️ Aucun avis trouvé pour ce médecin');
      return;
    }

    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    console.log('📊 Note moyenne calculée:', averageRating);

    // Mettre à jour le médecin
    const updatedMedecin = await prisma.medecin.update({
      where: { id: medecinId },
      data: {
        rating: Math.round(averageRating * 10) / 10, // Arrondir à 1 décimale
        reviews: reviews.length
      }
    });

    console.log('✅ Médecin mis à jour avec succès:', {
      id: updatedMedecin.id,
      rating: updatedMedecin.rating,
      reviews: updatedMedecin.reviews
    });
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour de la note:', error);
  }
} 

export async function debugReviews() {
  try {
    console.log('🔍 === DÉBOGAGE DES AVIS ===');
    
    // Vérifier tous les avis
    const allReviews = await prisma.review.findMany({
      include: {
        patient: {
          select: { firstName: true, lastName: true }
        },
        medecin: {
          select: { firstName: true, lastName: true, rating: true, reviews: true }
        }
      }
    });
    
    console.log('📝 Tous les avis en base:', allReviews);
    
    // Vérifier tous les médecins
    const allMedecins = await prisma.medecin.findMany({
      select: { id: true, firstName: true, lastName: true, rating: true, reviews: true }
    });
    
    console.log('👨‍⚕️ Tous les médecins:', allMedecins);
    
    return { reviews: allReviews, medecins: allMedecins };
  } catch (error) {
    console.error('❌ Erreur lors du débogage:', error);
    return null;
  }
} 

// Changer le statut et le mode d'un médecin
export async function setMedecinStatus(medecinId: number, status: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE', statusMode: 'AUTO' | 'MANUAL') {
  return prisma.medecin.update({
    where: { id: medecinId },
    data: { status, statusMode },
    select: { id: true, status: true, statusMode: true }
  });
}

// Lire le statut et le mode d'un médecin
export async function getMedecinStatus(medecinId: number) {
  return prisma.medecin.findUnique({
    where: { id: medecinId },
    select: { id: true, status: true, statusMode: true }
  });
} 

// --- WORKING HOURS ---
export async function createMedecinWorkingHour(data: { medecinId: number; dayOfWeek: number; startTime: string; endTime: string }) {
  return prisma.medecinWorkingHour.create({ data });
}

export async function getMedecinWorkingHours(medecinId: number) {
  return prisma.medecinWorkingHour.findMany({ where: { medecinId } });
}

export async function updateMedecinWorkingHour(id: number, data: Partial<{ dayOfWeek: number; startTime: string; endTime: string }>) {
  return prisma.medecinWorkingHour.update({ where: { id }, data });
}

export async function deleteMedecinWorkingHour(id: number) {
  return prisma.medecinWorkingHour.delete({ where: { id } });
} 

// Types pour HealthData
export type HealthData = {
  id: number;
  patientId: number;
  label: string;
  value: string;
  status: string;
  date: string; // string, pas Date
  icon?: string;
};

// Récupérer les données de santé d'un patient
export async function getHealthData(patientId: number): Promise<HealthData[]> {
  const data = await prisma.healthData.findMany({
    where: { patientId },
    orderBy: { date: 'desc' },
  });
  return data.map(d => ({ ...d, date: d.date.toISOString(), icon: typeof d.icon === 'string' ? d.icon : undefined }));
}

// Ajouter une donnée de santé
export async function addHealthData(data: { patientId: number; label: string; value: string; status: string; date: Date; icon?: string }): Promise<HealthData> {
  const created = await prisma.healthData.create({ data });
  return { ...created, date: created.date.toISOString(), icon: typeof created.icon === 'string' ? created.icon : undefined };
} 

// Suppression d'une healthData
export async function deleteHealthData(id: number) {
  await prisma.healthData.delete({ where: { id } });
} 

// --- PROFIL UTILISATEUR ---
export async function getUserProfile(userId: number) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        patient: true,
        medecin: {
          include: {
            speciality: true,
            workingHours: true,
            reviews_list: {
              select: {
                rating: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return { success: false, error: 'Utilisateur non trouvé.' };
    }

    return { success: true, profile: user };
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    return { success: false, error: 'Erreur lors de la récupération du profil.' };
  }
}

// --- GESTION DES PHOTOS DE PROFIL ---
export async function updateProfilePhoto(userId: number, photoUrl: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { patient: true, medecin: true }
    });

    if (!user) {
      console.error('[updateProfilePhoto] Utilisateur non trouvé pour userId:', userId);
      return { success: false, error: 'Utilisateur non trouvé.' };
    }

    if (user.patient) {
      console.log('[updateProfilePhoto] Patient trouvé pour userId:', userId, '-> patient.id:', user.patient.id);
      const updated = await prisma.patient.update({
        where: { userId: userId },
        data: { photo: photoUrl }
      });
      console.log('[updateProfilePhoto] Patient mis à jour:', updated);
    } else if (user.medecin) {
      console.log('[updateProfilePhoto] Médecin trouvé pour userId:', userId, '-> medecin.id:', user.medecin.id);
      const updated = await prisma.medecin.update({
        where: { userId: userId },
        data: { photo: photoUrl }
      });
      console.log('[updateProfilePhoto] Médecin mis à jour:', updated);
    } else {
      console.error('[updateProfilePhoto] Aucun profil patient ou médecin pour userId:', userId);
      return { success: false, error: 'Aucun profil patient ou médecin trouvé.' };
    }

    return { success: true, photoUrl };
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la photo:', error);
    return { success: false, error: 'Erreur lors de la mise à jour de la photo.' };
  }
}

// Mise à jour des types pour inclure la photo
export async function updatePatientProfile(userId: number, data: {
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  city?: string;
  photo?: string;
}) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { patient: true }
    });

    if (!user || !user.patient) {
      return { success: false, error: 'Profil patient non trouvé.' };
    }

    const updatedPatient = await prisma.patient.update({
      where: { userId: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        address: data.address,
        city: data.city
      }
    });

    return { success: true, profile: updatedPatient };
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil patient:', error);
    return { success: false, error: 'Erreur lors de la mise à jour du profil.' };
  }
}

export async function updateMedecinProfile(userId: number, data: {
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  city?: string;
  photo?: string;
  specialityId?: number;
  experience?: string;
  languages?: string;
  education?: string;
  about?: string;
}) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { medecin: true }
    });

    if (!user || !user.medecin) {
      return { success: false, error: 'Profil médecin non trouvé.' };
    }

    const updatedMedecin = await prisma.medecin.update({
      where: { userId: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        address: data.address,
        city: data.city,
        specialityId: data.specialityId || user.medecin.specialityId,
        experience: data.experience,
        languages: data.languages,
        education: data.education,
        about: data.about
      },
      include: {
        speciality: true,
        workingHours: true,
        reviews_list: {
          select: {
            rating: true
          }
        }
      }
    });

    return { success: true, profile: updatedMedecin };
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil médecin:', error);
    return { success: false, error: 'Erreur lors de la mise à jour du profil.' };
  }
}

export async function updateMedecinWorkingHours(medecinId: number, workingHours: {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}[]) {
  try {
    // Supprimer les horaires existants
    await prisma.medecinWorkingHour.deleteMany({
      where: { medecinId }
    });

    // Ajouter les nouveaux horaires
    const newHours = await Promise.all(
      workingHours.map(hour =>
        prisma.medecinWorkingHour.create({
          data: {
            medecinId,
            dayOfWeek: hour.dayOfWeek,
            startTime: hour.startTime,
            endTime: hour.endTime
          }
        })
      )
    );

    return { success: true, workingHours: newHours };
  } catch (error) {
    console.error('Erreur lors de la mise à jour des horaires:', error);
    return { success: false, error: 'Erreur lors de la mise à jour des horaires.' };
  }
} 

/**
 * Types d'abonnement disponibles
 */
export type SubscriptionType = 'INDIVIDUAL' | 'FAMILY' | 'STRUCTURE';

/**
 * Vérifie si un patient a un abonnement actif
 * @param patientId ID du patient
 * @param type Type d'abonnement spécifique à vérifier (optionnel)
 * @returns Booléen indiquant si le patient a un abonnement actif
 */
export async function hasActiveSubscription(patientId: number, type?: SubscriptionType): Promise<boolean> {
  try {
    // Construire la requête de base
    const query: {
      patientId: number;
      status: string;
      type?: SubscriptionType;
      OR: { endDate: null | { gt: Date } }[];
    } = {
      patientId,
      status: 'ACTIVE',
      OR: [
        { endDate: null }, // Abonnement sans date de fin
        { endDate: { gt: new Date() } } // Date de fin dans le futur
      ]
    };
    
    // Si un type spécifique est demandé, l'ajouter à la requête
    if (type) {
      query.type = type;
    }
    
    // Vérifier si le patient a au moins un abonnement actif
    const activeSubscription = await prisma.subscription.findFirst({
      where: query
    });
    
    return !!activeSubscription;
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'abonnement:', error);
    return false;
  }
}

/**
 * Vérifie si un patient peut accéder à une fonctionnalité
 * @param patientId ID du patient
 * @param feature Nom de la fonctionnalité à vérifier
 * @returns Booléen indiquant si le patient peut accéder à la fonctionnalité
 */
export async function canAccessFeature(patientId: number, feature: 'medical_exams' | 'prescriptions' | 'medical_records' | 'appointments'): Promise<boolean> {
  // Pour les abonnés, toutes les fonctionnalités sont disponibles sans restriction
  const hasSubscription = await hasActiveSubscription(patientId);
  if (hasSubscription) {
    return true;
  }
  
  // Vérifier si le patient existe
  const patient = await prisma.patient.findUnique({
    where: { id: patientId }
  });
  
  if (!patient) return false;
  
  // Appliquer des restrictions selon la fonctionnalité
  switch (feature) {
    case 'medical_exams': {
      // Limiter à 2 examens médicaux par mois pour les non-abonnés
      const examCount = await prisma.medicalExam.count({
        where: {
          patientId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 derniers jours
          }
        }
      });
      return examCount < 2;
    }
    
    case 'prescriptions': {
      // Limiter à 3 prescriptions par mois pour les non-abonnés
      const prescriptionCount = await prisma.prescription.count({
        where: {
          patientId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 derniers jours
          }
        }
      });
      return prescriptionCount < 3;
    }
    
    case 'medical_records':
      // Accès limité aux dossiers médicaux (consultation uniquement)
      return true; // Accès en lecture seule géré côté frontend
    
    case 'appointments': {
      // Limiter à 1 rendez-vous par mois pour les non-abonnés
      const appointmentCount = await prisma.appointment.count({
        where: {
          patientId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 derniers jours
          }
        }
      });
      return appointmentCount < 1;
    }
    
    default:
      return false;
  }
}

/**
 * Crée un nouvel abonnement pour un patient
 * @param data Données de l'abonnement
 * @returns L'abonnement créé
 */
export async function createSubscription(data: { 
  patientId: number; 
  medicalLocationId: number; 
  type: SubscriptionType;
  endDate?: Date | null;
  familyMembers?: number[]; // IDs des patients membres de la famille (pour type FAMILY)
  structureDetails?: string; // Détails de la structure (pour type STRUCTURE)
}) {
  // Vérifier si un abonnement actif existe déjà
  const existingSubscription = await prisma.subscription.findFirst({
    where: {
      patientId: data.patientId,
      status: 'ACTIVE',
      OR: [
        { endDate: null },
        { endDate: { gt: new Date() } }
      ]
    }
  });

  if (existingSubscription) {
    // Mettre à jour l'abonnement existant
    return prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        medicalLocationId: data.medicalLocationId,
        type: data.type,
        endDate: data.endDate,
        familyMembers: data.familyMembers ? JSON.stringify(data.familyMembers) : undefined,
        structureDetails: data.structureDetails
      }
    });
  } else {
    // Créer un nouvel abonnement
    return prisma.subscription.create({
      data: {
        patientId: data.patientId,
        medicalLocationId: data.medicalLocationId,
        type: data.type,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: data.endDate,
        familyMembers: data.familyMembers ? JSON.stringify(data.familyMembers) : undefined,
        structureDetails: data.structureDetails
      }
    });
  }
}

// --- MEDICAL EXAMS ---
export async function createMedicalExam(data: { 
  patientId: number; 
  medecinId: number; 
  name: string; 
  description: string; 
  status?: string;
  date?: Date;
}) {
  return prisma.medicalExam.create({ 
    data,
    include: { 
      patient: true,
      medecin: true
    }
  });
}

export async function getMedicalExamById(id: number) {
  return prisma.medicalExam.findUnique({ 
    where: { id },
    include: { 
      patient: true,
      medecin: true,
      results: true
    }
  });
}

export async function getMedicalExams(filters?: { 
  patientId?: number; 
  medecinId?: number;
  status?: string;
}) {
  const where: {
    patientId?: number;
    medecinId?: number;
    status?: string;
  } = {};
  
  if (filters?.patientId) where.patientId = filters.patientId;
  if (filters?.medecinId) where.medecinId = filters.medecinId;
  if (filters?.status) where.status = filters.status;

  return prisma.medicalExam.findMany({
    where,
    include: { 
      patient: true,
      medecin: true,
      results: true
    },
    orderBy: { date: 'desc' }
  });
}

export async function updateMedicalExam(id: number, data: Partial<{ 
  name: string; 
  description: string; 
  status: string;
  date: Date;
}>) {
  return prisma.medicalExam.update({ 
    where: { id },
    data,
    include: { 
      patient: true,
      medecin: true,
      results: true
    }
  });
}

export async function deleteMedicalExam(id: number) {
  return prisma.medicalExam.delete({ where: { id } });
}

// --- EXAM RESULTS ---
export async function createExamResult(data: { 
  examId: number; 
  title: string; 
  content: string;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
}) {
  return prisma.examResult.create({ 
    data: {
      examId: data.examId,
      title: data.title,
      content: data.content,
      fileUrl: data.fileUrl,
      fileType: data.fileType,
      fileName: data.fileName
    } 
  });
}

export async function getExamResultById(id: number) {
  return prisma.examResult.findUnique({ 
    where: { id },
    include: { exam: true }
  });
}

export async function getExamResults(examId: number) {
  return prisma.examResult.findMany({
    where: { examId },
    orderBy: { createdAt: 'desc' }
  });
}

export async function updateExamResult(id: number, data: Partial<{ 
  title: string; 
  content: string;
  fileUrl?: string;
}>) {
  return prisma.examResult.update({ 
    where: { id },
    data
  });
}

export async function deleteExamResult(id: number) {
  return prisma.examResult.delete({ where: { id } });
} 

// --- AUTOMATIC BILLING ---

/**
 * Facture automatiquement un examen médical
 * @param patientId ID du patient
 * @param examId ID de l'examen médical
 * @returns Objet contenant le paiement créé ou une erreur
 */
export async function billMedicalExam(patientId: number, examId: number) {
  try {
    // Vérifier si le patient a un abonnement actif
    const isSubscribed = await hasActiveSubscription(patientId);
    
    // Si le patient a un abonnement actif, pas besoin de facturer
    if (isSubscribed) {
      return { success: true, message: "Patient abonné, aucune facturation nécessaire" };
    }
    
    // Sinon, créer un paiement pour l'examen (500 FCFA)
    const payment = await createPayment({
      patientId,
      amount: 500, // Montant fixe pour un examen médical
      method: "automatic_billing",
      details: `Facturation automatique pour l'examen médical #${examId}`
    });
    
    return { success: true, payment };
  } catch (error) {
    console.error('Erreur lors de la facturation de l\'examen:', error);
    return { success: false, error: 'Erreur lors de la facturation.' };
  }
}

/**
 * Facture automatiquement une ordonnance
 * @param patientId ID du patient
 * @param prescriptionId ID de l'ordonnance
 * @returns Objet contenant le paiement créé ou une erreur
 */
export async function billPrescription(patientId: number, prescriptionId: number) {
  try {
    // Vérifier si le patient a un abonnement actif
    const isSubscribed = await hasActiveSubscription(patientId);
    
    // Si le patient a un abonnement actif, pas besoin de facturer
    if (isSubscribed) {
      return { success: true, message: "Patient abonné, aucune facturation nécessaire" };
    }
    
    // Sinon, créer un paiement pour l'ordonnance (500 FCFA)
    const payment = await createPayment({
      patientId,
      amount: 500, // Montant fixe pour une ordonnance
      method: "automatic_billing",
      details: `Facturation automatique pour l'ordonnance #${prescriptionId}`
    });
    
    return { success: true, payment };
  } catch (error) {
    console.error('Erreur lors de la facturation de l\'ordonnance:', error);
    return { success: false, error: 'Erreur lors de la facturation.' };
  }
} 

// --- DOCUMENTS MEDICAUX ---
export async function createMedicalDocument(data: {
  patientId: number;
  type: string;
  title: string;
  description?: string;
  fileUrl: string;
}) {
  try {
    // Créer un nouveau document médical
    const document = await prisma.medicalDocument.create({
      data: {
        patientId: data.patientId,
        type: data.type,
        title: data.title,
        description: data.description,
        fileUrl: data.fileUrl,
        createdAt: new Date()
      }
    });

    return { success: true, document };
  } catch (error) {
    console.error('Erreur lors de la création du document médical:', error);
    return { success: false, error: 'Erreur lors de la création du document.' };
  }
}

export async function getMedicalDocumentsByPatientId(patientId: number) {
  try {
    const documents = await prisma.medicalDocument.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' }
    });

    return documents;
  } catch (error) {
    console.error('Erreur lors de la récupération des documents médicaux:', error);
    return [];
  }
}

export async function deleteMedicalDocument(id: number) {
  try {
    await prisma.medicalDocument.delete({
      where: { id }
    });
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la suppression du document médical:', error);
    return { success: false, error: 'Erreur lors de la suppression du document.' };
  }
} 