import { useMemo, useState } from "react";
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, type ColumnDef, type SortingState } from "@tanstack/react-table";
import { TEST_CASE_PRIORITIES, TEST_CASE_TYPES, type StoryDto, type TestCaseDto } from "shared";
import { useEstimateStore } from "@/store/estimateStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown } from "lucide-react";

interface Row {
  tcId: string;
  storyId: string;
  storyTitle: string;
  testCase: TestCaseDto;
}

const PRIORITY_VARIANT: Record<string, "destructive" | "warning" | "secondary"> = {
  High: "destructive",
  Med: "warning",
  Low: "secondary",
};

export function TestCasesTab() {
  const project = useEstimateStore((s) => s.project)!;
  const updateTestCase = useEstimateStore((s) => s.updateTestCase);
  const [sorting, setSorting] = useState<SortingState>([]);

  const rows = useMemo<Row[]>(() => {
    let counter = 0;
    return project.stories.flatMap((story: StoryDto) =>
      story.testCases.map((tc) => {
        counter += 1;
        return { tcId: `TC-${String(counter).padStart(3, "0")}`, storyId: story.id, storyTitle: story.title, testCase: tc };
      })
    );
  }, [project.stories]);

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      { accessorKey: "tcId", header: "ID", size: 80 },
      {
        accessorKey: "storyTitle",
        header: ({ column }) => (
          <button className="flex items-center gap-1" onClick={() => column.toggleSorting()}>
            Story <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        size: 180,
      },
      {
        id: "title",
        header: "Title",
        cell: ({ row }) => (
          <Input
            className="h-8 min-w-40"
            value={row.original.testCase.title}
            onChange={(e) => updateTestCase(row.original.storyId, row.original.testCase.id, { title: e.target.value })}
          />
        ),
      },
      {
        id: "precondition",
        header: "Precondition",
        cell: ({ row }) => (
          <Input
            className="h-8 min-w-32"
            value={row.original.testCase.precondition ?? ""}
            onChange={(e) => updateTestCase(row.original.storyId, row.original.testCase.id, { precondition: e.target.value })}
          />
        ),
      },
      {
        id: "steps",
        header: "Steps",
        cell: ({ row }) => (
          <Textarea
            className="min-h-8 min-w-48"
            value={row.original.testCase.steps.join("\n")}
            onChange={(e) => updateTestCase(row.original.storyId, row.original.testCase.id, { steps: e.target.value.split("\n") })}
          />
        ),
      },
      {
        id: "expectedResult",
        header: "Expected Result",
        cell: ({ row }) => (
          <Input
            className="h-8 min-w-40"
            value={row.original.testCase.expectedResult}
            onChange={(e) => updateTestCase(row.original.storyId, row.original.testCase.id, { expectedResult: e.target.value })}
          />
        ),
      },
      {
        id: "priority",
        header: ({ column }) => (
          <button className="flex items-center gap-1" onClick={() => column.toggleSorting()}>
            Priority <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        accessorFn: (row) => row.testCase.priority,
        size: 110,
        cell: ({ row }) => (
          <Select
            value={row.original.testCase.priority}
            onValueChange={(v) => updateTestCase(row.original.storyId, row.original.testCase.id, { priority: v as TestCaseDto["priority"] })}
          >
            <SelectTrigger className="h-8 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEST_CASE_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  <Badge variant={PRIORITY_VARIANT[p]}>{p}</Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        id: "type",
        header: "Type",
        accessorFn: (row) => row.testCase.type,
        size: 130,
        cell: ({ row }) => (
          <Select
            value={row.original.testCase.type}
            onValueChange={(v) => updateTestCase(row.original.storyId, row.original.testCase.id, { type: v as TestCaseDto["type"] })}
          >
            <SelectTrigger className="h-8 w-28">
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
        ),
      },
    ],
    [updateTestCase]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.testCase.id,
  });

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No test cases yet.</p>;
  }

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
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
