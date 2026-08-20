import streamlit as st

import db
from model_catalog import PROVIDER_ICONS, PROVIDER_LABELS
from styles import hero, pill

hero("Projects", "Upload a Solution Design Document, pick a model, and get a realistic delivery estimate with a full backlog and test suite.")

col1, col2 = st.columns([5, 1])
with col2:
    if st.button("➕ New Project", type="primary", use_container_width=True):
        st.switch_page("views/new_project.py")

projects = db.list_projects()

if projects:
    generated = sum(1 for p in projects if p.status != "draft")
    total_stories = sum(len(p.stories) for p in projects)
    m1, m2, m3 = st.columns(3)
    m1.metric("Projects", len(projects))
    m2.metric("Estimates Generated", generated)
    m3.metric("Total Stories", total_stories)
    st.write("")

if not projects:
    with st.container(border=True):
        st.markdown(
            "<div style='text-align:center; padding: 48px 0;'>"
            "<div style='font-size:40px;'>🗂️</div>"
            "<div style='font-weight:700; font-size:18px; margin-top:8px;'>No projects yet</div>"
            "<div style='color:#71717A; margin-top:2px;'>Create a project to generate your first estimate.</div>"
            "</div>",
            unsafe_allow_html=True,
        )
else:
    cols = st.columns(3)
    for i, project in enumerate(projects):
        with cols[i % 3]:
            with st.container(border=True):
                st.markdown(f"**{project.name}**")
                badges = pill(project.status.title(), project.status)
                badges += " " + pill(f"{PROVIDER_ICONS[project.provider]} {PROVIDER_LABELS[project.provider]}", "provider")
                if project.aiComplexity:
                    badges += " " + pill(f"{project.aiComplexity} complexity", project.aiComplexity.lower())
                st.markdown(badges, unsafe_allow_html=True)
                st.caption(", ".join(project.technology) or "No technology set")
                st.caption(f"Dev start {project.devStartDate[:10]}")
                if st.button("Open", key=f"open-{project.id}", use_container_width=True):
                    st.session_state["active_project_id"] = project.id
                    if project.status == "draft":
                        st.switch_page("views/upload_generate.py")
                    else:
                        st.switch_page("views/workspace.py")
