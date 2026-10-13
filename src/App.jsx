import { useEffect, useMemo, useState } from "react";

import { supabase } from "./supabase";

import "./App.css";
import { csvCell, dateKey, examFinal, latestAssessment, monthCalendarDays, nextRollNumber } from "./domain";
import { buildOfflineTeachingPlan, isUsableTeachingResponse, teachingPlanGuidance } from "./teaching-plans";



const ADMIN_EMAIL = "kawathankarshardul@gmail.com";

const CLASSES = ["9A", "9B", "9C", "10A", "10B", "10C"];

const SUBJECTS = [

  { name: "History", group: "HCG", report: false },

  { name: "Geography", group: "HCG", report: false },

  { name: "Physics", group: "Science", report: false },

  { name: "Chemistry", group: "Science", report: false },

  { name: "Biology", group: "Science", report: false },

  { name: "Maths", group: "Maths", report: true },

  { name: "Hindi Language", group: "Hindi", report: false },

  { name: "Hindi Literature", group: "Hindi", report: false },

  { name: "English Language", group: "English", report: false },

  { name: "English Literature", group: "English", report: false },

  { name: "Marathi / Hindi Graded", group: "Graded", report: true },

];

const MENU = ["Dashboard", "Students", "Attendance", "Attendance Summary", "Assessments", "Report Cards", "Calendar", "AI Studio", "Learning Signals"];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const localDate = () => {

  const parts = new Intl.DateTimeFormat("en-CA", {

    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"

  }).formatToParts(new Date());

  const get = (type) => parts.find((p) => p.type === type)?.value;

  return `${get("year")}-${get("month")}-${get("day")}`;

};

const errText = (e) => e?.message || "Something went wrong.";
const sameId = (a, b) => String(a) === String(b);
const attendanceStatusKey = value => {
  const status = String(value ?? "").trim().toLowerCase();
  if (status === "present" || status === "p") return "present";
  if (status === "absent" || status === "a") return "absent";
  return "";
};
const attendanceStatusLabel = value => {
  const status = attendanceStatusKey(value);
  return status ? status[0].toUpperCase() + status.slice(1) : "";
};



function csvDownload(name, rows) {

  const text = rows.map(row => row.map(csvCell).join(",")).join("\r\n");

  const url = URL.createObjectURL(new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8;" }));

  const a = document.createElement("a");

  a.href = url; a.download = name; a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);

}



function roundUp(n) { return Math.ceil(n); }



