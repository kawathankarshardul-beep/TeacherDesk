import test from "node:test";
import assert from "node:assert/strict";

import { csvCell, examFinal, latestAssessment, monthCalendarDays, nextRollNumber } from "./domain.js";

test("final exam score stays within zero and one hundred", () => {
  assert.equal(examFinal(0, 0), 0);
  assert.equal(examFinal(30, 80), 100);
  assert.equal(examFinal(null, 80), null);
});

test("report marks use the latest assessment of each exam type", () => {
  const assessments = [
    { id: 1, class_name: "9A", subject: "Maths", exam_type: "Unit Test", created_at: "2026-01-01" },
    { id: 2, class_name: "9A", subject: "Maths", exam_type: "Unit Test", created_at: "2026-02-01" },
    { id: 3, class_name: "9B", subject: "Maths", exam_type: "Unit Test", created_at: "2026-03-01" },
  ];
  assert.equal(latestAssessment(assessments, "9A", "Maths", "Unit Test").id, 2);
  assert.equal(latestAssessment(assessments, "9A", "Maths", "Unit Test", "2026-01-15").id, 1);
  assert.equal(latestAssessment(assessments, "9A", "Maths", "Main Exam"), null);
});

test("automatic roll number reuses a free slot and caps at 99", () => {
  const students = [{ class_name: "9A", roll_number: "01" }, { class_name: "9A", roll_number: "03" }];
  assert.equal(nextRollNumber(students, "9A"), "02");
  assert.equal(nextRollNumber(Array.from({ length: 99 }, (_, index) => ({
    class_name: "9A",
    roll_number: String(index + 1),
  })), "9A"), null);
});

test("CSV export escapes spreadsheet formula cells", () => {
  assert.equal(csvCell("=1+1"), "\"'=1+1\"");
  assert.equal(csvCell('safe "text"'), '"safe ""text"""');
});

test("month view always has six Monday-first weeks", () => {
  const days = monthCalendarDays(new Date(2026, 9, 13));
  assert.equal(days.length, 42);
  assert.equal(days[0].getDay(), 1);
  assert.equal(days[35].getMonth(), 10);
});
