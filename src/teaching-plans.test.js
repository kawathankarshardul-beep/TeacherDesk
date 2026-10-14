import test from "node:test";
import assert from "node:assert/strict";

import { buildOfflineTeachingPlan, isUsableTeachingResponse, syllabusPoints, teachingPlanGuidance } from "./teaching-plans.js";

test("syllabus points preserve teacher content and remove list markers", () => {
  assert.deepEqual(syllabusPoints("- Cell structure\n2. Photosynthesis occurs in chloroplasts."), [
    "Cell structure",
    "Photosynthesis occurs in chloroplasts."
  ]);
});

test("lesson template includes presentation structure, usable timings, and supplied points", () => {
  const plan = buildOfflineTeachingPlan({
    mode: "lesson",
    className: "9A",
    subject: "Biology",
    chapter: "Cells",
    syllabus: "- Cell membrane controls movement\n- Nucleus contains genetic material",
    duration: 40,
    classSize: 32,
    materials: "board and paper"
  });

  assert.match(plan, /PRESENTATION-READY LESSON PLAN/);
  assert.match(plan, /Slide 1/);
  assert.match(plan, /Slide 5/);
  assert.match(plan, /0–4 min/);
  assert.match(plan, /Cell membrane controls movement/);
  assert.match(plan, /Nucleus contains genetic material/);
  assert.match(plan, /32 learners · Materials: board and paper/);
});

test("game template provides playable rules, scoring, individual checks, and syllabus cards", () => {
  const plan = buildOfflineTeachingPlan({
    mode: "gameideas",
    className: "10A",
    subject: "History",
    chapter: "Revolutions",
    syllabus: "The Estates-General met in 1789.\nThe Bastille was stormed on 14 July 1789.",
    duration: 40,
    classSize: 28
  });

  assert.match(plan, /GAME 1 — SYLLABUS QUEST/);
  assert.match(plan, /How to play:/);
  assert.match(plan, /Scoring:/);
  assert.match(plan, /win/);
  assert.match(plan, /Teacher check:/);
  assert.match(plan, /CARD 1/);
  assert.match(plan, /The Bastille was stormed on 14 July 1789/);
  assert.match(plan, /EXIT-TICKET BOSS ROUND/);
  assert.match(plan, /deliberately supplies no invented factual answers/);
});

test("game template avoids invented subject facts when no syllabus is supplied", () => {
  const plan = buildOfflineTeachingPlan({ mode: "gameideas", duration: 10 });
  assert.match(plan, /CARD TEMPLATE/);
  assert.match(plan, /add exact syllabus points/);
  assert.match(plan, /0–4 min/);
  assert.match(plan, /4–6 min/);
  assert.match(plan, /6–8 min/);
  assert.match(plan, /8–10 min/);
});

test("AI teaching guidance asks for concrete games and respects classroom setup", () => {
  const guidance = teachingPlanGuidance("gameideas", {
    className: "9B",
    duration: 25,
    classSize: 24,
    materials: "chalk and paper"
  });

  assert.match(guidance, /THREE genuinely playable/);
  assert.match(guidance, /win condition/);
  assert.match(guidance, /24 learners, and 25 minutes/);
  assert.match(guidance, /chalk and paper/);
  assert.match(guidance, /Do not invent curriculum facts/);
});

test("teaching response validation rejects safety-only output and accepts a structured plan", () => {
  assert.equal(isUsableTeachingResponse("lesson", "User Safety: safe"), false);
  assert.equal(isUsableTeachingResponse("lesson", `Learning objectives
Timed lesson sequence: 0-5 minutes, 5-15 minutes, 15-30 minutes.
Assessment: learners complete an exit ticket.
${"Teacher prompts and student actions. ".repeat(12)}`), true);
  assert.equal(isUsableTeachingResponse("gameideas", `How to play: ${"Teams rotate through the cards. ".repeat(12)}
Scoring awards points for evidence. The win condition is reaching 8 points first.`), true);
  assert.equal(isUsableTeachingResponse("gameideas", `Game 1: discuss the topic. ${"Generic activity suggestion. ".repeat(12)}`), false);
});

test("worksheet response validation rejects placeholders and requires requested numbered questions", () => {
  const placeholder = `QUESTIONS
1. [MCQs] Bricks, Bread and Bones: Write a question that tests this syllabus point: . (Marks: ____)
${"Teacher template. ".repeat(20)}`;
  const valid = `WORKSHEET
1. Which material was commonly used to build houses in the Harappan cities? (1 mark)
2. Explain why historians study bones found at archaeological sites. (2 marks)
${"Use complete sentences and support answers with evidence from the supplied syllabus. ".repeat(8)}`;

  assert.equal(isUsableTeachingResponse("worksheet", placeholder, 2), false);
  assert.equal(isUsableTeachingResponse("worksheet", valid, 2), true);
  assert.equal(isUsableTeachingResponse("worksheet", valid, 3), false);
});

test("worksheet response validation accepts common markdown and question-label formats", () => {
  const markdownWorksheet = `# Worksheet
**1.** **MCQ:** Which material was used to build houses?
**Question 2:** Explain why archaeologists study bones.
3) Give one detail from the chapter.
## Answer Key
1. Bricks.
2. To understand diets.
`;

  assert.equal(isUsableTeachingResponse("worksheet", markdownWorksheet, 3), true);
  assert.equal(isUsableTeachingResponse("worksheet", markdownWorksheet, 4), false);
  assert.equal(isUsableTeachingResponse("worksheet", "1. What happened?", 1), true);
});
