-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'FARMER',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "country" TEXT NOT NULL,
    "website" TEXT,
    "logoUrl" TEXT,
    "description" TEXT,
    "stripeCustomerId" TEXT,
    "escrowBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCreditsEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isKycVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Farmer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "idDocument" TEXT,
    "idDocumentUrl" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "bankRoutingNumber" TEXT,
    "stripeAccountId" TEXT,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pendingEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isKycVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Farmer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetTreeCount" INTEGER NOT NULL,
    "currentTreeCount" INTEGER NOT NULL DEFAULT 0,
    "species" TEXT NOT NULL DEFAULT 'mixed',
    "pricePerTreePerMonth" DOUBLE PRECISION NOT NULL,
    "totalBudget" DOUBLE PRECISION NOT NULL,
    "remainingBudget" DOUBLE PRECISION NOT NULL,
    "country" TEXT NOT NULL,
    "regionLat" DOUBLE PRECISION,
    "regionLng" DOUBLE PRECISION,
    "regionRadiusKm" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "co2PerTreePerYear" DOUBLE PRECISION NOT NULL DEFAULT 22,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tree" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "projectId" TEXT,
    "qrCode" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "plantedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "photoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "totalCredits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tree_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiScore" DOUBLE PRECISION,
    "aiLabels" TEXT,
    "aiVerified" BOOLEAN,
    "aiVerifiedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING_AI',
    "adminNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "distanceFromTree" DOUBLE PRECISION,
    "locationValid" BOOLEAN,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stripePaymentIntentId" TEXT,
    "stripeStatus" TEXT,
    "description" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "treesCount" INTEGER NOT NULL,
    "approvedDays" INTEGER NOT NULL,
    "stripeTransferId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarbonCertificate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "creditsAmount" DOUBLE PRECISION NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "treesCount" INTEGER NOT NULL,
    "co2Kg" DOUBLE PRECISION NOT NULL,
    "certificateUrl" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarbonCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Otp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Otp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_userId_key" ON "Organization"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Farmer_userId_key" ON "Farmer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Tree_qrCode_key" ON "Tree"("qrCode");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Farmer" ADD CONSTRAINT "Farmer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tree" ADD CONSTRAINT "Tree_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tree" ADD CONSTRAINT "Tree_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "Tree"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarbonCertificate" ADD CONSTRAINT "CarbonCertificate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarbonCertificate" ADD CONSTRAINT "CarbonCertificate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Otp" ADD CONSTRAINT "Otp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
