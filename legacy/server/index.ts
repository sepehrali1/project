import express, { type ErrorRequestHandler } from "express";
import authRoutes from "./routes/auth.ts";
import scriptsRoutes from "./routes/scripts.ts";
import commentsRoutes from "./routes/comments.ts";
import reportsRoutes from "./routes/reports.ts";
import adminRoutes from "./routes/admin.ts";
import ownerRoutes from "./routes/owner.ts";
import statsRoutes from "./routes/stats.ts";

const app = express();

app.use(express.json({ limit: "5mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/scripts", scriptsRoutes);
app.use("/api", commentsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/stats", statsRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "ssblox-api" });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error("[server error]", err);
  res.status(500).json({ error: "خطای داخلی سرور" });
};
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log("[SSBLOX API] http://127.0.0.1:" + PORT);
});