import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TECHNOLOGIES, COMPLEXITY_LEVELS, DEFAULT_HOURS_PER_DAY, type CreateProjectInput } from "shared";
import type { GeminiModelOption } from "@/types/geminiModel";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function NewProject() {
  const navigate = useNavigate();
  const [models, setModels] = useState<GeminiModelOption[]>([]);
  const [name, setName] = useState("");
  const [devStartDate, setDevStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [technology, setTechnology] = useState<string[]>([]);
  const [otherTechnology, setOtherTechnology] = useState("");
  const [complexityOverride, setComplexityOverride] = useState<string>("auto");
  const [hoursPerDay, setHoursPerDay] = useState(DEFAULT_HOURS_PER_DAY);
  const [geminiModel, setGeminiModel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getModels().then((list) => {
      setModels(list);
      const def = list.find((m) => m.isDefault) ?? list[0];
      if (def) setGeminiModel(def.id);
    });
  }, []);

  function toggleTechnology(tech: string) {
    setTechnology((prev) => (prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const resolvedTechnology = technology.includes("Other") && otherTechnology.trim()
      ? [...technology.filter((t) => t !== "Other"), otherTechnology.trim()]
      : technology;

    if (!name.trim() || resolvedTechnology.length === 0) {
      setError("Project name and at least one technology are required.");
      return;
    }

    const input: CreateProjectInput = {
      name: name.trim(),
      technology: resolvedTechnology,
      devStartDate: new Date(devStartDate).toISOString(),
      geminiModel,
      complexityOverride: complexityOverride === "auto" ? null : (complexityOverride as CreateProjectInput["complexityOverride"]),
      hoursPerDay,
    };

    setSubmitting(true);
    try {
      const project = await api.createProject(input);
      navigate(`/projects/${project.id}/upload`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>New Project</CardTitle>
          <CardDescription>Set up the basics, then upload the SDD to generate an estimate.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Project Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Invoice Processing Automation" />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="devStartDate">Planned Dev Start Date</Label>
              <Input id="devStartDate" type="date" value={devStartDate} onChange={(e) => setDevStartDate(e.target.value)} />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Technology</Label>
              <div className="grid grid-cols-2 gap-2">
                {TECHNOLOGIES.map((tech) => (
                  <label key={tech} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={technology.includes(tech)} onCheckedChange={() => toggleTechnology(tech)} />
                    {tech}
                  </label>
                ))}
              </div>
              {technology.includes("Other") && (
                <Input
                  placeholder="Specify other technology"
                  value={otherTechnology}
                  onChange={(e) => setOtherTechnology(e.target.value)}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Complexity Override</Label>
                <Select value={complexityOverride} onValueChange={setComplexityOverride}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">AI-inferred (recommended)</SelectItem>
                    {COMPLEXITY_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="hoursPerDay">Hours per Productive Day</Label>
                <Input
                  id="hoursPerDay"
                  type="number"
                  min={1}
                  max={12}
                  step={0.5}
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Gemini Model</Label>
              <Select value={geminiModel} onValueChange={setGeminiModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
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

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Continue to Upload"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
