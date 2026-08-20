import mammoth from "mammoth";

export type GeminiInputPart =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mime_type: string }
  | { type: "document"; data: string; mime_type: string };

const IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/jpg"]);
const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function filesToInputParts(files: Express.Multer.File[]): Promise<GeminiInputPart[]> {
  const parts: GeminiInputPart[] = [];

  for (const file of files) {
    if (file.mimetype === "application/pdf") {
      parts.push({ type: "document", data: file.buffer.toString("base64"), mime_type: file.mimetype });
    } else if (IMAGE_MIME_TYPES.has(file.mimetype)) {
      parts.push({ type: "image", data: file.buffer.toString("base64"), mime_type: file.mimetype });
    } else if (file.mimetype === DOCX_MIME_TYPE) {
      const { value: text } = await mammoth.extractRawText({ buffer: file.buffer });
      parts.push({ type: "text", text: `--- Extracted from ${file.originalname} ---\n${text}` });
    } else {
      throw new Error(`Unsupported file type: ${file.originalname} (${file.mimetype})`);
    }
  }

  return parts;
}
