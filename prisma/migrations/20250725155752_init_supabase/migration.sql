-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "userId" INTEGER,
    "address" TEXT,
    "city" TEXT,
    "photo" TEXT,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalRecord" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "medecinId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "medecinId" INTEGER NOT NULL,
    "medication" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "renewal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalLocation" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "province" TEXT,

    CONSTRAINT "MedicalLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Speciality" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Speciality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medecin" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviews" INTEGER NOT NULL DEFAULT 0,
    "experience" TEXT,
    "languages" TEXT,
    "specialityId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "statusMode" TEXT NOT NULL DEFAULT 'AUTO',
    "about" TEXT,
    "education" TEXT,
    "photo" TEXT,

    CONSTRAINT "Medecin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedecinWorkingHour" (
    "id" SERIAL NOT NULL,
    "medecinId" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "MedecinWorkingHour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "medecinId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "appointmentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionRequest" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "medecinId" INTEGER NOT NULL,
    "motif" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "prescriptionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrescriptionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthData" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "icon" TEXT,

    CONSTRAINT "HealthData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "new_Prescription" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "medecinId" INTEGER NOT NULL,
    "medication" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "renewal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "new_Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "senderId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lu" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_email_key" ON "Patient"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_userId_key" ON "Patient"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalRecord_patientId_key" ON "MedicalRecord"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Speciality_name_key" ON "Speciality"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Medecin_email_key" ON "Medecin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Medecin_userId_key" ON "Medecin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_appointmentId_key" ON "Review"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_patientId_medecinId_key" ON "Review"("patientId", "medecinId");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_medecinId_fkey" FOREIGN KEY ("medecinId") REFERENCES "Medecin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_medecinId_fkey" FOREIGN KEY ("medecinId") REFERENCES "Medecin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medecin" ADD CONSTRAINT "Medecin_specialityId_fkey" FOREIGN KEY ("specialityId") REFERENCES "Speciality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medecin" ADD CONSTRAINT "Medecin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedecinWorkingHour" ADD CONSTRAINT "MedecinWorkingHour_medecinId_fkey" FOREIGN KEY ("medecinId") REFERENCES "Medecin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_medecinId_fkey" FOREIGN KEY ("medecinId") REFERENCES "Medecin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionRequest" ADD CONSTRAINT "PrescriptionRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionRequest" ADD CONSTRAINT "PrescriptionRequest_medecinId_fkey" FOREIGN KEY ("medecinId") REFERENCES "Medecin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionRequest" ADD CONSTRAINT "PrescriptionRequest_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthData" ADD CONSTRAINT "HealthData_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "new_Prescription" ADD CONSTRAINT "new_Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "new_Prescription" ADD CONSTRAINT "new_Prescription_medecinId_fkey" FOREIGN KEY ("medecinId") REFERENCES "Medecin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
