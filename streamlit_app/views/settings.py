import os

import streamlit as st

import db
from model_catalog import PROVIDER_LABELS, PROVIDER_ICONS
from styles import page_header

page_header("Settings", "Configure your AI provider API keys and defaults.")

for provider, label in PROVIDER_LABELS.items():
    with st.container(border=True):
        st.subheader(f"{PROVIDER_ICONS[provider]} {label}")

        current_key = db.get_api_key(provider)
        env_var = {"gemini": "GEMINI_API_KEY", "openai": "OPENAI_API_KEY", "anthropic": "ANTHROPIC_API_KEY"}[provider]
        env_key_present = bool(os.environ.get(env_var))

        if current_key:
            st.success(f"Key configured — ending in **····{current_key[-4:]}**")
        elif env_key_present:
            st.info(f"No key set here, but a `{env_var}` environment variable is configured and will be used.")
        else:
            st.warning("No API key configured yet. Generation with this provider won't work until you add one.")

        with st.form(f"api_key_form_{provider}", clear_on_submit=True):
            new_key = st.text_input(f"{label} API Key", type="password", placeholder="Paste your key here", key=f"settings-key-{provider}")
            col1, col2 = st.columns([1, 1])
            with col1:
                save = st.form_submit_button("Save Key", type="primary", use_container_width=True)
            with col2:
                clear = st.form_submit_button("Clear Saved Key", use_container_width=True, disabled=not current_key)

            if save:
                if new_key.strip():
                    db.set_api_key(provider, new_key.strip())
                    st.success("API key saved.")
                    st.rerun()
                else:
                    st.error("Enter a key before saving.")

            if clear:
                db.set_api_key(provider, None)
                st.info("Saved key cleared.")
                st.rerun()

st.caption(
    "Keys are stored locally in this app's database and are never displayed again after saving — only shown masked. "
    "Get keys from [Google AI Studio](https://aistudio.google.com/apikey), "
    "[OpenAI Platform](https://platform.openai.com/api-keys), or "
    "[Anthropic Console](https://console.anthropic.com/settings/keys)."
)

st.write("")

with st.container(border=True):
    st.subheader("About")
    st.caption(
        "EstiFlow is a single-user, local-first tool — there's no login. Anyone with access to this app "
        "(and this browser tab) can view and edit every project and change these API keys."
    )
