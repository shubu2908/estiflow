import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Download } from "lucide-react";

const EXPORTS: { kind: string; label: string }[] = [
  { kind: "all", label: "Export All (single workbook)" },
  { kind: "excel-estimate", label: "Estimate Summary (Excel)" },
  { kind: "stories-excel", label: "Stories & Tasks (Excel)" },
  { kind: "stories-word", label: "Stories & Tasks (Word)" },
  { kind: "testcases-excel", label: "Test Cases (Excel)" },
  { kind: "csv", label: "Estimate Summary (CSV)" },
];

export function ExportMenu({ projectId }: { projectId: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {EXPORTS.map((item, i) => (
          <div key={item.kind}>
            {i === 1 && <DropdownMenuSeparator />}
            <DropdownMenuItem asChild>
              <a href={api.exportUrl(projectId, item.kind)}>{item.label}</a>
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
