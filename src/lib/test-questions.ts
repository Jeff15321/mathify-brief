/**
 * Project-authored canonical examples for prompt evaluation.
 * Curriculum references provide context; exact textbook attributions are unverified.
 */

export interface TestQuestion {
  id: string;
  grade: number;
  questionText: string;
  source: string;
  /** Expected topic category (for sanity-checking model output) */
  expectedTopic: string;
  /** Minimum number of prerequisite concepts a good breakdown should identify */
  minBreakdownSteps: number;
}

export const TEST_QUESTIONS: TestQuestion[] = [
  {
    id: "gr9-linear-brackets",
    grade: 9,
    questionText: "Solve 2(x + 3) = 14.",
    source: "Project-authored example; Ontario Grade 9 MTH1W context. Textbook attribution not verified.",
    expectedTopic: "Linear equations",
    minBreakdownSteps: 2,
  },
  {
    id: "gr10-quadratic-factor",
    grade: 10,
    questionText: "Factor x² + 5x + 6.",
    source: "Project-authored example; Ontario Grade 10 MPM2D context. Textbook attribution not verified.",
    expectedTopic: "Quadratic factoring",
    minBreakdownSteps: 2,
  },
  {
    id: "gr9-pythagorean",
    grade: 9,
    questionText:
      "A right triangle has legs of length 3 cm and 4 cm. Find the length of the hypotenuse.",
    source: "Project-authored example; Ontario Grade 9 MTH1W context. Textbook attribution not verified.",
    expectedTopic: "Pythagorean theorem",
    minBreakdownSteps: 2,
  },
  {
    id: "gr11-trig-ratio",
    grade: 11,
    questionText:
      "In a right triangle, the side opposite angle θ is 5 and the hypotenuse is 13. Find sin θ.",
    source: "Project-authored example; Ontario Grade 11 MCR3U context. Textbook attribution not verified.",
    expectedTopic: "Trigonometric ratios",
    minBreakdownSteps: 2,
  },
  {
    id: "gr7-proportion",
    grade: 7,
    questionText:
      "A recipe calls for 2 cups of flour to make 12 cookies. How many cups of flour are needed to make 30 cookies?",
    source: "Project-authored example; Ontario Grade 7 curriculum context. Textbook attribution not verified.",
    expectedTopic: "Proportional reasoning",
    minBreakdownSteps: 2,
  },
  {
    id: "gr10-linear-system",
    grade: 10,
    questionText:
      "Solve the system: y = 2x + 1 and y = -x + 7.",
    source: "Project-authored example; Ontario Grade 10 MPM2D context. Textbook attribution not verified.",
    expectedTopic: "Systems of linear equations",
    minBreakdownSteps: 2,
  },
  {
    id: "gr8-area-circle",
    grade: 8,
    questionText:
      "Find the area of a circle with radius 7 cm. Round your answer to one decimal place.",
    source: "Project-authored example; Ontario Grade 8 curriculum context. Textbook attribution not verified.",
    expectedTopic: "Area of a circle",
    minBreakdownSteps: 2,
  },
  {
    id: "gr11-exponent-law",
    grade: 11,
    questionText: "Simplify (2x³)² ÷ 4x².",
    source: "Project-authored example; Ontario Grade 11 MCR3U context. Textbook attribution not verified.",
    expectedTopic: "Exponent laws",
    minBreakdownSteps: 2,
  },
];
