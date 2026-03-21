"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const authService = __importStar(require("./auth.service"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    role: zod_1.z.string().refine(r => ["ORGANIZATION", "FARMER"].includes(r), "Invalid role"),
    companyName: zod_1.z.string().optional(),
    country: zod_1.z.string().min(2),
    fullName: zod_1.z.string().optional(),
});
router.post("/register", async (req, res, next) => {
    try {
        const body = registerSchema.parse(req.body);
        const { user, tokens } = await authService.registerUser({
            email: body.email,
            password: body.password,
            role: body.role,
            organizationData: body.role === "ORGANIZATION"
                ? { companyName: body.companyName || "", country: body.country }
                : undefined,
            farmerData: body.role === "FARMER"
                ? { fullName: body.fullName || "", country: body.country }
                : undefined,
        });
        res.status(201).json({
            message: "Registration successful. Check your email for verification code.",
            tokens,
            user: { id: user.id, email: user.email, role: user.role },
        });
    }
    catch (err) {
        next(err);
    }
});
router.post("/login", async (req, res, next) => {
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
    }
    catch (err) {
        next(err);
    }
});
router.post("/refresh", async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        const { accessToken } = await authService.refreshAccessToken(refreshToken);
        res.json({ accessToken });
    }
    catch (err) {
        next(err);
    }
});
router.post("/verify-email", auth_middleware_1.authenticate, async (req, res, next) => {
    try {
        await authService.verifyEmail(req.user.id, req.body.code);
        res.json({ message: "Email verified successfully" });
    }
    catch (err) {
        next(err);
    }
});
router.get("/me", auth_middleware_1.authenticate, async (req, res, next) => {
    try {
        const { prisma } = await Promise.resolve().then(() => __importStar(require("../../config/database")));
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { organization: true, farmer: true },
        });
        res.json(user);
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map