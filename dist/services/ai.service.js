"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTreePhoto = verifyTreePhoto;
const axios_1 = __importDefault(require("axios"));
const database_1 = require("../config/database");
const config_1 = require("../config");
const AI_CONFIDENCE_THRESHOLD = 0.65;
async function verifyTreePhoto(submissionId, imageUrl) {
    try {
        const response = await axios_1.default.post(`${config_1.config.aiService.url}/verify`, { image_url: imageUrl, submission_id: submissionId }, {
            headers: { "X-API-Key": config_1.config.aiService.apiKey },
            timeout: 30000,
        });
        const { is_tree, confidence, labels } = response.data;
        const passed = is_tree && confidence >= AI_CONFIDENCE_THRESHOLD;
        await database_1.prisma.submission.update({
            where: { id: submissionId },
            data: {
                aiScore: confidence,
                aiLabels: labels,
                aiVerified: passed,
                aiVerifiedAt: new Date(),
                status: passed ? "AI_APPROVED" : "AI_REJECTED",
            },
        });
        // Auto-approve high-confidence passes; flag borderline for admin
        if (passed && confidence >= 0.85) {
            await database_1.prisma.submission.update({
                where: { id: submissionId },
                data: { status: "APPROVED" },
            });
        }
        else if (!passed || confidence < 0.75) {
            await database_1.prisma.submission.update({
                where: { id: submissionId },
                data: { status: "ADMIN_REVIEW" },
            });
        }
    }
    catch (err) {
        console.error(`AI verification failed for submission ${submissionId}:`, err);
        // On AI service failure, flag for manual review
        await database_1.prisma.submission.update({
            where: { id: submissionId },
            data: { status: "ADMIN_REVIEW", adminNote: "AI service unavailable - manual review required" },
        });
    }
}
//# sourceMappingURL=ai.service.js.map