"""API keys are scoped to the visitor's browser session (st.session_state), not
stored server-side - so on a shared deployment, one visitor entering their key
never overwrites or exposes it to anyone else. The one exception is a key set
via environment variable / Streamlit Cloud secrets: that's an explicit choice
by whoever deployed the app to provide a shared default, and any visitor's own
session key still takes priority over it."""
from __future__ import annotations

import os

import streamlit as st

_ENV_VAR_BY_PROVIDER = {"gemini": "GEMINI_API_KEY", "openai": "OPENAI_API_KEY", "anthropic": "ANTHROPIC_API_KEY"}


def _state_key(provider: str) -> str:
    return f"session_api_key_{provider}"


def get_session_key(provider: str) -> str | None:
    return st.session_state.get(_state_key(provider))


def set_session_key(provider: str, key: str | None):
    st.session_state[_state_key(provider)] = key


def get_deployment_default_key(provider: str) -> str | None:
    """The shared fallback set outside the app UI (env var or Cloud secrets), if any."""
    env_var = _ENV_VAR_BY_PROVIDER.get(provider)
    if not env_var:
        return None
    from_env = os.environ.get(env_var)
    if from_env:
        return from_env
    try:
        return st.secrets.get(env_var) or None
    except Exception:
        return None


def get_effective_api_key(provider: str) -> str | None:
    """Your own session's key takes priority; falls back to the deployment default."""
    return get_session_key(provider) or get_deployment_default_key(provider)
