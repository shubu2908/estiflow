import "dotenv/config";
import express from "express";
import cors from "cors";
import { modelsRouter } from "./routes/models.js";
import { projectsRouter } from "./routes/projects.js";
import { generateRouter } from "./routes/generate.js";
import { exportRouter } from "./routes/export.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/models", modelsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/projects", generateRouter);
app.use("/api/projects", exportRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: message });
});

const port = Number(process.env.PORT) || 4001;
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
