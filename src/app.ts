import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import { config } from "./config";
import { errorHandler } from "./middleware/error.middleware";
import authRoutes from "./modules/auth/auth.routes";
import projectsRoutes from "./modules/projects/projects.routes";
import treesRoutes from "./modules/trees/trees.routes";
import submissionsRoutes from "./modules/submissions/submissions.routes";
import paymentsRoutes from "./modules/payments/payments.routes";
import adminRoutes from "./modules/admin/admin.routes";
import usersRoutes from "./modules/users/users.routes";

const app = express();

app.use(helmet());

app.use(cors({ origin: true, credentials: true }));
app.use(morgan(config.nodeEnv === "development" ? "dev" : "combined"));

// Raw body for Stripe webhooks
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use("/api", limiter);

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/trees", treesRoutes);
app.use("/api/submissions", submissionsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/auth", usersRoutes); // forgot-password and reset-password live under /api/auth

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.use(errorHandler);

export default app;
