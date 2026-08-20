from __future__ import annotations

import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from models import EstimateResponse, PhaseDto, ProjectDto, RoleHourDto, StoryDto, TaskDto, TestCaseDto
from timeline import TimelinePhaseResult

DB_PATH = Path(__file__).parent / "estimation_tool.db"


def new_id() -> str:
    return uuid.uuid4().hex


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                technology TEXT NOT NULL,
                dev_start_date TEXT NOT NULL,
                provider TEXT NOT NULL DEFAULT 'gemini',
                model TEXT NOT NULL,
                complexity_override TEXT,
                ai_complexity TEXT,
                assumptions TEXT NOT NULL DEFAULT '[]',
                hours_per_day REAL NOT NULL DEFAULT 6,
                working_days TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
                status TEXT NOT NULL DEFAULT 'draft',
                custom_roles TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS phases (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                "order" INTEGER NOT NULL,
                hours REAL NOT NULL,
                buffer_percent REAL NOT NULL,
                start_date TEXT,
                end_date TEXT,
                rationale TEXT,
                dependencies TEXT
            );

            CREATE TABLE IF NOT EXISTS role_hours (
                id TEXT PRIMARY KEY,
                phase_id TEXT NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
                role TEXT NOT NULL,
                hours REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS stories (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                phase_id TEXT REFERENCES phases(id) ON DELETE SET NULL,
                epic TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                acceptance_criteria TEXT NOT NULL DEFAULT '[]',
                story_points INTEGER NOT NULL,
                "order" INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                hours REAL NOT NULL,
                role TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS test_cases (
                id TEXT PRIMARY KEY,
                story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                precondition TEXT,
                steps TEXT NOT NULL DEFAULT '[]',
                expected_result TEXT NOT NULL,
                priority TEXT NOT NULL,
                type TEXT NOT NULL,
                "order" INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_phases_project ON phases(project_id);
            CREATE INDEX IF NOT EXISTS idx_stories_project ON stories(project_id);
            CREATE INDEX IF NOT EXISTS idx_stories_phase ON stories(phase_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_story ON tasks(story_id);
            CREATE INDEX IF NOT EXISTS idx_testcases_story ON test_cases(story_id);
            """
        )


# ---- Projects ----


def create_project(name: str, technology: list[str], dev_start_date: str, provider: str, model: str, complexity_override: str | None, hours_per_day: float) -> str:
    pid = new_id()
    ts = now_iso()
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO projects (id, name, technology, dev_start_date, provider, model, complexity_override, hours_per_day, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (pid, name, json.dumps(technology), dev_start_date, provider, model, complexity_override, hours_per_day, ts, ts),
        )
    return pid


def list_projects() -> list[ProjectDto]:
    with get_conn() as conn:
        rows = conn.execute("SELECT id FROM projects ORDER BY updated_at DESC").fetchall()
    return [get_project(row["id"]) for row in rows]


def delete_project(project_id: str):
    with get_conn() as conn:
        conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))


def update_project_meta(project_id: str, **fields):
    column_map = {
        "name": "name",
        "technology": "technology",
        "devStartDate": "dev_start_date",
        "provider": "provider",
        "model": "model",
        "complexityOverride": "complexity_override",
        "hoursPerDay": "hours_per_day",
    }
    sets, values = [], []
    for key, value in fields.items():
        col = column_map.get(key)
        if not col:
            continue
        if key == "technology":
            value = json.dumps(value)
        sets.append(f"{col} = ?")
        values.append(value)
    if not sets:
        return
    sets.append("updated_at = ?")
    values.append(now_iso())
    values.append(project_id)
    with get_conn() as conn:
        conn.execute(f"UPDATE projects SET {', '.join(sets)} WHERE id = ?", values)


def get_project(project_id: str) -> ProjectDto | None:
    with get_conn() as conn:
        p = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not p:
            return None

        phase_rows = conn.execute('SELECT * FROM phases WHERE project_id = ? ORDER BY "order" ASC', (project_id,)).fetchall()
        phases = []
        for ph in phase_rows:
            rh_rows = conn.execute("SELECT * FROM role_hours WHERE phase_id = ?", (ph["id"],)).fetchall()
            phases.append(
                PhaseDto(
                    id=ph["id"],
                    name=ph["name"],
                    order=ph["order"],
                    hours=ph["hours"],
                    bufferPercent=ph["buffer_percent"],
                    startDate=ph["start_date"],
                    endDate=ph["end_date"],
                    rationale=ph["rationale"],
                    dependencies=ph["dependencies"],
                    roleHours=[RoleHourDto(id=r["id"], role=r["role"], hours=r["hours"]) for r in rh_rows],
                )
            )

        story_rows = conn.execute('SELECT * FROM stories WHERE project_id = ? ORDER BY "order" ASC', (project_id,)).fetchall()
        stories = []
        for st in story_rows:
            task_rows = conn.execute("SELECT * FROM tasks WHERE story_id = ?", (st["id"],)).fetchall()
            tc_rows = conn.execute('SELECT * FROM test_cases WHERE story_id = ? ORDER BY "order" ASC', (st["id"],)).fetchall()
            stories.append(
                StoryDto(
                    id=st["id"],
                    epic=st["epic"],
                    title=st["title"],
                    description=st["description"],
                    acceptanceCriteria=json.loads(st["acceptance_criteria"]),
                    storyPoints=st["story_points"],
                    phaseId=st["phase_id"],
                    order=st["order"],
                    tasks=[TaskDto(id=t["id"], title=t["title"], hours=t["hours"], role=t["role"]) for t in task_rows],
                    testCases=[
                        TestCaseDto(
                            id=tc["id"],
                            title=tc["title"],
                            precondition=tc["precondition"],
                            steps=json.loads(tc["steps"]),
                            expectedResult=tc["expected_result"],
                            priority=tc["priority"],
                            type=tc["type"],
                            order=tc["order"],
                        )
                        for tc in tc_rows
                    ],
                )
            )

        return ProjectDto(
            id=p["id"],
            name=p["name"],
            technology=json.loads(p["technology"]),
            devStartDate=p["dev_start_date"],
            provider=p["provider"],
            model=p["model"],
            complexityOverride=p["complexity_override"],
            aiComplexity=p["ai_complexity"],
            assumptions=json.loads(p["assumptions"]),
            hoursPerDay=p["hours_per_day"],
            workingDays=json.loads(p["working_days"]),
            status=p["status"],
            customRoles=json.loads(p["custom_roles"]),
            createdAt=p["created_at"],
            updatedAt=p["updated_at"],
            phases=phases,
            stories=stories,
        )


def _replace_phases_and_stories(conn, project_id: str, phases: list[PhaseDto], stories: list[StoryDto]):
    conn.execute("DELETE FROM stories WHERE project_id = ?", (project_id,))
    conn.execute("DELETE FROM phases WHERE project_id = ?", (project_id,))

    for phase in phases:
        conn.execute(
            'INSERT INTO phases (id, project_id, name, "order", hours, buffer_percent, start_date, end_date, rationale, dependencies) '
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (phase.id, project_id, phase.name, phase.order, phase.hours, phase.bufferPercent, phase.startDate, phase.endDate, phase.rationale, phase.dependencies),
        )
        for rh in phase.roleHours:
            conn.execute("INSERT INTO role_hours (id, phase_id, role, hours) VALUES (?, ?, ?, ?)", (rh.id, phase.id, rh.role, rh.hours))

    for story in stories:
        conn.execute(
            'INSERT INTO stories (id, project_id, phase_id, epic, title, description, acceptance_criteria, story_points, "order") '
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (story.id, project_id, story.phaseId, story.epic, story.title, story.description, json.dumps(story.acceptanceCriteria), story.storyPoints, story.order),
        )
        for task in story.tasks:
            conn.execute("INSERT INTO tasks (id, story_id, title, hours, role) VALUES (?, ?, ?, ?, ?)", (task.id, story.id, task.title, task.hours, task.role))
        for tc in story.testCases:
            conn.execute(
                'INSERT INTO test_cases (id, story_id, title, precondition, steps, expected_result, priority, type, "order") '
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (tc.id, story.id, tc.title, tc.precondition, json.dumps(tc.steps), tc.expectedResult, tc.priority, tc.type, tc.order),
            )


def save_estimate(project_id: str, hours_per_day: float, working_days: list[int], phases: list[PhaseDto], stories: list[StoryDto], custom_roles: list[str]):
    with get_conn() as conn:
        _replace_phases_and_stories(conn, project_id, phases, stories)
        conn.execute(
            "UPDATE projects SET hours_per_day = ?, working_days = ?, custom_roles = ?, status = 'edited', updated_at = ? WHERE id = ?",
            (hours_per_day, json.dumps(working_days), json.dumps(custom_roles), now_iso(), project_id),
        )


def save_generated_estimate(
    project_id: str,
    phase_names_in_order: list[str],
    timeline: list[TimelinePhaseResult],
    estimate: EstimateResponse,
):
    phases: list[PhaseDto] = []
    phase_id_by_name: dict[str, str] = {}
    estimate_phase_by_name = {p.name: p for p in estimate.phases}

    for i, name in enumerate(phase_names_in_order):
        gp = estimate_phase_by_name[name]
        pid = new_id()
        phase_id_by_name[name] = pid
        phases.append(
            PhaseDto(
                id=pid,
                name=name,
                order=i,
                hours=gp.hours,
                bufferPercent=gp.bufferPercent,
                startDate=timeline[i].startDate,
                endDate=timeline[i].endDate,
                rationale=gp.rationale,
                dependencies=gp.dependencies,
                roleHours=[RoleHourDto(id=new_id(), role=rh.role, hours=rh.hours) for rh in gp.roleHours],
            )
        )

    stories: list[StoryDto] = []
    order = 0
    for epic in estimate.epics:
        for s in epic.stories:
            from constants import nearest_fibonacci

            stories.append(
                StoryDto(
                    id=new_id(),
                    epic=epic.name,
                    title=s.title,
                    description=s.description,
                    acceptanceCriteria=s.acceptanceCriteria,
                    storyPoints=nearest_fibonacci(s.storyPoints),
                    phaseId=phase_id_by_name.get(s.phase),
                    order=order,
                    tasks=[TaskDto(id=new_id(), title=t.title, hours=t.hours, role=t.role) for t in s.tasks],
                    testCases=[
                        TestCaseDto(
                            id=new_id(),
                            title=tc.title,
                            precondition=tc.precondition,
                            steps=tc.steps,
                            expectedResult=tc.expectedResult,
                            priority=tc.priority,
                            type=tc.type,
                            order=idx,
                        )
                        for idx, tc in enumerate(s.testCases)
                    ],
                )
            )
            order += 1

    with get_conn() as conn:
        _replace_phases_and_stories(conn, project_id, phases, stories)
        conn.execute(
            "UPDATE projects SET status = 'generated', ai_complexity = ?, assumptions = ?, updated_at = ? WHERE id = ?",
            (estimate.overallComplexity, json.dumps(estimate.assumptions), now_iso(), project_id),
        )
