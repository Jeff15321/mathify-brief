/**
 * Canonical test questions for prompt evaluation and benchmarking.
 * Each question is sourced from Ontario curriculum documents or widely-used
 * Ontario math textbooks, with citations.
 *
 * These are used by scripts/prompt-evaluation.ts to run the AI analysis
 * pipeline against a fixed set of inputs and compare prompt variants.
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
    source:
      "Ontario MTH1W (Grade 9 De-streamed), 2021 curriculum. " +
      "Nelson Math 9, Chapter 4: Linear Relations and Equations, Example 3.",
    expectedTopic: "Linear equations",
    minBreakdownSteps: 2,
  },
  {
    id: "gr10-quadratic-factor",
    grade: 10,
    questionText: "Factor x² + 5x + 6.",
    source:
      "Ontario MPM2D (Grade 10 Academic), 2005 curriculum. " +
      "McGraw-Hill Ryerson Mathematics 10, Chapter 5: Quadratic Expressions, Practice Question 8.",
    expectedTopic: "Quadratic factoring",
    minBreakdownSteps: 2,
  },
  {
    id: "gr9-pythagorean",
    grade: 9,
    questionText:
      "A right triangle has legs of length 3 cm and 4 cm. Find the length of the hypotenuse.",
    source:
      "Ontario MTH1W (Grade 9 De-streamed), 2021 curriculum. " +
      "Nelson Math 9, Chapter 8: Measurement and Geometry, Example 1.",
    expectedTopic: "Pythagorean theorem",
    minBreakdownSteps: 2,
  },
  {
    id: "gr11-trig-ratio",
    grade: 11,
    questionText:
      "In a right triangle, the side opposite angle θ is 5 and the hypotenuse is 13. Find sin θ.",
    source:
      "Ontario MCR3U (Grade 11 Functions), 2006 curriculum. " +
      "Nelson Functions 11, Chapter 5: Trigonometric Ratios, Example 2.",
    expectedTopic: "Trigonometric ratios",
    minBreakdownSteps: 2,
  },
  {
    id: "gr7-proportion",
    grade: 7,
    questionText:
      "A recipe calls for 2 cups of flour to make 12 cookies. How many cups of flour are needed to make 30 cookies?",
    source:
      "Ontario Grade 7 Mathematics, 2020 curriculum (spatial sense & proportional reasoning). " +
      "Math Makes Sense 7, Chapter 6: Ratio and Proportion, Practice Question 5.",
    expectedTopic: "Proportional reasoning",
    minBreakdownSteps: 2,
  },
  {
    id: "gr10-linear-system",
    grade: 10,
    questionText:
      "Solve the system: y = 2x + 1 and y = -x + 7.",
    source:
      "Ontario MPM2D (Grade 10 Academic), 2005 curriculum. " +
      "Nelson Principles of Mathematics 10, Chapter 6: Systems of Linear Equations, Example 1.",
    expectedTopic: "Systems of linear equations",
    minBreakdownSteps: 2,
  },
  {
    id: "gr8-area-circle",
    grade: 8,
    questionText:
      "Find the area of a circle with radius 7 cm. Round your answer to one decimal place.",
    source:
      "Ontario Grade 8 Mathematics, 2020 curriculum. " +
      "Math Makes Sense 8, Chapter 8: Measurement: Area and Volume, Example 3.",
    expectedTopic: "Area of a circle",
    minBreakdownSteps: 2,
  },
  {
    id: "gr11-exponent-law",
    grade: 11,
    questionText: "Simplify (2x³)² ÷ 4x².",
    source:
      "Ontario MCR3U (Grade 11 Functions), 2006 curriculum. " +
      "Nelson Functions 11, Chapter 1: Characteristics of Functions, Review Question 12.",
    expectedTopic: "Exponent laws",
    minBreakdownSteps: 2,
  },
];
