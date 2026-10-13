export function examFinal(unit, main) {
  if (unit == null || main == null) return null;
  return Math.min(100, Math.max(0, 100 - ((30 - Number(unit)) + (80 - Number(main)))));
}

export function latestAssessment(assessments, className, subject, examType, throughDate = null) {
  return assessments.reduce((latest, assessment) => {
    if (
      assessment.class_name !== className
      || assessment.subject !== subject
      || (assessment.exam_type || assessment.title) !== examType
      || (throughDate && String(assessment.created_at || "").slice(0, 10) > throughDate)
    ) return latest;

    if (!latest || String(assessment.created_at || "") >= String(latest.created_at || "")) {
      return assessment;
    }
    return latest;
  }, null);
}

export function nextRollNumber(students, className) {
  const used = new Set(
    students
      .filter(student => student.class_name === className)
      .map(student => Number(student.roll_number))
      .filter(Number.isInteger)
  );
  for (let roll = 1; roll <= 99; roll += 1) {
    if (!used.has(roll)) return String(roll).padStart(2, "0");
  }
  return null;
}

export function csvCell(value) {
  const text = String(value ?? "");
  const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

export function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function monthCalendarDays(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
  return Array.from({ length: 42 }, (_, index) =>
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
  );
}
