-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "familyMembers" TEXT,
ADD COLUMN     "structureDetails" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'INDIVIDUAL';
