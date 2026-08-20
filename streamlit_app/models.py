from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, Field

from constants import PHASE_NAMES

PhaseName = Literal[
    "Requirement/Design Review",
    "Development",
    "SIT",
    "UAT",
    "Production Deployment",
    "Hypercare/Support",
]

# ---- Shape every provider must return (structured output / schema-constrained) ----


class EstimateRoleHour(BaseModel):
    role: str
    hours: float = Field(ge=0)


class EstimatePhase(BaseModel):
    name: PhaseName
    hours: float = Field(gt=0)
    bufferPercent: float = Field(ge=0, le=100)
    rationale: str
    dependencies: str
    roleHours: list[EstimateRoleHour] = Field(min_length=1)


class EstimateTask(BaseModel):
    title: str
    hours: float = Field(gt=0)
    role: str


class EstimateTestCase(BaseModel):
    title: str
    precondition: str
    steps: list[str] = Field(min_length=1)
    expectedResult: str
    priority: Literal["High", "Med", "Low"]
    type: Literal["Functional", "Regression", "Negative"]


class EstimateStory(BaseModel):
    title: str
    description: str
    acceptanceCriteria: list[str] = Field(min_length=1)
    # Loosely validated then snapped to the nearest Fibonacci value server-side -
    # strict literal validation here is brittle against off-sequence AI output.
    storyPoints: int = Field(gt=0)
    phase: PhaseName
    tasks: list[EstimateTask] = Field(min_length=1)
    testCases: list[EstimateTestCase] = Field(min_length=2)


class EstimateEpic(BaseModel):
    name: str
    stories: list[EstimateStory] = Field(min_length=1)


class EstimateResponse(BaseModel):
    overallComplexity: Literal["Low", "Medium", "High"]
    assumptions: list[str]
    phases: list[EstimatePhase] = Field(min_length=len(PHASE_NAMES), max_length=len(PHASE_NAMES))
    epics: list[EstimateEpic] = Field(min_length=1)


# ---- Persisted / app-facing shapes (post-generation, editable) ----


class RoleHourDto(BaseModel):
    id: str
    role: str
    hours: float = 0


class PhaseDto(BaseModel):
    id: str
    name: PhaseName
    order: int
    hours: float = 0
    bufferPercent: float = 0
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    rationale: Optional[str] = None
    dependencies: Optional[str] = None
    roleHours: list[RoleHourDto] = []


class TaskDto(BaseModel):
    id: str
    title: str
    hours: float = 0
    role: str


class TestCaseDto(BaseModel):
    id: str
    title: str
    precondition: Optional[str] = None
    steps: list[str] = []
    expectedResult: str = ""
    priority: Literal["High", "Med", "Low"] = "Med"
    type: Literal["Functional", "Regression", "Negative"] = "Functional"
    order: int = 0


class StoryDto(BaseModel):
    id: str
    epic: str
    title: str
    description: str
    acceptanceCriteria: list[str] = []
    storyPoints: int = 1
    phaseId: Optional[str] = None
    order: int = 0
    tasks: list[TaskDto] = []
    testCases: list[TestCaseDto] = []


class ProjectDto(BaseModel):
    id: str
    name: str
    technology: list[str]
    devStartDate: str
    provider: Literal["gemini", "openai", "anthropic"] = "gemini"
    model: str
    complexityOverride: Optional[Literal["Simple", "Medium", "Complex"]] = None
    aiComplexity: Optional[Literal["Low", "Medium", "High"]] = None
    assumptions: list[str] = []
    hoursPerDay: float = 6
    workingDays: list[int] = [1, 2, 3, 4, 5]
    status: Literal["draft", "generated", "edited"] = "draft"
    customRoles: list[str] = []
    createdAt: str
    updatedAt: str
    phases: list[PhaseDto] = []
    stories: list[StoryDto] = []
