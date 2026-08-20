import streamlit as st

import session_keys
from model_catalog import PROVIDER_LABELS


def render_api_key_prompt(provider: str, key_prefix: str = "") -> str | None:
    """Shows the configured status for a provider's key, or an inline field to set
    it right here. Keys are session-only - never read from an env file or any
    server-side default - so every visitor enters their own, every session.
    Returns the effective key so callers can use it immediately after saving."""
    label = PROVIDER_LABELS[provider]
    session_key = session_keys.get_session_key(provider)

    if session_key:
        st.success(f"✓ {label} API key set for this session — ending in ····{session_key[-4:]}")
        return session_key

    st.warning(f"{label} API key required to generate with this model.")
    col1, col2 = st.columns([4, 1])
    with col1:
        entered = st.text_input(
            f"{label} API Key",
            type="password",
            key=f"{key_prefix}apikey-{provider}",
            label_visibility="collapsed",
            placeholder=f"Paste your {label} API key here",
        )
    with col2:
        if st.button("Use Key", key=f"{key_prefix}apikey-save-{provider}", use_container_width=True):
            if entered.strip():
                session_keys.set_session_key(provider, entered.strip())
                st.rerun()
            else:
                st.error("Enter a key first.")
    st.caption("Stored only in your browser session — never saved on the server, never read from a config file.")

    return None
