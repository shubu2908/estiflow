import { useEstimateStore } from "@/store/estimateStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GanttChart } from "@/components/estimate/GanttChart";
import { cn } from "@/lib/utils";

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export function OverviewTimelineTab() {
  const project = useEstimateStore((s) => s.project)!;
  const updatePhase = useEstimateStore((s) => s.updatePhase);
  const updateHoursPerDay = useEstimateStore((s) => s.updateHoursPerDay);
  const toggleWorkingDay = useEstimateStore((s) => s.toggleWorkingDay);

  const totalHours = project.phases.reduce((sum, p) => sum + p.hours, 0);
  const totalEffectiveHours = project.phases.reduce((sum, p) => sum + p.hours * (1 + p.bufferPercent / 100), 0);
  const overallStart = project.phases[0]?.startDate;
  const overallEnd = project.phases[project.phases.length - 1]?.endDate;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-6">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hoursPerDay">Hours per productive day</Label>
          <Input
            id="hoursPerDay"
            type="number"
            min={1}
            max={12}
            step={0.5}
            className="w-32"
            value={project.hoursPerDay}
            onChange={(e) => updateHoursPerDay(Number(e.target.value) || 1)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Working Days</Label>
          <div className="flex gap-1">
            {WEEKDAYS.map((day) => {
              const active = project.workingDays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleWorkingDay(day.value)}
                  className={cn(
                    "h-8 w-11 rounded-md border text-xs font-medium transition-colors",
                    active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background text-muted-foreground"
                  )}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {overallStart && overallEnd && (
            <>
              Project window: <strong className="text-foreground">{new Date(overallStart).toLocaleDateString()}</strong> to{" "}
              <strong className="text-foreground">{new Date(overallEnd).toLocaleDateString()}</strong>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Phase Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phase</TableHead>
                <TableHead className="w-28">Hours</TableHead>
                <TableHead className="w-24">Buffer %</TableHead>
                <TableHead className="w-28">Effective Hrs</TableHead>
                <TableHead className="w-24">Duration</TableHead>
                <TableHead className="w-32">Start</TableHead>
                <TableHead className="w-32">End</TableHead>
                <TableHead>Rationale</TableHead>
                <TableHead>Dependencies</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.phases.map((phase) => {
                const effectiveHours = phase.hours * (1 + phase.bufferPercent / 100);
                const durationDays = phase.startDate && phase.endDate
                  ? Math.round((new Date(phase.endDate).getTime() - new Date(phase.startDate).getTime()) / 86_400_000) + 1
                  : null;
                return (
                  <TableRow key={phase.id}>
                    <TableCell className="font-medium">{phase.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        className="h-8 w-full"
                        value={phase.hours}
                        onChange={(e) => updatePhase(phase.id, { hours: Number(e.target.value) || 0 })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        className="h-8 w-full"
                        value={phase.bufferPercent}
                        onChange={(e) => updatePhase(phase.id, { bufferPercent: Number(e.target.value) || 0 })}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{effectiveHours.toFixed(1)}</TableCell>
                    <TableCell className="text-muted-foreground">{durationDays ? `${durationDays}d` : "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{phase.startDate ? new Date(phase.startDate).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{phase.endDate ? new Date(phase.endDate).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      <Input
                        className="h-8 min-w-48"
                        value={phase.rationale ?? ""}
                        title={phase.rationale ?? ""}
                        onChange={(e) => updatePhase(phase.id, { rationale: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 min-w-40"
                        value={phase.dependencies ?? ""}
                        title={phase.dependencies ?? ""}
                        onChange={(e) => updatePhase(phase.id, { dependencies: e.target.value })}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-medium">Total</TableCell>
                <TableCell className="font-medium">{totalHours.toFixed(1)}</TableCell>
                <TableCell />
                <TableCell className="font-medium">{totalEffectiveHours.toFixed(1)}</TableCell>
                <TableCell colSpan={5} />
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <GanttChart phases={project.phases} />
        </CardContent>
      </Card>
    </div>
  );
}
