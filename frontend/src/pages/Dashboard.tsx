import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ProjectSummaryDto } from "shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  generated: "Generated",
  edited: "Edited",
};

export function Dashboard() {
  const [projects, setProjects] = useState<ProjectSummaryDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .listProjects()
      .then(setProjects)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load projects."));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">Delivery estimates for your automation projects.</p>
        </div>
        <Button onClick={() => navigate("/projects/new")}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {projects && projects.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No projects yet</p>
              <p className="text-sm text-muted-foreground">Create a project to generate your first estimate.</p>
            </div>
            <Button onClick={() => navigate("/projects/new")}>
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects?.map((project) => (
          <Link key={project.id} to={project.status === "draft" ? `/projects/${project.id}/upload` : `/projects/${project.id}`}>
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  <Badge variant={project.status === "draft" ? "outline" : "secondary"}>{STATUS_LABEL[project.status]}</Badge>
                </div>
                <CardDescription>{project.technology.join(", ") || "No technology set"}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Dev start {new Date(project.devStartDate).toLocaleDateString()}</span>
                {project.aiComplexity && <Badge variant="outline">{project.aiComplexity} complexity</Badge>}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
