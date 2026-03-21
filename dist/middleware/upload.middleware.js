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
exports.uploadToCloudinary = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("../config");
const storage = multer_1.default.memoryStorage();
exports.upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            cb(new Error("Only image files are allowed"));
            return;
        }
        cb(null, true);
    },
});
const uploadToCloudinary = async (buffer, folder, options = {}) => {
    // Use Cloudinary if configured
    if (config_1.config.cloudinary.cloudName && config_1.config.cloudinary.apiKey) {
        const { cloudinary } = await Promise.resolve().then(() => __importStar(require("../config/cloudinary")));
        const { Readable } = await Promise.resolve().then(() => __importStar(require("stream")));
        return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({ folder, ...options }, (error, result) => {
                if (error || !result)
                    return reject(error);
                resolve({
                    secure_url: result.secure_url,
                    public_id: result.public_id,
                    width: result.width,
                    height: result.height,
                });
            });
            const readable = new Readable();
            readable.push(buffer);
            readable.push(null);
            readable.pipe(stream);
        });
    }
    // Fallback: save to local uploads directory
    const uploadDir = path_1.default.join(process.cwd(), "uploads", folder);
    if (!fs_1.default.existsSync(uploadDir))
        fs_1.default.mkdirSync(uploadDir, { recursive: true });
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const filepath = path_1.default.join(uploadDir, filename);
    fs_1.default.writeFileSync(filepath, buffer);
    const publicId = `${folder}/${filename}`;
    return {
        secure_url: `http://localhost:${config_1.config.port}/uploads/${folder}/${filename}`,
        public_id: publicId,
        width: 0,
        height: 0,
    };
};
exports.uploadToCloudinary = uploadToCloudinary;
//# sourceMappingURL=upload.middleware.js.map