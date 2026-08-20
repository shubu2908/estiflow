import streamlit as st

from db import init_db
from styles import inject_css, brand_mark
from user_scope import get_user_id

st.set_page_config(page_title="EstiFlow", page_icon="📊", layout="wide")

init_db()
inject_css()
get_user_id()  # establishes ?uid=... in the URL on first visit, before any page renders

with st.sidebar:
    brand_mark()

dashboard = st.Page("views/dashboard.py", title="Dashboard", icon="🏠", default=True)
new_project = st.Page("views/new_project.py", title="New Project", icon="➕")
upload_generate = st.Page("views/upload_generate.py", title="Upload & Generate", icon="📤")
workspace = st.Page("views/workspace.py", title="Estimate Workspace", icon="📈")
settings = st.Page("views/settings.py", title="Settings", icon="⚙️")

pg = st.navigation([dashboard, new_project, upload_generate, workspace, settings])
pg.run()
