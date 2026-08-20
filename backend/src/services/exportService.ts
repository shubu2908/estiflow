import ExcelJS from "exceljs";
import { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, TextRun, WidthType } from "docx";
import { DEFAULT_ROLES, type ProjectDto } from "shared";

function effectiveHours(hours: number, bufferPercent: number): number {
  return hours * (1 + bufferPercent / 100);
}

function phaseBreakdownSheet(workbook: ExcelJS.Workbook, project: ProjectDto) {
  const sheet = workbook.addWorksheet("Phase Breakdown");
  sheet.columns = [
    { header: "Phase", key: "name", width: 26 },
    { header: "Hours", key: "hours", width: 10 },
    { header: "Buffer %", key: "buffer", width: 10 },
    { header: "Effective Hours", key: "effective", width: 16 },
    { header: "Start", key: "start", width: 14 },
    { header: "End", key: "end", width: 14 },
    { header: "Rationale", key: "rationale", width: 50 },
    { header: "Dependencies", key: "dependencies", width: 30 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const phase of project.phases) {
    sheet.addRow({
      name: phase.name,
      hours: phase.hours,
      buffer: phase.bufferPercent,
      effective: Number(effectiveHours(phase.hours, phase.bufferPercent).toFixed(1)),
      start: phase.startDate ? new Date(phase.startDate).toLocaleDateString() : "",
      end: phase.endDate ? new Date(phase.endDate).toLocaleDateString() : "",
      rationale: phase.rationale ?? "",
      dependencies: phase.dependencies ?? "",
    });
  }
  const totalRow = sheet.addRow({
    name: "Total",
    hours: project.phases.reduce((s, p) => s + p.hours, 0),
    effective: Number(project.phases.reduce((s, p) => s + effectiveHours(p.hours, p.bufferPercent), 0).toFixed(1)),
  });
  totalRow.font = { bold: true };
}

function roleHoursSheet(workbook: ExcelJS.Workbook, project: ProjectDto) {
  const sheet = workbook.addWorksheet("Role Hours");
  const roles = Array.from(
    new Set([...DEFAULT_ROLES, ...project.customRoles, ...project.phases.flatMap((p) => p.roleHours.map((rh) => rh.role))])
  );
  sheet.columns = [{ header: "Phase", key: "phase", width: 26 }, ...roles.map((r) => ({ header: r, key: r, width: 16 })), { header: "Total", key: "total", width: 12 }];
  sheet.getRow(1).font = { bold: true };

  const roleTotals: Record<string, number> = Object.fromEntries(roles.map((r) => [r, 0]));
  for (const phase of project.phases) {
    const row: Record<string, number | string> = { phase: phase.name };
    let phaseTotal = 0;
    for (const role of roles) {
      const hours = phase.roleHours.find((rh) => rh.role === role)?.hours ?? 0;
      row[role] = hours;
      roleTotals[role] += hours;
      phaseTotal += hours;
    }
    row.total = phaseTotal;
    sheet.addRow(row);
  }
  const totalRow: Record<string, number | string> = { phase: "Total", total: Object.values(roleTotals).reduce((s, v) => s + v, 0) };
  for (const role of roles) totalRow[role] = roleTotals[role];
  sheet.addRow(totalRow).font = { bold: true };
}

function timelineSheet(workbook: ExcelJS.Workbook, project: ProjectDto) {
  const sheet = workbook.addWorksheet("Timeline");
  sheet.columns = [
    { header: "Phase", key: "name", width: 26 },
    { header: "Start", key: "start", width: 14 },
    { header: "End", key: "end", width: 14 },
    { header: "Duration (days)", key: "duration", width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const phase of project.phases) {
    const duration =
      phase.startDate && phase.endDate
        ? Math.round((new Date(phase.endDate).getTime() - new Date(phase.startDate).getTime()) / 86_400_000) + 1
        : "";
    sheet.addRow({
      name: phase.name,
      start: phase.startDate ? new Date(phase.startDate).toLocaleDateString() : "",
      end: phase.endDate ? new Date(phase.endDate).toLocaleDateString() : "",
      duration,
    });
  }
}

function storiesSheet(workbook: ExcelJS.Workbook, project: ProjectDto) {
  const sheet = workbook.addWorksheet("Stories");
  sheet.columns = [
    { header: "Epic", key: "epic", width: 22 },
    { header: "Story", key: "title", width: 40 },
    { header: "Description", key: "description", width: 60 },
    { header: "Acceptance Criteria", key: "ac", width: 60 },
    { header: "Story Points", key: "points", width: 12 },
    { header: "Phase", key: "phase", width: 22 },
  ];
  sheet.getRow(1).font = { bold: true };
  const phaseNameById = new Map(project.phases.map((p) => [p.id, p.name]));
  for (const story of project.stories) {
    sheet.addRow({
      epic: story.epic,
      title: story.title,
      description: story.description,
      ac: story.acceptanceCriteria.map((c) => `- ${c}`).join("\n"),
      points: story.storyPoints,
      phase: story.phaseId ? phaseNameById.get(story.phaseId) ?? "" : "",
    });
  }
}

function tasksSheet(workbook: ExcelJS.Workbook, project: ProjectDto) {
  const sheet = workbook.addWorksheet("Tasks");
  sheet.columns = [
    { header: "Epic", key: "epic", width: 22 },
    { header: "Story", key: "story", width: 40 },
    { header: "Task", key: "title", width: 40 },
    { header: "Hours", key: "hours", width: 10 },
    { header: "Role", key: "role", width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const story of project.stories) {
    for (const task of story.tasks) {
      sheet.addRow({ epic: story.epic, story: story.title, title: task.title, hours: task.hours, role: task.role });
    }
  }
}

function testCasesSheet(workbook: ExcelJS.Workbook, project: ProjectDto) {
  const sheet = workbook.addWorksheet("Test Cases");
  sheet.columns = [
    { header: "Test Case ID", key: "id", width: 14 },
    { header: "Story", key: "story", width: 40 },
    { header: "Title", key: "title", width: 40 },
    { header: "Precondition", key: "precondition", width: 30 },
    { header: "Steps", key: "steps", width: 50 },
    { header: "Expected Result", key: "expected", width: 40 },
    { header: "Priority", key: "priority", width: 10 },
    { header: "Type", key: "type", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };
  let counter = 0;
  for (const story of project.stories) {
    for (const tc of story.testCases) {
      counter += 1;
      sheet.addRow({
        id: `TC-${String(counter).padStart(3, "0")}`,
        story: story.title,
        title: tc.title,
        precondition: tc.precondition ?? "",
        steps: tc.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
        expected: tc.expectedResult,
        priority: tc.priority,
        type: tc.type,
      });
    }
  }
}

export async function buildEstimateWorkbook(project: ProjectDto): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  phaseBreakdownSheet(workbook, project);
  roleHoursSheet(workbook, project);
  timelineSheet(workbook, project);
  return workbook.xlsx.writeBuffer();
}

export async function buildStoriesWorkbook(project: ProjectDto): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  storiesSheet(workbook, project);
  tasksSheet(workbook, project);
  return workbook.xlsx.writeBuffer();
}

export async function buildTestCasesWorkbook(project: ProjectDto): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  testCasesSheet(workbook, project);
  return workbook.xlsx.writeBuffer();
}

export async function buildAllWorkbook(project: ProjectDto): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  phaseBreakdownSheet(workbook, project);
  roleHoursSheet(workbook, project);
  timelineSheet(workbook, project);
  storiesSheet(workbook, project);
  tasksSheet(workbook, project);
  testCasesSheet(workbook, project);
  return workbook.xlsx.writeBuffer();
}

