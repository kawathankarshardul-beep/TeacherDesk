const cleanPoint = value => value.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim();

export function syllabusPoints(syllabus) {
  return String(syllabus || "")
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map(cleanPoint)
    .filter(Boolean)
    .slice(0, 12);
}

export function teachingPlanGuidance(mode, setup) {
  if (!["lesson", "revision", "gameideas"].includes(mode)) return "";

  const duration = Number(setup.duration) || 40;
  const classSize = Number(setup.classSize) || 30;
  const materials = setup.materials?.trim() || "board, paper, and pens";
  const format = mode === "gameideas"
    ? `Create THREE genuinely playable, distinct classroom games—not activity names or generic suggestions. For each game provide: learning objective tied to the supplied syllabus; age/class and player count; exact materials and setup; numbered rules; sample challenge cards/questions using only supplied facts; turn/round timings that add up; scoring and an unambiguous win condition; teacher facilitation script; a fast way to check each learner's understanding; and adaptations for learners needing support and extra challenge. Keep preparation possible with the stated materials. End with a recommended game and a concise teacher run-sheet.`
    : `Create a complete, presentation-ready ${mode === "lesson" ? "lesson plan" : "revision lesson"} with measurable learning objectives grounded in the supplied syllabus, prerequisite check, a timed teacher/student sequence that adds up to ${duration} minutes, exact teacher talk/prompts, student actions, materials, a fully playable syllabus-based game with rules/scoring/debrief, formative checks with expected evidence, differentiation, and a short exit ticket. Include a clean 5-slide/board presentation outline with slide title and concise on-screen bullets plus presenter notes.`;

  return [
    "TEACHERDESK CLASSROOM-READY QUALITY REQUIREMENTS:",
    format,
    `Plan for class ${setup.className || "as selected"}, approximately ${classSize} learners, and ${duration} minutes.`,
    `Available materials: ${materials}. Respect the teacher's other classroom constraints in this request.`,
    "Treat the teacher's syllabus and attached files as the only source of subject facts. Do not invent curriculum facts, answers, equipment, or assessment results. If a detail is missing, label a short teacher-fill-in placeholder instead of guessing.",
    "Use clear headings, concise facilitator instructions, realistic timing, inclusive participation, and outputs that can be printed or presented without rewriting."
  ].join("\n");
}

export function isUsableTeachingResponse(mode, response, expectedQuestionCount = 1) {
  const text = String(response || "").trim();
  if (text.length < 300) return false;

  if (mode === "worksheet") {
    if (/write a question that tests this syllabus point|marks:\s*_{2,}/i.test(text)) return false;
    const numberedQuestions = text.match(/^\s*(?:(?:Q|Question)\s*)?\d{1,2}[.)]\s+\S.+$/gim) || [];
    return numberedQuestions.length >= expectedQuestionCount;
  }

  if (mode === "lesson" || mode === "revision") {
    return /learning objectives?|learning outcomes?/i.test(text)
      && /\b\d{1,2}\s*(?:-|–|to)\s*\d{1,2}\s*(?:min|minutes)\b/i.test(text)
      && /exit ticket|check for understanding|assessment/i.test(text);
  }

  if (mode === "gameideas") {
    return /rules|how to play/i.test(text)
      && /scoring|points/i.test(text)
      && /win(?:ning)? condition|wins?/i.test(text);
  }

  return Boolean(text);
}

