from datetime import date

import streamlit as st

import db
from constants import TECHNOLOGIES, COMPLEXITY_LEVELS, DEFAULT_HOURS_PER_DAY
from model_catalog import models_by_provider, PROVIDER_LABELS, PROVIDER_ICONS, get_default_model
from styles import page_header
from ui_helpers import render_api_key_prompt

page_header("New Project", "Set up the basics, then upload the SDD to generate an estimate.")

with st.container(border=True):
    name = st.text_input("Project Name", placeholder="Invoice Processing Automation")
    dev_start = st.date_input("Planned Dev Start Date", value=date.today())

    technology = st.multiselect("Technology", TECHNOLOGIES, placeholder="Select one or more technologies")
    other_tech = ""
    if "Other" in technology:
        other_tech = st.text_input("Specify other technology")

    col1, col2 = st.columns(2)
    with col1:
        complexity = st.selectbox("Complexity Override", ["AI-inferred (recommended)", *COMPLEXITY_LEVELS])
    with col2:
        hours_per_day = st.number_input("Hours per Productive Day", min_value=1.0, max_value=12.0, value=float(DEFAULT_HOURS_PER_DAY), step=0.5)

    st.markdown("**AI Model**")
    grouped = models_by_provider()
    default_model = get_default_model()
    providers = list(grouped.keys())

    provider_labels = [f"{PROVIDER_ICONS[p]} {PROVIDER_LABELS[p]}" for p in providers]
    provider_idx = st.selectbox("Provider", range(len(providers)), format_func=lambda i: provider_labels[i], index=providers.index(default_model.provider))
    selected_provider = providers[provider_idx]

    provider_models = grouped[selected_provider]
    model_labels = [m.label for m in provider_models]
    default_model_idx = next((i for i, m in enumerate(provider_models) if m.id == default_model.id), 0)
    model_idx = st.selectbox("Model", range(len(provider_models)), format_func=lambda i: model_labels[i], index=default_model_idx)
    selected_model = provider_models[model_idx].id

    render_api_key_prompt(selected_provider, key_prefix="new-")

    st.write("")
    if st.button("Continue to Upload", type="primary", use_container_width=True):
        resolved_tech = [t for t in technology if t != "Other"]
        if other_tech.strip():
            resolved_tech.append(other_tech.strip())

        if not name.strip() or not resolved_tech:
            st.error("Project name and at least one technology are required.")
        else:
            project_id = db.create_project(
                name=name.strip(),
                technology=resolved_tech,
                dev_start_date=dev_start.isoformat(),
                provider=selected_provider,
                model=selected_model,
                complexity_override=None if complexity == "AI-inferred (recommended)" else complexity,
                hours_per_day=hours_per_day,
            )
            st.session_state["active_project_id"] = project_id
            st.switch_page("views/upload_generate.py")
