import streamlit as st

CUSTOM_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

html, body, [class*="css"] {
    font-family: 'Inter', -apple-system, sans-serif;
}

/* Soft tinted page background instead of flat white */
[data-testid="stAppViewContainer"] > .main {
    background: linear-gradient(180deg, #FAFAFE 0%, #F7F7FC 100%);
}
[data-testid="stSidebar"] {
    background: #FCFCFF;
    border-right: 1px solid rgba(99, 102, 241, 0.08);
}

/* App title / logo mark in the sidebar */
.eflow-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 0 20px 0;
    margin-bottom: 10px;
    border-bottom: 1px solid rgba(99, 102, 241, 0.15);
}
.eflow-brand .mark {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 60%, #A855F7 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 19px;
    box-shadow: 0 3px 10px rgba(99, 102, 241, 0.4);
}
.eflow-brand .name {
    font-weight: 800;
    font-size: 21px;
    letter-spacing: -0.02em;
    color: #18181B;
    line-height: 1.1;
}
.eflow-brand .tag {
    font-size: 11px;
    color: #8B8B96;
    margin-top: 1px;
}

/* Sidebar nav links */
[data-testid="stSidebarNav"] a,
[data-testid="stSidebarNavLink"] {
    border-radius: 8px !important;
    font-weight: 600 !important;
    transition: background 0.12s ease;
}
[data-testid="stSidebarNav"] a:hover {
    background: rgba(99, 102, 241, 0.08) !important;
}
[data-testid="stSidebarNav"] a[aria-current="page"] {
    background: linear-gradient(135deg, rgba(99,102,241,0.14), rgba(139,92,246,0.14)) !important;
    color: #4338CA !important;
}

/* Hero banner */
.eflow-hero {
    background: linear-gradient(135deg, #6366F1 0%, #7C3AED 55%, #A855F7 100%);
    border-radius: 18px;
    padding: 28px 32px;
    margin-bottom: 22px;
    color: white;
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.28);
    position: relative;
    overflow: hidden;
}
.eflow-hero::after {
    content: "";
    position: absolute;
    top: -40%; right: -8%;
    width: 260px; height: 260px;
    background: radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%);
}
.eflow-hero .title { font-weight: 800; font-size: 26px; letter-spacing: -0.02em; margin-bottom: 4px; }
.eflow-hero .sub { font-size: 14.5px; opacity: 0.92; max-width: 620px; }

/* Plain page headers (non-hero pages) */
.eflow-page-title {
    font-weight: 800;
    font-size: 28px;
    letter-spacing: -0.02em;
    margin-bottom: 2px;
    color: #18181B;
}
.eflow-page-sub {
    color: #71717A;
    font-size: 14.5px;
    margin-bottom: 18px;
}

/* Buttons: rounder, lift + glow on hover */
.stButton > button, .stDownloadButton > button {
    border-radius: 9px;
    font-weight: 600;
    transition: transform 0.1s ease, box-shadow 0.1s ease;
}
.stButton > button:hover, .stDownloadButton > button:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.22);
}
.stButton > button[kind="primary"] {
    background: linear-gradient(135deg, #6366F1 0%, #7C3AED 100%);
    border: none;
}

/* Cards: soft shadow + hover lift for clickable ones */
div[data-testid="stVerticalBlockBorderWrapper"] {
    border-radius: 14px !important;
    box-shadow: 0 1px 3px rgba(24, 24, 27, 0.04), 0 1px 2px rgba(24, 24, 27, 0.03);
}

/* Metrics */
div[data-testid="stMetric"] {
    background: linear-gradient(135deg, #F5F5FD 0%, #F0EFFC 100%);
    border-radius: 12px;
    padding: 14px 16px 12px 16px;
    border: 1px solid rgba(99, 102, 241, 0.1);
}
div[data-testid="stMetricLabel"] {
    font-weight: 600;
    color: #52525B;
}
div[data-testid="stMetricValue"] {
    color: #4338CA;
}

/* Status / complexity pills */
.eflow-pill {
    display: inline-block;
    padding: 3px 11px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.01em;
}
.eflow-pill.draft { background: #F4F4F5; color: #52525B; border: 1px solid #E4E4E7; }
.eflow-pill.generated { background: #EEF2FF; color: #4338CA; }
.eflow-pill.edited { background: #ECFDF5; color: #047857; }
.eflow-pill.low { background: #ECFDF5; color: #047857; }
.eflow-pill.medium { background: #FFFBEB; color: #B45309; }
.eflow-pill.high { background: #FEF2F2; color: #B91C1C; }
.eflow-pill.provider { background: #F5F3FF; color: #6D28D9; }

/* Card kicker label for section groupings */
.eflow-kicker {
    text-transform: uppercase;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: #A1A1AA;
    margin-bottom: 6px;
}

/* Tabs: give the active tab a little more presence */
button[data-baseweb="tab"] {
    font-weight: 600;
}
div[data-baseweb="tab-highlight"] {
    background-color: #6366F1 !important;
}

hr { margin: 0.6em 0 1.2em 0; opacity: 0.12; }
</style>
"""


def inject_css():
    st.markdown(CUSTOM_CSS, unsafe_allow_html=True)


def brand_mark():
    st.markdown(
        """
        <div class="eflow-brand">
            <div class="mark">📊</div>
            <div>
                <div class="name">EstiFlow</div>
                <div class="tag">Automation delivery estimates</div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def hero(title: str, subtitle: str = ""):
    st.markdown(
        f"""
        <div class="eflow-hero">
            <div class="title">{title}</div>
            <div class="sub">{subtitle}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def page_header(title: str, subtitle: str = ""):
    st.markdown(f'<div class="eflow-page-title">{title}</div>', unsafe_allow_html=True)
    if subtitle:
        st.markdown(f'<div class="eflow-page-sub">{subtitle}</div>', unsafe_allow_html=True)


def kicker(text: str):
    st.markdown(f'<div class="eflow-kicker">{text}</div>', unsafe_allow_html=True)


def pill(text: str, variant: str) -> str:
    return f'<span class="eflow-pill {variant}">{text}</span>'
