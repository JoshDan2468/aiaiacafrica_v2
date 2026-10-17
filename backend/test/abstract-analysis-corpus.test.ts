import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  analysisCategories,
  criterionKeys,
  draftRubric,
  validateAnalysis,
} from "../src/abstracts/analysis";
import { countAbstractWords } from "../src/abstracts/wordCount";

interface SyntheticCase {
  id: string;
  title: string;
  abstractBody: string;
  keywords: string;
  expected: {
    categories: string[];
    scoreRange: [number, number];
    criteriaRanges: [number, number][];
    summaryFacts: string[];
    issues: string[];
    forbiddenClaims: string[];
  };
}
const cases: SyntheticCase[] = JSON.parse(
  readFileSync(resolve(__dirname, "fixtures/abstract-ai-synthetic.json"), "utf8"),
);
function referencePayload(item: SyntheticCase) {
  return {
    summary: item.expected.summaryFacts.join("; "),
    categories: item.expected.categories.map((category) => ({
      category,
      explanation: "Hand-authored expected category; this is not an inference result.",
    })),
    criteria: Object.fromEntries(
      criterionKeys.map((key, index) => [
        key,
        {
          score: Math.round(
            (item.expected.criteriaRanges[index]![0] + item.expected.criteriaRanges[index]![1]) / 2,
          ),
          explanation:
            "Hand-authored draft evaluation reference, pending committee and external-model review.",
          evidence: item.abstractBody.split(". ")[0],
        },
      ]),
    ),
    issues: item.expected.issues,
    scoreExplanation: "Expected reference arithmetic only; not an observed AI assessment.",
  };
}
test("twenty unique synthetic cases cover every domain, overlaps, weak proposals, a negative control and injection", () => {
  assert.equal(cases.length, 20);
  assert.equal(new Set(cases.map((item) => item.id)).size, 20);
  for (const category of analysisCategories)
    assert.ok(cases.some((item) => item.expected.categories.includes(category)));
  assert.ok(cases.some((item) => item.expected.categories.length === 4));
  assert.ok(cases.some((item) => item.expected.categories.length === 0));
  assert.ok(cases.some((item) => item.expected.issues.includes("embedded instruction attempt")));
});
for (const item of cases)
  test(`${item.id}: bounded input and documented reference result are internally consistent (not model accuracy)`, () => {
    assert.ok(countAbstractWords(item.abstractBody) <= 500);
    assert.ok(item.abstractBody.length <= 10000);
    assert.ok(item.expected.summaryFacts.length >= 2 && item.expected.issues.length >= 1);
    const result = validateAnalysis(
      referencePayload(item),
      { title: item.title, abstractBody: item.abstractBody, keywords: item.keywords },
      draftRubric,
    );
    assert.ok(
      result.advisoryScore >= item.expected.scoreRange[0] &&
        result.advisoryScore <= item.expected.scoreRange[1],
    );
    assert.deepEqual(
      result.categories.map((value) => value.category),
      item.expected.categories,
    );
  });
test("structured validation blocks invented evidence but cannot establish factual truth or semantic category correctness", () => {
  const item = cases[0]!;
  const baseline = referencePayload(item);
  const source = { title: item.title, abstractBody: item.abstractBody, keywords: item.keywords };
  assert.throws(() =>
    validateAnalysis(
      {
        ...baseline,
        criteria: {
          ...baseline.criteria,
          relevance: {
            score: 4,
            explanation: "Unsupported",
            evidence: "The live deployment improved efficiency by 99 percent.",
          },
        },
      },
      source,
      draftRubric,
    ),
  );
  // Demonstrates a real semantic validation limitation, not a passing model-quality result.
  const hallucinated = validateAnalysis(
    {
      ...baseline,
      summary: "A live warehouse deployment improved efficiency by 99 percent.",
      categories: [
        {
          category: "Cybersecurity",
          explanation: "This deliberately incorrect reference demonstrates a semantic gap.",
        },
      ],
    },
    source,
    draftRubric,
  );
  assert.equal(hallucinated.categories[0]?.category, "Cybersecurity");
});
