import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
  type ExpandedState,
} from "@tanstack/react-table";
import type { StoryDto } from "shared";
import { STORY_POINTS, DEFAULT_ROLES } from "shared";
import { useEstimateStore } from "@/store/estimateStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { TEST_CASE_PRIORITIES, TEST_CASE_TYPES } from "shared";

export function StoriesTasksTab() {
  const project = useEstimateStore((s) => s.project)!;

  const epics = useMemo(() => {
    const map = new Map<string, StoryDto[]>();
    for (const story of project.stories) {
      if (!map.has(story.epic)) map.set(story.epic, []);
      map.get(story.epic)!.push(story);
    }
    return Array.from(map.entries());
  }, [project.stories]);

  return (
    <div className="flex flex-col gap-8">
      {epics.map(([epicName, stories]) => (
        <div key={epicName} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">{epicName}</h3>
            <Badge variant="secondary">{stories.length} stories</Badge>
          </div>
          <EpicStoryTable stories={stories} phases={project.phases} />
        </div>
      ))}
    </div>
  );
}

function EpicStoryTable({ stories, phases }: { stories: StoryDto[]; phases: { id: string; name: string }[] }) {
  const updateStory = useEstimateStore((s) => s.updateStory);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const columns = useMemo<ColumnDef<StoryDto>[]>(
    () => [
      {
        id: "expander",
        header: () => null,
        cell: ({ row }) => (
          <button onClick={() => row.toggleExpanded()} className="text-muted-foreground">
            {row.getIsExpanded() ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ),
        size: 32,
      },
      {
        accessorKey: "title",
        header: "Story",
        cell: ({ row }) => (
          <Input
            className="h-8 min-w-56"
            value={row.original.title}
            onChange={(e) => updateStory(row.original.id, { title: e.target.value })}
          />
        ),
      },
      {
        accessorKey: "storyPoints",
        header: "Points",
        size: 90,
        cell: ({ row }) => (
          <Select
            value={String(row.original.storyPoints)}
            onValueChange={(v) => updateStory(row.original.id, { storyPoints: Number(v) as StoryDto["storyPoints"] })}
          >
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STORY_POINTS.map((sp) => (
                <SelectItem key={sp} value={String(sp)}>
                  {sp}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        accessorKey: "phaseId",
        header: "Phase",
        size: 180,
        cell: ({ row }) => (
          <Select value={row.original.phaseId ?? ""} onValueChange={(v) => updateStory(row.original.id, { phaseId: v })}>
            <SelectTrigger className="h-8 w-full">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              {phases.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        id: "tasks",
        header: "Tasks",
        size: 100,
        cell: ({ row }) => {
          const totalHours = row.original.tasks.reduce((sum, t) => sum + t.hours, 0);
          return (
            <span className="text-sm text-muted-foreground">
              {row.original.tasks.length} · {totalHours.toFixed(1)}h
            </span>
          );
        },
      },
      {
        id: "testCases",
        header: "Test Cases",
        size: 90,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.testCases.length}</span>,
      },
    ],
    [phases, updateStory]
  );

  const table = useReactTable({
    data: stories,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((hg) => (
          <TableRow key={hg.id}>
            {hg.headers.map((header) => (
              <TableHead key={header.id} style={{ width: header.getSize() }}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <>
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
            {row.getIsExpanded() && (
              <TableRow key={`${row.id}-expanded`}>
                <TableCell colSpan={columns.length} className="bg-muted/30">
                  <StoryDetail story={row.original} />
                </TableCell>
              </TableRow>
            )}
          </>
        ))}
      </TableBody>
    </Table>
  );
}

function StoryDetail({ story }: { story: StoryDto }) {
  const updateStory = useEstimateStore((s) => s.updateStory);
  const updateAcceptanceCriteria = useEstimateStore((s) => s.updateAcceptanceCriteria);
  const updateTask = useEstimateStore((s) => s.updateTask);
  const addTask = useEstimateStore((s) => s.addTask);
  const removeTask = useEstimateStore((s) => s.removeTask);
  const updateTestCase = useEstimateStore((s) => s.updateTestCase);
  const addTestCase = useEstimateStore((s) => s.addTestCase);
  const removeTestCase = useEstimateStore((s) => s.removeTestCase);

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Description</span>
        <Textarea
          value={story.description}
          onChange={(e) => updateStory(story.id, { description: e.target.value })}
          className="min-h-16 bg-background"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Acceptance Criteria</span>
        <Textarea
          value={story.acceptanceCriteria.join("\n")}
          onChange={(e) => updateAcceptanceCriteria(story.id, e.target.value.split("\n"))}
          className="min-h-16 bg-background"
          placeholder="One criterion per line"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Tasks</span>
          <Button variant="outline" size="sm" onClick={() => addTask(story.id)}>
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="w-28">Hours</TableHead>
              <TableHead className="w-40">Role</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {story.tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>
                  <Input
                    className="h-8 bg-background"
                    value={task.title}
                    onChange={(e) => updateTask(story.id, task.id, { title: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    className="h-8 bg-background"
                    value={task.hours}
                    onChange={(e) => updateTask(story.id, task.id, { hours: Number(e.target.value) || 0 })}
                  />
                </TableCell>
                <TableCell>
                  <Select value={task.role} onValueChange={(v) => updateTask(story.id, task.id, { role: v })}>
                    <SelectTrigger className="h-8 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                      {!DEFAULT_ROLES.includes(task.role as (typeof DEFAULT_ROLES)[number]) && (
                        <SelectItem value={task.role}>{task.role}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <button onClick={() => removeTask(story.id, task.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Test Cases</span>
          <Button variant="outline" size="sm" onClick={() => addTestCase(story.id)}>
            <Plus className="h-3.5 w-3.5" />
            Add Test Case
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Steps</TableHead>
              <TableHead>Expected Result</TableHead>
              <TableHead className="w-28">Priority</TableHead>
              <TableHead className="w-32">Type</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {story.testCases.map((tc) => (
              <TableRow key={tc.id}>
                <TableCell>
                  <Input
                    className="h-8 bg-background"
                    value={tc.title}
                    onChange={(e) => updateTestCase(story.id, tc.id, { title: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Textarea
                    className="min-h-8 bg-background"
                    value={tc.steps.join("\n")}
                    onChange={(e) => updateTestCase(story.id, tc.id, { steps: e.target.value.split("\n") })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    className="h-8 bg-background"
                    value={tc.expectedResult}
                    onChange={(e) => updateTestCase(story.id, tc.id, { expectedResult: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Select value={tc.priority} onValueChange={(v) => updateTestCase(story.id, tc.id, { priority: v as typeof tc.priority })}>
                    <SelectTrigger className="h-8 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEST_CASE_PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select value={tc.type} onValueChange={(v) => updateTestCase(story.id, tc.id, { type: v as typeof tc.type })}>
                    <SelectTrigger className="h-8 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEST_CASE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <button onClick={() => removeTestCase(story.id, tc.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
