import { Router } from "express";
import { GEMINI_MODELS } from "../config/geminiModels.js";

export const modelsRouter = Router();

modelsRouter.get("/", (_req, res) => {
  res.json(GEMINI_MODELS);
});
