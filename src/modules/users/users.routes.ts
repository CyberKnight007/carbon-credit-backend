import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../../config/database";
import { authenticate, AuthRequest } from "../../middleware/auth.middleware";
import { AppError } from "../../middleware/error.middleware";
import { sendEmail } from "../../services/email.service";

const router = Router();

// PATCH /api/users/profile - update farmer fullName/country or org companyName/country
const profileSchema = z.object({
  fullName: z.string().min(1).optional(),
  companyName: z.string().min(1).optional(),
  country: z.string().min(2).optional(),
});

router.patch("/profile", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = profileSchema.parse(req.body);
    const userId = req.user!.id;
    const role = req.user!.role;

    if (role === "FARMER") {
      const updated = await prisma.farmer.update({
        where: { userId },
        data: {
          ...(body.fullName !== undefined && { fullName: body.fullName }),
          ...(body.country !== undefined && { country: body.country }),
        },
      });
      return res.json(updated);
    }

    if (role === "ORGANIZATION") {
      const updated = await prisma.organization.update({
        where: { userId },
        data: {
          ...(body.companyName !== undefined && { companyName: body.companyName }),
          ...(body.country !== undefined && { country: body.country }),
        },
      });
      return res.json(updated);
    }

    throw new AppError("Profile update not supported for this role", 400);
  } catch (err) {
    next(err);
  }
});

// POST /api/users/kyc-request - flag account for admin KYC review
const kycRequestSchema = z.object({
  note: z.string().min(1).max(500).optional(),
});

router.post("/kyc-request", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = kycRequestSchema.parse(req.body);
    const userId = req.user!.id;
    const role = req.user!.role;

    const note = body.note || "User requested KYC review";

    if (role === "FARMER") {
      await prisma.farmer.update({
        where: { userId },
        data: { idDocument: note },
      });
    } else if (role === "ORGANIZATION") {
      await prisma.organization.update({
        where: { userId },
        data: { description: note },
      });
    } else {
      throw new AppError("KYC request not supported for this role", 400);
    }

    res.json({ message: "KYC request submitted. An admin will review your account shortly." });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/forgot-password - send OTP for password reset
const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

router.post("/forgot-password", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond 200 to avoid email enumeration
    if (!user) {
      return res.json({ message: "If that email exists, a reset code has been sent." });
    }

    // Invalidate any existing unused FORGOT_PASSWORD OTPs
    await prisma.otp.updateMany({
      where: { userId: user.id, type: "FORGOT_PASSWORD", used: false },
      data: { used: true },
    });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await prisma.otp.create({
      data: {
        userId: user.id,
        code,
        type: "FORGOT_PASSWORD",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    });

    await sendEmail(
      email,
      "Your password reset code",
      `<p>Your password reset code is: <strong>${code}</strong></p><p>This code is valid for 15 minutes.</p>`
    );

    res.json({ message: "If that email exists, a reset code has been sent." });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password - reset password with OTP
const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(8),
});

router.post("/reset-password", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, code, newPassword } = resetPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError("Invalid or expired reset code", 400);

    const otp = await prisma.otp.findFirst({
      where: {
        userId: user.id,
        code,
        type: "FORGOT_PASSWORD",
        used: false,
        expiresAt: { gt: new Date() },
      },
    });
    if (!otp) throw new AppError("Invalid or expired reset code", 400);

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.otp.update({ where: { id: otp.id }, data: { used: true } }),
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    ]);

    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    next(err);
  }
});

export default router;
