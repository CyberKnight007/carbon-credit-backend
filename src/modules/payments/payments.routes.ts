import { Router, Response, NextFunction, Request } from "express";
import { prisma } from "../../config/database";
import { authenticate, requireRole, AuthRequest } from "../../middleware/auth.middleware";
import { createPaymentIntent, confirmProjectFunding } from "../../services/payment.service";
import { AppError } from "../../middleware/error.middleware";
import { config } from "../../config";

const router = Router();

function getStripe() {
  if (config.stripe.secretKey && !config.stripe.secretKey.includes("placeholder")) {
    const Stripe = require("stripe");
    return new Stripe(config.stripe.secretKey, { apiVersion: "2023-10-16" });
  }
  return null;
}

// Create payment intent to fund a project
router.post(
  "/fund-project",
  authenticate,
  requireRole("ORGANIZATION"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { projectId, amount } = req.body;
      const org = await prisma.organization.findUnique({ where: { userId: req.user!.id } });
      if (!org) throw new AppError("Organization not found", 404);

      const intent = await createPaymentIntent(org.id, projectId, amount);

      // For dev mock, auto-confirm immediately
      if ((intent as any).id?.startsWith("mock_")) {
        await confirmProjectFunding((intent as any).id, org.id, projectId, amount);
        return res.json({ message: "Project funded successfully (dev mode)", amount });
      }

      res.json({ clientSecret: (intent as any).client_secret, paymentIntentId: (intent as any).id });
    } catch (err) {
      next(err);
    }
  }
);

// Stripe webhook
router.post(
  "/webhook",
  async (req: Request, res: Response, next: NextFunction) => {
    const stripe = getStripe();
    if (!stripe) return res.json({ received: true });

    const sig = req.headers["stripe-signature"] as string;
    try {
      const event = stripe.webhooks.constructEvent(
        (req as any).rawBody || req.body,
        sig,
        config.stripe.webhookSecret
      );
      if (event.type === "payment_intent.succeeded") {
        const pi = event.data.object as any;
        confirmProjectFunding(pi.id).catch(console.error);
      }
      res.json({ received: true });
    } catch (err) {
      next(err);
    }
  }
);

// Get my payouts (farmer)
router.get(
  "/payouts/my",
  authenticate,
  requireRole("FARMER"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const farmer = await prisma.farmer.findUnique({ where: { userId: req.user!.id } });
      if (!farmer) throw new AppError("Farmer not found", 404);

      const payouts = await prisma.payout.findMany({
        where: { farmerId: farmer.id },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      });
      res.json({ payouts, totalEarnings: farmer.totalEarnings, pendingEarnings: farmer.pendingEarnings });
    } catch (err) {
      next(err);
    }
  }
);

// Get certificates for org
router.get(
  "/certificates",
  authenticate,
  requireRole("ORGANIZATION"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const org = await prisma.organization.findUnique({ where: { userId: req.user!.id } });
      if (!org) throw new AppError("Organization not found", 404);

      const certificates = await prisma.carbonCertificate.findMany({
        where: { organizationId: org.id },
        include: { project: { select: { title: true } } },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      });
      res.json({ certificates, totalCredits: org.totalCreditsEarned });
    } catch (err) {
      next(err);
    }
  }
);

// Connect Stripe account (farmer onboarding)
router.post(
  "/connect-stripe",
  authenticate,
  requireRole("FARMER"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const stripe = getStripe();
      if (!stripe) {
        return res.json({ message: "Stripe not configured. Bank payouts will be manual.", onboardingUrl: null });
      }

      const farmer = await prisma.farmer.findUnique({ where: { userId: req.user!.id } });
      if (!farmer) throw new AppError("Farmer not found", 404);

      const account = await stripe.accounts.create({
        type: "express",
        email: req.user!.email,
        metadata: { farmerId: farmer.id },
      });

      const link = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${config.frontendUrl}/app/earnings?stripe=refresh`,
        return_url: `${config.frontendUrl}/app/earnings?stripe=success`,
        type: "account_onboarding",
      });

      await prisma.farmer.update({
        where: { id: farmer.id },
        data: { stripeAccountId: account.id },
      });

      res.json({ onboardingUrl: link.url });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
