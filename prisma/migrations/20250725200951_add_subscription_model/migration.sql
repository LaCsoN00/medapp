-- CreateTable
CREATE TABLE "Subscription" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "medicalLocationId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_patientId_medicalLocationId_key" ON "Subscription"("patientId", "medicalLocationId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_medicalLocationId_fkey" FOREIGN KEY ("medicalLocationId") REFERENCES "MedicalLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
