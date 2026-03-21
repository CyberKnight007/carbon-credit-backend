"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../../config/database");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const payment_service_1 = require("../../services/payment.service");
const error_middleware_1 = require("../../middleware/error.middleware");
const config_1 = require("../../config");
const router = (0, express_1.Router)();
function getStripe() {
    if (config_1.config.stripe.secretKey && !config_1.config.stripe.secretKey.includes("placeholder")) {
        const Stripe = require("stripe");
        return new Stripe(config_1.config.stripe.secretKey, { apiVersion: "2023-10-16" });
    }
    return null;
}
// Create payment intent to fund a project
router.post("/fund-project", auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)("ORGANIZATION"), async (req, res, next) => {
    try {
        const { projectId, amount } = req.body;
        const org = await database_1.prisma.organization.findUnique({ where: { userId: req.user.id } });
        if (!org)
            throw new error_middleware_1.AppError("Organization not found", 404);
        const intent = await (0, payment_service_1.createPaymentIntent)(org.id, projectId, amount);
        // For dev mock, auto-confirm immediately
        if (intent.id?.startsWith("mock_")) {
            await (0, payment_service_1.confirmProjectFunding)(intent.id, org.id, projectId, amount);
            return res.json({ message: "Project funded successfully (dev mode)", amount });
        }
        res.json({ clientSecret: intent.client_secret, paymentIntentId: intent.id });
    }
    catch (err) {
        next(err);
    }
});
// Stripe webhook
router.post("/webhook", async (req, res, next) => {
    const stripe = getStripe();
    if (!stripe)
        return res.json({ received: true });
    const sig = req.headers["stripe-signature"];
    try {
        const event = stripe.webhooks.constructEvent(req.rawBody || req.body, sig, config_1.config.stripe.webhookSecret);
        if (event.type === "payment_intent.succeeded") {
            const pi = event.data.object;
            (0, payment_service_1.confirmProjectFunding)(pi.id).catch(console.error);
        }
        res.json({ received: true });
    }
    catch (err) {
        next(err);
    }
});
// Get my payouts (farmer)
router.get("/payouts/my", auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)("FARMER"), async (req, res, next) => {
    try {
        const farmer = await database_1.prisma.farmer.findUnique({ where: { userId: req.user.id } });
        if (!farmer)
            throw new error_middleware_1.AppError("Farmer not found", 404);
        const payouts = await database_1.prisma.payout.findMany({
            where: { farmerId: farmer.id },
            orderBy: [{ year: "desc" }, { month: "desc" }],
        });
        res.json({ payouts, totalEarnings: farmer.totalEarnings, pendingEarnings: farmer.pendingEarnings });
    }
    catch (err) {
        next(err);
    }
});
// Get certificates for org
router.get("/certificates", auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)("ORGANIZATION"), async (req, res, next) => {
    try {
        const org = await database_1.prisma.organization.findUnique({ where: { userId: req.user.id } });
        if (!org)
            throw new error_middleware_1.AppError("Organization not found", 404);
        const certificates = await database_1.prisma.carbonCertificate.findMany({
            where: { organizationId: org.id },
            include: { project: { select: { title: true } } },
            orderBy: [{ year: "desc" }, { month: "desc" }],
        });
        res.json({ certificates, totalCredits: org.totalCreditsEarned });
    }
    catch (err) {
        next(err);
    }
});
// Connect Stripe account (farmer onboarding)
router.post("/connect-stripe", auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)("FARMER"), async (req, res, next) => {
    try {
        const stripe = getStripe();
        if (!stripe) {
            return res.json({ message: "Stripe not configured. Bank payouts will be manual.", onboardingUrl: null });
        }
        const farmer = await database_1.prisma.farmer.findUnique({ where: { userId: req.user.id } });
        if (!farmer)
            throw new error_middleware_1.AppError("Farmer not found", 404);
        const account = await stripe.accounts.create({
            type: "express",
            email: req.user.email,
            metadata: { farmerId: farmer.id },
        });
        const link = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `${config_1.config.frontendUrl}/app/earnings?stripe=refresh`,
            return_url: `${config_1.config.frontendUrl}/app/earnings?stripe=success`,
            type: "account_onboarding",
        });
        await database_1.prisma.farmer.update({
            where: { id: farmer.id },
            data: { stripeAccountId: account.id },
        });
        res.json({ onboardingUrl: link.url });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=payments.routes.js.map