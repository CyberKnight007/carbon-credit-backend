"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = exports.errorHandler = void 0;
const zod_1 = require("zod");
const errorHandler = (err, req, res, _next) => {
    console.error(err.stack);
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            message: "Validation error",
            errors: err.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
        });
    }
    const status = err.status || 500;
    res.status(status).json({
        message: err.message || "Internal server error",
    });
};
exports.errorHandler = errorHandler;
class AppError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.message = message;
        this.status = status;
    }
}
exports.AppError = AppError;
//# sourceMappingURL=error.middleware.js.map