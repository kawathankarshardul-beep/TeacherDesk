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
const MENU = ["Dashboard", "Students", "Attendance", "Attendance Summary", "Assessments", "Report Cards"];
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

  const isAdmin = sessionUser?.email?.toLowerCase() === ADMIN_EMAIL;
  const activeClass = isAdmin ? classChoice : (teacherClass || classChoice);
  const classStudents = useMemo(() => students.filter(s => s.class_name === activeClass), [students, activeClass]);
  const selectedTest = assessments.find(a => sameId(a.id, selectedAssessment));
  const testsForClass = assessments.filter(a => a.class_name === activeClass);
  const todayAttendance = attendance.filter(a => a.attendance_date === attDate && classStudents.some(s => sameId(s.id, a.student_id)));
  const presentToday = todayAttendance.filter(a => a.status === "Present").length;

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
    if (!sessionUser) {
      setStudents([]); setAssessments([]); setMarks([]); setAttendance([]);
      setTeacherClass("");
      return;
    }
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

  useEffect(() => {
    const next = {};
    classStudents.forEach(s => {
      const record = attendance.find(a => sameId(a.student_id, s.id) && a.attendance_date === attDate);
      next[s.id] = record?.status || "";
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
    const roll = newStudent.roll.trim() || String(classCount + 1).padStart(2, "0");
    setBusy(true);
    const { data, error } = await supabase.from("students").insert({
      name: newStudent.name.trim(), class_name: className, roll_number: roll, teacher_id: sessionUser.id
    }).select().single();
    setBusy(false);
    if (error) return setNotice("Could not add student: " + error.message);
    setStudents(old => [...old, data].sort((a,b) => String(a.roll_number).localeCompare(String(b.roll_number), undefined, {numeric:true})));
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
    const records = classStudents.map(s => ({ s, status: attDraft[s.id] })).filter(x => x.status);
    if (!records.length) return setNotice("Mark at least one student Present or Absent.");
    setBusy(true);
    let failure = null;
    const saved = [];
    for (const { s, status } of records) {
      const previous = attendance.find(a => sameId(a.student_id, s.id) && a.attendance_date === attDate);
      const payload = { student_id: s.id, attendance_date: attDate, status, teacher_id: sessionUser.id, class_name: activeClass };
      const result = previous?.id
        ? await supabase.from("attendance").update({ status, teacher_id: sessionUser.id, class_name: activeClass }).eq("id", previous.id).select().single()
        : await supabase.from("attendance").upsert(payload, { onConflict: "student_id,attendance_date" }).select().single();
      if (result.error) { failure = result.error; break; }
      if (result.data) saved.push(result.data);
    }
    setBusy(false);
    if (failure) return setNotice("Could not save attendance: " + failure.message + " (check the SQL setup file was run).");
    setAttendance(old => [...old.filter(a => !saved.some(r => sameId(r.id, a.id)) && !records.some(x => sameId(x.s.id,a.student_id) && a.attendance_date === attDate)), ...saved]);
    setNotice(`Attendance saved for ${attDate}. Previous dates remain stored.`);
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
    const present = days.filter(a => a.status === "Present").length;
    const absent = days.filter(a => a.status === "Absent").length;
    return { present, absent, recorded: days.length, percent: days.length ? Math.round(present/days.length*100) : 0 };
  }

  const visibleStudents = students.filter(s => (isAdmin || s.class_name === activeClass) &&
    `${s.name} ${s.roll_number} ${s.class_name}`.toLowerCase().includes(studentSearch.toLowerCase()));
  const reportTarget = students.find(s => sameId(s.id, reportStudent)) || classStudents[0];
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
      <nav>{MENU.map(item=><button key={item} className={`nav-item ${page===item?"active":""}`} onClick={()=>{setPage(item);setNotice("");}}>{item==="Dashboard"?"⌂":item==="Students"?"♙":item==="Attendance"?"✓":item==="Attendance Summary"?"◷":item==="Assessments"?"▤":"▧"} <span>{item}</span>{item==="Students"&&<b>{isAdmin?students.length:classStudents.length}</b>}</button>)}</nav>
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
        {page==="Dashboard"&&<><div className="stats-grid"><Stat label="Students in class" value={classStudents.length}/><Stat label="Present today" value={`${presentToday}/${classStudents.length}`}/><Stat label="Assessments" value={assessments.filter(a=>a.class_name===activeClass).length}/><Stat label="Attendance records" value={attendance.filter(a=>classStudents.some(s=>sameId(s.id,a.student_id))).length}/></div><div className="panel"><h2>Quick actions</h2><div className="quick-grid">{["Students","Attendance","Assessments","Report Cards","Attendance Summary"].map(p=><button className="action-row" key={p} onClick={()=>setPage(p)}>{p} →</button>)}</div></div></>}
        {page==="Students"&&<div className="panel"><div className="table-toolbar"><h2>Students — {activeClass}</h2><input placeholder="Search name or roll no." value={studentSearch} onChange={e=>setStudentSearch(e.target.value)}/></div><div className="table-wrap"><table><thead><tr><th>ROLL NO.</th><th>STUDENT NAME</th><th>CLASS</th><th>ATTENDANCE</th></tr></thead><tbody>{visibleStudents.map(s=><tr key={s.id}><td>{s.roll_number}</td><td>{s.name}</td><td>{s.class_name}</td><td>{attendanceSummary(s).present}/90 present · {attendanceSummary(s).percent}% of recorded days</td></tr>)}{!visibleStudents.length&&<tr><td colSpan="4" className="empty">No students yet. Use Add student.</td></tr>}</tbody></table></div></div>}
        {page==="Attendance"&&<div className="panel"><div className="section-heading"><div><h2>Daily attendance register</h2><p>Excel-style register. Choose Present or Absent for each student, then save the whole day.</p></div><span className="pill">{presentToday} present</span></div><div className="form-row"><label>Date<input type="date" value={attDate} onChange={e=>setAttDate(e.target.value)}/></label><button className="secondary-btn" onClick={()=>setAttDraft(Object.fromEntries(classStudents.map(s=>[s.id,"Present"])))}>Mark all present</button><button className="secondary-btn" onClick={()=>setAttDraft(Object.fromEntries(classStudents.map(s=>[s.id,"Absent"])))}>Mark all absent</button><button className="secondary-btn" onClick={()=>csvDownload(`Attendance-${activeClass}-${attDate}.csv`,[["Date","Roll No","Name","Class","Status"],...classStudents.map(s=>[attDate,s.roll_number,s.name,s.class_name,attDraft[s.id]||"Not marked"])])}>Export CSV</button></div><div className="table-wrap"><table><thead><tr><th>ROLL NO.</th><th>STUDENT NAME</th><th>PRESENT</th><th>ABSENT</th><th>STATUS</th></tr></thead><tbody>{classStudents.map(s=><tr key={s.id}><td>{s.roll_number}</td><td>{s.name}</td><td><button className={`attendance-choice present ${attDraft[s.id]==="Present"?"chosen":""}`} onClick={()=>setAttDraft(d=>({...d,[s.id]:"Present"}))}>Present</button></td><td><button className={`attendance-choice absent ${attDraft[s.id]==="Absent"?"chosen":""}`} onClick={()=>setAttDraft(d=>({...d,[s.id]:"Absent"}))}>Absent</button></td><td>{attDraft[s.id]||"Not marked"}</td></tr>)}{!classStudents.length&&<tr><td colSpan="5" className="empty">Add students to this class first.</td></tr>}</tbody></table></div><div className="save-bar"><span className="muted">The sheet selects the current India date after 8 AM. Saved history is never reset.</span><button className="primary-btn" disabled={busy||!classStudents.length} onClick={saveAttendance}>Save register</button></div></div>}
        {page==="Attendance Summary"&&<div className="panel"><div className="section-heading"><div><h2>Attendance summary</h2><p>90-day view is a target; saved school-day records are counted. Unrecorded days are not marked absent automatically.</p></div><button className="secondary-btn" onClick={()=>csvDownload(`Attendance-summary-${activeClass}.csv`,[["Roll","Student","Present","Absent","Days recorded","Present %"],...classStudents.map(s=>{const x=attendanceSummary(s);return[s.roll_number,s.name,x.present,x.absent,x.recorded,x.percent+"%"]})])}>Export summary</button></div><div className="table-wrap"><table><thead><tr><th>ROLL</th><th>STUDENT</th><th>PRESENT / 90</th><th>ABSENT</th><th>DAYS RECORDED</th><th>ATTENDANCE %</th><th>HISTORY</th></tr></thead><tbody>{classStudents.map(s=>{const x=attendanceSummary(s);return <tr key={s.id}><td>{s.roll_number}</td><td>{s.name}</td><td>{x.present}/90</td><td>{x.absent}</td><td>{x.recorded}</td><td>{x.percent}%</td><td><button className="text-btn" onClick={()=>{setSelectedStudent(String(s.id));setPage("Student Attendance");}}>View dates →</button></td></tr>})}</tbody></table></div></div>}
        {page==="Student Attendance"&&<div className="panel"><label>Student<select value={selectedStudent} onChange={e=>setSelectedStudent(e.target.value)}>{classStudents.map(s=><option key={s.id} value={s.id}>{s.roll_number} — {s.name}</option>)}</select></label>{studentHistory&&<><h2>{studentHistory.name}</h2><p>Present {attendanceSummary(studentHistory).present}/90 · Absent {attendanceSummary(studentHistory).absent} · {attendanceSummary(studentHistory).percent}% of recorded days</p><div className="table-wrap"><table><thead><tr><th>DATE</th><th>STATUS</th></tr></thead><tbody>{attendance.filter(a=>sameId(a.student_id,studentHistory.id)).sort((a,b)=>b.attendance_date.localeCompare(a.attendance_date)).map(a=><tr key={a.id}><td>{a.attendance_date}</td><td>{a.status}</td></tr>)}</tbody></table></div></>}</div>}
        {page==="Assessments"&&<><div className="panel"><h2>Set up a test</h2><p className="muted">The two standard exams are created for you: Unit Test /30 and Main Exam /80.</p><form className="form-grid" onSubmit={createTest}><label>Subject<select value={assessmentSubject} onChange={e=>setAssessmentSubject(e.target.value)}>{SUBJECTS.map(s=><option key={s.name}>{s.name}</option>)}<option>Marathi</option></select></label><label>Exam<select value={assessmentType} onChange={e=>setAssessmentType(e.target.value)}><option>Unit Test</option><option>Main Exam</option></select></label>{isAdmin&&<label>Class<select value={assessmentClass} onChange={e=>setAssessmentClass(e.target.value)}>{CLASSES.map(c=><option key={c}>{c}</option>)}</select></label>}<p className="exam-max">Maximum marks: <strong>{assessmentType==="Unit Test"?30:80}</strong></p><button className="primary-btn" disabled={busy}>Create this subject exam</button></form></div><div className="panel"><h2>Enter marks</h2><label>Exam<select value={selectedAssessment} onChange={e=>setSelectedAssessment(e.target.value)}>{testsForClass.map(t=><option key={t.id} value={t.id}>{t.subject} — {t.exam_type||t.title} (/{t.max_marks})</option>)}</select></label>{selectedTest&&<form onSubmit={saveMarks}><h3>{selectedTest.subject} · {selectedTest.exam_type||selectedTest.title} · /{selectedTest.max_marks}</h3><div className="table-wrap"><table><thead><tr><th>ROLL</th><th>STUDENT</th><th>MARKS / {selectedTest.max_marks}</th></tr></thead><tbody>{classStudents.map(s=><tr key={s.id}><td>{s.roll_number}</td><td>{s.name}</td><td><input className="mark-input" type="number" min="0" max={selectedTest.max_marks} step="any" value={markDraft[s.id]??""} onChange={e=>setMarkDraft(d=>({...d,[s.id]:e.target.value}))}/></td></tr>)}</tbody></table></div><button className="primary-btn" disabled={busy}>Save marks</button></form>}</div><div className="panel"><h2>Created exams</h2><div className="table-wrap"><table><thead><tr><th>SUBJECT</th><th>EXAM</th><th>CLASS</th><th>MAXIMUM</th></tr></thead><tbody>{assessments.filter(a=>isAdmin||a.class_name===activeClass).map(a=><tr key={a.id}><td>{a.subject}</td><td>{a.exam_type||a.title}</td><td>{a.class_name}</td><td>{a.max_marks}</td></tr>)}</tbody></table></div></div></>}
        {page==="Report Cards"&&<div className="panel"><div className="section-heading"><div><h2>Final report card</h2><p>Unit /30 + Main /80. Subject result = 100 − marks lost in both exams. Combined subjects are averaged and rounded up.</p></div><button className="secondary-btn" onClick={()=>csvDownload("TeacherDesk-Report-Cards.csv",[["Roll","Student","Class","HCG","Science","Maths","Hindi","English","Graded","Average"],...classStudents.map(s=>{const r=reportFor(s);return[s.roll_number,s.name,s.class_name,...r.report.map(x=>x[1]??"—"),r.average??"—"]})])}>Export report cards</button></div><label>Select student<select value={reportStudent||reportTarget?.id||""} onChange={e=>setReportStudent(e.target.value)}>{classStudents.map(s=><option key={s.id} value={s.id}>{s.name} · Roll {s.roll_number}</option>)}</select></label>{reportTarget&&(()=>{const r=reportFor(reportTarget);return <div className="report-card"><div className="report-head"><div><p className="eyebrow">STUDENT REPORT CARD</p><h2>{reportTarget.name}</h2><p>Class {reportTarget.class_name} · Roll {reportTarget.roll_number}</p></div><div className="report-total"><small>Overall average</small><strong>{r.average==null?"—":`${r.average}/100`}</strong></div></div><div className="table-wrap"><table><thead><tr><th>REPORT SUBJECT</th><th>FINAL MARK / 100</th><th>STATUS</th></tr></thead><tbody>{r.report.map(([name,score])=><tr key={name}><td>{name}</td><td>{score==null?"Marks incomplete":`${score}/100`}</td><td>{score==null?"Pending":score>=35?"Recorded":"Review"}</td></tr>)}</tbody></table></div><h3>Component marks (not printed as separate report subjects)</h3><div className="table-wrap"><table><thead><tr><th>SUBJECT</th><th>UNIT /30</th><th>MAIN /80</th><th>SUBJECT RESULT /100</th></tr></thead><tbody>{SUBJECTS.filter(s=>s.name!=="Marathi / Hindi Graded").map(s=>{const x=studentSubjectMarks(reportTarget,s.name);return <tr key={s.name}><td>{s.name}</td><td>{x.unit??"—"}</td><td>{x.main??"—"}</td><td>{x.final??"Pending"}</td></tr>})}</tbody></table></div></div>})()}</div>}
      </div>
    </main>
  </div>;
}

function Stat({label,value}) { return <div className="stat-card"><div className="stat-label">{label}</div><div className="stat-value">{value}</div></div>; }
