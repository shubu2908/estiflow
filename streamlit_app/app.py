import streamlit as st
from dotenv import load_dotenv

from db import init_db
from styles import inject_css, brand_mark

load_dotenv()
st.set_page_config(page_title="EstiFlow", page_icon="📊", layout="wide")

init_db()
inject_css()

with st.sidebar:
    brand_mark()

dashboard = st.Page("views/dashboard.py", title="Dashboard", icon="🏠", default=True)
new_project = st.Page("views/new_project.py", title="New Project", icon="➕")
upload_generate = st.Page("views/upload_generate.py", title="Upload & Generate", icon="📤")
workspace = st.Page("views/workspace.py", title="Estimate Workspace", icon="📈")
settings = st.Page("views/settings.py", title="Settings", icon="⚙️")

pg = st.navigation([dashboard, new_project, upload_generate, workspace, settings])
pg.run()
