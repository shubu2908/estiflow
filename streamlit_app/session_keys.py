"""API keys are scoped to the visitor's browser session (st.session_state) only.
There is no fallback to environment variables or Streamlit Cloud secrets - every
visitor must enter their own key, every session, no exceptions. This is a
deliberate choice: on a shared deployment, a server-side default would mean
whoever set it is paying for/exposing their key to every visitor."""
from __future__ import annotations

import streamlit as st


def _state_key(provider: str) -> str:
    return f"session_api_key_{provider}"


def get_session_key(provider: str) -> str | None:
    return st.session_state.get(_state_key(provider))


def set_session_key(provider: str, key: str | None):
    st.session_state[_state_key(provider)] = key


def get_effective_api_key(provider: str) -> str | None:
    return get_session_key(provider)
