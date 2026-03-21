"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../../config/database");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const upload_middleware_1 = require("../../middleware/upload.middleware");
const error_middleware_1 = require("../../middleware/error.middleware");
const ai_service_1 = require("../../services/ai.service");
const router = (0, express_1.Router)();
const MAX_DISTANCE_METERS = 100; // must be within 100m of registered tree location
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
// Submit daily photo for a tree
router.post("/", auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)("FARMER"), upload_middleware_1.upload.single("photo"), async (req, res, next) => {
    try {
        if (!req.file)
            throw new error_middleware_1.AppError("Photo is required", 400);
        const treeId = req.body.treeId;
        const lat = parseFloat(req.body.lat);
        const lng = parseFloat(req.body.lng);
        const accuracy = req.body.accuracy ? parseFloat(req.body.accuracy) : undefined;
        if (!treeId || isNaN(lat) || isNaN(lng))
            throw new error_middleware_1.AppError("treeId, lat, and lng are required", 400);
        const farmer = await database_1.prisma.farmer.findUnique({ where: { userId: req.user.id } });
        if (!farmer)
            throw new error_middleware_1.AppError("Farmer profile not found", 404);
        const tree = await database_1.prisma.tree.findUnique({ where: { id: treeId } });
        if (!tree || tree.farmerId !== farmer.id)
            throw new error_middleware_1.AppError("Tree not found", 404);
        if (tree.status === "DEAD")
            throw new error_middleware_1.AppError("Cannot submit for a dead tree", 400);
        // Check if already submitted today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existing = await database_1.prisma.submission.findFirst({
            where: { treeId, submittedAt: { gte: today } },
        });
        if (existing)
            throw new error_middleware_1.AppError("Already submitted for this tree today", 409);
        // Validate location
        const distance = haversineDistance(lat, lng, tree.lat, tree.lng);
        const locationValid = distance <= MAX_DISTANCE_METERS;
        // Upload photo to Cloudinary
        const uploaded = await (0, upload_middleware_1.uploadToCloudinary)(req.file.buffer, "carbon-credit/submissions", {
            transformation: [{ quality: "auto", fetch_format: "auto" }],
        });
        // Create submission as PENDING_AI
        const submission = await database_1.prisma.submission.create({
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
        (0, ai_service_1.verifyTreePhoto)(submission.id, uploaded.secure_url).catch(console.error);
        res.status(201).json({
            submission,
            locationValid,
            distanceFromTree: Math.round(distance),
            message: locationValid
                ? "Photo submitted successfully. AI verification in progress."
                : "Warning: Location is far from registered tree position.",
        });
    }
    catch (err) {
        next(err);
    }
});
// Get submissions for a tree
router.get("/tree/:treeId", auth_middleware_1.authenticate, async (req, res, next) => {
    try {
        const { page = 1, limit = 30 } = req.query;
        const submissions = await database_1.prisma.submission.findMany({
            where: { treeId: req.params.treeId },
            orderBy: { submittedAt: "desc" },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
        });
        res.json(submissions);
    }
    catch (err) {
        next(err);
    }
});
// Get my submissions (farmer)
router.get("/my", auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)("FARMER"), async (req, res, next) => {
    try {
        const farmer = await database_1.prisma.farmer.findUnique({ where: { userId: req.user.id } });
        if (!farmer)
            throw new error_middleware_1.AppError("Farmer profile not found", 404);
        const submissions = await database_1.prisma.submission.findMany({
            where: { farmerId: farmer.id },
            orderBy: { submittedAt: "desc" },
            take: 50,
            include: { tree: { select: { species: true, lat: true, lng: true } } },
        });
        res.json(submissions);
    }
    catch (err) {
        next(err);
    }
});
// Admin: get pending review submissions
router.get("/admin/pending", auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)("ADMIN"), async (req, res, next) => {
    try {
        const submissions = await database_1.prisma.submission.findMany({
            where: { status: "ADMIN_REVIEW" },
            orderBy: { submittedAt: "asc" },
            include: {
                tree: { select: { species: true, lat: true, lng: true } },
                farmer: { select: { fullName: true } },
            },
        });
        res.json(submissions);
    }
    catch (err) {
        next(err);
    }
});
// Admin: approve or reject submission
router.patch("/:id/review", auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)("ADMIN"), async (req, res, next) => {
    try {
        const { approved, note } = req.body;
        const submission = await database_1.prisma.submission.update({
            where: { id: req.params.id },
            data: {
                status: approved ? "APPROVED" : "REJECTED",
                adminNote: note,
                reviewedBy: req.user.id,
                reviewedAt: new Date(),
            },
        });
        res.json(submission);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=submissions.routes.js.map