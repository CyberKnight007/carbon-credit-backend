"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../../config/database");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const payment_service_1 = require("../../services/payment.service");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)("ADMIN"));
// Platform overview stats
router.get("/stats", async (_req, res, next) => {
    try {
        const [totalUsers, totalOrgs, totalFarmers, totalProjects, totalTrees, totalSubmissions, pendingReviews,] = await Promise.all([
            database_1.prisma.user.count(),
            database_1.prisma.organization.count(),
            database_1.prisma.farmer.count(),
            database_1.prisma.project.count(),
            database_1.prisma.tree.count(),
            database_1.prisma.submission.count(),
            database_1.prisma.submission.count({ where: { status: "ADMIN_REVIEW" } }),
        ]);
        const totalCredits = await database_1.prisma.carbonCertificate.aggregate({ _sum: { creditsAmount: true } });
        const totalPayouts = await database_1.prisma.payout.aggregate({
            _sum: { amount: true },
            where: { status: "COMPLETED" },
        });
        res.json({
            totalUsers, totalOrgs, totalFarmers, totalProjects,
            totalTrees, totalSubmissions, pendingReviews,
            totalCreditsIssued: totalCredits._sum.creditsAmount || 0,
            totalPayoutsCompleted: totalPayouts._sum.amount || 0,
        });
    }
    catch (err) {
        next(err);
    }
});
// List users with filters
router.get("/users", async (req, res, next) => {
    try {
        const { role, page = 1, limit = 20 } = req.query;
        const where = {};
        if (role)
            where.role = role;
        const [users, total] = await Promise.all([
            database_1.prisma.user.findMany({
                where,
                skip: (Number(page) - 1) * Number(limit),
                take: Number(limit),
                include: { organization: { select: { companyName: true } }, farmer: { select: { fullName: true } } },
                orderBy: { createdAt: "desc" },
            }),
            database_1.prisma.user.count({ where }),
        ]);
        res.json({ users, total });
    }
    catch (err) {
        next(err);
    }
});
// Toggle user active status
router.patch("/users/:id/status", async (req, res, next) => {
    try {
        const user = await database_1.prisma.user.update({
            where: { id: req.params.id },
            data: { isActive: req.body.isActive },
        });
        res.json(user);
    }
    catch (err) {
        next(err);
    }
});
// Verify KYC for farmer or org
router.patch("/kyc/:type/:id", async (req, res, next) => {
    try {
        const { type, id } = req.params;
        if (type === "farmer") {
            await database_1.prisma.farmer.update({ where: { id }, data: { isKycVerified: true } });
        }
        else if (type === "organization") {
            await database_1.prisma.organization.update({ where: { id }, data: { isKycVerified: true } });
        }
        res.json({ message: "KYC verified" });
    }
    catch (err) {
        next(err);
    }
});
// Trigger monthly payout processing
router.post("/process-payouts", async (req, res, next) => {
    try {
        const { month, year } = req.body;
        await (0, payment_service_1.processMonthlyPayouts)(Number(month), Number(year));
        res.json({ message: `Payouts for ${month}/${year} processed` });
    }
    catch (err) {
        next(err);
    }
});
// Get all projects (admin view)
router.get("/projects", async (_req, res, next) => {
    try {
        const projects = await database_1.prisma.project.findMany({
            include: {
                organization: { select: { companyName: true } },
                _count: { select: { trees: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(projects);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=admin.routes.js.map