import streamlit as st

import session_keys
from model_catalog import PROVIDER_LABELS, PROVIDER_ICONS
from styles import page_header

page_header("Settings", "Set your AI provider API keys for this browser session.")

st.info(
    "Keys entered here apply **only to your current browser session** — nothing is saved on the "
    "server, and other people using this same app (e.g. a shared deployed link) never see your key "
    "or have theirs affected by you. Close the tab or start a new session and you'll need to re-enter it."
)

for provider, label in PROVIDER_LABELS.items():
    with st.container(border=True):
        st.subheader(f"{PROVIDER_ICONS[provider]} {label}")

        session_key = session_keys.get_session_key(provider)
        deployment_default = session_keys.get_deployment_default_key(provider)

        if session_key:
            st.success(f"Using your session key — ending in **····{session_key[-4:]}**")
        elif deployment_default:
            st.info("No session key set — currently using this deployment's default key (set by whoever hosts this app).")
        else:
            st.warning("No API key available yet. Generation with this provider won't work until you add one.")

        with st.form(f"api_key_form_{provider}", clear_on_submit=True):
            new_key = st.text_input(f"{label} API Key", type="password", placeholder="Paste your key here", key=f"settings-key-{provider}")
            col1, col2 = st.columns([1, 1])
            with col1:
                save = st.form_submit_button("Use for This Session", type="primary", use_container_width=True)
            with col2:
                clear = st.form_submit_button("Clear My Session Key", use_container_width=True, disabled=not session_key)

            if save:
                if new_key.strip():
                    session_keys.set_session_key(provider, new_key.strip())
                    st.success("Key set for this session.")
                    st.rerun()
                else:
                    st.error("Enter a key before saving.")

            if clear:
                session_keys.set_session_key(provider, None)
                st.info("Session key cleared.")
                st.rerun()

st.caption(
    "Get keys from [Google AI Studio](https://aistudio.google.com/apikey), "
    "[OpenAI Platform](https://platform.openai.com/api-keys), or "
    "[Anthropic Console](https://console.anthropic.com/settings/keys)."
)

st.write("")

with st.container(border=True):
    st.subheader("About")
    st.caption(
        "EstiFlow has no login — anyone with a link to this app can view and edit every project. "
        "API keys, however, are private to your own browser session and never shared between visitors."
    )
