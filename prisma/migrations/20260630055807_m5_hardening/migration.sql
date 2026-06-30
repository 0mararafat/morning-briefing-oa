-- AlterTable
ALTER TABLE "UserConfig" ADD COLUMN     "lastRunAt" TIMESTAMP(3),
ADD COLUMN     "lastRunError" TEXT,
ADD COLUMN     "lastRunStatus" TEXT;

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);
