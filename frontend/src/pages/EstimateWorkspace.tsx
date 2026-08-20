import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useEstimateStore } from "@/store/estimateStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { OverviewTimelineTab } from "@/components/estimate/OverviewTimelineTab";
import { StoriesTasksTab } from "@/components/stories/StoriesTasksTab";
import { TestCasesTab } from "@/components/testcases/TestCasesTab";
import { RoleHoursTab } from "@/components/estimate/RoleHoursTab";
import { ExportMenu } from "@/components/estimate/ExportMenu";
import { Loader2 } from "lucide-react";

export function EstimateWorkspace() {
  const { id } = useParams<{ id: string }>();
  const project = useEstimateStore((s) => s.project);
  const saveStatus = useEstimateStore((s) => s.saveStatus);
  const saveError = useEstimateStore((s) => s.saveError);
  const load = useEstimateStore((s) => s.load);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getProject(id)
      .then(load)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load project."));
  }, [id, load]);

  if (loadError) return <p className="text-sm text-destructive">{loadError}</p>;
  if (!project || project.id !== id) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading estimate...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="text-sm text-muted-foreground">
            {project.technology.join(", ")} · Dev start {new Date(project.devStartDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {project.aiComplexity && <Badge variant="outline">{project.aiComplexity} complexity</Badge>}
          <SaveIndicator status={saveStatus} error={saveError} />
          <ExportMenu projectId={project.id} />
        </div>
      </div>

      {project.assumptions.length > 0 && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          <p className="mb-1 font-medium">AI assumptions to sanity-check</p>
          <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
            {project.assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview / Timeline</TabsTrigger>
          <TabsTrigger value="stories">Stories & Tasks</TabsTrigger>
          <TabsTrigger value="testcases">Test Cases</TabsTrigger>
          <TabsTrigger value="roles">Role Hours</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewTimelineTab />
        </TabsContent>
        <TabsContent value="stories">
          <StoriesTasksTab />
        </TabsContent>
        <TabsContent value="testcases">
          <TestCasesTab />
        </TabsContent>
        <TabsContent value="roles">
          <RoleHoursTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SaveIndicator({ status, error }: { status: string; error: string | null }) {
  if (status === "saving") return <span className="text-xs text-muted-foreground">Saving...</span>;
  if (status === "saved") return <span className="text-xs text-success">Saved</span>;
  if (status === "error") return <span className="text-xs text-destructive" title={error ?? undefined}>Save failed</span>;
  return null;
}
