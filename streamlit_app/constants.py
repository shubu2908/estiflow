PHASE_NAMES = [
    "Requirement/Design Review",
    "Development",
    "SIT",
    "UAT",
    "Production Deployment",
    "Hypercare/Support",
]

DEFAULT_BUFFER_PERCENT = {
    "Requirement/Design Review": 10,
    "Development": 15,
    "SIT": 10,
    "UAT": 10,
    "Production Deployment": 5,
    "Hypercare/Support": 5,
}

DEFAULT_ROLES = ["Developer", "Tech Lead", "Business Analyst", "QA/Tester", "PM"]

STORY_POINTS = [1, 2, 3, 5, 8, 13]

TECHNOLOGIES = ["UiPath", "Automation Anywhere", "Power Automate", "Python", "Other"]

COMPLEXITY_LEVELS = ["Simple", "Medium", "Complex"]

AI_COMPLEXITY_LEVELS = ["Low", "Medium", "High"]

TEST_CASE_PRIORITIES = ["High", "Med", "Low"]

TEST_CASE_TYPES = ["Functional", "Regression", "Negative"]

DEFAULT_HOURS_PER_DAY = 6

DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5]  # Mon-Fri (0 = Sunday, matches Python's isoweekday-independent convention used across the app)

WEEKDAY_LABELS = {0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat"}


def nearest_fibonacci(value: float) -> int:
    return min(STORY_POINTS, key=lambda p: abs(p - value))
