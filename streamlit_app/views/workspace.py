import pandas as pd
import plotly.express as px
import streamlit as st

import db
from constants import DEFAULT_ROLES, STORY_POINTS, TEST_CASE_PRIORITIES, TEST_CASE_TYPES, WEEKDAY_LABELS
from db import new_id
from export_service import build_estimate_workbook, build_stories_workbook, build_test_cases_workbook, build_all_workbook, build_estimate_csv, build_stories_docx
from model_catalog import PROVIDER_ICONS, PROVIDER_LABELS
from models import RoleHourDto, TaskDto, TestCaseDto
from styles import page_header, pill
from timeline import TimelinePhaseInput, calculate_timeline

project_id = st.session_state.get("active_project_id")
if not project_id:
    st.warning("No project selected.")
    if st.button("← Back to Dashboard"):
        st.switch_page("views/dashboard.py")
    st.stop()

project = db.get_project(project_id)
if not project:
    st.error("That project no longer exists.")
    if st.button("← Back to Dashboard"):
        st.switch_page("views/dashboard.py")
    st.stop()


def recalc_and_save(hours_per_day=None, working_days=None):
    """Recompute phase dates from current DB state (optionally with overridden
    hours_per_day/working_days) and persist - single source of truth is the DB,
    reloaded fresh on every rerun, so every edit goes: mutate -> recalc -> save -> rerun."""
    p = db.get_project(project.id)
    hpd = hours_per_day if hours_per_day is not None else p.hoursPerDay
    wd = working_days if working_days is not None else p.workingDays
    timeline = calculate_timeline(
        [TimelinePhaseInput(hours=ph.hours, bufferPercent=ph.bufferPercent) for ph in p.phases],
        p.devStartDate,
        hpd,
        wd,
    )
    for ph, t in zip(p.phases, timeline):
        ph.startDate = t.startDate
        ph.endDate = t.endDate
    db.save_estimate(p.id, hpd, wd, p.phases, p.stories, p.customRoles)


# ---- Header ----

top = st.columns([1, 5, 2])
with top[0]:
    if st.button("🏠 Dashboard"):
        st.switch_page("views/dashboard.py")
with top[2]:
    with st.popover("⬇️ Export", use_container_width=True):
        base = project.name.strip().lower().replace(" ", "-")
        st.download_button("Export All (workbook)", build_all_workbook(project), f"{base}-full-export.xlsx", use_container_width=True)
        st.download_button("Estimate Summary (Excel)", build_estimate_workbook(project), f"{base}-estimate.xlsx", use_container_width=True)
        st.download_button("Stories & Tasks (Excel)", build_stories_workbook(project), f"{base}-stories.xlsx", use_container_width=True)
        st.download_button("Stories & Tasks (Word)", build_stories_docx(project), f"{base}-stories.docx", use_container_width=True)
        st.download_button("Test Cases (Excel)", build_test_cases_workbook(project), f"{base}-testcases.xlsx", use_container_width=True)
        st.download_button("Estimate Summary (CSV)", build_estimate_csv(project), f"{base}-estimate.csv", use_container_width=True)

page_header(project.name, f"{', '.join(project.technology)} · Dev start {project.devStartDate[:10]}")

badges = pill(project.status.title(), project.status)
badges += " " + pill(f"{PROVIDER_ICONS[project.provider]} {PROVIDER_LABELS[project.provider]}", "provider")
if project.aiComplexity:
    badges += " " + pill(f"{project.aiComplexity} complexity", project.aiComplexity.lower())
st.markdown(badges, unsafe_allow_html=True)
st.write("")

if project.assumptions:
    with st.expander("⚠️ AI assumptions to sanity-check", expanded=False):
        for a in project.assumptions:
            st.markdown(f"- {a}")

tab_overview, tab_stories, tab_testcases, tab_roles = st.tabs(["Overview / Timeline", "Stories & Tasks", "Test Cases", "Role Hours"])

# ---- Overview / Timeline ----

