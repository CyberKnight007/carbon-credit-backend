import { Request, Response, NextFunction } from "express";
export declare const errorHandler: (err: Error, req: Request, res: Response, _next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare class AppError extends Error {
    message: string;
    status: number;
    constructor(message: string, status?: number);
}
//# sourceMappingURL=error.middleware.d.ts.map