export default function App() {

  const [sessionUser, setSessionUser] = useState(null);

  const [authLoading, setAuthLoading] = useState(true);

  const [authMode, setAuthMode] = useState("login");
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [signupClass, setSignupClass] = useState("9A");

  const [authMsg, setAuthMsg] = useState("");

  const [authBusy, setAuthBusy] = useState(false);



  const [page, setPage] = useState("Dashboard");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [calendarItems, setCalendarItems] = useState([]);
  const [calendarBusy, setCalendarBusy] = useState(false);
  const [calendarLoadedClass, setCalendarLoadedClass] = useState("");
  const [calendarError, setCalendarError] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarItemType, setCalendarItemType] = useState("lesson");
  const [calendarTitle, setCalendarTitle] = useState("");
  const [calendarSubject, setCalendarSubject] = useState("Maths");
  const [calendarWeekday, setCalendarWeekday] = useState("1");
  const [calendarDate, setCalendarDate] = useState(localDate());
  const [calendarStartTime, setCalendarStartTime] = useState("");
  const [calendarEndTime, setCalendarEndTime] = useState("");
  const [calendarNotes, setCalendarNotes] = useState("");
  const [calendarLessonPlan, setCalendarLessonPlan] = useState("");
  const [aiOutputMode, setAiOutputMode] = useState("");

  const [students, setStudents] = useState([]);

  const [assessments, setAssessments] = useState([]);

  const [marks, setMarks] = useState([]);

  const [attendance, setAttendance] = useState([]);

  const [teacherClass, setTeacherClass] = useState("");

  const [classChoice, setClassChoice] = useState("9A");

  const [newStudent, setNewStudent] = useState({ name: "", roll: "", className: "9A" });

  const [showStudentForm, setShowStudentForm] = useState(false);

  const [studentSearch, setStudentSearch] = useState("");

  const [attDate, setAttDate] = useState(localDate());

  const [attDraft, setAttDraft] = useState({});

  const [selectedStudent, setSelectedStudent] = useState("");

  const [assessmentType, setAssessmentType] = useState("Unit Test");

  const [assessmentSubject, setAssessmentSubject] = useState("Maths");

  const [assessmentClass, setAssessmentClass] = useState("9A");

  const [selectedAssessment, setSelectedAssessment] = useState("");

  const [markDraft, setMarkDraft] = useState({});

  const [reportStudent, setReportStudent] = useState("");
  const [reportClass, setReportClass] = useState("9A");
  const [reportAssessmentDate, setReportAssessmentDate] = useState("latest");

  const [aiMode, setAiMode] = useState("worksheet");

  const [aiSubject, setAiSubject] = useState("Science");

  const [aiChapter, setAiChapter] = useState("");

  const [aiSyllabus, setAiSyllabus] = useState("");

  const [aiQuestionTypes, setAiQuestionTypes] = useState(["MCQs", "Give reasons", "Short answer"]);

  const [aiCount, setAiCount] = useState("12");

  const [aiInstructions, setAiInstructions] = useState("");

  const [aiDuration, setAiDuration] = useState("40");

  const [aiClassSize, setAiClassSize] = useState("30");

  const [aiMaterials, setAiMaterials] = useState("");

  const [aiAnswerKey, setAiAnswerKey] = useState(true);

  const [aiOutput, setAiOutput] = useState("");

  const [aiBusy, setAiBusy] = useState(false);

  const [paperQuestion, setPaperQuestion] = useState("");

  const [paperScheme, setPaperScheme] = useState("");

  const [paperAnswer, setPaperAnswer] = useState("");
  const [teachingFiles, setTeachingFiles] = useState([]);
  const [filesBusy, setFilesBusy] = useState(false);
  const [isFileDragging, setIsFileDragging] = useState(false);



  const isAdmin = sessionUser?.email?.toLowerCase() === ADMIN_EMAIL;

  async function addTeachingFiles(fileList) {
    const incoming = Array.from(fileList || []);
    const allowed = incoming.filter(file =>
      /\.(pdf|txt|md|csv)$/i.test(file.name)
      || ["application/pdf", "text/plain", "text/markdown", "text/csv"].includes(file.type)
    );
    const oversized = allowed.filter(file => file.size > 5 * 1024 * 1024);
    const eligible = allowed.filter(file => file.size <= 5 * 1024 * 1024);
    const slots = Math.max(0, 5 - teachingFiles.length);
    const selected = eligible.slice(0, slots);
    const skipped = incoming.length - selected.length;

    if (skipped) {
      const reasons = [];
      if (allowed.length !== incoming.length) reasons.push("only PDF, TXT, MD and CSV are supported");
      if (oversized.length) reasons.push("each file must be 5 MB or smaller");
      if (eligible.length > slots) reasons.push("up to 5 files can be attached");
      setNotice(`Some files were skipped: ${reasons.join("; ")}.`);
    }
    if (!selected.length) return;

    setFilesBusy(true);
    try {
      const prepared = await Promise.all(selected.map(async file => {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(reader.error || new Error(`Could not read ${file.name}.`));
          reader.readAsDataURL(file);
        });
        const data = dataUrl.includes(",") ? dataUrl.slice(dataUrl.indexOf(",") + 1) : dataUrl;
        const text = /\.(txt|md|csv)$/i.test(file.name) ? await file.text() : "";
        return { name: file.name, type: file.type || "application/octet-stream", size: file.size, data, text };
      }));
      setTeachingFiles(old => [...old, ...prepared].slice(0, 5));
      setNotice(`${prepared.length} file${prepared.length === 1 ? "" : "s"} ready. Text files include their extracted text; PDFs are attached for backend processing.`);
    } catch (error) {
      setNotice(`Could not prepare the selected files: ${errText(error)}`);
    } finally {
      setFilesBusy(false);
    }
  }

  const teachingDropzone = <div className={`teaching-dropzone ${isFileDragging ? "dragging" : ""} ${filesBusy ? "reading" : ""}`} onDragOver={e => { e.preventDefault(); if (!filesBusy) setIsFileDragging(true); }} onDragLeave={() => setIsFileDragging(false)} onDrop={e => { e.preventDefault(); setIsFileDragging(false); if (!filesBusy) addTeachingFiles(e.dataTransfer.files); }}>
    <input type="file" aria-label="Add syllabus files" accept=".pdf,.txt,.md,.csv,application/pdf,text/plain,text/csv" multiple disabled={filesBusy || teachingFiles.length >= 5} onChange={e => { addTeachingFiles(e.target.files); e.target.value = ""; }} />
    <strong>{filesBusy ? "Reading your files…" : "Drop syllabus files or PDFs here"}</strong><span>or click to browse · PDF, TXT, MD, CSV · max 5 MB each · up to 5 files</span>
    <span>TXT, MD and CSV text is extracted before sending. PDFs are attached for the AI backend to process.</span>
    {teachingFiles.length > 0 && <ul>{teachingFiles.map((file, i) => <li key={`${file.name}-${i}`}>{file.name} <button type="button" className="text-btn" onClick={() => setTeachingFiles(old => old.filter((_, j) => i !== j))}>Remove</button></li>)}</ul>}
  </div>;

  const activeClass = isAdmin ? classChoice : (teacherClass || classChoice);
  const teachingSetupFields = <div className="form-grid">
    <label>Time available (minutes)<input type="number" min="10" max="120" value={aiDuration} onChange={e=>setAiDuration(e.target.value)}/></label>
    <label>Class size<input type="number" min="1" max="200" value={aiClassSize} onChange={e=>setAiClassSize(e.target.value)}/></label>
    <label>Available materials<input value={aiMaterials} onChange={e=>setAiMaterials(e.target.value)} placeholder="e.g. board, paper, pens"/></label>
  </div>;
  const calendarLoading = Boolean(sessionUser && calendarLoadedClass !== activeClass);
  const currentCalendarError = calendarLoadedClass === activeClass ? calendarError : "";
  const calendarDays = monthCalendarDays(calendarMonth);
  const calendarItemsByDate = new Map(calendarDays.map(day => {
    const key = dateKey(day);
    const items = calendarItems.filter(item =>
      (item.item_type === "event" && item.event_date === key)
      || (item.item_type === "lesson" && Number(item.weekday) === day.getDay())
    );
    return [key, items];
  }));

  const classStudents = useMemo(
    () => students
      .filter(s => s.class_name === activeClass)
      .sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base" })),
    [students, activeClass]
  );

  const selectedTest = assessments.find(a => sameId(a.id, selectedAssessment));

  const testsForClass = assessments.filter(a => a.class_name === activeClass);
  const reportAssessmentDates = [...new Set(assessments
    .filter(assessment => assessment.class_name === (isAdmin ? reportClass : activeClass))
    .map(assessment => String(assessment.created_at || "").slice(0, 10))
    .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)))]
    .sort((a, b) => b.localeCompare(a));
  const effectiveReportDate = reportAssessmentDates.includes(reportAssessmentDate) ? reportAssessmentDate : "latest";

  const learningSignalData = SUBJECTS.map(subject => {
    const subjectTests = assessments.filter(test => test.class_name === activeClass && test.subject === subject.name);
    const classStudentIds = new Set(classStudents.map(student => String(student.id)));
    const scores = marks
      .filter(mark => classStudentIds.has(String(mark.student_id)))
      .map(mark => {
        const test = subjectTests.find(item => sameId(item.id, mark.assessment_id));
        const score = mark.score == null ? NaN : Number(mark.score);
        const maximum = Number(test?.max_marks);
        return test && Number.isFinite(score) && maximum > 0 ? score / maximum * 100 : null;
      })
      .filter(score => score != null);
    return {
      subject: subject.name,
      average: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
      recordedScores: scores.length
    };
  }).filter(signal => signal.recordedScores > 0).sort((a, b) => a.average - b.average);

  const studentsWithAttendance = classStudents.filter(student => attendanceSummary(student).recorded > 0);
  const classAttendanceAverage = studentsWithAttendance.length
    ? Math.round(studentsWithAttendance.reduce((sum, student) => sum + attendanceSummary(student).percent, 0) / studentsWithAttendance.length)
    : null;

  const todayAttendance = attendance.filter(a => a.attendance_date === attDate && classStudents.some(s => sameId(s.id, a.student_id)));

  const presentToday = todayAttendance.filter(a => String(a.status || "").trim().toLowerCase() === "present").length;



  useEffect(() => {

    let alive = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) setAuthMsg(error.message);
      setSessionUser(data?.session?.user || null);
      setAuthLoading(false);
    }).catch(error => {
      if (!alive) return;
      setAuthMsg(`Could not connect to the sign-in service: ${errText(error)}`);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      if (!session) {
        setCalendarItems([]);
        setCalendarLoadedClass("");
        setCalendarError("");
      }
      setSessionUser(session?.user || null);
    });

    return () => { alive = false; subscription.unsubscribe(); };

  }, []);



  useEffect(() => {

    if (!sessionUser) return;

    let cancelled = false;

    (async () => {
      setBusy(true);
      try {
        const [st, tests, mk, at] = await Promise.all([
          supabase.from("students").select("*").order("created_at"),
          supabase.from("assessments").select("*").order("created_at"),
          supabase.from("marks").select("*"),
          supabase.from("attendance").select("*")
        ]);

        if (cancelled) return;

        const failure = [st, tests, mk, at].find(result => result.error)?.error;
        if (st.data) setStudents(st.data);
        if (tests.data) setAssessments(tests.data);
        if (mk.data) setMarks(mk.data);
        if (at.data) setAttendance(at.data);

        let assignedClass = CLASSES.includes(sessionUser.user_metadata?.class_name)
          ? sessionUser.user_metadata.class_name
          : "";
        if (!assignedClass && !isAdmin) {
          const { data: profile, error: profileError } = await supabase
            .from("teacher_profiles")
            .select("class_name")
            .eq("user_id", sessionUser.id)
            .maybeSingle();
          if (cancelled) return;
          if (CLASSES.includes(profile?.class_name)) assignedClass = profile.class_name;
          else if (profileError) setNotice("Could not load your assigned class: " + profileError.message);
        }
        if (assignedClass) {
          setTeacherClass(assignedClass);
          setClassChoice(assignedClass);
          setAssessmentClass(assignedClass);
          setReportClass(assignedClass);
        } else if (!isAdmin) {
          setNotice("Your teacher profile has no class yet. Sign out and register again with your class, or ask the administrator to set it.");
        }

        if (failure) setNotice("Some records could not load: " + errText(failure));
      } catch (error) {
        if (!cancelled) setNotice(`Could not load classroom records: ${errText(error)}`);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => { cancelled = true; };

  }, [sessionUser, isAdmin]);

  useEffect(() => {
    if (!sessionUser) return undefined;

    let cancelled = false;

    (async () => {
      try {
        if (!isAdmin) {
          const { data: profile, error: profileError } = await supabase
            .from("teacher_profiles")
            .select("class_name")
            .eq("user_id", sessionUser.id)
            .maybeSingle();
          if (profileError) throw profileError;
          if (profile?.class_name !== activeClass) {
            throw new Error(`An administrator-managed teacher profile for class ${activeClass} is required to use the calendar.`);
          }
        }

        const { data, error } = await supabase
          .from("class_calendar_items")
          .select("*")
          .eq("class_name", activeClass)
          .order("event_date", { ascending: true, nullsFirst: false })
          .order("weekday", { ascending: true, nullsFirst: false })
          .order("start_time", { ascending: true, nullsFirst: false });
        if (error) throw error;
        if (!cancelled) {
          setCalendarItems(data || []);
          setCalendarError("");
          setCalendarLoadedClass(activeClass);
        }
      } catch (error) {
        if (!cancelled) {
          setCalendarItems([]);
          setCalendarError(errText(error));
          setCalendarLoadedClass(activeClass);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [sessionUser, activeClass, isAdmin]);


  // A new daily sheet is selected by the India date when the app opens; historical records are never deleted.

  useEffect(() => {

    const updateDate = () => setAttDate(localDate());

    updateDate();

    const timer = setInterval(updateDate, 30_000);

    return () => clearInterval(timer);

  }, []);



  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {

    const next = {};

    classStudents.forEach(s => {

      const record = attendance.find(a => sameId(a.student_id, s.id) && a.attendance_date === attDate);

      next[s.id] = attendanceStatusLabel(record?.status);

    });

    setAttDraft(next);

  }, [attDate, activeClass, students, attendance]);



  useEffect(() => {

    if (!testsForClass.length) { setSelectedAssessment(""); return; }

    if (!testsForClass.some(t => sameId(t.id, selectedAssessment))) setSelectedAssessment(String(testsForClass[0].id));

  }, [activeClass, assessments]);



  useEffect(() => {

    const next = {};

    if (selectedTest) classStudents.forEach(s => {

      const found = marks.find(m => sameId(m.student_id, s.id) && sameId(m.assessment_id, selectedTest.id));

      next[s.id] = found?.score == null ? "" : String(found.score);

    });

    setMarkDraft(next);

  }, [selectedAssessment, students, marks, activeClass]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */



  async function authSubmit(e) {

    e.preventDefault(); setAuthMsg(""); setAuthBusy(true);

    try {

      if (authMode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        });
        if (error) throw error;
        setAuthMsg("If an account exists for that address, a password reset link has been sent.");
      } else if (authMode === "signup") {

        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { class_name: signupClass } } });

        if (error) throw error;

        if (data.user && !data.session) setAuthMsg("Account created. Confirm your email, then sign in.");

      } else {

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) throw error;

      }

    } catch (e2) { setAuthMsg(errText(e2)); }

    finally { setAuthBusy(false); }

  }

  async function updateRecoveredPassword(e) {
    e.preventDefault();
    setAuthMsg("");
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPasswordRecovery(false);
      setPassword("");
      setNotice("Password updated.");
    } catch (error) {
      setAuthMsg(`Could not update password: ${errText(error)}`);
    } finally {
      setAuthBusy(false);
    }
  }



  async function logout() {

    const { error } = await supabase.auth.signOut();

    if (error) setNotice(error.message);

  }



  async function addStudent(e) {

    e.preventDefault();

    if (!newStudent.name.trim()) return;

    const className = isAdmin ? newStudent.className : activeClass;

    const rawRoll = newStudent.roll.trim() || nextRollNumber(students, className);
    if (!rawRoll) return setNotice(`Class ${className} has used all roll numbers from 01 to 99.`);
    if (!/^\d{1,2}$/.test(rawRoll)) return setNotice("Roll number must be 1–2 digits (01–99).");

    const roll = rawRoll.padStart(2, "0");

    setBusy(true);
    try {
      const { data, error } = await supabase.from("students").insert({
        name: newStudent.name.trim(), class_name: className, roll_number: roll, teacher_id: sessionUser.id
      }).select().single();
      if (error) throw error;
      setStudents(old => [...old, data].sort((a,b) => String(a.name).localeCompare(String(b.name), undefined, {sensitivity:"base"})));
      setNewStudent({ name: "", roll: "", className: activeClass });
      setShowStudentForm(false);
      setNotice("Student added.");
    } catch (error) {
      setNotice(`Could not add student: ${errText(error)}`);
    } finally {
      setBusy(false);
    }

  }



  async function createTest(e) {

    e.preventDefault();

    const max = assessmentType === "Unit Test" ? 30 : 80;

    setBusy(true);
    try {
      const { data, error } = await supabase.from("assessments").insert({
        title: assessmentType, subject: assessmentSubject, max_marks: max,
        class_name: isAdmin ? assessmentClass : activeClass, teacher_id: sessionUser.id,
        exam_type: assessmentType
      }).select().single();
      if (error) throw error;
      setAssessments(old => [...old, data]);
      setSelectedAssessment(String(data.id));
      setNotice(`${assessmentSubject} ${assessmentType} created (/${max}).`);
    } catch (error) {
      setNotice(`Could not create assessment: ${errText(error)}`);
    } finally {
      setBusy(false);
    }

  }



  async function saveMarks(e) {

    e.preventDefault();

    if (!selectedTest) return setNotice("Select a test first.");

    const rows = [];

    for (const s of classStudents) {

      const raw = markDraft[s.id];

      if (raw === "" || raw == null) continue;

      const score = Number(raw);

      if (!Number.isFinite(score) || score < 0 || score > Number(selectedTest.max_marks))

        return setNotice(`Check ${s.name}'s mark. It must be between 0 and ${selectedTest.max_marks}.`);

      rows.push({ student_id: s.id, assessment_id: selectedTest.id, score });

    }

    const studentIds = new Set(classStudents.map(student => String(student.id)));
    const marksToClear = marks.filter(mark =>
      sameId(mark.assessment_id, selectedTest.id)
      && studentIds.has(String(mark.student_id))
      && (markDraft[mark.student_id] === "" || markDraft[mark.student_id] == null)
    );
    if (!rows.length && !marksToClear.length) return setNotice("Enter or change at least one mark.");

    setBusy(true);
    try {
      let savedRows = [];
      if (rows.length) {
        const { data, error } = await supabase.from("marks").upsert(rows, { onConflict: "student_id,assessment_id" }).select();
        if (error) throw error;
        savedRows = data || rows;
        setMarks(old => [
          ...old.filter(mark => !rows.some(row => sameId(row.student_id, mark.student_id) && sameId(row.assessment_id, mark.assessment_id))),
          ...savedRows
        ]);
      }

      if (marksToClear.length) {
        const studentIds = marksToClear.map(mark => mark.student_id);
        const { error } = await supabase.from("marks").delete()
          .eq("assessment_id", selectedTest.id)
          .in("student_id", studentIds);
        if (error) throw error;
        setMarks(old => old.filter(mark =>
          !sameId(mark.assessment_id, selectedTest.id)
          || !studentIds.some(studentId => sameId(studentId, mark.student_id))
        ));
      }

      setNotice(`Marks saved${marksToClear.length ? `; cleared ${marksToClear.length} blank mark${marksToClear.length === 1 ? "" : "s"}` : ""}.`);
    } catch (error) {
      setNotice(`Could not save marks: ${errText(error)}.`);
    } finally {
      setBusy(false);
    }

  }



  async function saveAttendance() {
    if (!classStudents.length) return setNotice("Add students to this class first.");
    const records = classStudents.map(s => ({ s, status: String(attDraft[s.id] || "").trim().toLowerCase() }))
      .filter(x => x.status === "present" || x.status === "absent");
    if (!records.length) return setNotice("Choose Present or Absent for at least one student.");

    setBusy(true);
    try {
      // Keep the stored values consistent with the app's Present/Absent labels.
      const payloads = records.map(({ s, status }) => ({
        student_id: s.id,
        attendance_date: attDate,
        status: attendanceStatusLabel(status),
        teacher_id: sessionUser.id,
        class_name: activeClass
      }));
      const { data, error } = await supabase.from("attendance")
        .upsert(payloads, { onConflict: "student_id,attendance_date" }).select();
      if (error) throw error;
      // Use returned rows (including server-normalized status) to keep the UI in sync.
      setAttendance(old => [
        ...old.filter(a => !(a.attendance_date === attDate && records.some(r => sameId(r.s.id, a.student_id)))),
        ...(data || payloads)
      ]);
      setAttDraft(Object.fromEntries(records.map(({ s, status }) => [s.id, status === "present" ? "Present" : "Absent"])));
      setNotice(`Attendance saved for ${attDate}: ${records.filter(r => r.status === "present").length} present, ${records.filter(r => r.status === "absent").length} absent.`);
    } catch (err) {
      setNotice("Could not save attendance: " + errText(err) + ". Check the attendance table's status constraint and RLS policies.");
    } finally { setBusy(false); }
  }

  async function saveAttendanceChoice(student, status) {
    const savedRecord = attendance.find(record =>
      sameId(record.student_id, student.id) && record.attendance_date === attDate
    );
    const previousStatus = attendanceStatusLabel(savedRecord?.status);

    setAttDraft(draft => ({ ...draft, [student.id]: status === "present" ? "Present" : "Absent" }));
    setBusy(true);
    try {
      const payload = {
        student_id: student.id,
        attendance_date: attDate,
        status: attendanceStatusLabel(status),
        teacher_id: sessionUser.id,
        class_name: activeClass
      };
      const { data, error } = await supabase.from("attendance")
        .upsert(payload, { onConflict: "student_id,attendance_date" }).select();
      if (error) throw error;

      const persistedRecord = data?.[0] || payload;
      setAttendance(records => [
        ...records.filter(record =>
          !(sameId(record.student_id, student.id) && record.attendance_date === attDate)
        ),
        persistedRecord
      ]);
      setNotice(`${student.name} marked ${status} for ${attDate}.`);
    } catch (err) {
      setAttDraft(draft => ({ ...draft, [student.id]: previousStatus }));
      setNotice(`Could not save ${student.name}'s attendance: ${errText(err)}.`);
    } finally {
      setBusy(false);
    }
  }


  async function generateTeachingContent(e, modeOverride) {

    e?.preventDefault?.();

    const requestedMode = modeOverride || aiMode;
    setAiBusy(true); setAiOutput(""); setAiOutputMode("");

    try {

      const payload = {

        mode: modeOverride || aiMode,

        className: activeClass,

        subject: aiSubject,

        chapter: aiChapter,

        syllabus: aiSyllabus,

        questionTypes: aiQuestionTypes,

        count: Math.min(30, Math.max(1, Number(aiCount) || 12)),

        instructions: aiInstructions,

        duration: Number(aiDuration) || 40,

        classSize: Number(aiClassSize) || 30,

        materials: aiMaterials,

        includeAnswerKey: aiAnswerKey,

        question: paperQuestion,

        markingScheme: paperScheme,

        studentAnswer: paperAnswer,

        // Aggregate-only, de-identified signals; never send student names or roll numbers.
        learningSignals: {
          students: classStudents.length,
          averageAttendancePercent: classAttendanceAverage,
          subjectPerformance: learningSignalData.map(({ subject, average, recordedScores }) => ({ subject, averagePercent: average, recordedScores }))
        },
        files: teachingFiles.map(({ name, type, size, data, text }) => ({ name, type, size, data, text }))
      };

      const activeAiMode = modeOverride || aiMode;
      const classroomGuidance = teachingPlanGuidance(activeAiMode, {
        className: activeClass,
        duration: aiDuration,
        classSize: aiClassSize,
        materials: aiMaterials
      });
      if (classroomGuidance) {
        payload.instructions = [aiInstructions, classroomGuidance].filter(Boolean).join("\n\n");
      }

      const { data, error } = await supabase.functions.invoke("teacherdesk-ai", {
        body: payload,
        timeout: 45_000
      });

      if (error) throw error;

      if (!data?.text) throw new Error(data?.error || "The AI endpoint returned no content.");
      if (!isUsableTeachingResponse(requestedMode, data.text)) {
        throw new Error("The AI endpoint returned an incomplete or non-lesson response.");
      }

      setAiOutput(data.text);
      setAiOutputMode(requestedMode);

    } catch (error) {
      // Honest offline template mode: this is not represented as AI-generated content.
      const activeAiMode = modeOverride || aiMode;
      const offlineSyllabus = [
        aiSyllabus,
        ...teachingFiles.map(file => file.text).filter(Boolean)
      ].filter(Boolean).join("\n");
      if (activeAiMode === "worksheet") {
        const types = (aiQuestionTypes.length ? aiQuestionTypes : ["MCQ", "Short answer", "Give reasons"]).slice(0, 8);
        const count = Math.min(30, Math.max(1, Number(aiCount) || 12));
        const qs = Array.from({ length: count }, (_, i) => `${i + 1}. [${types[i % types.length]}] ${aiChapter}: Write a question that tests this syllabus point: ${aiSyllabus.split(/\n|[.;]/).filter(Boolean)[i % Math.max(1, aiSyllabus.split(/\n|[.;]/).filter(Boolean).length)] || aiSyllabus}. (Marks: ____ )`);
        setAiOutput(`TEACHERDESK WORKSHEET — TEMPLATE MODE\nClass: ${activeClass} | Subject: ${aiSubject}\nChapter: ${aiChapter}\nSyllabus supplied by teacher: ${aiSyllabus}\n\nQUESTIONS\n${qs.join("\n\n")}${aiAnswerKey ? "\n\nANSWER KEY\nTeacher: complete and verify the answer key before distributing. This offline template does not invent factual answers." : ""}\n\nExtra instructions: ${aiInstructions || "None"}`);
        setAiOutputMode(activeAiMode);
        setNotice(`AI service unavailable (${errText(error)}). Created an editable worksheet template instead; it is not AI-generated.`);
      } else if (activeAiMode === "lesson" || activeAiMode === "revision") {
        setAiOutput(buildOfflineTeachingPlan({
          mode: activeAiMode,
          className: activeClass,
          subject: aiSubject,
          chapter: aiChapter,
          syllabus: offlineSyllabus,
          instructions: aiInstructions,
          duration: aiDuration,
          classSize: aiClassSize,
          materials: aiMaterials
        }));
        setAiOutputMode(activeAiMode);
        setNotice(`AI service unavailable (${errText(error)}). Created an editable lesson/revision template instead; verify it against your syllabus.`);
      } else if (activeAiMode === "gameideas") {
        setAiOutput(buildOfflineTeachingPlan({
          mode: activeAiMode,
          className: activeClass,
          subject: aiSubject,
          chapter: aiChapter,
          syllabus: offlineSyllabus,
          instructions: aiInstructions,
          duration: aiDuration,
          classSize: aiClassSize,
          materials: aiMaterials
        }));
        setAiOutputMode(activeAiMode);
        setNotice(`AI service unavailable (${errText(error)}). Created a playable game pack template instead; verify card content against the syllabus.`);
      } else {
        setNotice(`No AI response (${errText(error)}). Check the deployed teacherdesk-ai function and its provider configuration.`);
      }
    } finally { setAiBusy(false); }

  }

  async function saveCalendarItem(e) {
    e.preventDefault();
    if (!calendarTitle.trim()) return setCalendarError("Add a title for this calendar item.");
    if (calendarEndTime && (!calendarStartTime || calendarEndTime <= calendarStartTime)) {
      return setCalendarError("Choose an end time later than the start time.");
    }

    setCalendarBusy(true);
    setCalendarError("");
    try {
      const item = {
        class_name: activeClass,
        item_type: calendarItemType,
        title: calendarTitle.trim(),
        subject: calendarItemType === "lesson" ? calendarSubject : null,
        notes: calendarNotes.trim() || null,
        lesson_plan: calendarItemType === "lesson" ? calendarLessonPlan.trim() || null : null,
        event_date: calendarItemType === "event" ? calendarDate : null,
        weekday: calendarItemType === "lesson" ? Number(calendarWeekday) : null,
        start_time: calendarStartTime || null,
        end_time: calendarEndTime || null,
        created_by: sessionUser.id
      };
      const { data, error } = await supabase.from("class_calendar_items").insert(item).select().single();
      if (error) throw error;
      setCalendarItems(old => [...old, data]);
      if (calendarItemType === "event") setCalendarMonth(new Date(`${calendarDate}T12:00:00`));
      setCalendarTitle("");
      setCalendarNotes("");
      setCalendarLessonPlan("");
      setCalendarStartTime("");
      setCalendarEndTime("");
      setNotice(`${calendarItemType === "lesson" ? "Weekly lesson" : "Class event"} added to ${activeClass}'s calendar.`);
    } catch (error) {
      setCalendarError(`Could not save calendar item: ${errText(error)}. Confirm the class calendar migration has been applied.`);
    } finally {
      setCalendarBusy(false);
    }
  }

  async function deleteCalendarItem(item) {
    if (!window.confirm(`Delete "${item.title}" from the ${activeClass} calendar?`)) return;

    setCalendarBusy(true);
    setCalendarError("");
    try {
      const { error } = await supabase.from("class_calendar_items").delete().eq("id", item.id);
      if (error) throw error;
      setCalendarItems(old => old.filter(calendarItem => !sameId(calendarItem.id, item.id)));
      setNotice("Calendar item deleted.");
    } catch (error) {
      setCalendarError(`Could not delete calendar item: ${errText(error)}.`);
    } finally {
      setCalendarBusy(false);
    }
  }


  async function deleteStudent(student) {

    if (!window.confirm(`Delete ${student.name} (roll ${student.roll_number}) and their saved attendance/marks? This cannot be undone.`)) return;

    setBusy(true);

    try {

      const at = await supabase.from("attendance").delete().eq("student_id", student.id);

      if (at.error) throw at.error;

      const mk = await supabase.from("marks").delete().eq("student_id", student.id);

      if (mk.error) throw mk.error;

      const st = await supabase.from("students").delete().eq("id", student.id);

      if (st.error) throw st.error;

      setStudents(old => old.filter(s => !sameId(s.id, student.id)));

      setAttendance(old => old.filter(a => !sameId(a.student_id, student.id)));

      setMarks(old => old.filter(m => !sameId(m.student_id, student.id)));

      setNotice(`Deleted ${student.name} and their associated attendance/marks.`);

    } catch (err) {

      setNotice("Could not finish deleting the student: " + (err?.message || "database permission or relationship error") + ". Check your Supabase row-level security policies.");

    } finally { setBusy(false); }

  }



  function studentSubjectMarks(student, subject) {

    const getScore = type => {

      const test = latestAssessment(assessments, student.class_name, subject, type, effectiveReportDate === "latest" ? null : effectiveReportDate);

      if (!test) return null;

      const mark = marks.find(m => sameId(m.student_id, student.id) && sameId(m.assessment_id, test.id));

      return mark?.score == null ? null : Number(mark.score);

    };

    const unit = getScore("Unit Test");

    const main = getScore("Main Exam");

    return { unit, main, final: examFinal(unit, main) };

  }



  function reportFor(student) {

    const subject = name => studentSubjectMarks(student, name);

    const averageGroup = names => {

      const values = names.map(name => subject(name).final).filter(v => v != null);

      return values.length ? roundUp(values.reduce((a,b) => a+b,0) / values.length) : null;

    };

    const hcg = averageGroup(["History", "Geography"]);

    const science = averageGroup(["Physics", "Chemistry", "Biology"]);

    const hindi = averageGroup(["Hindi Language", "Hindi Literature"]);

    const english = averageGroup(["English Language", "English Literature"]);

    const maths = subject("Maths").final;

    const graded = subject("Marathi / Hindi Graded").final;

    const report = [

      ["HCG", hcg], ["Science", science], ["Maths", maths],

      ["Hindi", hindi], ["English", english], ["Marathi / Hindi Graded", graded]

    ];

    const available = report.map(x => x[1]).filter(x => x != null);

    return { report, average: available.length ? roundUp(available.reduce((a,b) => a+b,0)/available.length) : null };

  }



  function attendanceSummary(student) {
    const days = attendance.filter(a => sameId(a.student_id, student.id));
    const present = days.filter(a => attendanceStatusKey(a.status) === "present").length;
    const absent = days.filter(a => attendanceStatusKey(a.status) === "absent").length;
    const recorded = present + absent;
    return { present, absent, recorded, percent: recorded ? Math.round(present / recorded * 100) : 0 };
  }


  const visibleStudents = students.filter(s => (isAdmin || s.class_name === activeClass) &&

    `${s.name} ${s.roll_number} ${s.class_name}`.toLowerCase().includes(studentSearch.toLowerCase()))

    .sort((a,b) => String(a.name).localeCompare(String(b.name), undefined, {sensitivity:"base"}));

  const reportStudents = isAdmin ? students.filter(s => s.class_name === reportClass) : classStudents;
  const reportTarget = students.find(s => sameId(s.id, reportStudent) && (isAdmin ? s.class_name === reportClass : s.class_name === activeClass)) || reportStudents[0] || classStudents[0];

  const studentHistory = students.find(s => sameId(s.id, selectedStudent));



  if (authLoading) return <div className="app-shell loading">Loading TeacherDesk…</div>;

  if (passwordRecovery) return (
    <div className="login-screen">
      <div className="login-card">
        <div className="brand-icon">T</div><p className="eyebrow">ACCOUNT RECOVERY</p>
        <h1>Choose a new password</h1>
        <form onSubmit={updateRecoveredPassword}>
          <label>New password<input type="password" value={password} onChange={event=>setPassword(event.target.value)} required minLength={6} autoComplete="new-password"/></label>
          <button className="primary-btn" disabled={authBusy}>{authBusy?"Updating…":"Update password"}</button>
        </form>
        {authMsg&&<p role="alert" className="notice">{authMsg}</p>}
      </div>
    </div>
  );

  if (!sessionUser) return (

    <div className="login-screen">

      <div className="login-card">

        <div className="brand-icon">T</div><p className="eyebrow">TEACHER WORKSPACE</p>

        <h1>TeacherDesk</h1><p className="muted">Your classroom, organized.</p>

        <form onSubmit={authSubmit}>

          <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" /></label>

          {authMode!=="reset"&&<label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete={authMode==="login"?"current-password":"new-password"} minLength={6} /></label>}

          {authMode === "signup" && <label>Your class<select value={signupClass} onChange={e=>setSignupClass(e.target.value)}>{CLASSES.map(c=><option key={c}>{c}</option>)}</select></label>}

          <button className="primary-btn" disabled={authBusy}>{authBusy ? "Please wait…" : authMode==="login" ? "Sign in" : authMode==="signup" ? "Create teacher account" : "Send password reset link"}</button>

        </form>

        {authMsg && <p role="status" className="notice">{authMsg}</p>}

        {authMode==="login"&&<button type="button" className="text-btn" onClick={()=>{setAuthMode("reset");setAuthMsg("");}}>Forgot password?</button>}
        <button className="text-btn" onClick={()=>{setAuthMode(authMode==="signup"||authMode==="reset"?"login":"signup");setAuthMsg("");}}>{authMode==="signup"?"Already registered? Sign in":authMode==="reset"?"Back to sign in":"New teacher? Create an account"}</button>

        <p className="tiny-note">Your class is saved to your teacher profile. The administrator demo uses the designated account.</p>

      </div>

    </div>

  );



  return <div className="app-shell">

    <aside className="sidebar">

      <div className="brand"><div className="brand-icon">T</div><div><strong>TeacherDesk</strong><small>{isAdmin ? "ADMIN DEMO" : "TEACHER WORKSPACE"}</small></div></div>

      {!isAdmin && <div className="teacher-class">Assigned class <strong>{teacherClass || "Not configured"}</strong></div>}

      <div className="nav-label">WORKSPACE</div>

      <nav>{MENU.map(item=><button key={item} className={`nav-item ${page===item?"active":""}`} onClick={()=>{setPage(item);setNotice("");}}>{item==="Dashboard"?"⌂":item==="Students"?"♙":item==="Attendance"?"✓":item==="Attendance Summary"?"◷":item==="Assessments"?"▤":item==="Calendar"?"▦":item==="AI Studio"?"✦":item==="Learning Signals"?"↗":"▧"} <span>{item}</span>{item==="Students"&&<b>{isAdmin?students.length:classStudents.length}</b>}</button>)}</nav>

      <div className="sidebar-bottom"><div className="avatar">{isAdmin?"AD":"T"}</div><div><strong>{isAdmin?"Administrator":"Teacher"}</strong><small>{sessionUser.email}</small></div></div>

      <button className="nav-item logout" onClick={logout}>↪ <span>Sign out</span></button>

    </aside>

    <main className="main">

      <header className="topbar"><div>Workspace <span>/</span> {page}</div><div className="top-right"><span className="status-dot"/> Signed in <span className="class-pill">{activeClass}</span></div></header>

      <div className="content">

        {notice&&<div className="notice">{notice}<button onClick={()=>setNotice("")}>×</button></div>}

        {busy&&<p className="muted">Working…</p>}

        {isAdmin&&<div className="class-switch"><label>Demo class<select value={classChoice} onChange={e=>{setClassChoice(e.target.value);setAssessmentClass(e.target.value);setReportClass(e.target.value);}}>{CLASSES.map(c=><option key={c}>{c}</option>)}</select></label><span className="muted">Admin demo can switch classes. Teachers stay in their assigned class.</span></div>}

        <div className="page-heading"><div><div className="eyebrow">TEACHER WORKSPACE</div><h1>{page}</h1><p>{page==="Attendance"?"Daily class register — changes are saved for the selected date.":page==="Assessments"?"Unit tests /30 and main exams /80, organized by subject.":page==="Report Cards"?"Calculated subject averages, rounded up to whole marks.":page==="Attendance Summary"?"Each student's saved attendance history and total out of 90.":page==="Calendar"?"Plan repeating class lessons and one-off school events.":"Manage students, marks and classroom records."}</p></div>

          {["Dashboard","Students"].includes(page)&&<button className="primary-btn" onClick={()=>setShowStudentForm(v=>!v)}>＋ Add student</button>}

        </div>

        {showStudentForm&&<form className="panel form-grid" onSubmit={addStudent}><h3>Add student</h3><label>Full name<input value={newStudent.name} onChange={e=>setNewStudent({...newStudent,name:e.target.value})} required/></label><label>Roll number (optional)<input value={newStudent.roll} onChange={e=>setNewStudent({...newStudent,roll:e.target.value})} placeholder="Auto-number if blank"/></label>{isAdmin&&<label>Class<select value={newStudent.className} onChange={e=>setNewStudent({...newStudent,className:e.target.value})}>{CLASSES.map(c=><option key={c}>{c}</option>)}</select></label>}<button className="primary-btn" disabled={busy}>Save student</button><button type="button" className="secondary-btn" onClick={()=>setShowStudentForm(false)}>Cancel</button></form>}

        {page==="Dashboard"&&<><div className="stats-grid"><Stat label="Students in class" value={classStudents.length}/><Stat label="Present today" value={`${presentToday}/${classStudents.length}`}/><Stat label="Attendance records" value={attendance.filter(a=>classStudents.some(s=>sameId(s.id,a.student_id))).length}/></div><div className="panel"><h2>Quick actions</h2><div className="quick-grid">{["Students","Attendance","Attendance Summary","Assessments","Report Cards","Calendar","AI Studio","Learning Signals"].map(p=><button className="action-row" key={p} onClick={()=>setPage(p)}>{p} →</button>)}</div></div></>}

        {page==="Students"&&<div className="panel"><div className="table-toolbar"><h2>Students — {activeClass}</h2><input placeholder="Search name or roll no." value={studentSearch} onChange={e=>setStudentSearch(e.target.value)}/></div><div className="table-wrap"><table><thead><tr><th>ROLL NO.</th><th>STUDENT NAME</th><th>CLASS</th><th>ATTENDANCE</th><th>ACTIONS</th></tr></thead><tbody>{visibleStudents.map(s=><tr key={s.id}><td>{s.roll_number}</td><td>{s.name}</td><td>{s.class_name}</td><td>{attendanceSummary(s).present}/90 present · {attendanceSummary(s).percent}% of recorded days</td><td><button className="danger-btn" disabled={busy} onClick={()=>deleteStudent(s)}>Delete</button></td></tr>)}{!visibleStudents.length&&<tr><td colSpan="5" className="empty">No students yet. Use Add student.</td></tr>}</tbody></table></div></div>}

        {page==="Attendance"&&<div className="panel"><div className="section-heading"><div><h2>Daily attendance register</h2><p>Present and Absent choices save immediately. Use Mark all and Save register to save a whole-class update.</p></div><span className="pill">{presentToday} present</span></div><div className="form-row"><label>Date<input type="date" value={attDate} onChange={e=>setAttDate(e.target.value)}/></label><button className="secondary-btn" disabled={busy} onClick={()=>setAttDraft(Object.fromEntries(classStudents.map(s=>[s.id,"Present"])))}>Mark all present</button><button className="secondary-btn" disabled={busy} onClick={()=>setAttDraft(Object.fromEntries(classStudents.map(s=>[s.id,"Absent"])))}>Mark all absent</button><button className="secondary-btn" onClick={()=>csvDownload(`Attendance-${activeClass}-${attDate}.csv`,[["Date","Roll No","Name","Class","Status"],...classStudents.map(s=>[attDate,s.roll_number,s.name,s.class_name,attDraft[s.id]||"Not marked"])])}>Export CSV</button></div><div className="table-wrap"><table><thead><tr><th>ROLL NO.</th><th>STUDENT NAME</th><th>PRESENT</th><th>ABSENT</th><th>STATUS</th></tr></thead><tbody>{classStudents.map(s=><tr key={s.id}><td>{s.roll_number}</td><td>{s.name}</td><td><button className={`attendance-choice present ${attDraft[s.id]==="Present"?"chosen":""}`} disabled={busy} onClick={()=>saveAttendanceChoice(s,"present")}>Present</button></td><td><button className={`attendance-choice absent ${attDraft[s.id]==="Absent"?"chosen":""}`} disabled={busy} onClick={()=>saveAttendanceChoice(s,"absent")}>Absent</button></td><td>{attDraft[s.id]||"Not marked"}</td></tr>)}{!classStudents.length&&<tr><td colSpan="5" className="empty">Add students to this class first.</td></tr>}</tbody></table></div><div className="save-bar"><span className="muted">Use Mark all then Save register to record everyone together. Saved history is never reset.</span><button className="primary-btn" disabled={busy||!classStudents.length} onClick={saveAttendance}>Save register</button></div></div>}

        {page==="Attendance Summary"&&<div className="panel"><div className="section-heading"><div><h2>Attendance summary</h2><p>90-day view is a target; saved school-day records are counted. Unrecorded days are not marked absent automatically.</p></div><button className="secondary-btn" onClick={()=>csvDownload(`Attendance-summary-${activeClass}.csv`,[["Roll","Student","Present","Absent","Days recorded","Present %"],...classStudents.map(s=>{const x=attendanceSummary(s);return[s.roll_number,s.name,x.present,x.absent,x.recorded,x.percent+"%"]})])}>Export summary</button></div><div className="table-wrap"><table><thead><tr><th>ROLL</th><th>STUDENT</th><th>PRESENT / 90</th><th>ABSENT</th><th>DAYS RECORDED</th><th>ATTENDANCE %</th><th>HISTORY</th></tr></thead><tbody>{classStudents.map(s=>{const x=attendanceSummary(s);return <tr key={s.id}><td>{s.roll_number}</td><td>{s.name}</td><td>{x.present}/90</td><td>{x.absent}</td><td>{x.recorded}</td><td>{x.percent}%</td><td><button className="text-btn" onClick={()=>{setSelectedStudent(String(s.id));setPage("Student Attendance");}}>View dates →</button></td></tr>})}</tbody></table></div></div>}

        {page==="Student Attendance"&&<div className="panel"><label>Student<select value={selectedStudent} onChange={e=>setSelectedStudent(e.target.value)}>{classStudents.map(s=><option key={s.id} value={s.id}>{s.roll_number} — {s.name}</option>)}</select></label>{studentHistory&&<><h2>{studentHistory.name}</h2><p>Present {attendanceSummary(studentHistory).present}/90 · Absent {attendanceSummary(studentHistory).absent} · {attendanceSummary(studentHistory).percent}% of recorded days</p><div className="table-wrap"><table><thead><tr><th>DATE</th><th>STATUS</th></tr></thead><tbody>{attendance.filter(a=>sameId(a.student_id,studentHistory.id)).sort((a,b)=>b.attendance_date.localeCompare(a.attendance_date)).map(a=><tr key={a.id}><td>{a.attendance_date}</td><td>{a.status}</td></tr>)}</tbody></table></div></>}</div>}

        {page==="Assessments"&&<><div className="panel"><h2>Set up a test</h2><p className="muted">The two standard exams are created for you: Unit Test /30 and Main Exam /80.</p><form className="form-grid" onSubmit={createTest}><label>Subject<select value={assessmentSubject} onChange={e=>setAssessmentSubject(e.target.value)}>{SUBJECTS.map(s=><option key={s.name}>{s.name}</option>)}<option>Marathi</option></select></label><label>Exam<select value={assessmentType} onChange={e=>setAssessmentType(e.target.value)}><option>Unit Test</option><option>Main Exam</option></select></label>{isAdmin&&<label>Class<select value={assessmentClass} onChange={e=>setAssessmentClass(e.target.value)}>{CLASSES.map(c=><option key={c}>{c}</option>)}</select></label>}<p className="exam-max">Maximum marks: <strong>{assessmentType==="Unit Test"?30:80}</strong></p><button className="primary-btn" disabled={busy}>Create this subject exam</button></form></div><div className="panel"><h2>Enter marks</h2><label>Exam<select value={selectedAssessment} onChange={e=>setSelectedAssessment(e.target.value)}>{testsForClass.map(t=><option key={t.id} value={t.id}>{t.subject} — {t.exam_type||t.title} (/{t.max_marks})</option>)}</select></label>{selectedTest&&<form onSubmit={saveMarks}><h3>{selectedTest.subject} · {selectedTest.exam_type||selectedTest.title} · /{selectedTest.max_marks}</h3><div className="table-wrap"><table><thead><tr><th>ROLL</th><th>STUDENT</th><th>MARKS / {selectedTest.max_marks}</th></tr></thead><tbody>{classStudents.map(s=><tr key={s.id}><td>{s.roll_number}</td><td>{s.name}</td><td><input className="mark-input" type="number" min="0" max={selectedTest.max_marks} step="any" value={markDraft[s.id]??""} onChange={e=>setMarkDraft(d=>({...d,[s.id]:e.target.value}))}/></td></tr>)}</tbody></table></div><button className="primary-btn" disabled={busy}>Save marks</button></form>}</div><div className="panel"><h2>Created exams</h2><div className="table-wrap"><table><thead><tr><th>SUBJECT</th><th>EXAM</th><th>CLASS</th><th>MAXIMUM</th></tr></thead><tbody>{assessments.filter(a=>isAdmin||a.class_name===activeClass).map(a=><tr key={a.id}><td>{a.subject}</td><td>{a.exam_type||a.title}</td><td>{a.class_name}</td><td>{a.max_marks}</td></tr>)}</tbody></table></div></div></>}

        {page==="Calendar"&&<>
          <div className="panel">
            <div className="section-heading"><div><h2>Class calendar · {activeClass}</h2><p>Schedule weekly lessons and dated events. Attach a systematic teaching outline to each recurring lesson.</p></div><span className="pill">Class schedule</span></div>
            {currentCalendarError&&<div className="calendar-error" role="alert">{currentCalendarError}<p>Apply the class calendar SQL migration in <code>supabase/migrations</code>, then reload this page.</p></div>}
            <form className="calendar-form" onSubmit={saveCalendarItem}>
              <label>What are you adding?
                <select value={calendarItemType} onChange={event=>setCalendarItemType(event.target.value)}>
                  <option value="lesson">Weekly lesson</option>
                  <option value="event">One-off class event</option>
                </select>
              </label>
              <label>Title<input value={calendarTitle} onChange={event=>setCalendarTitle(event.target.value)} maxLength="120" placeholder={calendarItemType==="lesson"?"e.g. Algebra — linear equations":"e.g. Teachers’ Day celebration"} required/></label>
              {calendarItemType==="lesson"
                ? <label>Subject<select value={calendarSubject} onChange={event=>setCalendarSubject(event.target.value)}>{SUBJECTS.map(subject=><option key={subject.name}>{subject.name}</option>)}</select></label>
                : <label>Event date<input type="date" value={calendarDate} onChange={event=>setCalendarDate(event.target.value)} required/></label>}
              {calendarItemType==="lesson"&&<label>Repeats every
                <select value={calendarWeekday} onChange={event=>setCalendarWeekday(event.target.value)}>
                  {WEEKDAYS.map((weekday,index)=><option key={weekday} value={String((index+1)%7)}>{weekday}</option>)}
                </select>
              </label>}
              <label>Starts at<input type="time" value={calendarStartTime} onChange={event=>setCalendarStartTime(event.target.value)}/></label>
              <label>Ends at<input type="time" value={calendarEndTime} onChange={event=>setCalendarEndTime(event.target.value)}/></label>
              <label className="calendar-notes">Notes<textarea value={calendarNotes} onChange={event=>setCalendarNotes(event.target.value)} rows="2" placeholder="Room, materials, reminders, or lesson objective"/></label>
              {calendarItemType==="lesson"&&<>
                <label className="calendar-plan">Systematic lesson plan<textarea value={calendarLessonPlan} onChange={event=>setCalendarLessonPlan(event.target.value)} rows="8" placeholder={"Paste a verified plan here, or build one in AI Studio and use the button below.\n\nSuggested structure:\n1. Learning objectives\n2. Materials and preparation\n3. Timed teaching steps\n4. Student practice / activity\n5. Check for understanding and exit ticket"} /></label>
                <button type="button" className="secondary-btn calendar-use-ai" disabled={aiOutputMode!=="lesson"||!aiOutput} onClick={()=>setCalendarLessonPlan(aiOutput)}>Use latest lesson draft</button>
              </>}
              <button className="primary-btn" disabled={calendarBusy||calendarLoading}>{calendarBusy?"Saving…":"Add to class calendar"}</button>
            </form>
          </div>

          <div className="panel calendar-panel">
            <div className="section-heading calendar-month-heading">
              <h2>{calendarMonth.toLocaleDateString("en", { month:"long", year:"numeric" })}</h2>
              <div className="calendar-controls">
                <button className="secondary-btn" onClick={()=>setCalendarMonth(month=>new Date(month.getFullYear(),month.getMonth()-1,1))} aria-label="Previous month">←</button>
                <button className="secondary-btn" onClick={()=>setCalendarMonth(new Date())}>Today</button>
                <button className="secondary-btn" onClick={()=>setCalendarMonth(month=>new Date(month.getFullYear(),month.getMonth()+1,1))} aria-label="Next month">→</button>
              </div>
            </div>
            {calendarLoading&&<p className="muted" role="status">Loading class calendar…</p>}
            {currentCalendarError&&<p className="calendar-empty">Calendar data could not be loaded for {activeClass}.</p>}
            {!calendarLoading&&!currentCalendarError&&<div className="calendar-scroll">
              <div className="calendar-grid">
                {WEEKDAYS.map(day=><div className="calendar-weekday" key={day}>{day}</div>)}
                {calendarDays.map(day=>{
                  const key=dateKey(day);
                  const items=calendarItemsByDate.get(key)||[];
                  return <div className={`calendar-day ${day.getMonth()===calendarMonth.getMonth()?"":"outside-month"} ${key===localDate()?"today":""}`} key={key}>
                    <span className="calendar-day-number">{day.getDate()}</span>
                    <div className="calendar-day-items">
                      {items.map(item=><div className={`calendar-item ${item.item_type}`} key={`${key}-${item.id}`}>
                        <strong>{item.start_time?item.start_time.slice(0,5)+" ":""}{item.title}</strong>
                        <small>{item.item_type==="lesson"?(item.subject||"Weekly lesson"):"Class event"}{item.end_time?` · until ${item.end_time.slice(0,5)}`:""}</small>
                        {item.notes&&<small className="calendar-item-notes">{item.notes}</small>}
                        <button type="button" className="calendar-delete" onClick={()=>deleteCalendarItem(item)} disabled={calendarBusy} aria-label={`Delete ${item.title}`}>×</button>
                      </div>)}
                    </div>
                  </div>;
                })}
              </div>
            </div>}
            {!calendarLoading&&!currentCalendarError&&!calendarItems.length&&<p className="calendar-empty">Nothing scheduled for {activeClass} yet. Add a weekly lesson or a one-off event above.</p>}
            {!calendarLoading&&!currentCalendarError&&calendarItems.some(item=>item.item_type==="lesson")&&<section className="calendar-weekly-plans" aria-label="Weekly lesson plans">
              <div className="section-heading"><div><h3>Weekly teaching plans</h3><p>Recurring lessons are listed once here. Open a lesson to review its attached plan.</p></div></div>
              {[...calendarItems]
                .filter(item=>item.item_type==="lesson")
                .sort((a,b)=>Number(a.weekday)-Number(b.weekday)||String(a.start_time||"").localeCompare(String(b.start_time||""))||a.title.localeCompare(b.title))
                .map(item=><details className="calendar-plan-card" key={`plan-${item.id}`}>
                  <summary><span>{["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][Number(item.weekday)]} · {item.start_time?item.start_time.slice(0,5)+" · ":""}{item.title}</span><small>{item.subject||"Weekly lesson"}{item.end_time?` · until ${item.end_time.slice(0,5)}`:""}</small></summary>
                  {item.notes&&<p className="calendar-item-notes">{item.notes}</p>}
                  {item.lesson_plan?<pre>{item.lesson_plan}</pre>:<p className="calendar-empty">No outline is attached. Add the outline when creating this weekly lesson.</p>}
                </details>)}
            </section>}
          </div>
        </>}

        {page==="AI Studio"&&<>

          <div className="panel"><div className="section-heading"><div><h2>TeacherDesk AI Studio</h2><p>Generate editable teaching materials from the syllabus you provide. Requests and attached files are sent to the configured AI provider (OpenRouter). Do not include student names, records, or confidential material. Always verify results before using.</p></div><span className="pill">Secure server-side AI</span></div>

            <div className="form-grid ai-mode-row"><label>Tool<select value={aiMode} onChange={e=>{setAiMode(e.target.value);setAiOutput("");}}><option value="worksheet">Worksheet Studio</option><option value="lesson">Lesson & Activity Planner</option><option value="revision">Class revision plan</option><option value="gameideas">Game-based learning ideas</option><option value="papercheck">PaperCheck — suggest marks</option></select></label><label>Subject<select value={aiSubject} onChange={e=>setAiSubject(e.target.value)}>{SUBJECTS.map(s=><option key={s.name}>{s.name}</option>)}</select></label><label>Class<input value={activeClass} readOnly/></label></div>

            {aiMode!=="papercheck"?<form onSubmit={generateTeachingContent} className="ai-form">

              <label>Chapter / topic<input value={aiChapter} onChange={e=>setAiChapter(e.target.value)} placeholder="e.g. Cell — The Unit of Life" required/></label>

              <label>Exact syllabus / textbook points<textarea value={aiSyllabus} onChange={e=>setAiSyllabus(e.target.value)} placeholder="Paste syllabus points here, or add files below." rows="4" required={teachingFiles.length===0}/></label>
              {teachingDropzone}

              {["lesson","revision","gameideas"].includes(aiMode)&&teachingSetupFields}

              {aiMode==="worksheet"&&<><label>Question types (comma separated)<input value={aiQuestionTypes.join(", ")} onChange={e=>setAiQuestionTypes(e.target.value.split(",").map(x=>x.trim()).filter(Boolean))} placeholder="MCQs, case study, match columns, give reasons"/></label><div className="form-grid"><label>Number of questions<input type="number" min="1" max="30" value={aiCount} onChange={e=>setAiCount(e.target.value)}/></label><label className="check-label"><input type="checkbox" checked={aiAnswerKey} onChange={e=>setAiAnswerKey(e.target.checked)}/> Include answer key</label></div></>}

              <label>Extra instructions (optional)<textarea value={aiInstructions} onChange={e=>setAiInstructions(e.target.value)} placeholder="Difficulty, marks, ICSE question style, time limit…" rows="2"/></label>

              <button className="primary-btn" disabled={aiBusy||filesBusy}>{filesBusy?"Reading files…":aiBusy?"Generating…":aiMode==="lesson"?"Build lesson plan":aiMode==="revision"?"Build revision plan":"Generate worksheet"}</button>

            </form>:<form onSubmit={generateTeachingContent} className="ai-form"><label>Question / task<input value={paperQuestion} onChange={e=>setPaperQuestion(e.target.value)} placeholder="Paste the exam question" required/></label><label>Teacher's marking scheme<textarea value={paperScheme} onChange={e=>setPaperScheme(e.target.value)} rows="4" placeholder="Expected points, marks per point, acceptable alternatives" required/></label><label>Student answer<textarea value={paperAnswer} onChange={e=>setPaperAnswer(e.target.value)} rows="5" placeholder="Paste or type the answer (avoid student names or personal data)" required/></label><p className="muted">PaperCheck only suggests marks and feedback. It can be wrong; the teacher must make the final decision.</p><button className="primary-btn" disabled={aiBusy}>{aiBusy?"Reviewing…":"Suggest marks & feedback"}</button></form>}

          </div>

        </>}

        {page==="Learning Signals"&&<div className="panel">
          <div className="section-heading"><div><h2>Class signals · {activeClass}</h2><p>Evidence from saved marks and attendance. These are class-level trends, not individual skill diagnoses.</p></div></div>
          <div className="signal-stats">
            <div className="signal-stat"><span>Students in class</span><strong>{classStudents.length}</strong><small>Current class roster</small></div>
            <div className="signal-stat"><span>Class attendance</span><strong>{classAttendanceAverage == null ? "—" : `${classAttendanceAverage}%`}</strong><small>{studentsWithAttendance.length} students with saved attendance</small></div>
            <div className="signal-stat"><span>Subjects with marks</span><strong>{learningSignalData.length}/{SUBJECTS.length}</strong><small>Based on saved assessment scores</small></div>
          </div>
          <div className="signal-subjects">
            <div className="section-heading"><div><h3>Recorded subject trends</h3><p>Average percentage across saved marks; not a syllabus-skill score.</p></div>
              {!learningSignalData.length&&<button className="secondary-btn" onClick={()=>setPage("Assessments")}>Enter marks first →</button>}
            </div>
            {learningSignalData.length ? learningSignalData.map((signal, index) => <div className="signal-subject" key={signal.subject}>
              <div className="signal-subject-heading"><strong>{signal.subject}</strong><span>{signal.average}% average · {signal.recordedScores} saved {signal.recordedScores === 1 ? "score" : "scores"}</span></div>
              <div className="signal-track"><span className={index === 0 ? "focus" : ""} style={{ width: `${signal.average}%` }} /></div>
              <button className="text-btn" onClick={()=>{setAiSubject(signal.subject);setAiChapter("");setAiSyllabus("");setAiInstructions(`Class trend: ${signal.subject} has a ${signal.average}% average across ${signal.recordedScores} saved scores. Use this only as a class-level prompt; do not infer individual learners or invent syllabus content. Ask the teacher to provide the exact topic and learning points.`);document.getElementById("signal-activity-form")?.scrollIntoView({behavior:"smooth",block:"center"});}}>Plan practice for {signal.subject} ↓</button>
            </div>) : <p className="signal-empty">No marks have been saved for this class yet. Enter assessment marks to see class trends here.</p>}
          </div>
          <div className="signal-game-lab" id="signal-activity-form">
            <div className="section-heading"><div><h2>Turn a signal into an activity</h2><p>Share the exact topic or syllabus points. We’ll use the class trends as context while keeping student identities out of the request.</p></div><span className="pill">Teacher-reviewed</span></div>
          <form className="ai-form" onSubmit={e=>{setAiMode("gameideas");generateTeachingContent(e,"gameideas");}}>
            <label>Subject<select value={aiSubject} onChange={e=>setAiSubject(e.target.value)}>{SUBJECTS.map(s=><option key={s.name}>{s.name}</option>)}</select></label>
            <label>Chapter / topic<input value={aiChapter} onChange={e=>setAiChapter(e.target.value)} placeholder="e.g. French Revolution, cells, trigonometry" /></label>
            <label>What should students learn?<textarea value={aiSyllabus} onChange={e=>setAiSyllabus(e.target.value)} rows="4" placeholder="Paste exact syllabus points here, if available." /></label>
            {teachingDropzone}
           {teachingSetupFields}
           <label>Classroom constraints (optional)<textarea value={aiInstructions} onChange={e=>setAiInstructions(e.target.value)} rows="2" placeholder="e.g. no phones, 35 students, 10 minutes, only paper and board" /></label>
           <button className="primary-btn" disabled={aiBusy||filesBusy}>{filesBusy?"Reading files…":aiBusy?"Building ideas…":"Create game-based lesson ideas"}</button>
          </form>
          <p className="muted">AI output uses your supplied syllabus and constraints. If the AI service is unavailable, TeacherDesk provides a playable offline game-pack template without inventing subject facts. Review and verify all materials before class.</p>
          </div>
        </div>}

        {["AI Studio", "Learning Signals"].includes(page) && aiOutput && <div className="panel ai-output"><div className="section-heading"><h2>{page === "Learning Signals" ? "Game-based lesson ideas" : "Generated draft"}</h2><div><button className="secondary-btn" onClick={()=>navigator.clipboard?.writeText(aiOutput).then(()=>setNotice("Draft copied."),()=>setNotice("Copy failed; select the text manually."))}>Copy</button> <button className="secondary-btn" onClick={()=>window.print()}>Print</button></div></div><textarea className="ai-editable-output" aria-label="Editable generated draft" value={aiOutput} onChange={e=>setAiOutput(e.target.value)} rows={22} /><p className="muted">This is a draft. Check facts and syllabus coverage before using it in class.</p></div>}

        {page==="Report Cards"&&<div className="panel">
          <div className="section-heading">
            <div><h2>Final report card</h2><p>Unit /30 + Main /80. Subject result = 100 − marks lost in both exams. Combined subjects are averaged and rounded up. The newest attempt on or before the selected date is used for each exam.</p></div>
            <button className="secondary-btn" onClick={()=>csvDownload("TeacherDesk-Report-Cards.csv",[
              ["Roll","Student","Class","Exam records through", "HCG","Science","Maths","Hindi","English","Graded","Average"],
              ...reportStudents.map(student=>{
                const result=reportFor(student);
                return [student.roll_number,student.name,student.class_name,effectiveReportDate==="latest"?"Latest":effectiveReportDate,...result.report.map(item=>item[1]??"—"),result.average??"—"];
              })
            ])}>Export report cards</button>
          </div>
          {isAdmin&&<label>Class<select value={reportClass} onChange={event=>{setReportClass(event.target.value);setReportStudent("");}}>{CLASSES.map(className=><option key={className}>{className}</option>)}</select></label>}
          <label>Exam records through
            <select value={effectiveReportDate} onChange={event=>setReportAssessmentDate(event.target.value)}>
              <option value="latest">Latest available attempts</option>
              {reportAssessmentDates.map(date=><option key={date} value={date}>{new Date(`${date}T12:00:00`).toLocaleDateString()}</option>)}
            </select>
          </label>
          <label>Select student<select value={reportStudent||reportTarget?.id||""} onChange={event=>setReportStudent(event.target.value)}>{reportStudents.map(student=><option key={student.id} value={student.id}>{student.name} · Roll {student.roll_number}</option>)}</select></label>
          {reportTarget&&(()=>{const result=reportFor(reportTarget);return <div className="report-card">
            <div className="report-head"><div><p className="eyebrow">STUDENT REPORT CARD</p><h2>{reportTarget.name}</h2><p>Class {reportTarget.class_name} · Roll {reportTarget.roll_number} · {effectiveReportDate==="latest"?"Latest attempts":`Through ${effectiveReportDate}`}</p></div><div className="report-total"><small>Overall average</small><strong>{result.average==null?"—":`${result.average}/100`}</strong></div></div>
            <div className="table-wrap"><table><thead><tr><th>REPORT SUBJECT</th><th>FINAL MARK / 100</th><th>STATUS</th></tr></thead><tbody>{result.report.map(([name,score])=><tr key={name}><td>{name}</td><td>{score==null?"Marks incomplete":`${score}/100`}</td><td>{score==null?"Pending":score>=35?"Recorded":"Review"}</td></tr>)}</tbody></table></div>
            <h3>Component marks (not printed as separate report subjects)</h3>
            <div className="table-wrap"><table><thead><tr><th>SUBJECT</th><th>UNIT /30</th><th>MAIN /80</th><th>SUBJECT RESULT /100</th></tr></thead><tbody>{SUBJECTS.filter(subject=>subject.name!=="Marathi / Hindi Graded").map(subject=>{const marksForSubject=studentSubjectMarks(reportTarget,subject.name);return <tr key={subject.name}><td>{subject.name}</td><td>{marksForSubject.unit??"—"}</td><td>{marksForSubject.main??"—"}</td><td>{marksForSubject.final??"Pending"}</td></tr>})}</tbody></table></div>
          </div>})()}
        </div>}

      </div>

    </main>

  </div>;

}



function Stat({label,value}) { return <div className="stat-card"><div className="stat-label">{label}</div><div className="stat-value">{value}</div></div>; }
