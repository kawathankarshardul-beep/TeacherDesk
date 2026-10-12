import { useEffect, useMemo, useState } from "react";

import { supabase } from "./supabase";

import "./App.css";



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

const MENU = ["Dashboard", "Students", "Attendance", "Attendance Summary", "AI Studio", "Learning Signals"];

const localDate = () => {

  const parts = new Intl.DateTimeFormat("en-CA", {

    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"

  }).formatToParts(new Date());

  const get = (type) => parts.find((p) => p.type === type)?.value;

  return `${get("year")}-${get("month")}-${get("day")}`;

};

const errText = (e) => e?.message || "Something went wrong.";

const sameId = (a, b) => String(a) === String(b);



function csvDownload(name, rows) {

  const text = rows.map(row => row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");

  const url = URL.createObjectURL(new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8;" }));

  const a = document.createElement("a");

  a.href = url; a.download = name; a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);

}



function roundUp(n) { return Math.ceil(n); }

function examFinal(unit, main) {

  if (unit == null || main == null) return null;

  // Score is 100 minus marks lost in the /30 unit test and /80 main exam.

  return 100 - ((30 - Number(unit)) + (80 - Number(main)));

}



export default function App() {

  const [sessionUser, setSessionUser] = useState(null);

  const [authLoading, setAuthLoading] = useState(true);

  const [authMode, setAuthMode] = useState("login");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [signupClass, setSignupClass] = useState("9A");

  const [authMsg, setAuthMsg] = useState("");

  const [authBusy, setAuthBusy] = useState(false);



  const [page, setPage] = useState("Dashboard");

  const [notice, setNotice] = useState("");

  const [busy, setBusy] = useState(false);

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

  const [aiMode, setAiMode] = useState("worksheet");

  const [aiSubject, setAiSubject] = useState("Science");

  const [aiChapter, setAiChapter] = useState("");

  const [aiSyllabus, setAiSyllabus] = useState("");

  const [aiQuestionTypes, setAiQuestionTypes] = useState(["MCQs", "Give reasons", "Short answer"]);

  const [aiCount, setAiCount] = useState("12");

  const [aiInstructions, setAiInstructions] = useState("");

  const [aiAnswerKey, setAiAnswerKey] = useState(true);

  const [aiOutput, setAiOutput] = useState("");

  const [aiBusy, setAiBusy] = useState(false);

  const [paperQuestion, setPaperQuestion] = useState("");

  const [paperScheme, setPaperScheme] = useState("");

  const [paperAnswer, setPaperAnswer] = useState("");
  const [teachingFiles, setTeachingFiles] = useState([]);
  const [isFileDragging, setIsFileDragging] = useState(false);



  const isAdmin = sessionUser?.email?.toLowerCase() === ADMIN_EMAIL;

  async function addTeachingFiles(fileList) {
    const incoming = Array.from(fileList || []);
    const allowed = incoming.filter(file => /\.(pdf|txt|md|csv)$/i.test(file.name) || ["application/pdf", "text/plain", "text/markdown", "text/csv"].includes(file.type));
    if (allowed.some(file => file.size > 5 * 1024 * 1024)) {
      setNotice("Each file must be 5 MB or smaller. Remove larger files and try again.");
      return;
    }
    if (allowed.length !== incoming.length) setNotice("Some files were skipped. Upload PDF, TXT, MD or CSV files only.");
    const prepared = await Promise.all(allowed.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        resolve({ name: file.name, type: file.type || "application/octet-stream", size: file.size, data: result.includes(",") ? result.split(",").slice(1).join(",") : result, text: /\.(txt|md|csv)$/i.test(file.name) ? result : "" });
      };
      reader.onerror = () => resolve({ name: file.name, type: file.type, size: file.size, error: "Could not read this file" });
      reader.readAsDataURL(file);
    })));
    setTeachingFiles(old => [...old, ...prepared].slice(0, 5));
  }

  const teachingDropzone = <div className={`teaching-dropzone ${isFileDragging ? "dragging" : ""}`} onDragOver={e => { e.preventDefault(); setIsFileDragging(true); }} onDragLeave={() => setIsFileDragging(false)} onDrop={e => { e.preventDefault(); setIsFileDragging(false); addTeachingFiles(e.dataTransfer.files); }}>
    <input type="file" accept=".pdf,.txt,.md,.csv,application/pdf,text/plain,text/csv" multiple onChange={e => { addTeachingFiles(e.target.files); e.target.value = ""; }} />
    <strong>Drop syllabus files or PDFs here</strong><span>or click to browse · PDF, TXT, MD, CSV · max 5 MB each · up to 5 files</span>
    {teachingFiles.length > 0 && <ul>{teachingFiles.map((file, i) => <li key={`${file.name}-${i}`}>{file.name} <button type="button" className="text-btn" onClick={() => setTeachingFiles(old => old.filter((_, j) => i !== j))}>Remove</button></li>)}</ul>}
  </div>;

  const activeClass = isAdmin ? classChoice : (teacherClass || classChoice);

  const classStudents = useMemo(() => students.filter(s => s.class_name === activeClass), [students, activeClass]);

  const selectedTest = assessments.find(a => sameId(a.id, selectedAssessment));

  const testsForClass = assessments.filter(a => a.class_name === activeClass);

  const todayAttendance = attendance.filter(a => a.attendance_date === attDate && classStudents.some(s => sameId(s.id, a.student_id)));

  const presentToday = todayAttendance.filter(a => String(a.status || "").trim().toLowerCase() === "present").length;



  useEffect(() => {

    let alive = true;

    supabase.auth.getSession().then(({ data, error }) => {

      if (!alive) return;

      if (error) setAuthMsg(error.message);

      setSessionUser(data?.session?.user || null);

      setAuthLoading(false);

    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {

      setSessionUser(session?.user || null);

    });

    return () => { alive = false; subscription.unsubscribe(); };

  }, []);



  useEffect(() => {

    if (!sessionUser) return;

    let cancelled = false;

    (async () => {

      setBusy(true);

      const [st, tests, mk, at, profile] = await Promise.all([

        supabase.from("students").select("*").order("created_at"),

        supabase.from("assessments").select("*").order("created_at"),

        supabase.from("marks").select("*"),

        supabase.from("attendance").select("*"),

        supabase.from("teacher_profiles").select("class_name").eq("user_id", sessionUser.id).maybeSingle()

      ]);

      if (cancelled) return;

      const failure = [st, tests, mk, at, profile].find(r => r.error)?.error;

      if (st.data) setStudents(st.data);

      if (tests.data) setAssessments(tests.data);

      if (mk.data) setMarks(mk.data);

      if (at.data) setAttendance(at.data);

      if (profile.data?.class_name) {

        setTeacherClass(profile.data.class_name);

        setClassChoice(profile.data.class_name);

        setAssessmentClass(profile.data.class_name);

        setReportClass(profile.data.class_name);

      } else if (!isAdmin) {

        setNotice("Your teacher profile has no class yet. Sign out and register again with your class, or ask the administrator to set it.");

      }

      if (failure) setNotice("Some records could not load: " + errText(failure));

      setBusy(false);

    })();

    return () => { cancelled = true; };

  }, [sessionUser, isAdmin]);



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

      next[s.id] = String(record?.status || "").trim().toLowerCase() === "present" ? "Present" : String(record?.status || "").trim().toLowerCase() === "absent" ? "Absent" : "";

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

      if (authMode === "signup") {

        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { class_name: signupClass } } });

        if (error) throw error;

        if (data.user) {

          const { error: profileError } = await supabase.from("teacher_profiles").upsert({

            user_id: data.user.id, email: email.toLowerCase(), class_name: signupClass

          }, { onConflict: "user_id" });

          if (profileError) setAuthMsg("Account created, but class profile could not be saved: " + profileError.message);

          else if (!data.session) setAuthMsg("Account created. Confirm your email, then sign in.");

        }

      } else {

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) throw error;

      }

    } catch (e2) { setAuthMsg(errText(e2)); }

    finally { setAuthBusy(false); }

  }



  async function logout() {

    const { error } = await supabase.auth.signOut();

    if (error) setNotice(error.message);

  }



  async function addStudent(e) {

    e.preventDefault();

    if (!newStudent.name.trim()) return;

    const className = isAdmin ? newStudent.className : activeClass;

    const classCount = students.filter(s => s.class_name === className).length;

    const rawRoll = newStudent.roll.trim() || String(classCount + 1);

    if (!/^\d{1,2}$/.test(rawRoll)) return setNotice("Roll number must be 1–2 digits (01–99).");

    const roll = rawRoll.padStart(2, "0");

    setBusy(true);

    const { data, error } = await supabase.from("students").insert({

      name: newStudent.name.trim(), class_name: className, roll_number: roll, teacher_id: sessionUser.id

    }).select().single();

    setBusy(false);

    if (error) return setNotice("Could not add student: " + error.message);

    setStudents(old => [...old, data].sort((a,b) => String(a.name).localeCompare(String(b.name), undefined, {sensitivity:"base"})));

    setNewStudent({ name: "", roll: "", className: activeClass }); setShowStudentForm(false);

    setNotice("Student added.");

  }



  async function createTest(e) {

    e.preventDefault();

    const max = assessmentType === "Unit Test" ? 30 : 80;

    setBusy(true);

    const { data, error } = await supabase.from("assessments").insert({

      title: assessmentType, subject: assessmentSubject, max_marks: max,

      class_name: isAdmin ? assessmentClass : activeClass, teacher_id: sessionUser.id,

      exam_type: assessmentType

    }).select().single();

    setBusy(false);

    if (error) return setNotice("Could not create assessment: " + error.message);

    setAssessments(old => [...old, data]);

    setSelectedAssessment(String(data.id));

    setNotice(`${assessmentSubject} ${assessmentType} created (/${max}).`);

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

    if (!rows.length) return setNotice("Enter at least one mark.");

    setBusy(true);

    const { data, error } = await supabase.from("marks").upsert(rows, { onConflict: "student_id,assessment_id" }).select();

    setBusy(false);

    if (error) return setNotice("Could not save marks: " + error.message);

    setMarks(old => [...old.filter(m => !rows.some(r => sameId(r.student_id,m.student_id) && sameId(r.assessment_id,m.assessment_id))), ...(data || rows)]);

    setNotice("Marks saved.");

  }



  async function saveAttendance() {
    if (!classStudents.length) return setNotice("Add students to this class first.");
    const records = classStudents.map(s => ({ s, status: String(attDraft[s.id] || "").trim().toLowerCase() }))
      .filter(x => x.status === "present" || x.status === "absent");
    if (!records.length) return setNotice("Choose Present or Absent for at least one student.");

    setBusy(true);
    try {
      // Save lowercase canonical values so database constraints and summary logic agree.
      const payloads = records.map(({ s, status }) => ({
        student_id: s.id,
        attendance_date: attDate,
        status,
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


  async function generateTeachingContent(e, modeOverride) {

    e?.preventDefault?.();

    setAiBusy(true); setAiOutput("");

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

        includeAnswerKey: aiAnswerKey,

        question: paperQuestion,

        markingScheme: paperScheme,

        studentAnswer: paperAnswer,

        // Aggregate-only, de-identified signals; never send student names or roll numbers.
        learningSignals: { students: classStudents.length, averageAttendancePercent: classStudents.length ? Math.round(classStudents.reduce((sum, s) => sum + attendanceSummary(s).percent, 0) / classStudents.length) : 0 },
        files: teachingFiles.map(({ name, type, size, data, text }) => ({ name, type, size, data, text }))
      };

      const { data, error } = await supabase.functions.invoke("teacherdesk-ai", { body: payload });

      if (error) throw error;

      if (!data?.text) throw new Error(data?.error || "The AI endpoint returned no content.");

      setAiOutput(data.text);

    } catch {
      // Honest offline template mode: this is not represented as AI-generated content.
      const activeAiMode = modeOverride || aiMode;
      if (activeAiMode === "worksheet") {
        const types = (aiQuestionTypes.length ? aiQuestionTypes : ["MCQ", "Short answer", "Give reasons"]).slice(0, 8);
        const count = Math.min(30, Math.max(1, Number(aiCount) || 12));
        const qs = Array.from({ length: count }, (_, i) => `${i + 1}. [${types[i % types.length]}] ${aiChapter}: Write a question that tests this syllabus point: ${aiSyllabus.split(/\n|[.;]/).filter(Boolean)[i % Math.max(1, aiSyllabus.split(/\n|[.;]/).filter(Boolean).length)] || aiSyllabus}. (Marks: ____ )`);
        setAiOutput(`TEACHERDESK WORKSHEET — TEMPLATE MODE\nClass: ${activeClass} | Subject: ${aiSubject}\nChapter: ${aiChapter}\nSyllabus supplied by teacher: ${aiSyllabus}\n\nQUESTIONS\n${qs.join("\n\n")}${aiAnswerKey ? "\n\nANSWER KEY\nTeacher: complete and verify the answer key before distributing. This offline template does not invent factual answers." : ""}\n\nExtra instructions: ${aiInstructions || "None"}`);
        setNotice("AI service unavailable. Created an editable worksheet template instead; it is not AI-generated.");
      } else if (activeAiMode === "lesson" || activeAiMode === "revision") {
        setAiOutput(`${activeAiMode === "lesson" ? "LESSON & ACTIVITY PLAN" : "REVISION PLAN"} — TEMPLATE MODE\nClass: ${activeClass} | Subject: ${aiSubject}\nChapter: ${aiChapter}\nSyllabus: ${aiSyllabus}\n\n1. LEARNING OBJECTIVES\n- Students can explain the key terms in the supplied syllabus.\n- Students can answer a question for each syllabus point.\n\nPREREQUISITES\n- Check prior knowledge with a 2-minute starter; pre-teach any vocabulary learners do not know.\n\n2. LESSON FLOW (40 minutes; adjust as needed)\n- 0–5 min: starter question and prior-knowledge check.\n- 5–15 min: teach the first syllabus points with examples.\n- 15–25 min: guided explanation and student questions.\n- 25–33 min: pair/group activity: students create examples or sort key concepts.\n- 33–38 min: independent check for understanding.\n- 38–40 min: exit ticket and recap.\n\n3. MATERIALS\n- Textbook/syllabus provided by the teacher, board, paper and pens.\n\n4. ENGAGING CLASSROOM ACTIVITIES & DISCUSSION\n- Concept detective: teams find examples of each key idea in the supplied syllabus.\n- Think-pair-share: learners explain one point in their own words, then compare explanations.\n- Discussion prompts: “How do you know?”, “Can you give a counterexample?”, “Where might this idea be used?”\n\n5. HOMEWORK\n- Write a short summary of each syllabus point and answer 5 teacher-selected questions.\n\n6. REVISION / REMEDIAL SUPPORT\n- Re-teach the least-understood point using a worked example, then give 3 simpler practice questions.\n\n7. SUCCESS CHECK\n- Use a 3-question exit ticket. Record which syllabus point needs another explanation.\n\nTeacher note: This is a reusable offline template, not an AI-generated or syllabus-verified plan. ${aiInstructions}`);
        setNotice("AI service unavailable. Created an editable lesson/revision template instead; verify it against your syllabus.");
      } else if (activeAiMode === "gameideas") {
        setAiOutput(`GAME-BASED LEARNING IDEAS — TEMPLATE MODE\nClass: ${activeClass} | Subject: ${aiSubject}\nTopic: ${aiChapter || "Use uploaded material"}\n\n1. CONCEPT QUEST (10 min)\nTeams solve clue cards; each correct explanation unlocks the next clue.\n\n2. HUMAN SORTING GAME (8 min)\nLearners sort statements, examples or diagrams into categories and justify each choice.\n\n3. MISTAKE DETECTIVES (7 min)\nShow a deliberately incorrect explanation and ask groups to find and correct the misconception.\n\n4. BUILD-A-MODEL CHALLENGE (10 min)\nGroups create a paper model, timeline, flowchart or role-play that teaches one key concept.\n\n5. EXIT-TICKET BOSS ROUND (5 min)\nEach learner answers three short questions independently. Use responses to decide what needs reteaching.\n\nSyllabus/material notes: ${aiSyllabus || "Review uploaded material; this template does not read PDF content without a configured AI backend."}\n\nTeacher note: This is a general template, not AI-generated or syllabus-verified. Add an approved AI backend to tailor games to uploaded files.`);
        setNotice("Created a game-based learning template. It is not AI-generated; uploaded PDFs need a configured backend to be analysed.");
      } else {
        setNotice("No AI backend response. Check the deployed teacherdesk-ai function and its permitted provider configuration.");
      }
    } finally { setAiBusy(false); }

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

    const matching = assessments.filter(a => a.class_name === student.class_name && a.subject === subject);

    const getScore = type => {

      const test = matching.find(a => (a.exam_type || a.title) === type);

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
    const normalize = value => String(value ?? "").trim().toLowerCase();
    const present = days.filter(a => normalize(a.status) === "present" || normalize(a.status) === "p").length;
    const absent = days.filter(a => normalize(a.status) === "absent" || normalize(a.status) === "a").length;
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

  if (!sessionUser) return (

    <div className="login-screen">

      <div className="login-card">

        <div className="brand-icon">T</div><p className="eyebrow">TEACHER WORKSPACE</p>

        <h1>TeacherDesk</h1><p className="muted">Your classroom, organized.</p>

        <form onSubmit={authSubmit}>

          <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" /></label>

          <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete={authMode==="login"?"current-password":"new-password"} minLength={6} /></label>

          {authMode === "signup" && <label>Your class<select value={signupClass} onChange={e=>setSignupClass(e.target.value)}>{CLASSES.map(c=><option key={c}>{c}</option>)}</select></label>}

          <button className="primary-btn" disabled={authBusy}>{authBusy ? "Please wait…" : authMode==="login" ? "Sign in" : "Create teacher account"}</button>

        </form>

        {authMsg && <p role="status" className="notice">{authMsg}</p>}

        <button className="text-btn" onClick={()=>{setAuthMode(authMode==="login"?"signup":"login");setAuthMsg("");}}>{authMode==="login"?"New teacher? Create an account":"Already registered? Sign in"}</button>

        <p className="tiny-note">Your class is saved to your teacher profile. The administrator demo uses the designated account.</p>

      </div>

    </div>

  );



  return <div className="app-shell">

    <aside className="sidebar">

      <div className="brand"><div className="brand-icon">T</div><div><strong>TeacherDesk</strong><small>{isAdmin ? "ADMIN DEMO" : "TEACHER WORKSPACE"}</small></div></div>

      {!isAdmin && <div className="teacher-class">Assigned class <strong>{teacherClass || "Not configured"}</strong></div>}

      <div className="nav-label">WORKSPACE</div>

      <nav>{MENU.map(item=><button key={item} className={`nav-item ${page===item?"active":""}`} onClick={()=>{setPage(item);setNotice("");}}>{item==="Dashboard"?"⌂":item==="Students"?"♙":item==="Attendance"?"✓":item==="Attendance Summary"?"◷":item==="Assessments"?"▤":item==="AI Studio"?"✦":item==="Learning Signals"?"↗":"▧"} <span>{item}</span>{item==="Students"&&<b>{isAdmin?students.length:classStudents.length}</b>}</button>)}</nav>

      <div className="sidebar-bottom"><div className="avatar">{isAdmin?"AD":"T"}</div><div><strong>{isAdmin?"Administrator":"Teacher"}</strong><small>{sessionUser.email}</small></div></div>

      <button className="nav-item logout" onClick={logout}>↪ <span>Sign out</span></button>

    </aside>

    <main className="main">

      <header className="topbar"><div>Workspace <span>/</span> {page}</div><div className="top-right"><span className="status-dot"/> Connected <span className="class-pill">{activeClass}</span></div></header>

      <div className="content">

        {notice&&<div className="notice">{notice}<button onClick={()=>setNotice("")}>×</button></div>}

        {busy&&<p className="muted">Working…</p>}

        {isAdmin&&<div className="class-switch"><label>Demo class<select value={classChoice} onChange={e=>{setClassChoice(e.target.value);setAssessmentClass(e.target.value);setReportClass(e.target.value);}}>{CLASSES.map(c=><option key={c}>{c}</option>)}</select></label><span className="muted">Admin demo can switch classes. Teachers stay in their assigned class.</span></div>}

        <div className="page-heading"><div><div className="eyebrow">TEACHER WORKSPACE</div><h1>{page}</h1><p>{page==="Attendance"?"Daily class register — changes are saved for the selected date.":page==="Assessments"?"Unit tests /30 and main exams /80, organized by subject.":page==="Report Cards"?"Calculated subject averages, rounded up to whole marks.":page==="Attendance Summary"?"Each student's saved attendance history and total out of 90.":"Manage students, marks and classroom records."}</p></div>

          {["Dashboard","Students"].includes(page)&&<button className="primary-btn" onClick={()=>setShowStudentForm(v=>!v)}>＋ Add student</button>}

        </div>

        {showStudentForm&&<form className="panel form-grid" onSubmit={addStudent}><h3>Add student</h3><label>Full name<input value={newStudent.name} onChange={e=>setNewStudent({...newStudent,name:e.target.value})} required/></label><label>Roll number (optional)<input value={newStudent.roll} onChange={e=>setNewStudent({...newStudent,roll:e.target.value})} placeholder="Auto-number if blank"/></label>{isAdmin&&<label>Class<select value={newStudent.className} onChange={e=>setNewStudent({...newStudent,className:e.target.value})}>{CLASSES.map(c=><option key={c}>{c}</option>)}</select></label>}<button className="primary-btn" disabled={busy}>Save student</button><button type="button" className="secondary-btn" onClick={()=>setShowStudentForm(false)}>Cancel</button></form>}

        {page==="Dashboard"&&<><div className="stats-grid"><Stat label="Students in class" value={classStudents.length}/><Stat label="Present today" value={`${presentToday}/${classStudents.length}`}/><Stat label="Attendance records" value={attendance.filter(a=>classStudents.some(s=>sameId(s.id,a.student_id))).length}/></div><div className="panel"><h2>Quick actions</h2><div className="quick-grid">{["Students","Attendance","Attendance Summary","AI Studio","Learning Signals"].map(p=><button className="action-row" key={p} onClick={()=>setPage(p)}>{p} →</button>)}</div></div></>}

        {page==="Students"&&<div className="panel"><div className="table-toolbar"><h2>Students — {activeClass}</h2><input placeholder="Search name or roll no." value={studentSearch} onChange={e=>setStudentSearch(e.target.value)}/></div><div className="table-wrap"><table><thead><tr><th>ROLL NO.</th><th>STUDENT NAME</th><th>CLASS</th><th>ATTENDANCE</th><th>ACTIONS</th></tr></thead><tbody>{visibleStudents.map(s=><tr key={s.id}><td>{s.roll_number}</td><td>{s.name}</td><td>{s.class_name}</td><td>{attendanceSummary(s).present}/90 present · {attendanceSummary(s).percent}% of recorded days</td><td><button className="danger-btn" disabled={busy} onClick={()=>deleteStudent(s)}>Delete</button></td></tr>)}{!visibleStudents.length&&<tr><td colSpan="5" className="empty">No students yet. Use Add student.</td></tr>}</tbody></table></div></div>}

        {page==="Attendance"&&<div className="panel"><div className="section-heading"><div><h2>Daily attendance register</h2><p>Excel-style register. Choose Present or Absent for each student, then save the whole day.</p></div><span className="pill">{presentToday} present</span></div><div className="form-row"><label>Date<input type="date" value={attDate} onChange={e=>setAttDate(e.target.value)}/></label><button className="secondary-btn" onClick={()=>setAttDraft(Object.fromEntries(classStudents.map(s=>[s.id,"Present"])))}>Mark all present</button><button className="secondary-btn" onClick={()=>setAttDraft(Object.fromEntries(classStudents.map(s=>[s.id,"Absent"])))}>Mark all absent</button><button className="secondary-btn" onClick={()=>csvDownload(`Attendance-${activeClass}-${attDate}.csv`,[["Date","Roll No","Name","Class","Status"],...classStudents.map(s=>[attDate,s.roll_number,s.name,s.class_name,attDraft[s.id]||"Not marked"])])}>Export CSV</button></div><div className="table-wrap"><table><thead><tr><th>ROLL NO.</th><th>STUDENT NAME</th><th>PRESENT</th><th>ABSENT</th><th>STATUS</th></tr></thead><tbody>{classStudents.map(s=><tr key={s.id}><td>{s.roll_number}</td><td>{s.name}</td><td><button className={`attendance-choice present ${attDraft[s.id]==="Present"?"chosen":""}`} onClick={()=>setAttDraft(d=>({...d,[s.id]:"Present"}))}>Present</button></td><td><button className={`attendance-choice absent ${attDraft[s.id]==="Absent"?"chosen":""}`} onClick={()=>setAttDraft(d=>({...d,[s.id]:"Absent"}))}>Absent</button></td><td>{attDraft[s.id]||"Not marked"}</td></tr>)}{!classStudents.length&&<tr><td colSpan="5" className="empty">Add students to this class first.</td></tr>}</tbody></table></div><div className="save-bar"><span className="muted">The sheet selects the current India date after 8 AM. Saved history is never reset.</span><button className="primary-btn" disabled={busy||!classStudents.length} onClick={saveAttendance}>Save register</button></div></div>}

        {page==="Attendance Summary"&&<div className="panel"><div className="section-heading"><div><h2>Attendance summary</h2><p>90-day view is a target; saved school-day records are counted. Unrecorded days are not marked absent automatically.</p></div><button className="secondary-btn" onClick={()=>csvDownload(`Attendance-summary-${activeClass}.csv`,[["Roll","Student","Present","Absent","Days recorded","Present %"],...classStudents.map(s=>{const x=attendanceSummary(s);return[s.roll_number,s.name,x.present,x.absent,x.recorded,x.percent+"%"]})])}>Export summary</button></div><div className="table-wrap"><table><thead><tr><th>ROLL</th><th>STUDENT</th><th>PRESENT / 90</th><th>ABSENT</th><th>DAYS RECORDED</th><th>ATTENDANCE %</th><th>HISTORY</th></tr></thead><tbody>{classStudents.map(s=>{const x=attendanceSummary(s);return <tr key={s.id}><td>{s.roll_number}</td><td>{s.name}</td><td>{x.present}/90</td><td>{x.absent}</td><td>{x.recorded}</td><td>{x.percent}%</td><td><button className="text-btn" onClick={()=>{setSelectedStudent(String(s.id));setPage("Student Attendance");}}>View dates →</button></td></tr>})}</tbody></table></div></div>}

        {page==="Student Attendance"&&<div className="panel"><label>Student<select value={selectedStudent} onChange={e=>setSelectedStudent(e.target.value)}>{classStudents.map(s=><option key={s.id} value={s.id}>{s.roll_number} — {s.name}</option>)}</select></label>{studentHistory&&<><h2>{studentHistory.name}</h2><p>Present {attendanceSummary(studentHistory).present}/90 · Absent {attendanceSummary(studentHistory).absent} · {attendanceSummary(studentHistory).percent}% of recorded days</p><div className="table-wrap"><table><thead><tr><th>DATE</th><th>STATUS</th></tr></thead><tbody>{attendance.filter(a=>sameId(a.student_id,studentHistory.id)).sort((a,b)=>b.attendance_date.localeCompare(a.attendance_date)).map(a=><tr key={a.id}><td>{a.attendance_date}</td><td>{a.status}</td></tr>)}</tbody></table></div></>}</div>}

        {page==="Assessments"&&<><div className="panel"><h2>Set up a test</h2><p className="muted">The two standard exams are created for you: Unit Test /30 and Main Exam /80.</p><form className="form-grid" onSubmit={createTest}><label>Subject<select value={assessmentSubject} onChange={e=>setAssessmentSubject(e.target.value)}>{SUBJECTS.map(s=><option key={s.name}>{s.name}</option>)}<option>Marathi</option></select></label><label>Exam<select value={assessmentType} onChange={e=>setAssessmentType(e.target.value)}><option>Unit Test</option><option>Main Exam</option></select></label>{isAdmin&&<label>Class<select value={assessmentClass} onChange={e=>setAssessmentClass(e.target.value)}>{CLASSES.map(c=><option key={c}>{c}</option>)}</select></label>}<p className="exam-max">Maximum marks: <strong>{assessmentType==="Unit Test"?30:80}</strong></p><button className="primary-btn" disabled={busy}>Create this subject exam</button></form></div><div className="panel"><h2>Enter marks</h2><label>Exam<select value={selectedAssessment} onChange={e=>setSelectedAssessment(e.target.value)}>{testsForClass.map(t=><option key={t.id} value={t.id}>{t.subject} — {t.exam_type||t.title} (/{t.max_marks})</option>)}</select></label>{selectedTest&&<form onSubmit={saveMarks}><h3>{selectedTest.subject} · {selectedTest.exam_type||selectedTest.title} · /{selectedTest.max_marks}</h3><div className="table-wrap"><table><thead><tr><th>ROLL</th><th>STUDENT</th><th>MARKS / {selectedTest.max_marks}</th></tr></thead><tbody>{classStudents.map(s=><tr key={s.id}><td>{s.roll_number}</td><td>{s.name}</td><td><input className="mark-input" type="number" min="0" max={selectedTest.max_marks} step="any" value={markDraft[s.id]??""} onChange={e=>setMarkDraft(d=>({...d,[s.id]:e.target.value}))}/></td></tr>)}</tbody></table></div><button className="primary-btn" disabled={busy}>Save marks</button></form>}</div><div className="panel"><h2>Created exams</h2><div className="table-wrap"><table><thead><tr><th>SUBJECT</th><th>EXAM</th><th>CLASS</th><th>MAXIMUM</th></tr></thead><tbody>{assessments.filter(a=>isAdmin||a.class_name===activeClass).map(a=><tr key={a.id}><td>{a.subject}</td><td>{a.exam_type||a.title}</td><td>{a.class_name}</td><td>{a.max_marks}</td></tr>)}</tbody></table></div></div></>}

        {page==="AI Studio"&&<>

          <div className="panel"><div className="section-heading"><div><h2>TeacherDesk AI Studio</h2><p>Generate editable teaching materials from the syllabus you provide. Always verify syllabus accuracy before using.</p></div><span className="pill">Secure server-side AI</span></div>

            <div className="form-grid ai-mode-row"><label>Tool<select value={aiMode} onChange={e=>{setAiMode(e.target.value);setAiOutput("");}}><option value="worksheet">Worksheet Studio</option><option value="lesson">Lesson & Activity Planner</option><option value="revision">Class revision plan</option><option value="gameideas">Game-based learning ideas</option></select></label><label>Subject<select value={aiSubject} onChange={e=>setAiSubject(e.target.value)}>{SUBJECTS.map(s=><option key={s.name}>{s.name}</option>)}</select></label><label>Class<input value={activeClass} readOnly/></label></div>

            {aiMode!=="papercheck"?<form onSubmit={generateTeachingContent} className="ai-form">

              <label>Chapter / topic<input value={aiChapter} onChange={e=>setAiChapter(e.target.value)} placeholder="e.g. Cell — The Unit of Life" required/></label>

              <label>Exact syllabus / textbook points<textarea value={aiSyllabus} onChange={e=>setAiSyllabus(e.target.value)} placeholder="Paste syllabus points here, or add files below." rows="4" required={teachingFiles.length===0}/></label>
              {teachingDropzone}

              {aiMode==="worksheet"&&<><label>Question types (comma separated)<input value={aiQuestionTypes.join(", ")} onChange={e=>setAiQuestionTypes(e.target.value.split(",").map(x=>x.trim()).filter(Boolean))} placeholder="MCQs, case study, match columns, give reasons"/></label><div className="form-grid"><label>Number of questions<input type="number" min="1" max="30" value={aiCount} onChange={e=>setAiCount(e.target.value)}/></label><label className="check-label"><input type="checkbox" checked={aiAnswerKey} onChange={e=>setAiAnswerKey(e.target.checked)}/> Include answer key</label></div></>}

              <label>Extra instructions (optional)<textarea value={aiInstructions} onChange={e=>setAiInstructions(e.target.value)} placeholder="Difficulty, marks, ICSE question style, time limit…" rows="2"/></label>

              <button className="primary-btn" disabled={aiBusy}>{aiBusy?"Generating…":aiMode==="lesson"?"Build lesson plan":aiMode==="revision"?"Build revision plan":"Generate worksheet"}</button>

            </form>:<form onSubmit={generateTeachingContent} className="ai-form"><label>Question / task<input value={paperQuestion} onChange={e=>setPaperQuestion(e.target.value)} placeholder="Paste the exam question" required/></label><label>Teacher's marking scheme<textarea value={paperScheme} onChange={e=>setPaperScheme(e.target.value)} rows="4" placeholder="Expected points, marks per point, acceptable alternatives" required/></label><label>Student answer<textarea value={paperAnswer} onChange={e=>setPaperAnswer(e.target.value)} rows="5" placeholder="Paste or type the answer (avoid student names or personal data)" required/></label><p className="muted">PaperCheck only suggests marks and feedback. It can be wrong; the teacher must make the final decision.</p><button className="primary-btn" disabled={aiBusy}>{aiBusy?"Reviewing…":"Suggest marks & feedback"}</button></form>}

          </div>

          {aiOutput&&<div className="panel ai-output"><div className="section-heading"><h2>Generated draft</h2><div><button className="secondary-btn" onClick={()=>navigator.clipboard?.writeText(aiOutput).then(()=>setNotice("Draft copied."),()=>setNotice("Copy failed; select the text manually."))}>Copy</button> <button className="secondary-btn" onClick={()=>window.print()}>Print</button></div></div><textarea className="ai-editable-output" aria-label="Editable generated draft" value={aiOutput} onChange={e=>setAiOutput(e.target.value)} rows={22} /><p className="muted">AI output is a draft. Check facts, syllabus coverage, mark totals and answer keys before use.</p></div>}

        </>}

        {page==="Learning Signals"&&<div className="panel">
          <div className="section-heading"><div><h2>Learning Signals · Game Lab</h2><p>Drop a syllabus PDF or learning material and create engaging game-based teaching ideas. Avoid student names or personal data.</p></div></div>
          <form className="ai-form" onSubmit={e=>{setAiMode("gameideas");generateTeachingContent(e,"gameideas");}}>
            <label>Subject<select value={aiSubject} onChange={e=>setAiSubject(e.target.value)}>{SUBJECTS.map(s=><option key={s.name}>{s.name}</option>)}</select></label>
            <label>Chapter / topic<input value={aiChapter} onChange={e=>setAiChapter(e.target.value)} placeholder="e.g. French Revolution, cells, trigonometry" /></label>
            <label>What should students learn?<textarea value={aiSyllabus} onChange={e=>setAiSyllabus(e.target.value)} rows="4" placeholder="Paste exact syllabus points here, if available." /></label>
            {teachingDropzone}
            <label>Classroom constraints (optional)<textarea value={aiInstructions} onChange={e=>setAiInstructions(e.target.value)} rows="2" placeholder="e.g. no phones, 35 students, 10 minutes, only paper and board" /></label>
            <button className="primary-btn" disabled={aiBusy}>{aiBusy?"Building ideas…":"Create game-based lesson ideas"}</button>
          </form>
          <p className="muted">PDFs are attached to the request as file data, but the current backend must explicitly support PDF/file input before it can analyse their contents. Until then, output falls back to a general game template.</p>
        </div>}

        {page==="Report Cards"&&<div className="panel"><div className="section-heading"><div><h2>Final report card</h2><p>Unit /30 + Main /80. Subject result = 100 − marks lost in both exams. Combined subjects are averaged and rounded up.</p></div><button className="secondary-btn" onClick={()=>csvDownload("TeacherDesk-Report-Cards.csv",[["Roll","Student","Class","HCG","Science","Maths","Hindi","English","Graded","Average"],...reportStudents.map(s=>{const r=reportFor(s);return[s.roll_number,s.name,s.class_name,...r.report.map(x=>x[1]??"—"),r.average??"—"]})])}>Export report cards</button></div>{isAdmin&&<label>Class<select value={reportClass} onChange={e=>{setReportClass(e.target.value); setReportStudent("");}}>{CLASSES.map(c=><option key={c}>{c}</option>)}</select></label>}<label>Select student<select value={reportStudent||reportTarget?.id||""} onChange={e=>setReportStudent(e.target.value)}>{reportStudents.map(s=><option key={s.id} value={s.id}>{s.name} · Roll {s.roll_number}</option>)}</select></label>{reportTarget&&(()=>{const r=reportFor(reportTarget);return <div className="report-card"><div className="report-head"><div><p className="eyebrow">STUDENT REPORT CARD</p><h2>{reportTarget.name}</h2><p>Class {reportTarget.class_name} · Roll {reportTarget.roll_number}</p></div><div className="report-total"><small>Overall average</small><strong>{r.average==null?"—":`${r.average}/100`}</strong></div></div><div className="table-wrap"><table><thead><tr><th>REPORT SUBJECT</th><th>FINAL MARK / 100</th><th>STATUS</th></tr></thead><tbody>{r.report.map(([name,score])=><tr key={name}><td>{name}</td><td>{score==null?"Marks incomplete":`${score}/100`}</td><td>{score==null?"Pending":score>=35?"Recorded":"Review"}</td></tr>)}</tbody></table></div><h3>Component marks (not printed as separate report subjects)</h3><div className="table-wrap"><table><thead><tr><th>SUBJECT</th><th>UNIT /30</th><th>MAIN /80</th><th>SUBJECT RESULT /100</th></tr></thead><tbody>{SUBJECTS.filter(s=>s.name!=="Marathi / Hindi Graded").map(s=>{const x=studentSubjectMarks(reportTarget,s.name);return <tr key={s.name}><td>{s.name}</td><td>{x.unit??"—"}</td><td>{x.main??"—"}</td><td>{x.final??"Pending"}</td></tr>})}</tbody></table></div></div>})()}</div>}

      </div>

    </main>

  </div>;

}



function Stat({label,value}) { return <div className="stat-card"><div className="stat-label">{label}</div><div className="stat-value">{value}</div></div>; }
