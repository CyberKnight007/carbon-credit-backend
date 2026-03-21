import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/database";
import { authenticate, requireRole, AuthRequest } from "../../middleware/auth.middleware";
import { AppError } from "../../middleware/error.middleware";

const router = Router();

const createProjectSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  targetTreeCount: z.number().int().positive(),
  species: z.string().min(1),
  pricePerTreePerMonth: z.number().positive(),
  totalBudget: z.number().positive(),
  country: z.string(),
  regionLat: z.number().optional(),
  regionLng: z.number().optional(),
  regionRadiusKm: z.number().optional(),
  co2PerTreePerYear: z.number().optional(),
});

// List projects (public browse for farmers, own for orgs)
router.get("/", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any =
      req.user!.role === "ORGANIZATION"
        ? { organization: { userId: req.user!.id } }
        : { status: "ACTIVE" };

    if (status) where.status = status;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: { organization: { select: { companyName: true, country: true } }, _count: { select: { trees: true } } },
      }),
      prisma.project.count({ where }),
    ]);

    res.json({ projects, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
});

// Get single project
router.get("/:id", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        organization: { select: { companyName: true, country: true, logoUrl: true } },
        trees: {
          take: 100,
          select: { id: true, lat: true, lng: true, species: true, status: true },
        },
        _count: { select: { trees: true } },
      },
    });
    if (!project) throw new AppError("Project not found", 404);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

// Create project (orgs only)
router.post(
  "/",
  authenticate,
  requireRole("ORGANIZATION"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const body = createProjectSchema.parse(req.body);
      const org = await prisma.organization.findUnique({ where: { userId: req.user!.id } });
      if (!org) throw new AppError("Organization profile not found", 404);

      const project = await prisma.project.create({
        data: {
          ...body,
          organizationId: org.id,
          remainingBudget: body.totalBudget,
          status: "ACTIVE",
        },
      });
      res.status(201).json(project);
    } catch (err) {
      next(err);
    }
  }
);

// Update project status
router.patch(
  "/:id/status",
  authenticate,
  requireRole("ORGANIZATION", "ADMIN"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body;
      const project = await prisma.project.update({
        where: { id: req.params.id },
        data: { status },
      });
      res.json(project);
    } catch (err) {
      next(err);
    }
  }
);

// Get project stats
router.get(
  "/:id/stats",
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const [treesCount, submissionsCount, approvedSubmissions] = await Promise.all([
        prisma.tree.count({ where: { projectId: req.params.id, status: "ACTIVE" } }),
        prisma.submission.count({ where: { tree: { projectId: req.params.id } } }),
        prisma.submission.count({
          where: { tree: { projectId: req.params.id }, status: "APPROVED" },
        }),
      ]);

      const project = await prisma.project.findUnique({ where: { id: req.params.id } });
      if (!project) throw new AppError("Project not found", 404);

      const co2Kg = treesCount * (project.co2PerTreePerYear / 12);
      const credits = co2Kg / 1000;

      res.json({ treesCount, submissionsCount, approvedSubmissions, co2Kg, credits });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
