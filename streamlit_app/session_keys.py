"""API keys are scoped to the visitor's browser session (st.session_state) by
default. The one deliberate exception: Gemini alone can fall back to a
deployment-wide default (env var / Streamlit Cloud secret), so teammates who
don't know how to get their own Google API key can still use the app - an
explicit, opt-in tradeoff the deploying user accepted (it means their own
key/billing gets used by anyone who doesn't enter their own). OpenAI and
Anthropic have no such fallback: a shared key there would mean strangers
spending the deploying user's money with zero visibility, which is a
materially bigger risk than Gemini's free tier."""
from __future__ import annotations

import os

import streamlit as st

_FALLBACK_ENV_VAR_BY_PROVIDER = {"gemini": "GEMINI_API_KEY"}


def _state_key(provider: str) -> str:
    return f"session_api_key_{provider}"


def get_session_key(provider: str) -> str | None:
    return st.session_state.get(_state_key(provider))


def set_session_key(provider: str, key: str | None):
    st.session_state[_state_key(provider)] = key


def get_deployment_default_key(provider: str) -> str | None:
    env_var = _FALLBACK_ENV_VAR_BY_PROVIDER.get(provider)
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
    """Your own session's key takes priority; falls back to the deployment
    default, which only exists at all for Gemini."""
    return get_session_key(provider) or get_deployment_default_key(provider)
