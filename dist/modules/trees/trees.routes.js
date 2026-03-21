"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const database_1 = require("../../config/database");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const upload_middleware_1 = require("../../middleware/upload.middleware");
const error_middleware_1 = require("../../middleware/error.middleware");
const router = (0, express_1.Router)();
const registerTreeSchema = zod_1.z.object({
    species: zod_1.z.string(),
    lat: zod_1.z.number(),
    lng: zod_1.z.number(),
    address: zod_1.z.string().optional(),
    projectId: zod_1.z.string().optional(),
});
// Get my trees (farmer)
router.get("/my", auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)("FARMER"), async (req, res, next) => {
    try {
        const farmer = await database_1.prisma.farmer.findUnique({ where: { userId: req.user.id } });
        if (!farmer)
            throw new error_middleware_1.AppError("Farmer profile not found", 404);
        const trees = await database_1.prisma.tree.findMany({
            where: { farmerId: farmer.id },
            include: {
                project: { select: { title: true, pricePerTreePerMonth: true, organization: { select: { companyName: true } } } },
                _count: { select: { submissions: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(trees);
    }
    catch (err) {
        next(err);
    }
});
// Get tree by ID with submission history
router.get("/:id", auth_middleware_1.authenticate, async (req, res, next) => {
    try {
        const tree = await database_1.prisma.tree.findUnique({
            where: { id: req.params.id },
            include: {
                submissions: { orderBy: { submittedAt: "desc" }, take: 30 },
                project: { select: { title: true, pricePerTreePerMonth: true } },
                farmer: { select: { fullName: true } },
            },
        });
        if (!tree)
            throw new error_middleware_1.AppError("Tree not found", 404);
        res.json(tree);
    }
    catch (err) {
        next(err);
    }
});
// Register a new tree (farmer)
router.post("/", auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)("FARMER"), upload_middleware_1.upload.single("photo"), async (req, res, next) => {
    try {
        const body = registerTreeSchema.parse({
            ...req.body,
            lat: parseFloat(req.body.lat),
            lng: parseFloat(req.body.lng),
        });
        const farmer = await database_1.prisma.farmer.findUnique({ where: { userId: req.user.id } });
        if (!farmer)
            throw new error_middleware_1.AppError("Farmer profile not found", 404);
        let photoUrl;
        if (req.file) {
            const result = await (0, upload_middleware_1.uploadToCloudinary)(req.file.buffer, "carbon-credit/trees");
            photoUrl = result.secure_url;
        }
        const tree = await database_1.prisma.tree.create({
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
            await database_1.prisma.project.update({
                where: { id: body.projectId },
                data: { currentTreeCount: { increment: 1 } },
            });
        }
        res.status(201).json(tree);
    }
    catch (err) {
        next(err);
    }
});
// Get trees for a project (org view - map data)
router.get("/project/:projectId", auth_middleware_1.authenticate, async (req, res, next) => {
    try {
        const trees = await database_1.prisma.tree.findMany({
            where: { projectId: req.params.projectId },
            select: {
                id: true, lat: true, lng: true, species: true, status: true,
                qrCode: true, plantedDate: true,
                farmer: { select: { fullName: true } },
                _count: { select: { submissions: true } },
            },
        });
        res.json(trees);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=trees.routes.js.map