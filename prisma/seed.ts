import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Admin
  const adminHash = await bcrypt.hash("Admin@123456", 12);
  await prisma.user.upsert({
    where: { email: "admin@carboncredit.com" },
    update: {},
    create: { email: "admin@carboncredit.com", passwordHash: adminHash, role: "ADMIN", isVerified: true },
  });

  // Organization
  const orgHash = await bcrypt.hash("Test@123456", 12);
  const orgUser = await prisma.user.upsert({
    where: { email: "org@test.com" },
    update: {},
    create: {
      email: "org@test.com", passwordHash: orgHash, role: "ORGANIZATION", isVerified: true,
      organization: {
        create: { companyName: "GreenTech Corp", country: "US", escrowBalance: 50000, isKycVerified: true },
      },
    },
    include: { organization: true },
  });

  // Farmer
  const farmerHash = await bcrypt.hash("Test@123456", 12);
  const farmerUser = await prisma.user.upsert({
    where: { email: "farmer@test.com" },
    update: {},
    create: {
      email: "farmer@test.com", passwordHash: farmerHash, role: "FARMER", isVerified: true,
      farmer: { create: { fullName: "John Farmer", country: "IN", isKycVerified: true } },
    },
    include: { farmer: true },
  });

  // Sample project
  if (orgUser.organization) {
    const existingProject = await prisma.project.findFirst({
      where: { organizationId: orgUser.organization.id },
    });

    if (!existingProject) {
      const project = await prisma.project.create({
        data: {
          organizationId: orgUser.organization.id,
          title: "Amazon Reforestation 2024",
          description: "Plant native tree species in deforested Amazon regions to offset corporate carbon emissions.",
          targetTreeCount: 1000,
          species: "oak,mangrove,bamboo",
          pricePerTreePerMonth: 8,
          totalBudget: 96000,
          remainingBudget: 96000,
          country: "BR",
          regionLat: -3.4653,
          regionLng: -62.2159,
          regionRadiusKm: 200,
          status: "ACTIVE",
        },
      });

      // Sample tree for the farmer
      if (farmerUser.farmer) {
        await prisma.tree.create({
          data: {
            farmerId: farmerUser.farmer.id,
            projectId: project.id,
            species: "oak",
            lat: -3.4653,
            lng: -62.2159,
            address: "Amazonas, Brazil",
            status: "ACTIVE",
          },
        });

        await prisma.project.update({
          where: { id: project.id },
          data: { currentTreeCount: 1 },
        });
      }
    }
  }

  console.log("✅ Seed complete!");
  console.log("Admin:  admin@carboncredit.com / Admin@123456");
  console.log("Org:    org@test.com / Test@123456");
  console.log("Farmer: farmer@test.com / Test@123456");
}

main().catch(console.error).finally(() => prisma.$disconnect());
