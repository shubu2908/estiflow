"""Lightweight per-visitor identity with no login. Each browser gets a random id
stored in a cookie, so it survives page refreshes and new tabs (unlike
st.session_state, which resets on every full reload) and unlike URL query
params, which Streamlit's sidebar navigation does NOT preserve across pages
(verified: clicking between pages drops query params entirely - confirmed by
testing, not assumed). Projects are tagged with this id and every read/write
is filtered by it, so one visitor's projects are invisible to anyone else
hitting the same deployment.

Cookie writes take one extra rerun to become readable via st.context.cookies
(the browser has to actually send it back on the next request), so a fresh
visitor's very first run uses a session_state-cached id immediately and relies
on the cookie for persistence from the second run/session onward.
"""
from __future__ import annotations

import uuid

import streamlit as st
import streamlit.components.v1 as components

_COOKIE_NAME = "estiflow_uid"
_SESSION_CACHE_KEY = "_user_scope_uid"


def _set_cookie_js(uid: str):
    components.html(
        f"""
        <script>
        document.cookie = "{_COOKIE_NAME}={uid}; path=/; max-age=31536000; SameSite=Lax";
        </script>
        """,
        height=0,
        width=0,
    )


def get_user_id() -> str:
    if _SESSION_CACHE_KEY in st.session_state:
        return st.session_state[_SESSION_CACHE_KEY]

    cookie_uid = st.context.cookies.get(_COOKIE_NAME)
    if cookie_uid:
        st.session_state[_SESSION_CACHE_KEY] = cookie_uid
        return cookie_uid

    new_uid = uuid.uuid4().hex[:16]
    st.session_state[_SESSION_CACHE_KEY] = new_uid
    _set_cookie_js(new_uid)
    return new_uid
