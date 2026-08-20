import { useMemo, useState } from "react";
import { DEFAULT_ROLES } from "shared";
import { useEstimateStore } from "@/store/estimateStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

export function RoleHoursTab() {
  const project = useEstimateStore((s) => s.project)!;
  const setRoleHour = useEstimateStore((s) => s.setRoleHour);
  const addCustomRole = useEstimateStore((s) => s.addCustomRole);
  const [newRole, setNewRole] = useState("");

  const roles = useMemo(() => {
    const fromData = project.phases.flatMap((p) => p.roleHours.map((rh) => rh.role));
    return Array.from(new Set([...DEFAULT_ROLES, ...project.customRoles, ...fromData]));
  }, [project.phases, project.customRoles]);

  function hoursFor(phaseId: string, role: string): number {
    const phase = project.phases.find((p) => p.id === phaseId);
    return phase?.roleHours.find((rh) => rh.role === role)?.hours ?? 0;
  }

  const roleTotals = roles.map((role) => project.phases.reduce((sum, p) => sum + hoursFor(p.id, role), 0));
  const phaseTotals = project.phases.map((p) => p.roleHours.reduce((sum, rh) => sum + rh.hours, 0));
  const grandTotal = roleTotals.reduce((sum, v) => sum + v, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-2">
        <Input placeholder="Add custom role" value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-56" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (newRole.trim()) {
              addCustomRole(newRole.trim());
              setNewRole("");
            }
          }}
        >
          <Plus className="h-4 w-4" />
          Add Role
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role Hours by Phase</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phase</TableHead>
                {roles.map((role) => (
                  <TableHead key={role} className="w-28">
                    {role}
                  </TableHead>
                ))}
                <TableHead className="w-24">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.phases.map((phase, phaseIdx) => (
                <TableRow key={phase.id}>
                  <TableCell className="font-medium">{phase.name}</TableCell>
                  {roles.map((role) => (
                    <TableCell key={role}>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        className="h-8 w-full"
                        value={hoursFor(phase.id, role)}
                        onChange={(e) => setRoleHour(phase.id, role, Number(e.target.value) || 0)}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="font-medium text-muted-foreground">{phaseTotals[phaseIdx].toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-medium">Total</TableCell>
                {roleTotals.map((total, i) => (
                  <TableCell key={roles[i]} className="font-medium">
                    {total.toFixed(1)}
                  </TableCell>
                ))}
                <TableCell className="font-medium">{grandTotal.toFixed(1)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
