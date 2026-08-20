import { Router, type Response } from "express";
import type ExcelJS from "exceljs";
import { prisma } from "../db.js";
import { projectInclude, toProjectDto } from "../services/mapper.js";
import {
  buildEstimateWorkbook,
  buildStoriesWorkbook,
  buildTestCasesWorkbook,
  buildAllWorkbook,
  buildEstimateCsv,
  buildStoriesDocx,
} from "../services/exportService.js";

export const exportRouter = Router();

function slug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "project";
}

exportRouter.get("/:id/export/:kind", async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id }, include: projectInclude });
  if (!project) return res.status(404).json({ error: "Project not found" });
  const dto = toProjectDto(project);
  const base = slug(dto.name);

  try {
    switch (req.params.kind) {
      case "excel-estimate": {
        const buffer = await buildEstimateWorkbook(dto);
        return sendXlsx(res, buffer, `${base}-estimate.xlsx`);
      }
      case "stories-excel": {
        const buffer = await buildStoriesWorkbook(dto);
        return sendXlsx(res, buffer, `${base}-stories.xlsx`);
      }
      case "stories-word": {
        const buffer = await buildStoriesDocx(dto);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        res.setHeader("Content-Disposition", `attachment; filename="${base}-stories.docx"`);
        return res.send(buffer);
      }
      case "testcases-excel": {
        const buffer = await buildTestCasesWorkbook(dto);
        return sendXlsx(res, buffer, `${base}-testcases.xlsx`);
      }
      case "all": {
        const buffer = await buildAllWorkbook(dto);
        return sendXlsx(res, buffer, `${base}-full-export.xlsx`);
      }
      case "csv": {
        const csv = buildEstimateCsv(dto);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${base}-estimate.csv"`);
        return res.send(csv);
      }
      default:
        return res.status(400).json({ error: `Unknown export kind: ${req.params.kind}` });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed.";
    res.status(500).json({ error: message });
  }
});

function sendXlsx(res: Response, buffer: ExcelJS.Buffer, filename: string) {
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(Buffer.from(buffer));
}