export function buildEstimateCsv(project: ProjectDto): string {
  const header = ["Phase", "Hours", "Buffer %", "Effective Hours", "Start", "End", "Rationale", "Dependencies"];
  const rows = project.phases.map((phase) => [
    phase.name,
    String(phase.hours),
    String(phase.bufferPercent),
    effectiveHours(phase.hours, phase.bufferPercent).toFixed(1),
    phase.startDate ? new Date(phase.startDate).toLocaleDateString() : "",
    phase.endDate ? new Date(phase.endDate).toLocaleDateString() : "",
    phase.rationale ?? "",
    phase.dependencies ?? "",
  ]);
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
}

export async function buildStoriesDocx(project: ProjectDto): Promise<Buffer> {
  const phaseNameById = new Map(project.phases.map((p) => [p.id, p.name]));
  const epics = new Map<string, typeof project.stories>();
  for (const story of project.stories) {
    if (!epics.has(story.epic)) epics.set(story.epic, []);
    epics.get(story.epic)!.push(story);
  }

  const children: (Paragraph | Table)[] = [
    new Paragraph({ text: project.name, heading: HeadingLevel.TITLE }),
    new Paragraph({ text: "Stories & Tasks", heading: HeadingLevel.HEADING_1 }),
  ];

  for (const [epicName, stories] of epics) {
    children.push(new Paragraph({ text: epicName, heading: HeadingLevel.HEADING_2 }));
    for (const story of stories) {
      children.push(
        new Paragraph({ text: `${story.title} (${story.storyPoints} pts)`, heading: HeadingLevel.HEADING_3 }),
        new Paragraph({ children: [new TextRun({ text: story.description, italics: true })] }),
        new Paragraph({ text: "Acceptance Criteria:", spacing: { before: 100 } }),
        ...story.acceptanceCriteria.map((c) => new Paragraph({ text: `• ${c}` })),
        new Paragraph({ text: `Phase: ${story.phaseId ? phaseNameById.get(story.phaseId) ?? "" : "Unassigned"}`, spacing: { before: 100 } })
      );

      if (story.tasks.length > 0) {
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: ["Task", "Hours", "Role"].map(
                  (h) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] })
                ),
              }),
              ...story.tasks.map(
                (task) =>
                  new TableRow({
                    children: [task.title, String(task.hours), task.role].map(
                      (v) => new TableCell({ children: [new Paragraph(v)] })
                    ),
                  })
              ),
            ],
          }),
          new Paragraph({ text: "" })
        );
      }
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}
