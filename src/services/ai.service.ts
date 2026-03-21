import axios from "axios";
import { prisma } from "../config/database";
import { config } from "../config";

const AI_CONFIDENCE_THRESHOLD = 0.65;

export async function verifyTreePhoto(submissionId: string, imageUrl: string): Promise<void> {
  try {
    const response = await axios.post(
      `${config.aiService.url}/verify`,
      { image_url: imageUrl, submission_id: submissionId },
      {
        headers: { "X-API-Key": config.aiService.apiKey },
        timeout: 30000,
      }
    );

    const { is_tree, confidence, labels } = response.data;
    const passed = is_tree && confidence >= AI_CONFIDENCE_THRESHOLD;

    await prisma.submission.update({
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
      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: "APPROVED" },
      });
    } else if (!passed || confidence < 0.75) {
      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: "ADMIN_REVIEW" },
      });
    }
  } catch (err) {
    console.error(`AI verification failed for submission ${submissionId}:`, err);
    // On AI service failure, flag for manual review
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: "ADMIN_REVIEW", adminNote: "AI service unavailable - manual review required" },
    });
  }
}
