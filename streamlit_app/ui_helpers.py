import streamlit as st

import session_keys
from model_catalog import PROVIDER_LABELS


def render_api_key_prompt(provider: str, key_prefix: str = "") -> str | None:
    """Shows the configured status for a provider's key, or an inline field to set
    it right here (rather than only ever fetching it silently from an env file).
    The key is stored in this visitor's browser session only - on a shared/deployed
    instance, entering a key here never overwrites or exposes it to anyone else.
    Returns the effective key so callers can use it immediately after saving."""
    label = PROVIDER_LABELS[provider]
    session_key = session_keys.get_session_key(provider)
    deployment_default = session_keys.get_deployment_default_key(provider)
    effective = session_key or deployment_default

    if session_key:
        st.success(f"✓ {label} API key set for this session — ending in ····{session_key[-4:]}")
        return effective

    if deployment_default:
        st.info(f"Using this deployment's default {label} key. You can use your own for this session instead, below.")
        return effective

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
    st.caption("Stored only in your browser session — not saved on the server, and not visible to other visitors.")

    return effective
