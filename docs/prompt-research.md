# Prompt Effectiveness Research: Mathify Tutor Brief

## Overview

This document surveys research on effective prompting strategies for math question decomposition and diagnostic probe generation, the two core AI tasks in the Mathify Tutor Brief system. It evaluates trade-offs between prompt approaches and proposes an evaluation methodology for benchmarking prompt variants against a canonical test set.

> Evidence audit, November 1, 2026: this is a research rationale and proposed
> methodology, not completed experimental findings. There are currently zero tutor
> responses (confirmed by the project owner). No live API credential is available
> in this workspace. Mock runs and prewritten examples must not be reported as model
> accuracy or learner outcomes. The static stakeholder presentation is available at
> `public/stakeholder-deck.html`.

---

## 1. Literature Review

### 1.1 Chain-of-Thought Prompting

**Key finding:** Wei et al. (2022) showed that chain-of-thought (CoT) prompting, providing step-by-step reasoning examples in the prompt, significantly improves performance on multi-step math problems, especially for larger models.

- **Citation:** Wei, J., Wang, X., Schuurmans, D., et al. (2022). "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models." *NeurIPS 2022*. [arXiv:2201.11903](https://arxiv.org/abs/2201.11903)
- **Relevance:** Our `ANALYSIS_SYSTEM_PROMPT` implicitly requests chain-of-thought reasoning by asking the model to "identify the prerequisite concepts" and "explain why each is needed." Making this more explicit with numbered reasoning steps could improve breakdown quality.
- **Trade-off:** CoT increases output token count and latency. For real-time probe generation, shorter prompts may be preferred; for the one-time analysis step, the latency cost is acceptable.

### 1.2 Few-Shot vs. Zero-Shot Prompting

**Key finding:** Brown et al. (2020) studied few-shot task performance in language models. Whether examples improve this project's mathematical accuracy or format compliance must be measured locally; the paper does not establish that stronger models benefit less in our setting.

- **Citation:** Brown, T., Mann, B., Ryder, N., et al. (2020). "Language Models are Few-Shot Learners." *NeurIPS 2020*. [arXiv:2005.14165](https://arxiv.org/abs/2005.14165)
- **Relevance:** Our current prompts are zero-shot: they describe the task without worked examples. Adding 1–2 high-quality example breakdowns could improve format compliance and reduce malformed outputs.
- **Trade-off:** Few-shot examples consume context window tokens and may bias the model toward the specific patterns in the examples. If the examples are too narrow, the model may miss creative or atypical breakdowns.

### 1.3 Structured Output and Schema Constraints

**Engineering rationale:** Structured output and Zod validation provide explicit
format contracts. They do not establish mathematical correctness, handle every
provider failure, or guarantee valid responses.

- **Citation correction:** the previous arXiv:2402.05826 link is a paper about
  SARS-CoV-2 modelling, not constrained decoding; it is excluded from our evidence.
- **Relevance:** the provider uses schema-constrained output and validates the
  returned artifacts. This is an implemented engineering safeguard, not a measured
  ranking of prompt strategies.
- **Limitation:** a perfectly valid JSON object can still contain a wrong answer.

### 1.4 Role Prompting and Persona

**Key finding:** White et al. (2023) found that role-based prompts ("You are an expert math teacher") can improve task-specific accuracy, but the effect is inconsistent across models and tasks.

- **Citation:** White, J., Fu, Q., et al. (2023). "A Prompt Pattern Catalog to Enhance Prompt Engineering with ChatGPT." *arXiv:2302.11382*. [link](https://arxiv.org/abs/2302.11382)
- **Relevance:** Our analysis prompt establishes a math-teacher persona ("You are an expert Ontario math teacher"). This likely helps ground the model's output in appropriate grade-level expectations.
- **Trade-off:** Persona prompts can sometimes lead to overly verbose or didactic outputs. We mitigate this with schema constraints.

### 1.5 Diagnostic Question Design Research

**Key finding:** Research on diagnostic assessment design (e.g., diagnostic classification models, DCMs) emphasizes that effective diagnostic items must:
1. Target a single prerequisite concept (unidimensionality)
2. Have plausible distractors that reveal specific misconceptions
3. Vary difficulty systematically to distinguish between mastery levels

- **Citation:** Rupp, A.A., Templin, J., & Henson, R.A. (2010). *Diagnostic Measurement: Theory, Methods, and Applications.* Guilford Press.
- **Citation:** Leighton, J.P. & Gierl, M.J. (2007). *Cognitive Diagnostic Assessment for Education.* Cambridge University Press.
- **Relevance:** Our probe generation prompts should explicitly request:
  - Distractors that target common misconceptions (not just random wrong answers)
  - A clear mapping between each probe and one prerequisite concept
  - Systematic difficulty reduction in the "easier" variant
- **Current gap:** Our prompts don't explicitly request misconception-targeted distractors. This is the single highest-impact prompt improvement we could make.

### 1.6 Ontario Math Curriculum Specificity

**Design rationale:** Curriculum references provide scope and terminology; improved grade-level accuracy from adding them is a hypothesis to test, not a result established by a curriculum document.

- **Citation:** Ontario Ministry of Education (2021). *The Ontario Curriculum, Grade 9: Mathematics (MTH1W).* [link](https://www.dcp.edu.gov.on.ca/en/curriculum/secondary-mathematics/courses/mth1w)
- **Citation:** Ontario Ministry of Education (2005). *The Ontario Curriculum, Grades 9 and 10: Mathematics.* [link](https://www.dcp.edu.gov.on.ca/en/curriculum/secondary-mathematics)
- **Relevance:** Our prompts reference "Ontario math curriculum" and "grade level" which helps the model produce appropriate difficulty assessments. Adding specific curriculum expectation codes (e.g., "C1.4" for algebraic expressions) could further improve alignment.
- **Trade-off:** Curriculum codes change between revisions and may not be in the training data for older curriculum documents.

---

## 2. Prompt Strategy Comparison

The comparisons below are hypotheses, not measured results. Terms such as
"Best" or "Better" must not be presented as observed performance.

| Strategy | Latency | Format Compliance | Breakdown Quality | Probe Quality | Recommendation |
|----------|---------|-------------------|-------------------|---------------|----------------|
| Zero-shot + schema | Low | High (schema enforced) | Good | Good | ✅ Current baseline |
| Zero-shot + CoT | Medium | High | Better | Better | ✅ For analysis step |
| Few-shot (1 example) | Medium | Very High | Better | Better | ⚠️ Worth testing |
| Few-shot (3+ examples) | High | Very High | Similar | Similar | ❌ Diminishing returns |
| Persona + CoT + schema | Medium | Very High | Best | Best | ✅ Recommended |
| Misconception-targeted | Medium | High | Same | Best | ✅ High-impact for probes |

---

## 3. Evaluation Methodology

### 3.1 Test Set

We use 8 canonical test questions sourced from Ontario curriculum documents (see `src/lib/test-questions.ts`), spanning Grades 7–11 across topics:
- Linear equations (Grade 9)
- Quadratic factoring (Grade 10)
- Pythagorean theorem (Grade 9)
- Trigonometric ratios (Grade 11)
- Proportional reasoning (Grade 7)
- Systems of linear equations (Grade 10)
- Area of a circle (Grade 8)
- Exponent laws (Grade 11)

### 3.2 Metrics

**Breakdown quality:**
- **Topic match**: Does the model's identified topic match the expected topic? (binary)
- **Breakdown step count**: Does the model identify at least the minimum expected prerequisite concepts? (binary)
- **Prerequisite accuracy**: Are all identified prerequisites genuinely required for the question? (manual review, scale 1–5)

**Probe quality:**
- **Correct answer accuracy**: Is the marked correct answer actually correct? (binary)
- **Distractor quality**: Are distractors plausible and misconception-targeted? (manual review, scale 1–5)
- **Concept alignment**: Does each probe test its stated prerequisite concept? (manual review, scale 1–5)
- **Hint quality**: Is the hint helpful without revealing the answer? (manual review, scale 1–5)

**Operational metrics:**
- **Format compliance**: Does the output parse correctly against the schema? (binary, automated)
- **Latency**: Wall-clock time for each API call (automated)
- **Token usage**: Input + output tokens per call (automated)

### 3.3 Running the Evaluation

```bash
# With mock provider (fast, for development)
AI_MOCK_MODE=true npx tsx scripts/prompt-evaluation.ts

# With Anthropic provider (real evaluation)
ANTHROPIC_API_KEY=... npx tsx scripts/prompt-evaluation.ts --json > results.json

# JSON output for analysis
npx tsx scripts/prompt-evaluation.ts --json
```

### 3.4 Manual Review Process

Automated metrics can evaluate topic matching and format compliance. Probe quality requires expert review:

1. Run `prompt-evaluation.ts --json` to generate structured results
2. For each question, a math education expert reviews:
   - Breakdown prerequisite accuracy (1–5)
   - Distractor quality per probe (1–5)
   - Concept alignment per probe (1–5)
   - Hint quality per probe (1–5)
3. Aggregate scores are compared across prompt variants

---

## 4. Recommended Prompt Improvements

Based on the research above, here are the highest-impact changes to our current prompts, ranked by expected improvement:

### 4.1 Add Misconception-Targeted Distractor Instructions (HIGH IMPACT)

Current: "Write four answer options A–D, one of which is the correct answer."

Proposed: "Write four answer options A–D. The correct answer should be clearly correct to a student who understands the concept. Each distractor should target a specific, common misconception that students have about this prerequisite concept. Name the misconception each distractor targets."

**Rationale:** Diagnostic assessment research (Rupp et al., 2010) shows that misconception-targeted distractors provide far more diagnostic signal than random wrong answers. This change directly improves the quality of the Tutor Brief's gap analysis.

### 4.2 Add Explicit Chain-of-Thought for Analysis (MEDIUM IMPACT)

Current: The analysis prompt asks for breakdown steps but doesn't request explicit reasoning.

Proposed: Add "Before listing the breakdown, reason step-by-step about what a student needs to know to solve this question. Then list the prerequisites."

**Rationale:** Wei et al. (2022) show CoT improves multi-step reasoning. For the one-time analysis step, the latency cost is acceptable.

### 4.3 Add One Worked Example (LOW–MEDIUM IMPACT)

Current: Zero-shot prompts.

Proposed: Include one complete example (question → breakdown → probe pair) in the system prompt.

**Rationale:** Few-shot examples improve format compliance and output consistency (Brown et al., 2020). A single example adds modest token cost while demonstrating the expected output pattern.

### 4.4 Reference Curriculum Expectations (LOW IMPACT)

Current: "Ontario math curriculum"

Proposed: "Ontario math curriculum (MTH1W for Grade 9, MPM2D for Grade 10, MCR3U for Grade 11)"

**Rationale:** More specific curriculum references may improve grade-level and topic accuracy, but the current prompt already produces reasonable results for most questions.

---

## 5. Validation Microservice

The validation service (`src/server/validation-service.ts`) provides a built-in mechanism for checking prompt quality: it uses a second AI call to review the analysis and probe outputs for correctness. This is gated by `AI_VALIDATION_ENABLED=true` and can be run as:

```bash
AI_VALIDATION_ENABLED=true npx tsx scripts/validate-analysis.ts
```

The validation prompts (`src/server/ai/validation-prompts.ts`) check:
1. Whether prerequisite concepts are correctly identified
2. Whether any important prerequisites are missing
3. Whether the correct answers are actually correct
4. Whether distractors are reasonable
5. Whether hints are helpful without giving away the answer

This creates a candidate review loop, not proof of correctness. The reviewer uses
the same provider construction point as the generator and can share its errors.
Compare its judgments against checked reference answers and intentionally corrupted
probes; report false positives, missed errors, and call failures separately.

## 6. Validation protocol and decision gates

1. Use the eight project-authored reference problems in
   `src/lib/test-questions.ts`. Textbook chapter/example attributions have not been
   verified and are not evidence of provenance. Curriculum links provide context,
   not proof that a specific question appeared there.
2. Freeze question text, prompt version, model ID, date, and mock/live mode for each
   run. Retain full generated breakdowns, main/easier options, private keys, hints,
   generation failures, and separate analysis/probe latencies.
3. Independently check the reference solutions: x=4; (x+2)(x+3); 5 cm; sin(theta)=5/13;
   5 cups; (x,y)=(2,5); 153.9 cm^2; x^4 with x != 0.
4. Review every served and generated item for key correctness, exactly one valid
   option, prerequisite alignment, meaningful distractors, and hint leakage.
   Longer breakdowns and substring topic matches are only sanity checks.
5. Compare the reviewer against known-error cases: wrong key, duplicate correct
   options, unrelated concept, and answer-revealing hint. Include clean controls.
   Measure detected errors / seeded errors and false flags / clean cases.
6. Have a math educator review the artifacts before any accuracy claim. Report
   counts/denominators and failures, not just successful calls. Eight cases are an
   exploratory check, not a representative validation sample.
7. When tutors respond, separate the external needs/layout questionnaire from
   per-demo feedback. Record respondent count, version/case, rating distributions,
   and comments. Zero responses currently means no tutor-derived findings.
8. For the 10-15-second goal, use matched synthetic cases with/without the brief,
   counterbalance order, record interpretation correctness and time, and avoid
   reusing the same problem with the same tutor. A rating alone cannot test timing.
9. Before a supervised pilot, require no unresolved mathematical key errors in the
   reviewed sample and stakeholder agreement on the comprehension/timing target.
   These are proposed decision gates, not achieved outcomes.

---

## References

1. Wei, J., Wang, X., Schuurmans, D., et al. (2022). "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models." NeurIPS 2022. https://arxiv.org/abs/2201.11903
2. Brown, T., Mann, B., Ryder, N., et al. (2020). "Language Models are Few-Shot Learners." NeurIPS 2020. https://arxiv.org/abs/2005.14165
3. Removed: incorrect constrained-decoding citation (arXiv:2402.05826).
4. White, J., Fu, Q., et al. (2023). "A Prompt Pattern Catalog to Enhance Prompt Engineering with ChatGPT." https://arxiv.org/abs/2302.11382
5. Rupp, A.A., Templin, J., & Henson, R.A. (2010). *Diagnostic Measurement: Theory, Methods, and Applications.* Guilford Press.
6. Leighton, J.P. & Gierl, M.J. (2007). *Cognitive Diagnostic Assessment for Education.* Cambridge University Press.
7. Ontario Ministry of Education (2021). *The Ontario Curriculum, Grade 9: Mathematics (MTH1W).* https://www.dcp.edu.gov.on.ca/en/curriculum/secondary-mathematics/courses/mth1w
8. Ontario Ministry of Education (2005). *The Ontario Curriculum, Grades 9 and 10: Mathematics.* https://www.dcp.edu.gov.on.ca/en/curriculum/secondary-mathematics
9. Education Endowment Foundation (2021). *Teacher Feedback to Improve Pupil Learning*, Recommendation 1. https://educationendowmentfoundation.org.uk/education-evidence/guidance-reports/feedback
10. Michael Alley. *Assertion-Evidence Approach*: message headlines supported by visual evidence. https://www.assertion-evidence.com/

## Verification snapshot (November 1, 2026)

- Full offline Vitest suite: 111 passing tests across 16 files, including eight
  reference-solution checks and consistency checks on the simulated briefs.
- Playwright: three passing tests (two synthetic handoff flows, one presentation
  navigation/mobile/print test), with a successful production build.
- Typecheck and changed-code lint passed.
- HTML and editable PowerPoint: 12 slides, including sources and Beatrice
  attribution. The PowerPoint-derived PDF has 12 pages. Original 16:9
  product-review layouts use message headlines, a traceable synthetic case,
  native editable diagrams, large prototype evidence, and natural speaker scripts.
  Template source: https://www.slidescarnival.com/template/beatrice-free-presentation-template/66
  License: CC BY 4.0, with attribution retained. Diagrams are original;
  prototype screenshots use mock data. No stock photos or generated images.
  Design references were inspected, not copied:
  - Public Google Cloud executive presentation, February 11, 2020:
    https://services.google.com/fh/files/misc/goldman_sachs_keynote_google_cloud_thomas_kurian_021120.pdf
  - Sparks, Google Cloud Next keynote design case study:
    https://www.wearesparks.com/our-work/google-cloud-next/
  These support a consistent visual grammar, hierarchy, and diagram-led
  storytelling. They are not Mathify effectiveness evidence or Google endorsement.
- Evaluation JSON now retains mock/live provenance, the full analysis and first
  probe pair, and explicit probe-generation errors. It remains a harness, not
  an independently graded math-accuracy benchmark.
- Mock harness smoke: eight records, all explicitly marked `mock`, with analysis
  and first-pair artifacts and zero generation failures. This checks plumbing only;
  the mock provider returns fixed fixtures and cannot benchmark new questions.
- Fixed reviewer input coverage: easier retries now include their concept, hint,
  and explanation, not just options/key. A mocked SDK payload test verifies this;
  no actual reviewer-accuracy result is inferred.
