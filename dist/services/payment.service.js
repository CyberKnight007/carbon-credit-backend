"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentIntent = createPaymentIntent;
exports.confirmProjectFunding = confirmProjectFunding;
exports.processMonthlyPayouts = processMonthlyPayouts;
const config_1 = require("../config");
const database_1 = require("../config/database");
const carbon_1 = require("../utils/carbon");
const certificate_service_1 = require("./certificate.service");
let stripe = null;
function getStripe() {
    if (!stripe && config_1.config.stripe.secretKey && !config_1.config.stripe.secretKey.includes("placeholder")) {
        const Stripe = require("stripe");
        stripe = new Stripe(config_1.config.stripe.secretKey, { apiVersion: "2023-10-16" });
    }
    return stripe;
}
async function createPaymentIntent(organizationId, projectId, amountUsd) {
    const s = getStripe();
    if (!s) {
        // Mock payment intent for development
        return { client_secret: "mock_secret_dev", id: `mock_pi_${Date.now()}` };
    }
    return s.paymentIntents.create({
        amount: Math.round(amountUsd * 100),
        currency: "usd",
        metadata: { organizationId, projectId },
    });
}
async function confirmProjectFunding(paymentIntentId, organizationId, projectId, amount) {
    // For mock/dev payments
    if (paymentIntentId.startsWith("mock_")) {
        if (organizationId && projectId && amount) {
            await Promise.all([
                database_1.prisma.organization.update({
                    where: { id: organizationId },
                    data: { escrowBalance: { increment: amount } },
                }),
                database_1.prisma.payment.create({
                    data: { organizationId, projectId, amount, stripePaymentIntentId: paymentIntentId, stripeStatus: "succeeded", description: "Project funding" },
                }),
                database_1.prisma.project.update({
                    where: { id: projectId },
                    data: { remainingBudget: { increment: amount } },
                }),
            ]);
        }
        return;
    }
    const s = getStripe();
    if (!s)
        return;
    const intent = await s.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== "succeeded")
        throw new Error("Payment not completed");
    const { organizationId: orgId, projectId: projId } = intent.metadata;
    const amt = intent.amount / 100;
    await Promise.all([
        database_1.prisma.organization.update({ where: { id: orgId }, data: { escrowBalance: { increment: amt } } }),
        database_1.prisma.payment.create({ data: { organizationId: orgId, projectId: projId, amount: amt, stripePaymentIntentId: paymentIntentId, stripeStatus: "succeeded", description: "Project funding" } }),
        database_1.prisma.project.update({ where: { id: projId }, data: { remainingBudget: { increment: amt } } }),
    ]);
}
async function processMonthlyPayouts(month, year) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const farmers = await database_1.prisma.farmer.findMany({
        where: { trees: { some: { project: { status: "ACTIVE" }, status: "ACTIVE" } } },
        include: {
            trees: {
                where: { project: { status: "ACTIVE" }, status: "ACTIVE" },
                include: { project: true },
            },
        },
    });
    for (const farmer of farmers) {
        let totalAmount = 0;
        let totalApprovedDays = 0;
        for (const tree of farmer.trees) {
            if (!tree.project)
                continue;
            const approvedSubmissions = await database_1.prisma.submission.count({
                where: {
                    treeId: tree.id,
                    status: "APPROVED",
                    submittedAt: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) },
                },
            });
            const payout = (0, carbon_1.calculateFarmerPayout)(1, tree.project.pricePerTreePerMonth, approvedSubmissions, daysInMonth);
            totalAmount += payout;
            totalApprovedDays += approvedSubmissions;
        }
        if (totalAmount <= 0)
            continue;
        const payout = await database_1.prisma.payout.create({
            data: {
                farmerId: farmer.id,
                amount: totalAmount,
                month,
                year,
                treesCount: farmer.trees.length,
                approvedDays: totalApprovedDays,
                status: "PROCESSING",
            },
        });
        const s = getStripe();
        if (s && farmer.stripeAccountId) {
            try {
                const transfer = await s.transfers.create({
                    amount: Math.round(totalAmount * 100),
                    currency: "usd",
                    destination: farmer.stripeAccountId,
                    metadata: { payoutId: payout.id },
                });
                await database_1.prisma.payout.update({
                    where: { id: payout.id },
                    data: { status: "COMPLETED", stripeTransferId: transfer.id, processedAt: new Date() },
                });
            }
            catch {
                await database_1.prisma.payout.update({ where: { id: payout.id }, data: { status: "FAILED" } });
            }
        }
        else {
            // Mark as completed for dev (no stripe)
            await database_1.prisma.payout.update({
                where: { id: payout.id },
                data: { status: "COMPLETED", processedAt: new Date() },
            });
            await database_1.prisma.farmer.update({
                where: { id: farmer.id },
                data: { totalEarnings: { increment: totalAmount } },
            });
        }
    }
    await generateMonthlyCertificates(month, year);
}
async function generateMonthlyCertificates(month, year) {
    const projects = await database_1.prisma.project.findMany({
        where: { status: "ACTIVE" },
        include: { organization: true },
    });
    for (const project of projects) {
        const approvedSubmissions = await database_1.prisma.submission.count({
            where: {
                tree: { projectId: project.id },
                status: "APPROVED",
                submittedAt: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) },
            },
        });
        if (approvedSubmissions === 0)
            continue;
        const treesCount = await database_1.prisma.tree.count({ where: { projectId: project.id, status: "ACTIVE" } });
        const co2Kg = treesCount * (project.co2PerTreePerYear / 12);
        const credits = co2Kg / 1000;
        let certUrl = "";
        try {
            certUrl = await (0, certificate_service_1.generateCertificate)({
                orgName: project.organization.companyName,
                projectTitle: project.title,
                month, year, treesCount, co2Kg, credits,
            });
        }
        catch (err) {
            console.error("Certificate generation failed:", err);
        }
        await database_1.prisma.carbonCertificate.create({
            data: { organizationId: project.organizationId, projectId: project.id, creditsAmount: credits, month, year, treesCount, co2Kg, certificateUrl: certUrl },
        });
        await database_1.prisma.organization.update({
            where: { id: project.organizationId },
            data: { totalCreditsEarned: { increment: credits } },
        });
    }
}
//# sourceMappingURL=payment.service.js.map