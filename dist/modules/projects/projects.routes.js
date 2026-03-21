"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const database_1 = require("../../config/database");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const error_middleware_1 = require("../../middleware/error.middleware");
const router = (0, express_1.Router)();
const createProjectSchema = zod_1.z.object({
    title: zod_1.z.string().min(3),
    description: zod_1.z.string().min(10),
    targetTreeCount: zod_1.z.number().int().positive(),
    species: zod_1.z.string().min(1),
    pricePerTreePerMonth: zod_1.z.number().positive(),
    totalBudget: zod_1.z.number().positive(),
    country: zod_1.z.string(),
    regionLat: zod_1.z.number().optional(),
    regionLng: zod_1.z.number().optional(),
    regionRadiusKm: zod_1.z.number().optional(),
    co2PerTreePerYear: zod_1.z.number().optional(),
});
// List projects (public browse for farmers, own for orgs)
router.get("/", auth_middleware_1.authenticate, async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = req.user.role === "ORGANIZATION"
            ? { organization: { userId: req.user.id } }
            : { status: "ACTIVE" };
        if (status)
            where.status = status;
        const [projects, total] = await Promise.all([
            database_1.prisma.project.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { createdAt: "desc" },
                include: { organization: { select: { companyName: true, country: true } }, _count: { select: { trees: true } } },
            }),
            database_1.prisma.project.count({ where }),
        ]);
        res.json({ projects, total, page: Number(page), limit: Number(limit) });
    }
    catch (err) {
        next(err);
    }
});
// Get single project
router.get("/:id", auth_middleware_1.authenticate, async (req, res, next) => {
    try {
        const project = await database_1.prisma.project.findUnique({
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
        if (!project)
            throw new error_middleware_1.AppError("Project not found", 404);
        res.json(project);
    }
    catch (err) {
        next(err);
    }
});
// Create project (orgs only)
router.post("/", auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)("ORGANIZATION"), async (req, res, next) => {
    try {
        const body = createProjectSchema.parse(req.body);
        const org = await database_1.prisma.organization.findUnique({ where: { userId: req.user.id } });
        if (!org)
            throw new error_middleware_1.AppError("Organization profile not found", 404);
        const project = await database_1.prisma.project.create({
            data: {
                ...body,
                organizationId: org.id,
                remainingBudget: body.totalBudget,
                status: "ACTIVE",
            },
        });
        res.status(201).json(project);
    }
    catch (err) {
        next(err);
    }
});
// Update project status
router.patch("/:id/status", auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)("ORGANIZATION", "ADMIN"), async (req, res, next) => {
    try {
        const { status } = req.body;
        const project = await database_1.prisma.project.update({
            where: { id: req.params.id },
            data: { status },
        });
        res.json(project);
    }
    catch (err) {
        next(err);
    }
});
// Get project stats
router.get("/:id/stats", auth_middleware_1.authenticate, async (req, res, next) => {
    try {
        const [treesCount, submissionsCount, approvedSubmissions] = await Promise.all([
            database_1.prisma.tree.count({ where: { projectId: req.params.id, status: "ACTIVE" } }),
            database_1.prisma.submission.count({ where: { tree: { projectId: req.params.id } } }),
            database_1.prisma.submission.count({
                where: { tree: { projectId: req.params.id }, status: "APPROVED" },
            }),
        ]);
        const project = await database_1.prisma.project.findUnique({ where: { id: req.params.id } });
        if (!project)
            throw new error_middleware_1.AppError("Project not found", 404);
        const co2Kg = treesCount * (project.co2PerTreePerYear / 12);
        const credits = co2Kg / 1000;
        res.json({ treesCount, submissionsCount, approvedSubmissions, co2Kg, credits });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=projects.routes.js.map