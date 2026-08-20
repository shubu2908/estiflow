import streamlit as st

import db
from constants import PHASE_NAMES
from file_service import files_to_neutral_parts
from llm_service import generate_estimate
from model_catalog import models_by_provider, PROVIDER_LABELS, PROVIDER_ICONS
from retry import GenerationError
from styles import page_header
from timeline import TimelinePhaseInput, calculate_timeline
from ui_helpers import render_api_key_prompt

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

top = st.columns([1, 5])
with top[0]:
    if st.button("🏠 Dashboard"):
        st.switch_page("views/dashboard.py")

page_header(f"Upload & Generate — {project.name}", "Upload the SDD and/or process flow diagram. Your AI model will analyze it and produce a phased estimate, backlog, and test cases.")

with st.container(border=True):
    grouped = models_by_provider()
    providers = list(grouped.keys())
    provider_labels = [f"{PROVIDER_ICONS[p]} {PROVIDER_LABELS[p]}" for p in providers]
    provider_idx = st.selectbox("Provider", range(len(providers)), format_func=lambda i: provider_labels[i], index=providers.index(project.provider))
    selected_provider = providers[provider_idx]

    provider_models = grouped[selected_provider]
    model_labels = [m.label for m in provider_models]
    current_model_idx = next((i for i, m in enumerate(provider_models) if m.id == project.model), 0)
    model_idx = st.selectbox("Model", range(len(provider_models)), format_func=lambda i: model_labels[i], index=current_model_idx)
    selected_model = provider_models[model_idx].id

    api_key = render_api_key_prompt(selected_provider, key_prefix="upload-")

    uploaded_files = st.file_uploader(
        "SDD / process flow files",
        type=["pdf", "docx", "png", "jpg", "jpeg"],
        accept_multiple_files=True,
        label_visibility="collapsed",
    )
    st.caption("PDF, DOCX, PNG, JPG — multiple files allowed")

    generate_clicked = st.button("Generate Estimate", type="primary", disabled=not uploaded_files or not api_key)

    if generate_clicked:
        if selected_model != project.model or selected_provider != project.provider:
            db.update_project_meta(project.id, provider=selected_provider, model=selected_model)

        with st.status(f"Generating estimate with {PROVIDER_LABELS[selected_provider]}... this can take 10–30s", expanded=True) as status:
            try:
                st.write("Reading uploaded files...")
                input_parts = files_to_neutral_parts(uploaded_files)

                st.write(f"Calling {PROVIDER_LABELS[selected_provider]}...")
                result = generate_estimate(
                    provider=selected_provider,
                    model=selected_model,
                    api_key=api_key,
                    input_parts=input_parts,
                    technology=project.technology,
                    complexity_override=project.complexityOverride,
                    hours_per_day=project.hoursPerDay,
                )

                st.write("Computing timeline and saving...")
                timeline = calculate_timeline(
                    [TimelinePhaseInput(hours=next(p.hours for p in result.phases if p.name == name), bufferPercent=next(p.bufferPercent for p in result.phases if p.name == name)) for name in PHASE_NAMES],
                    project.devStartDate,
                    project.hoursPerDay,
                    project.workingDays,
                )
                db.save_generated_estimate(project.id, list(PHASE_NAMES), timeline, result)

                status.update(label="Done!", state="complete", expanded=False)
                st.session_state["active_project_id"] = project.id
                st.switch_page("views/workspace.py")
            except GenerationError as err:
                status.update(label="Generation failed", state="error")
                st.error(str(err))
                if err.retryable:
                    st.caption("This looks like a temporary issue — try clicking Generate again.")
            except Exception as err:
                status.update(label="Generation failed", state="error")
                st.error(f"Unexpected error: {err}")
