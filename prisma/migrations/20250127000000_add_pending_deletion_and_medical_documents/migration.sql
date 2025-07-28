-- CreateTable
CREATE TABLE "MedicalDocument" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalDocument_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ExamResult" ADD COLUMN "fileName" TEXT,
ALTER COLUMN "fileType" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Prescription" ADD COLUMN "pendingDeletion" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "MedicalDocument" ADD CONSTRAINT "MedicalDocument_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE; 