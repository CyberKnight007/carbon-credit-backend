import multer from "multer";
export declare const upload: multer.Multer;
export declare const uploadToCloudinary: (buffer: Buffer, folder: string, options?: Record<string, any>) => Promise<{
    secure_url: string;
    public_id: string;
    width: number;
    height: number;
}>;
//# sourceMappingURL=upload.middleware.d.ts.map