"""Lightweight per-visitor identity with no login.

Two earlier approaches were tried and both failed specifically on Streamlit
Community Cloud (confirmed by testing against the actual deployed app, not
just locally - Cloud's iframe/proxy setup behaves differently from a plain
local dev server):
  1. A hand-rolled document.cookie write via components.html: worked on a
     local server, but a genuine full-page reload on Cloud came back with a
     brand-new cookie value even though one had already been set - the
     round-trip wasn't reliable there.
  2. streamlit-cookies-manager-v2: the component never even reported ready()
     locally, let alone on Cloud.

This approach avoids cookies entirely. The id lives in the URL's ?uid= query
param, which - unlike a cookie - requires no server-side header parsing: a
browser refresh simply re-requests whatever URL is currently in the address
bar. The one gap is that Streamlit's own sidebar navigation links drop query
params when clicked (verified separately). This is closed by re-syncing
st.query_params from st.session_state on every single script run (which
happens on every page navigation too, since app.py's top-level code re-runs
on each one) - so by the time a user hits refresh, the address bar has
already been corrected back to include ?uid=..., regardless of which link
they last clicked.
"""
from __future__ import annotations

import uuid

import streamlit as st

_SESSION_CACHE_KEY = "_user_scope_uid"


def get_user_id() -> str:
    cached = st.session_state.get(_SESSION_CACHE_KEY)
    if cached:
        if st.query_params.get("uid") != cached:
            st.query_params["uid"] = cached
        return cached

    from_url = st.query_params.get("uid")
    uid = from_url or uuid.uuid4().hex[:16]
    st.session_state[_SESSION_CACHE_KEY] = uid
    st.query_params["uid"] = uid
    return uid
