"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTokens = generateTokens;
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.refreshAccessToken = refreshAccessToken;
exports.verifyEmail = verifyEmail;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../../config/database");
const config_1 = require("../../config");
const error_middleware_1 = require("../../middleware/error.middleware");
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: config_1.config.smtp.host,
    port: config_1.config.smtp.port,
    auth: { user: config_1.config.smtp.user, pass: config_1.config.smtp.pass },
});
function generateTokens(userId, role, email) {
    const accessToken = jsonwebtoken_1.default.sign({ id: userId, role, email }, config_1.config.jwt.secret, {
        expiresIn: config_1.config.jwt.expiresIn,
    });
    const refreshToken = jsonwebtoken_1.default.sign({ id: userId }, config_1.config.jwt.refreshSecret, {
        expiresIn: config_1.config.jwt.refreshExpiresIn,
    });
    return { accessToken, refreshToken };
}
async function registerUser(data) {
    const existing = await database_1.prisma.user.findUnique({ where: { email: data.email } });
    if (existing)
        throw new error_middleware_1.AppError("Email already registered", 409);
    const passwordHash = await bcryptjs_1.default.hash(data.password, 12);
    const user = await database_1.prisma.user.create({
        data: {
            email: data.email,
            passwordHash,
            role: data.role,
            organization: data.role === "ORGANIZATION" && data.organizationData
                ? { create: data.organizationData }
                : undefined,
            farmer: data.role === "FARMER" && data.farmerData
                ? { create: data.farmerData }
                : undefined,
        },
        include: { organization: true, farmer: true },
    });
    await sendVerificationEmail(user.id, user.email);
    const tokens = generateTokens(user.id, user.role, user.email);
    await database_1.prisma.refreshToken.create({
        data: {
            userId: user.id,
            token: tokens.refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    });
    return { user, tokens };
}
async function loginUser(email, password) {
    const user = await database_1.prisma.user.findUnique({
        where: { email },
        include: { organization: true, farmer: true },
    });
    if (!user)
        throw new error_middleware_1.AppError("Invalid credentials", 401);
    if (!user.isActive)
        throw new error_middleware_1.AppError("Account suspended", 403);
    const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!valid)
        throw new error_middleware_1.AppError("Invalid credentials", 401);
    const tokens = generateTokens(user.id, user.role, user.email);
    await database_1.prisma.refreshToken.create({
        data: {
            userId: user.id,
            token: tokens.refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    });
    return { user, tokens };
}
async function refreshAccessToken(refreshToken) {
    const stored = await database_1.prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date())
        throw new error_middleware_1.AppError("Invalid refresh token", 401);
    const decoded = jsonwebtoken_1.default.verify(refreshToken, config_1.config.jwt.refreshSecret);
    const user = await database_1.prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user)
        throw new error_middleware_1.AppError("User not found", 401);
    const accessToken = jsonwebtoken_1.default.sign({ id: user.id, role: user.role, email: user.email }, config_1.config.jwt.secret, { expiresIn: config_1.config.jwt.expiresIn });
    return { accessToken };
}
async function sendVerificationEmail(userId, email) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await database_1.prisma.otp.create({
        data: {
            userId,
            code,
            type: "EMAIL_VERIFY",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
    });
    if (config_1.config.smtp.user) {
        try {
            await transporter.sendMail({
                from: config_1.config.smtp.from,
                to: email,
                subject: "Verify your Carbon Credit Platform account",
                html: `<p>Your verification code is: <strong>${code}</strong></p><p>Valid for 24 hours.</p>`,
            });
        }
        catch (err) {
            console.warn("Email send failed (check SMTP config):", err.message);
        }
    }
    else {
        console.log(`[DEV] Verification code for ${email}: ${code}`);
    }
}
async function verifyEmail(userId, code) {
    const otp = await database_1.prisma.otp.findFirst({
        where: { userId, code, type: "EMAIL_VERIFY", used: false, expiresAt: { gt: new Date() } },
    });
    if (!otp)
        throw new error_middleware_1.AppError("Invalid or expired verification code", 400);
    await database_1.prisma.$transaction([
        database_1.prisma.otp.update({ where: { id: otp.id }, data: { used: true } }),
        database_1.prisma.user.update({ where: { id: userId }, data: { isVerified: true } }),
    ]);
}
//# sourceMappingURL=auth.service.js.map