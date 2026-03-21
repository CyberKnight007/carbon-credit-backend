import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/database";
import { config } from "../../config";
import { AppError } from "../../middleware/error.middleware";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  auth: { user: config.smtp.user, pass: config.smtp.pass },
});

export function generateTokens(userId: string, role: string, email: string) {
  const accessToken = jwt.sign({ id: userId, role, email }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as any,
  });
  const refreshToken = jwt.sign({ id: userId }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as any,
  });
  return { accessToken, refreshToken };
}

export async function registerUser(data: {
  email: string;
  password: string;
  role: string;
  organizationData?: any;
  farmerData?: any;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError("Email already registered", 409);

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      role: data.role,
      organization:
        data.role === "ORGANIZATION" && data.organizationData
          ? { create: data.organizationData }
          : undefined,
      farmer:
        data.role === "FARMER" && data.farmerData
          ? { create: data.farmerData }
          : undefined,
    },
    include: { organization: true, farmer: true },
  });

  await sendVerificationEmail(user.id, user.email);
  const tokens = generateTokens(user.id, user.role, user.email);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { user, tokens };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { organization: true, farmer: true },
  });
  if (!user) throw new AppError("Invalid credentials", 401);
  if (!user.isActive) throw new AppError("Account suspended", 403);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError("Invalid credentials", 401);

  const tokens = generateTokens(user.id, user.role, user.email);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { user, tokens };
}

export async function refreshAccessToken(refreshToken: string) {
  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.expiresAt < new Date()) throw new AppError("Invalid refresh token", 401);

  const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as { id: string };
  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user) throw new AppError("User not found", 401);

  const accessToken = jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as any }
  );

  return { accessToken };
}

async function sendVerificationEmail(userId: string, email: string) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await prisma.otp.create({
    data: {
      userId,
      code,
      type: "EMAIL_VERIFY",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  if (config.smtp.user) {
    try {
      await transporter.sendMail({
        from: config.smtp.from,
        to: email,
        subject: "Verify your Carbon Credit Platform account",
        html: `<p>Your verification code is: <strong>${code}</strong></p><p>Valid for 24 hours.</p>`,
      });
    } catch (err) {
      console.warn("Email send failed (check SMTP config):", (err as Error).message);
    }
  } else {
    console.log(`[DEV] Verification code for ${email}: ${code}`);
  }
}

export async function verifyEmail(userId: string, code: string) {
  const otp = await prisma.otp.findFirst({
    where: { userId, code, type: "EMAIL_VERIFY", used: false, expiresAt: { gt: new Date() } },
  });
  if (!otp) throw new AppError("Invalid or expired verification code", 400);

  await prisma.$transaction([
    prisma.otp.update({ where: { id: otp.id }, data: { used: true } }),
    prisma.user.update({ where: { id: userId }, data: { isVerified: true } }),
  ]);
}
