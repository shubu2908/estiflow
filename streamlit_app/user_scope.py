"""Lightweight per-visitor identity with no login.

Uses a real cookie (via streamlit-cookies-manager-v2) as the primary
mechanism, since - unlike a URL query param - it survives the visitor
returning through a completely different link (Cloud dashboard, a bookmark
of the bare URL, etc.), not just a same-tab refresh. A ?uid= query param is
kept in sync as a secondary layer for the same-session case.

An earlier hand-rolled document.cookie write (via components.html) worked
locally but was unreliable specifically on Streamlit Community Cloud - a
real full-page reload there came back with a brand-new cookie value even
though one had already been set. Switched to this maintained library instead
of continuing to debug that by hand.

A first attempt at wiring the library in also failed - but for a mundane
reason: CookieManager() renders a component immediately in its constructor,
and it was being instantiated at module import time, which runs before
st.set_page_config() in app.py. Streamlit requires set_page_config() to be
the first Streamlit call in a script; declaring a component ahead of it
broke the cookie sync silently. Fixed by constructing CookieManager() lazily,
inside get_user_id(), which app.py only calls after set_page_config().
"""
from __future__ import annotations

import uuid

import streamlit as st
from streamlit_cookies_manager import CookieManager

_COOKIE_NAME = "estiflow_uid"
_SESSION_CACHE_KEY = "_user_scope_uid"


def get_user_id() -> str:
    # Resolved earlier in this same script run (app.py calls this once, and
    # each page calls it again) or in a previous run this session - skip the
    # cookie component entirely once cached, since CookieManager() renders a
    # component with a fixed key and calling it more than once per run
    # collides (StreamlitDuplicateElementKey) and crashes the whole script.
    cached = st.session_state.get(_SESSION_CACHE_KEY)
    if cached:
        if st.query_params.get("uid") != cached:
            st.query_params["uid"] = cached
        return cached

    cookies = CookieManager(prefix="estiflow/")
    if not cookies.ready():
        st.stop()

    uid = cookies.get(_COOKIE_NAME) or st.query_params.get("uid") or uuid.uuid4().hex[:16]

    st.session_state[_SESSION_CACHE_KEY] = uid
    st.query_params["uid"] = uid
    if cookies.get(_COOKIE_NAME) != uid:
        cookies[_COOKIE_NAME] = uid
        cookies.save()
    return uid
