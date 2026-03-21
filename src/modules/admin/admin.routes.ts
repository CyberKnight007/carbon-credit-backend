import { Router, Response, NextFunction } from "express";
import { prisma } from "../../config/database";
import { authenticate, requireRole, AuthRequest } from "../../middleware/auth.middleware";
import { processMonthlyPayouts } from "../../services/payment.service";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));

// Platform overview stats
router.get("/stats", async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [
      totalUsers, totalOrgs, totalFarmers, totalProjects,
      totalTrees, totalSubmissions, pendingReviews,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.farmer.count(),
      prisma.project.count(),
      prisma.tree.count(),
      prisma.submission.count(),
      prisma.submission.count({ where: { status: "ADMIN_REVIEW" } }),
    ]);

    const totalCredits = await prisma.carbonCertificate.aggregate({ _sum: { creditsAmount: true } });
    const totalPayouts = await prisma.payout.aggregate({
      _sum: { amount: true },
      where: { status: "COMPLETED" },
    });

    res.json({
      totalUsers, totalOrgs, totalFarmers, totalProjects,
      totalTrees, totalSubmissions, pendingReviews,
      totalCreditsIssued: totalCredits._sum.creditsAmount || 0,
      totalPayoutsCompleted: totalPayouts._sum.amount || 0,
    });
  } catch (err) {
    next(err);
  }
});

// List users with filters
router.get("/users", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const where: any = {};
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: { organization: { select: { companyName: true } }, farmer: { select: { fullName: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ users, total });
  } catch (err) {
    next(err);
  }
});

// Toggle user active status
router.patch("/users/:id/status", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: req.body.isActive },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// Verify KYC for farmer or org
router.patch("/kyc/:type/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { type, id } = req.params;
    if (type === "farmer") {
      await prisma.farmer.update({ where: { id }, data: { isKycVerified: true } });
    } else if (type === "organization") {
      await prisma.organization.update({ where: { id }, data: { isKycVerified: true } });
    }
    res.json({ message: "KYC verified" });
  } catch (err) {
    next(err);
  }
});

// Trigger monthly payout processing
router.post("/process-payouts", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { month, year } = req.body;
    await processMonthlyPayouts(Number(month), Number(year));
    res.json({ message: `Payouts for ${month}/${year} processed` });
  } catch (err) {
    next(err);
  }
});

// Get all projects (admin view)
router.get("/projects", async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        organization: { select: { companyName: true } },
        _count: { select: { trees: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

export default router;
