import streamlit as st

import db
from model_catalog import PROVIDER_LABELS


def render_api_key_prompt(provider: str, key_prefix: str = "") -> str | None:
    """Shows the configured status for a provider's key, or an inline field to set
    it right here (rather than only ever fetching it silently from an env file).
    Returns the effective key so callers can use it immediately after saving."""
    label = PROVIDER_LABELS[provider]
    effective = db.get_effective_api_key(provider)
    saved = db.get_api_key(provider)

    if saved:
        st.success(f"✓ {label} API key configured — ending in ····{saved[-4:]}")
        return effective

    if effective:
        st.info(f"Using {label} API key from the environment (`{provider.upper()}_API_KEY`). You can override it below.")

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
        if st.button("Save", key=f"{key_prefix}apikey-save-{provider}", use_container_width=True):
            if entered.strip():
                db.set_api_key(provider, entered.strip())
                st.rerun()
            else:
                st.error("Enter a key first.")

    return effective
