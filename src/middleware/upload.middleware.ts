import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";
import { config } from "../config";

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

export const uploadToCloudinary = async (
  buffer: Buffer,
  folder: string,
  options: Record<string, any> = {}
): Promise<{ secure_url: string; public_id: string; width: number; height: number }> => {
  // Use Cloudinary if configured
  if (config.cloudinary.cloudName && config.cloudinary.apiKey) {
    const { cloudinary } = await import("../config/cloudinary");
    const { Readable } = await import("stream");
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, ...options },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
          });
        }
      );
      const readable = new Readable();
      readable.push(buffer);
      readable.push(null);
      readable.pipe(stream);
    });
  }

  // Fallback: save to local uploads directory
  const uploadDir = path.join(process.cwd(), "uploads", folder);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const filepath = path.join(uploadDir, filename);
  fs.writeFileSync(filepath, buffer);
  const publicId = `${folder}/${filename}`;
  return {
    secure_url: `http://localhost:${config.port}/uploads/${folder}/${filename}`,
    public_id: publicId,
    width: 0,
    height: 0,
  };
};
