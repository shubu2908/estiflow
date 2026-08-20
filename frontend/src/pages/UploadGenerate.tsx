import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { ProjectDto } from "shared";
import type { GeminiModelOption } from "@/types/geminiModel";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, UploadCloud, X, FileText, Image as ImageIcon } from "lucide-react";

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function iconFor(file: File) {
  if (file.type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

export function UploadGenerate() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [models, setModels] = useState<GeminiModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    api.getProject(id).then((p) => {
      setProject(p);
      setSelectedModel(p.geminiModel);
    });
    api.getModels().then(setModels);
  }, [id]);

  useEffect(() => {
    if (!generating) return;
    const start = Date.now();
    const interval = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [generating]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(list)) {
      if (ACCEPTED_TYPES.includes(file.type)) accepted.push(file);
      else rejected.push(file.name);
    }
    if (rejected.length > 0) {
      setError(`Unsupported file type: ${rejected.join(", ")}. Use PDF, DOCX, PNG, or JPG.`);
    }
    setFiles((prev) => [...prev, ...accepted]);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    addFiles(e.dataTransfer.files);
  }, []);

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleGenerate() {
    if (!id || files.length === 0) return;
    setError(null);
    setRetryable(false);
    setGenerating(true);
    setElapsed(0);
    try {
      if (project && selectedModel !== project.geminiModel) {
        await api.updateProject(id, { geminiModel: selectedModel });
      }
      await api.generate(id, files);
      navigate(`/projects/${id}`);
    } catch (err) {
      setGenerating(false);
      if (err instanceof ApiError) {
        setError(err.message);
        setRetryable(err.retryable);
      } else {
        setError(err instanceof Error ? err.message : "Generation failed.");
      }
    }
  }

  if (!project) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Upload & Generate — {project.name}</CardTitle>
          <CardDescription>
            Upload the Solution Design Document and/or process flow diagram. Gemini will analyze it and produce a phased
            estimate, backlog, and test cases.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label>Gemini Model</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel} disabled={generating}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              dragActive ? "border-primary bg-accent" : "border-border"
            }`}
          >
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Drag & drop files, or click to browse</p>
            <p className="text-xs text-muted-foreground">PDF, DOCX, PNG, JPG — multiple files allowed</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES.join(",")}
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {files.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {files.map((file, i) => (
                <li key={`${file.name}-${i}`} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 truncate">
                    {iconFor(file)}
                    {file.name}
                    <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                  </span>
                  <button onClick={() => removeFile(i)} disabled={generating} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
              {retryable && <p className="mt-1 text-xs">This looks like a temporary issue — try again.</p>}
            </div>
          )}

          {generating ? (
            <Button disabled className="gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating estimate... {elapsed}s (usually 10-30s)
            </Button>
          ) : (
            <Button onClick={handleGenerate} disabled={files.length === 0}>
              Generate Estimate
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