with tab_overview:
    c1, c2 = st.columns([1, 3])
    with c1:
        hpd = st.number_input("Hours per productive day", min_value=1.0, max_value=12.0, value=project.hoursPerDay, step=0.5, key="hpd_input")
        if hpd != project.hoursPerDay:
            recalc_and_save(hours_per_day=hpd)
            st.rerun()
    with c2:
        st.markdown("**Working Days**")
        wd_cols = st.columns(7)
        new_working_days = []
        for i in range(7):
            with wd_cols[i]:
                checked = st.checkbox(WEEKDAY_LABELS[i], value=i in project.workingDays, key=f"wd-{i}")
                if checked:
                    new_working_days.append(i)
        if set(new_working_days) != set(project.workingDays) and new_working_days:
            recalc_and_save(working_days=sorted(new_working_days))
            st.rerun()

    total_hours = sum(p.hours for p in project.phases)
    total_effective = sum(p.hours * (1 + p.bufferPercent / 100) for p in project.phases)
    m1, m2, m3 = st.columns(3)
    m1.metric("Total Hours", f"{total_hours:.0f}")
    m2.metric("Effective Hours (with buffer)", f"{total_effective:.0f}")
    if project.phases and project.phases[0].startDate and project.phases[-1].endDate:
        m3.metric("Project Window", f"{project.phases[0].startDate[:10]} → {project.phases[-1].endDate[:10]}")

    st.subheader("Phase Breakdown")
    phase_rows = [
        {
            "Phase": p.name,
            "Hours": p.hours,
            "Buffer %": p.bufferPercent,
            "Effective Hrs": round(p.hours * (1 + p.bufferPercent / 100), 1),
            "Start": p.startDate[:10] if p.startDate else "",
            "End": p.endDate[:10] if p.endDate else "",
            "Rationale": p.rationale or "",
            "Dependencies": p.dependencies or "",
        }
        for p in project.phases
    ]
    phases_df = pd.DataFrame(phase_rows)
    edited = st.data_editor(
        phases_df,
        key="phases_editor",
        hide_index=True,
        use_container_width=True,
        column_config={
            "Phase": st.column_config.TextColumn(disabled=True),
            "Hours": st.column_config.NumberColumn(min_value=0, step=1),
            "Buffer %": st.column_config.NumberColumn(min_value=0, max_value=100, step=1),
            "Effective Hrs": st.column_config.NumberColumn(disabled=True),
            "Start": st.column_config.TextColumn(disabled=True),
            "End": st.column_config.TextColumn(disabled=True),
        },
    )

    if st.session_state.get("phases_editor", {}).get("edited_rows"):
        for idx, changes in st.session_state["phases_editor"]["edited_rows"].items():
            phase = project.phases[idx]
            if "Hours" in changes:
                phase.hours = changes["Hours"]
            if "Buffer %" in changes:
                phase.bufferPercent = changes["Buffer %"]
            if "Rationale" in changes:
                phase.rationale = changes["Rationale"]
            if "Dependencies" in changes:
                phase.dependencies = changes["Dependencies"]
        timeline = calculate_timeline(
            [TimelinePhaseInput(hours=p.hours, bufferPercent=p.bufferPercent) for p in project.phases],
            project.devStartDate,
            project.hoursPerDay,
            project.workingDays,
        )
        for p, t in zip(project.phases, timeline):
            p.startDate, p.endDate = t.startDate, t.endDate
        db.save_estimate(project.id, project.hoursPerDay, project.workingDays, project.phases, project.stories, project.customRoles)
        # Clear the editor's diff state before rerunning - otherwise Streamlit keeps
        # replaying this same edited_rows dict against the freshly-saved baseline on
        # every subsequent run, causing an infinite save/rerun loop.
        del st.session_state["phases_editor"]
        st.rerun()

    st.subheader("Timeline")
    gantt_rows = [{"Phase": p.name, "Start": p.startDate, "End": p.endDate} for p in project.phases if p.startDate and p.endDate]
    if gantt_rows:
        gantt_df = pd.DataFrame(gantt_rows)
        fig = px.timeline(gantt_df, x_start="Start", x_end="End", y="Phase", color="Phase", color_discrete_sequence=px.colors.qualitative.Bold)
        fig.update_yaxes(autorange="reversed", title=None)
        fig.update_layout(showlegend=False, height=260, margin=dict(l=10, r=10, t=10, b=10))
        st.plotly_chart(fig, use_container_width=True)