export function buildOfflineTeachingPlan({ mode, className, subject, chapter, syllabus, instructions, duration, classSize, materials }) {
  const points = syllabusPoints(syllabus);
  const topic = chapter?.trim() || "Teacher-selected topic";
  const time = Math.max(10, Math.min(120, Number(duration) || 40));
  const learners = Math.max(1, Number(classSize) || 30);
  const questEnd = Math.floor(time * 0.6);
  const buildEnd = Math.floor(time * 0.85);
  const supplies = materials?.trim() || "board, paper, and pens";
  const syllabusList = points.length
    ? points.map((point, index) => `${index + 1}. ${point}`).join("\n")
    : "Teacher: add exact syllabus points before teaching; do not infer facts from the topic title.";
  const checks = points.length
    ? points.slice(0, 3).map((point, index) => `${index + 1}. In your own words, explain: ${point}`).join("\n")
    : "Teacher: write 3 checks directly from the approved syllabus.";

  if (mode === "gameideas") {
    const cards = points.length
      ? points.slice(0, 6).map((point, index) =>
        `CARD ${index + 1}\nExplain this syllabus point in your own words: ${point}\nBonus: show it as a labelled sketch, worked example, timeline, or cause-and-effect chain when appropriate.`
      ).join("\n\n")
      : "CARD TEMPLATE\nTeacher: copy one exact approved syllabus point onto each card and prepare its verified explanation.";
    return `CLASSROOM GAME PACK — OFFLINE TEACHER TEMPLATE
Class ${className} · ${subject} · ${topic}
${time} minutes · ${learners} learners · Materials: ${supplies}

IMPORTANT
This is a ready-to-run game structure, not AI-generated content. Check the teacher-written cards and answer criteria against the syllabus before play.

GAME 1 — SYLLABUS QUEST (recommended, ${questEnd} minutes)
Goal: Every learner explains an assigned syllabus point accurately and earns team points for clear evidence—not speed alone.
Setup (4 min): Make teams of 3–5. Give each team scrap paper. Copy the challenge cards below onto slips (or display one at a time). Assign rotating roles: reader, explainer, evidence-checker, and reporter.
How to play:
1. Reveal one card. Teams get 45 seconds of quiet think time so everyone prepares an answer.
2. The explainer gives a 30-second answer. The evidence-checker points to the exact words in the supplied syllabus/notes that support it.
3. Rotate roles each round. Do not let the same learner answer twice until everyone has had a turn.
4. Teams may use one “ask the class” hint per game; the hint costs one point.
Scoring: 1 point for a correct idea grounded in the notes, 1 for explaining it clearly, and 1 for useful evidence. Award no points for unsupported facts. First team to 8 points wins; if time ends first, the team with the most points wins. Ties are broken by a new 20-second teach-back, judged against the notes.
Teacher check: While teams play, mark each learner as “explained”, “needs a prompt”, or “not yet heard”. This prevents a team score from hiding individual gaps.

GAME 2 — BUILD, SWAP, IMPROVE (${buildEnd - questEnd} minutes)
Teams create a small diagram, timeline, worked example, or labelled explanation for one card using only the listed materials. Swap with another team, which checks it against the syllabus and adds one evidence-based improvement. Score 1 for accuracy, 1 for a clear label/explanation, and 1 for a helpful peer improvement. The class votes for the clearest explanation, not the prettiest drawing.

GAME 3 — EXIT-TICKET BOSS ROUND (${time - buildEnd} minutes)
Every learner answers independently. No team help. Use the prompts below; check answers against the supplied syllabus, not a guessed answer key.
${checks}

CHALLENGE CARDS — READY TO COPY
${cards}

INCLUSION & DIFFERENTIATION
- Support: let learners rehearse with a partner, use a sentence starter (“The syllabus says …; this means …”), or draw before speaking.
- Stretch: ask confident learners to connect two supplied points and cite evidence for both; accept only connections the syllabus supports.
- Participation: rotate roles and require individual think time before team discussion.

TEACHER RUN-SHEET
0–4 min: Make teams, explain scoring, and model one answer using an actual supplied point.
4–${questEnd} min: Play Syllabus Quest; rotate speaker and evidence-checker every round.
${questEnd}–${buildEnd} min: Build, Swap, Improve.
${buildEnd}–${time} min: Silent exit ticket and collect responses.

SOURCE NOTES
${syllabusList}

Teacher constraints: ${instructions?.trim() || "None supplied."}

VERIFICATION: The offline template deliberately supplies no invented factual answers.`;
  }

  const lesson = mode === "lesson";
  const first = Math.floor(time * 0.1);
  const teachEnd = Math.floor(time * 0.35);
  const practiceEnd = Math.floor(time * 0.6);
  const gameEnd = Math.floor(time * 0.85);
  const objectiveList = points.length
    ? points.slice(0, 3).map((point, index) => `${index + 1}. Learners can explain or demonstrate: ${point}`).join("\n")
    : "Teacher: write observable objectives from the approved syllabus before class.";

  return `${lesson ? "PRESENTATION-READY LESSON PLAN" : "PRESENTATION-READY REVISION PLAN"} — OFFLINE TEACHER TEMPLATE
Class ${className} · ${subject} · ${topic}
${time} minutes · ${learners} learners · Materials: ${supplies}

LEARNING OBJECTIVES
${objectiveList}

PRESENTATION / BOARD OUTLINE
Slide 1 — Topic & goal: ${topic}. Say what students will explain or demonstrate by the end.
Slide 2 — Recall: ask learners what they already know; collect 2–3 brief responses.
Slide 3 — Syllabus focus: present one supplied point at a time. Do not add unverified facts.
${points.length ? points.slice(0, 3).map((point, index) => `  ${index + 1}. ${point}`).join("\n") : "  Teacher: add exact, verified syllabus bullets."}
Slide 4 — Play and practise: explain the game roles, turn sequence, evidence rule, and scoring.
Slide 5 — Check & reflect: learners complete the exit ticket independently; preview the next step.

TIMED TEACHER RUN-OF-SHOW
0–${first} min — HOOK & ENTRY CHECK
Teacher: display/read the topic, share the objective, and ask learners to write one thing they know and one question. Listen for prior knowledge; do not correct with facts outside the syllabus.
${first}–${teachEnd} min — EXPLICIT TEACHING
Teacher: unpack the listed syllabus points in short chunks. After each, model one explanation using only the supplied text. Students annotate a keyword or sketch a representation.
${teachEnd}–${practiceEnd} min — GUIDED PRACTICE
Pairs choose a syllabus point, explain it to one another, then underline the evidence in their notes. Ask: “Which exact words support that explanation?”
${practiceEnd}–${gameEnd} min — PLAY: SYLLABUS QUEST
Make teams of 3–5 and rotate reader, explainer, evidence-checker, and reporter. Reveal one point/card at a time. Give 45 seconds to think and 30 seconds to explain. Score 1 for an accurate idea, 1 for clear explanation, and 1 for evidence in the notes. Unsupported claims earn no points. Ensure each learner speaks before anyone takes a second turn.
${gameEnd}–${time} min — EXIT TICKET
Learners answer independently:
${checks}
Collect responses and note who needs a re-teach.

DIFFERENTIATION
- Support: partner rehearsal, a sentence starter (“The syllabus says …; this means …”), and drawing before speaking.
- Stretch: connect two supplied points and cite evidence; accept only syllabus-supported connections.
- Participation: think time for all, rotating roles, and an individual exit response.

SYLLABUS POINTS — USE AS THE FACT CHECK
${syllabusList}

Teacher constraints: ${instructions?.trim() || "None supplied."}

Teacher note: This is an editable offline plan, not AI-generated. Replace placeholders, verify facts, and adjust times to your class.`;
}
