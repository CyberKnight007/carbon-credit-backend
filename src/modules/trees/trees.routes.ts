import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/database";
import { authenticate, requireRole, AuthRequest } from "../../middleware/auth.middleware";
import { upload, uploadToCloudinary } from "../../middleware/upload.middleware";
import { AppError } from "../../middleware/error.middleware";

const router = Router();

const registerTreeSchema = z.object({
  species: z.string(),
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
  projectId: z.string().optional(),
});

// Get my trees (farmer)
router.get(
  "/my",
  authenticate,
  requireRole("FARMER"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const farmer = await prisma.farmer.findUnique({ where: { userId: req.user!.id } });
      if (!farmer) throw new AppError("Farmer profile not found", 404);

      const trees = await prisma.tree.findMany({
        where: { farmerId: farmer.id },
        include: {
          project: { select: { title: true, pricePerTreePerMonth: true, organization: { select: { companyName: true } } } },
          _count: { select: { submissions: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json(trees);
    } catch (err) {
      next(err);
    }
  }
);

// Get tree by ID with submission history
router.get("/:id", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tree = await prisma.tree.findUnique({
      where: { id: req.params.id },
      include: {
        submissions: { orderBy: { submittedAt: "desc" }, take: 30 },
        project: { select: { title: true, pricePerTreePerMonth: true } },
        farmer: { select: { fullName: true } },
      },
    });
    if (!tree) throw new AppError("Tree not found", 404);
    res.json(tree);
  } catch (err) {
    next(err);
  }
});

// Register a new tree (farmer)
router.post(
  "/",
  authenticate,
  requireRole("FARMER"),
  upload.single("photo"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const body = registerTreeSchema.parse({
        ...req.body,
        lat: parseFloat(req.body.lat),
        lng: parseFloat(req.body.lng),
      });

      const farmer = await prisma.farmer.findUnique({ where: { userId: req.user!.id } });
      if (!farmer) throw new AppError("Farmer profile not found", 404);

      let photoUrl: string | undefined;
      if (req.file) {
        const result = await uploadToCloudinary(req.file.buffer, "carbon-credit/trees");
        photoUrl = result.secure_url;
      }

      const tree = await prisma.tree.create({
        data: {
          farmerId: farmer.id,
          species: body.species,
          lat: body.lat,
          lng: body.lng,
          address: body.address,
          projectId: body.projectId || null,
          photoUrl,
          status: "PENDING_VERIFICATION",
        },
      });

      // If tied to project, update count
      if (body.projectId) {
        await prisma.project.update({
          where: { id: body.projectId },
          data: { currentTreeCount: { increment: 1 } },
        });
      }

      res.status(201).json(tree);
    } catch (err) {
      next(err);
    }
  }
);

// Get trees for a project (org view - map data)
router.get(
  "/project/:projectId",
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const trees = await prisma.tree.findMany({
        where: { projectId: req.params.projectId },
        select: {
          id: true, lat: true, lng: true, species: true, status: true,
          qrCode: true, plantedDate: true,
          farmer: { select: { fullName: true } },
          _count: { select: { submissions: true } },
        },
      });
      res.json(trees);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
