import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as authService from "./auth.service";
import { authenticate, AuthRequest } from "../../middleware/auth.middleware";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.string().refine(r => ["ORGANIZATION", "FARMER"].includes(r), "Invalid role"),
  companyName: z.string().optional(),
  country: z.string().min(2),
  fullName: z.string().optional(),
});

router.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = registerSchema.parse(req.body);
    const { user, tokens } = await authService.registerUser({
      email: body.email,
      password: body.password,
      role: body.role,
      organizationData:
        body.role === "ORGANIZATION"
          ? { companyName: body.companyName || "", country: body.country }
          : undefined,
      farmerData:
        body.role === "FARMER"
          ? { fullName: body.fullName || "", country: body.country }
          : undefined,
    });

    res.status(201).json({
      message: "Registration successful. Check your email for verification code.",
      tokens,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const { user, tokens } = await authService.loginUser(email, password);
    res.json({
      tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        profile: user.organization || user.farmer,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    const { accessToken } = await authService.refreshAccessToken(refreshToken);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/verify-email",
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await authService.verifyEmail(req.user!.id, req.body.code);
      res.json({ message: "Email verified successfully" });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/me",
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { prisma } = await import("../../config/database");
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: { organization: true, farmer: true },
      });
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
