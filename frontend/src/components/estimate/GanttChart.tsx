import type { PhaseDto } from "shared";

const COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

interface GanttChartProps {
  phases: PhaseDto[];
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function GanttChart({ phases }: GanttChartProps) {
  const withDates = phases.filter((p) => p.startDate && p.endDate);
  if (withDates.length === 0) return null;

  const rangeStart = new Date(Math.min(...withDates.map((p) => new Date(p.startDate!).getTime())));
  const rangeEnd = new Date(Math.max(...withDates.map((p) => new Date(p.endDate!).getTime())));
  const totalDays = Math.max(1, daysBetween(rangeStart, rangeEnd) + 1);

  const rowHeight = 36;
  const chartHeight = withDates.length * rowHeight + 24;
  const labelWidth = 200;
  const chartWidth = 760;

  return (
    <div className="overflow-x-auto">
      <svg width={labelWidth + chartWidth} height={chartHeight} role="img" aria-label="Phase timeline Gantt chart">
        {withDates.map((phase, i) => {
          const start = new Date(phase.startDate!);
          const end = new Date(phase.endDate!);
          const offsetDays = daysBetween(rangeStart, start);
          const durationDays = daysBetween(start, end) + 1;
          const x = labelWidth + (offsetDays / totalDays) * chartWidth;
          const width = Math.max(4, (durationDays / totalDays) * chartWidth);
          const y = i * rowHeight + 12;

          return (
            <g key={phase.id}>
              <text x={0} y={y + 16} fontSize={12} fill="currentColor" className="text-foreground">
                {phase.name}
              </text>
              <rect x={x} y={y} width={width} height={20} rx={4} fill={COLORS[i % COLORS.length]} />
              <text x={x + width + 6} y={y + 15} fontSize={10} fill="currentColor" className="text-muted-foreground">
                {start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
                {end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