# ---- Stories & Tasks ----

with tab_stories:
    epics: dict[str, list] = {}
    for story in project.stories:
        epics.setdefault(story.epic, []).append(story)

    phase_options = {p.id: p.name for p in project.phases}

    for epic_name, stories in epics.items():
        st.markdown(f"### {epic_name}")
        for story in stories:
            with st.expander(f"**{story.title}** · {story.storyPoints} pts · {phase_options.get(story.phaseId, 'Unassigned')}"):
                col1, col2 = st.columns([3, 1])
                with col1:
                    new_title = st.text_input("Title", value=story.title, key=f"title-{story.id}")
                with col2:
                    new_points = st.selectbox("Points", STORY_POINTS, index=STORY_POINTS.index(story.storyPoints) if story.storyPoints in STORY_POINTS else 0, key=f"points-{story.id}")

                phase_ids = list(phase_options.keys())
                phase_names = list(phase_options.values())
                current_phase_idx = phase_ids.index(story.phaseId) if story.phaseId in phase_ids else 0
                new_phase_name = st.selectbox("Phase", phase_names, index=current_phase_idx, key=f"phase-{story.id}")
                new_phase_id = phase_ids[phase_names.index(new_phase_name)]

                new_desc = st.text_area("Description", value=story.description, key=f"desc-{story.id}")
                new_ac = st.text_area("Acceptance Criteria (one per line)", value="\n".join(story.acceptanceCriteria), key=f"ac-{story.id}")

                if (
                    new_title != story.title
                    or new_points != story.storyPoints
                    or new_phase_id != story.phaseId
                    or new_desc != story.description
                    or new_ac != "\n".join(story.acceptanceCriteria)
                ):
                    story.title, story.storyPoints, story.phaseId, story.description = new_title, new_points, new_phase_id, new_desc
                    story.acceptanceCriteria = [line for line in new_ac.split("\n") if line.strip()]
                    db.save_estimate(project.id, project.hoursPerDay, project.workingDays, project.phases, project.stories, project.customRoles)
                    st.rerun()

                st.markdown("**Tasks**")
                task_df = pd.DataFrame([{"Title": t.title, "Hours": t.hours, "Role": t.role} for t in story.tasks])
                edited_tasks = st.data_editor(
                    task_df,
                    key=f"tasks-{story.id}",
                    hide_index=True,
                    use_container_width=True,
                    num_rows="dynamic",
                    column_config={"Hours": st.column_config.NumberColumn(min_value=0, step=0.5)},
                )
                if st.button("Save Tasks", key=f"save-tasks-{story.id}"):
                    story.tasks = [
                        TaskDto(
                            id=new_id(),
                            title=row["Title"],
                            hours=row["Hours"] if pd.notna(row.get("Hours")) else 0,
                            role=row["Role"] if pd.notna(row.get("Role")) else "Developer",
                        )
                        for _, row in edited_tasks.iterrows()
                        if row.get("Title")
                    ]
                    db.save_estimate(project.id, project.hoursPerDay, project.workingDays, project.phases, project.stories, project.customRoles)
                    st.rerun()

                st.markdown("**Test Cases**")
                tc_df = pd.DataFrame(
                    [
                        {
                            "Title": tc.title,
                            "Precondition": tc.precondition or "",
                            "Steps": "\n".join(tc.steps),
                            "Expected Result": tc.expectedResult,
                            "Priority": tc.priority,
                            "Type": tc.type,
                        }
                        for tc in story.testCases
                    ]
                )
                edited_tcs = st.data_editor(
                    tc_df,
                    key=f"tcs-{story.id}",
                    hide_index=True,
                    use_container_width=True,
                    num_rows="dynamic",
                    column_config={
                        "Priority": st.column_config.SelectboxColumn(options=TEST_CASE_PRIORITIES),
                        "Type": st.column_config.SelectboxColumn(options=TEST_CASE_TYPES),
                    },
                )
                if st.button("Save Test Cases", key=f"save-tcs-{story.id}"):
                    def _s(row, col, default=""):
                        val = row.get(col)
                        return val if pd.notna(val) else default

                    story.testCases = [
                        TestCaseDto(
                            id=new_id(),
                            title=row["Title"],
                            precondition=_s(row, "Precondition"),
                            steps=[s for s in str(_s(row, "Steps")).split("\n") if s.strip()],
                            expectedResult=_s(row, "Expected Result"),
                            priority=_s(row, "Priority", "Med"),
                            type=_s(row, "Type", "Functional"),
                            order=idx,
                        )
                        for idx, (_, row) in enumerate(edited_tcs.iterrows())
                        if row.get("Title") and pd.notna(row.get("Title"))
                    ]
                    db.save_estimate(project.id, project.hoursPerDay, project.workingDays, project.phases, project.stories, project.customRoles)
                    st.rerun()

