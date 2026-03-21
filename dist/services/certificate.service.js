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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCertificate = generateCertificate;
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
async function generateCertificate(data) {
    return new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({ size: "A4", margin: 60 });
        const chunks = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("error", reject);
        doc.on("end", async () => {
            const buffer = Buffer.concat(chunks);
            try {
                // Try Cloudinary first
                if (config_1.config.cloudinary.cloudName && config_1.config.cloudinary.apiKey) {
                    const { uploadToCloudinary } = await Promise.resolve().then(() => __importStar(require("../middleware/upload.middleware")));
                    const result = await uploadToCloudinary(buffer, "carbon-credit/certificates", {
                        resource_type: "raw",
                        format: "pdf",
                    });
                    return resolve(result.secure_url);
                }
                // Save locally
                const certDir = path_1.default.join(process.cwd(), "uploads", "certificates");
                if (!fs_1.default.existsSync(certDir))
                    fs_1.default.mkdirSync(certDir, { recursive: true });
                const filename = `cert_${data.orgName.replace(/\s/g, "_")}_${data.year}_${data.month}_${Date.now()}.pdf`;
                fs_1.default.writeFileSync(path_1.default.join(certDir, filename), buffer);
                resolve(`http://localhost:${config_1.config.port}/uploads/certificates/${filename}`);
            }
            catch (err) {
                reject(err);
            }
        });
        // --- PDF Design ---
        doc.rect(0, 0, doc.page.width, doc.page.height).fill("#f0fdf4");
        doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60).lineWidth(3).strokeColor("#16a34a").stroke();
        doc.fillColor("#15803d").fontSize(26).font("Helvetica-Bold")
            .text("CARBON OFFSET CERTIFICATE", { align: "center" }).moveDown(0.3);
        doc.fontSize(13).fillColor("#166534").font("Helvetica")
            .text("Carbon Credit Platform", { align: "center" }).moveDown(1.5);
        doc.fontSize(12).fillColor("#1e293b").text("This certifies that", { align: "center" }).moveDown(0.5);
        doc.fontSize(20).font("Helvetica-Bold").fillColor("#15803d")
            .text(data.orgName, { align: "center" }).moveDown(0.5);
        doc.fontSize(12).font("Helvetica").fillColor("#1e293b")
            .text(`has offset carbon emissions through the project "${data.projectTitle}"`, { align: "center" })
            .text(`for the month of ${MONTHS[data.month - 1]} ${data.year}.`, { align: "center" })
            .moveDown(1.5);
        const tableTop = doc.y;
        const col1 = 100, col2 = 330;
        const rows = [
            ["Trees Monitored", data.treesCount.toString()],
            ["CO₂ Absorbed", `${data.co2Kg.toFixed(2)} kg`],
            ["Carbon Credits Earned", `${data.credits.toFixed(4)} credits`],
        ];
        rows.forEach(([label, value], i) => {
            const y = tableTop + i * 35;
            doc.rect(col1, y, 210, 28).fill("#dcfce7").rect(col2, y, 180, 28).fill("#f0fdf4");
            doc.fillColor("#166534").fontSize(11).font("Helvetica-Bold").text(label, col1 + 8, y + 8, { width: 195 });
            doc.fillColor("#1e293b").font("Helvetica").text(value, col2 + 8, y + 8, { width: 165 });
        });
        doc.y = tableTop + rows.length * 35 + 30;
        doc.moveTo(100, doc.y).lineTo(510, doc.y).lineWidth(1).strokeColor("#86efac").stroke();
        doc.moveDown(1.5);
        doc.fontSize(10).fillColor("#6b7280").font("Helvetica")
            .text(`Issued: ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}`, { align: "center" })
            .text(`Certificate ID: CC-${data.year}-${String(data.month).padStart(2, "0")}-${Date.now()}`, { align: "center" });
        doc.end();
    });
}
//# sourceMappingURL=certificate.service.js.map