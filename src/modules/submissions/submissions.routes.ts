import { Router, Response, NextFunction } from "express";
import { prisma } from "../../config/database";
import { authenticate, requireRole, AuthRequest } from "../../middleware/auth.middleware";
import { upload, uploadToCloudinary } from "../../middleware/upload.middleware";
import { AppError } from "../../middleware/error.middleware";
import { verifyTreePhoto } from "../../services/ai.service";
import { sendEmail } from "../../services/email.service";
import axios from "axios";

const router = Router();

const MAX_DISTANCE_METERS = 100; // must be within 100m of registered tree location

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Submit daily photo for a tree
router.post(
  "/",
  authenticate,
  requireRole("FARMER"),
  upload.single("photo"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError("Photo is required", 400);

      const treeId = req.body.treeId;
      const lat = parseFloat(req.body.lat);
      const lng = parseFloat(req.body.lng);
      const accuracy = req.body.accuracy ? parseFloat(req.body.accuracy) : undefined;

      if (!treeId || isNaN(lat) || isNaN(lng))
        throw new AppError("treeId, lat, and lng are required", 400);

      const farmer = await prisma.farmer.findUnique({ where: { userId: req.user!.id } });
      if (!farmer) throw new AppError("Farmer profile not found", 404);

      const tree = await prisma.tree.findUnique({ where: { id: treeId } });
      if (!tree || tree.farmerId !== farmer.id) throw new AppError("Tree not found", 404);
      if (tree.status === "DEAD") throw new AppError("Cannot submit for a dead tree", 400);

      // Check if already submitted today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const existing = await prisma.submission.findFirst({
        where: { treeId, submittedAt: { gte: today } },
      });
      if (existing) throw new AppError("Already submitted for this tree today", 409);

      // Validate location
      const distance = haversineDistance(lat, lng, tree.lat, tree.lng);
      const locationValid = distance <= MAX_DISTANCE_METERS;

      // Upload photo to Cloudinary
      const uploaded = await uploadToCloudinary(req.file.buffer, "carbon-credit/submissions", {
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      });

      // Create submission as PENDING_AI
      const submission = await prisma.submission.create({
        data: {
          treeId,
          farmerId: farmer.id,
          photoUrl: uploaded.secure_url,
          lat,
          lng,
          accuracy,
          distanceFromTree: distance,
          locationValid,
          status: "PENDING_AI",
        },
      });

      // Run AI verification asynchronously
      verifyTreePhoto(submission.id, uploaded.secure_url).catch(console.error);

      res.status(201).json({
        submission,
        locationValid,
        distanceFromTree: Math.round(distance),
        message: locationValid
          ? "Photo submitted successfully. AI verification in progress."
          : "Warning: Location is far from registered tree position.",
      });
    } catch (err) {
      next(err);
    }
  }
);

// Get submissions for a tree
router.get(
  "/tree/:treeId",
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 30 } = req.query;
      const submissions = await prisma.submission.findMany({
        where: { treeId: req.params.treeId },
        orderBy: { submittedAt: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      });
      res.json(submissions);
    } catch (err) {
      next(err);
    }
  }
);

// Get my submissions (farmer)
router.get(
  "/my",
  authenticate,
  requireRole("FARMER"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const farmer = await prisma.farmer.findUnique({ where: { userId: req.user!.id } });
      if (!farmer) throw new AppError("Farmer profile not found", 404);

      const submissions = await prisma.submission.findMany({
        where: { farmerId: farmer.id },
        orderBy: { submittedAt: "desc" },
        take: 50,
        include: { tree: { select: { species: true, lat: true, lng: true } } },
      });
      res.json(submissions);
    } catch (err) {
      next(err);
    }
  }
);

// Admin: get pending review submissions
router.get(
  "/admin/pending",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const submissions = await prisma.submission.findMany({
        where: { status: "ADMIN_REVIEW" },
        orderBy: { submittedAt: "asc" },
        include: {
          tree: { select: { species: true, lat: true, lng: true } },
          farmer: { select: { fullName: true } },
        },
      });
      res.json(submissions);
    } catch (err) {
      next(err);
    }
  }
);

// Admin: approve or reject submission
router.patch(
  "/:id/review",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { approved, note } = req.body;
      const submission = await prisma.submission.update({
        where: { id: req.params.id },
        data: {
          status: approved ? "APPROVED" : "REJECTED",
          adminNote: note,
          reviewedBy: req.user!.id,
          reviewedAt: new Date(),
        },
        include: { farmer: { include: { user: true } } },
      });

      const farmerEmail = (submission.farmer as any)?.user?.email;
      if (farmerEmail) {
        if (approved) {
          await sendEmail(
            farmerEmail,
            "✅ Tree photo approved!",
            "<p>Your photo submission was approved. Keep up the great work!</p>"
          );
        } else {
          await sendEmail(
            farmerEmail,
            "❌ Tree photo needs review",
            "<p>Your submission was rejected. Please submit a clear photo of your tree.</p>"
          );
        }
      }

      res.json(submission);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