# ---- Test Cases (flat cross-story view) ----

with tab_testcases:
    rows = []
    counter = 0
    for story in project.stories:
        for tc in story.testCases:
            counter += 1
            rows.append(
                {
                    "ID": f"TC-{counter:03d}",
                    "Story": story.title,
                    "Title": tc.title,
                    "Precondition": tc.precondition or "",
                    "Steps": "\n".join(tc.steps),
                    "Expected Result": tc.expectedResult,
                    "Priority": tc.priority,
                    "Type": tc.type,
                }
            )
    if rows:
        st.dataframe(
            pd.DataFrame(rows),
            hide_index=True,
            use_container_width=True,
            column_config={
                "Steps": st.column_config.TextColumn(width="large"),
                "Precondition": st.column_config.TextColumn(width="medium"),
            },
        )
        st.caption("Edit test cases from the Stories & Tasks tab (each story's expander) — this view is for review and export.")
    else:
        st.info("No test cases yet.")

# ---- Role Hours ----

with tab_roles:
    roles = list(dict.fromkeys([*DEFAULT_ROLES, *project.customRoles, *[rh.role for p in project.phases for rh in p.roleHours]]))

    new_role_col1, new_role_col2 = st.columns([3, 1])
    with new_role_col1:
        new_role_name = st.text_input("Add custom role", label_visibility="collapsed", placeholder="Add custom role")
    with new_role_col2:
        if st.button("Add Role", use_container_width=True) and new_role_name.strip():
            project.customRoles.append(new_role_name.strip())
            db.save_estimate(project.id, project.hoursPerDay, project.workingDays, project.phases, project.stories, project.customRoles)
            st.rerun()

    role_rows = []
    for phase in project.phases:
        row = {"Phase": phase.name}
        for role in roles:
            row[role] = next((rh.hours for rh in phase.roleHours if rh.role == role), 0)
        role_rows.append(row)
    role_df = pd.DataFrame(role_rows)

    edited_roles = st.data_editor(
        role_df,
        key="roles_editor",
        hide_index=True,
        use_container_width=True,
        column_config={"Phase": st.column_config.TextColumn(disabled=True), **{r: st.column_config.NumberColumn(min_value=0, step=1) for r in roles}},
    )

    if st.session_state.get("roles_editor", {}).get("edited_rows"):
        for idx, changes in st.session_state["roles_editor"]["edited_rows"].items():
            phase = project.phases[idx]
            for role, hours in changes.items():
                existing = next((rh for rh in phase.roleHours if rh.role == role), None)
                if existing:
                    existing.hours = hours
                else:
                    phase.roleHours.append(RoleHourDto(id=new_id(), role=role, hours=hours))
        db.save_estimate(project.id, project.hoursPerDay, project.workingDays, project.phases, project.stories, project.customRoles)
        del st.session_state["roles_editor"]
        st.rerun()

    totals = {role: sum(next((rh.hours for rh in p.roleHours if rh.role == role), 0) for p in project.phases) for role in roles}
    st.markdown("**Totals:** " + " · ".join(f"{role}: {hours:.0f}h" for role, hours in totals.items()))
    st.markdown(f"**Grand Total: {sum(totals.values()):.0f}h**")
