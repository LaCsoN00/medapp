/*
  Warnings:

  - A unique constraint covering the columns `[name,address]` on the table `MedicalLocation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "MedicalLocation_name_address_key" ON "MedicalLocation"("name", "address");
