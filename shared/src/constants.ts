export const PHASE_NAMES = [
  "Requirement/Design Review",
  "Development",
  "SIT",
  "UAT",
  "Production Deployment",
  "Hypercare/Support",
] as const;

export type PhaseName = (typeof PHASE_NAMES)[number];

export const DEFAULT_BUFFER_PERCENT: Record<PhaseName, number> = {
  "Requirement/Design Review": 10,
  Development: 15,
  SIT: 10,
  UAT: 10,
  "Production Deployment": 5,
  "Hypercare/Support": 5,
};

export const DEFAULT_ROLES = ["Developer", "Tech Lead", "Business Analyst", "QA/Tester", "PM"] as const;

export const STORY_POINTS = [1, 2, 3, 5, 8, 13] as const;

export function nearestFibonacci(value: number): (typeof STORY_POINTS)[number] {
  return STORY_POINTS.reduce((closest, current) =>
    Math.abs(current - value) < Math.abs(closest - value) ? current : closest
  );
}

export const TECHNOLOGIES = ["UiPath", "Automation Anywhere", "Power Automate", "Python", "Other"] as const;

export const COMPLEXITY_LEVELS = ["Simple", "Medium", "Complex"] as const;

export const AI_COMPLEXITY_LEVELS = ["Low", "Medium", "High"] as const;

export const TEST_CASE_PRIORITIES = ["High", "Med", "Low"] as const;

export const TEST_CASE_TYPES = ["Functional", "Regression", "Negative"] as const;

export const DEFAULT_HOURS_PER_DAY = 6;

export const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5]; // Mon-Fri (0 = Sunday)
