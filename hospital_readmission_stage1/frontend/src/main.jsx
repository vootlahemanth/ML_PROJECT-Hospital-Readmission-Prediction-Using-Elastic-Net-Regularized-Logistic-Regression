import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity, BarChart3, ClipboardList, FileText, HeartPulse, Home,
  LogOut, Menu, ShieldCheck, UserRound, Users, X, ArrowRight,
  CalendarDays, Stethoscope, CheckCircle2, AlertTriangle
} from "lucide-react";
import "./styles.css";

const API = "http://127.0.0.1:8000/api";

function App() {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem("hospital_session") || "null"));
  const [page, setPage] = useState("dashboard");

  const logout = () => {
    localStorage.removeItem("hospital_session");
    setSession(null);
  };

  if (!session) return <Login onLogin={setSession} />;

  if (session.role === "admin") {
    return <AdminShell session={session} page={page} setPage={setPage} logout={logout} />;
  }

  return <PatientShell session={session} page={page} setPage={setPage} logout={logout} />;
}

function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", password: "", name: "", age_group: "50-60", gender: "Female", phone: "", blood_group: "Unknown" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const res = await fetch(API + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Request failed");

      if (mode === "register") {
        setMode("login");
        setError("Registration successful. Please sign in.");
      } else {
        localStorage.setItem("hospital_session", JSON.stringify(data));
        onLogin(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-panel">
        <div className="brand-mark"><HeartPulse size={28} /></div>
        <h1>Hospital Readmission System</h1>
        <p className="muted">Clinical decision-support demonstration portal</p>

        <div className="role-switch">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Sign in</button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Register</button>
        </div>

        <form onSubmit={submit}>
          {mode === "register" && <>
            <label>Full name<input value={form.name} onChange={e => setForm({...form, name:e.target.value})} required /></label>
            <div className="two-col">
              <label>Age group<select value={form.age_group} onChange={e => setForm({...form, age_group:e.target.value})}>{Array.from({length:10},(_,i)=><option key={i}>{i*10}-{(i+1)*10}</option>)}</select></label>
              <label>Gender<select value={form.gender} onChange={e => setForm({...form, gender:e.target.value})}><option>Female</option><option>Male</option><option>Other</option></select></label>
              <label>Blood group<select value={form.blood_group} onChange={e => setForm({...form, blood_group:e.target.value})}>{["A+","A-","B+","B-","AB+","AB-","O+","O-","Unknown"].map(v=><option key={v}>{v}</option>)}</select></label>
            </div>
            <label>Phone (optional)<input value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} /></label>
          </>}
          <label>Username<input value={form.username} onChange={e => setForm({...form, username:e.target.value})} required /></label>
          <label>Password<input type="password" value={form.password} onChange={e => setForm({...form, password:e.target.value})} required /></label>
          {error && <div className={error.includes("successful") ? "notice success" : "notice error"}>{error}</div>}
          <button className="primary full" disabled={loading}>{loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create patient account"}</button>
        </form>

        <div className="demo-note">
          <ShieldCheck size={16} />
          <span>Demo admin: create it once with <b>POST /api/admin/create-demo</b></span>
        </div>
      </div>
    </div>
  );
}

function Layout({ title, session, nav, page, setPage, logout, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
        <div className="top-brand"><HeartPulse size={23}/><span>Hospital Readmission System</span></div>
        <div className="user-chip"><UserRound size={17}/><span>{session.name}</span></div>
      </header>
      <div className="body-layout">
        <aside className={"sidebar " + (open ? "open" : "")}>
          <div className="side-title">{title}</div>
          {nav.map(item => <button key={item.key} className={page === item.key ? "nav-item active" : "nav-item"} onClick={() => {setPage(item.key);setOpen(false)}}>{item.icon}{item.label}</button>)}
          <button className="nav-item logout" onClick={logout}><LogOut size={18}/>Sign out</button>
        </aside>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}

function PatientShell({ session, page, setPage, logout }) {
  const nav = [
    {key:"dashboard",label:"Dashboard",icon:<Home size={18}/>},
    {key:"prediction",label:"New Prediction",icon:<Activity size={18}/>},
    {key:"visits",label:"My Visits",icon:<ClipboardList size={18}/>},
    {key:"profile",label:"My Profile",icon:<UserRound size={18}/>}
  ];
  return <Layout title="Patient Portal" session={session} nav={nav} page={page} setPage={setPage} logout={logout}>
    {page === "dashboard" && <PatientDashboard session={session} setPage={setPage}/>}
    {page === "prediction" && <Prediction session={session} setPage={setPage}/>}
    {page === "visits" && <Visits session={session}/>}
    {page === "profile" && <Profile session={session}/>}
  </Layout>;
}

function PatientDashboard({session,setPage}) {
  const [data,setData] = useState(null);
  useEffect(()=>{ fetch(API+"/patient/me",{headers:{Authorization:"Bearer "+session.access_token}}).then(r=>r.json()).then(setData); },[]);
  const visits=data?.visits||[];
  const latest=visits[0];
  return <Page title={`Welcome back, ${session.name}`} subtitle={`Patient ID: ${session.patient_id}`}>
    <div className="stat-grid">
      <Stat title="Total visits" value={visits.length} icon={<CalendarDays/>}/>
      <Stat title="Last visit" value={latest ? new Date(latest.visit_date).toLocaleDateString() : "—"} icon={<ClipboardList/>}/>
      <Stat title="Latest risk" value={latest ? `${(latest.probability*100).toFixed(1)}%` : "—"} icon={<Activity/>}/>
    </div>
    <section className="hero-card">
      <div><span className="eyebrow">NEW ASSESSMENT</span><h2>Check your readmission risk</h2><p>Enter a small set of current visit and medical-history details for a model-generated risk estimate.</p></div>
      <button className="primary" onClick={()=>setPage("prediction")}>Start new prediction <ArrowRight size={17}/></button>
    </section>
    <section className="panel">
      <div className="panel-head"><div><h3>Recent visits</h3><p>Your previous assessment records</p></div><button className="text-btn" onClick={()=>setPage("visits")}>View all</button></div>
      <VisitTable visits={visits.slice(0,5)}/>
    </section>
  </Page>
}

function Stat({title,value,icon}) { return <div className="stat-card"><div className="stat-icon">{icon}</div><div><p>{title}</p><strong>{value}</strong></div></div> }

function Prediction({session,setPage}) {
  const [step,setStep]=useState(1);
  const [result,setResult]=useState(null);
  const [error,setError]=useState("");
  const [form,setForm]=useState({
    age_group:"50-60",gender:"Female",admission_type:"Emergency",
    time_in_hospital:4,num_diagnoses:5,num_medications:8,num_procedures:1,
    previous_visits:1,previous_emergency_visits:0,previous_outpatient_visits:1,
    diabetes_medication:"Yes",insulin:"No", blood_group:"Unknown",
    symptoms:[], symptom_severity:"None", symptom_duration:"Not applicable", symptom_notes:""
  });

  const set=(k,v)=>setForm({...form,[k]:v});
  const submit=async()=>{
    setError("");
    try {
      const res=await fetch(API+"/patient/predict",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify(form)});
      const data=await res.json();
      if(!res.ok) throw new Error(data.detail||"Prediction failed");
      setResult(data);
      setStep(4);
    } catch(e){setError(e.message)}
  };

  if(step===4 && result) return <Page title="Assessment result" subtitle="Model-generated readmission risk estimate">
    <div className="result-card">
      <CheckCircle2 className="result-icon" size={42}/>
      <span className="eyebrow">READMISSION ASSESSMENT</span>
      <div className="probability">{(result.probability*100).toFixed(1)}%</div>
      <h2>{result.risk_level}</h2>
      <p>Based on the information submitted, the Elastic Net model estimates this probability of readmission.</p>
      <div className="result-meta"><span>Assessment ID <b>{result.assessment_id}</b></span><span>{new Date(result.created_at).toLocaleString()}</span></div>
      <button className="primary" onClick={()=>setPage("visits")}>View my visits <ArrowRight size={17}/></button>
    </div>
  </Page>;

  const review = <div className="panel review"><h3>Review your information</h3>{Object.entries(form).map(([k,v])=><div className="review-row" key={k}><span>{k.replaceAll("_"," ")}</span><b>{Array.isArray(v)?(v.length?v.join(", "):"None reported"):v||"—"}</b></div>)}<div className="actions"><button className="secondary" onClick={()=>setStep(1)}>Edit</button><button className="primary" onClick={submit}>Predict risk <ArrowRight size={17}/></button></div></div>;

  return <Page title="New prediction" subtitle={`Step ${step} of 3 — patient-friendly assessment`}>
    {error && <div className="notice error">{error}</div>}
    {step<3 ? <div className="panel form-panel">
      <div className="progress"><span className={step>=1?"done":""}></span><span className={step>=2?"done":""}></span><span className={step>=3?"done":""}></span></div>
      {step===1 && <><h3>Current visit</h3><p className="muted">Tell us about the current hospital visit.</p>
        <div className="two-col">
          <Field label="Age group"><select value={form.age_group} onChange={e=>set("age_group",e.target.value)}>{Array.from({length:10},(_,i)=><option key={i}>{i*10}-{(i+1)*10}</option>)}</select></Field>
          <Field label="Gender"><select value={form.gender} onChange={e=>set("gender",e.target.value)}><option>Female</option><option>Male</option><option>Other</option></select></Field>
          <Field label="Admission type"><select value={form.admission_type} onChange={e=>set("admission_type",e.target.value)}><option>Emergency</option><option>Urgent</option><option>Elective</option><option>Casual Check-up</option></select></Field>
          <Field label="Blood group"><select value={form.blood_group} onChange={e=>set("blood_group",e.target.value)}>{["A+","A-","B+","B-","AB+","AB-","O+","O-","Unknown"].map(v=><option key={v}>{v}</option>)}</select></Field>
          <Field label="Time in hospital (days)"><input type="number" min="1" max="30" value={form.time_in_hospital} onChange={e=>set("time_in_hospital",+e.target.value)}/></Field>
        </div>
        <button className="primary next" onClick={()=>setStep(2)}>Next <ArrowRight size={17}/></button>
      </>}
      {step===2 && <><h3>Clinical and history information</h3><p className="muted">Use information available from the current or previous visits.</p>
        <div className="two-col">
          <Field label="Number of diagnoses"><input type="number" min="0" value={form.num_diagnoses} onChange={e=>set("num_diagnoses",+e.target.value)}/></Field>
          <Field label="Number of medications"><input type="number" min="0" value={form.num_medications} onChange={e=>set("num_medications",+e.target.value)}/></Field>
          <Field label="Number of procedures"><input type="number" min="0" value={form.num_procedures} onChange={e=>set("num_procedures",+e.target.value)}/></Field>
          <Field label="Previous hospital visits"><input type="number" min="0" value={form.previous_visits} onChange={e=>set("previous_visits",+e.target.value)}/></Field>
          <Field label="Previous emergency visits"><input type="number" min="0" value={form.previous_emergency_visits} onChange={e=>set("previous_emergency_visits",+e.target.value)}/></Field>
          <Field label="Previous outpatient visits"><input type="number" min="0" value={form.previous_outpatient_visits} onChange={e=>set("previous_outpatient_visits",+e.target.value)}/></Field>
          <Field label="Diabetes medication"><select value={form.diabetes_medication} onChange={e=>set("diabetes_medication",e.target.value)}><option>Yes</option><option>No</option></select></Field>
          <Field label="Insulin"><select value={form.insulin} onChange={e=>set("insulin",e.target.value)}><option>Yes</option><option>No</option></select></Field>
        </div>
        <div className="symptom-section">
          <h4>Current symptoms</h4>
          <p className="muted">Select any symptoms you are experiencing. These are recorded with the visit; the current ML model does not use symptoms as prediction features.</p>
          <div className="symptom-grid">{["Fever","Cough","Shortness of breath","Chest pain","Fatigue","Dizziness","Headache","Nausea or vomiting","Abdominal pain","Swelling","Frequent urination","Increased thirst","Loss of appetite","Other symptom"].map(sym=><label className="check-item" key={sym}><input type="checkbox" checked={form.symptoms.includes(sym)} onChange={e=>set("symptoms",e.target.checked?[...form.symptoms,sym]:form.symptoms.filter(x=>x!==sym))}/><span>{sym}</span></label>)}</div>
          <div className="two-col">
            <Field label="Symptom severity"><select value={form.symptom_severity} onChange={e=>set("symptom_severity",e.target.value)}><option>None</option><option>Mild</option><option>Moderate</option><option>Severe</option></select></Field>
            <Field label="How long have you had symptoms?"><select value={form.symptom_duration} onChange={e=>set("symptom_duration",e.target.value)}><option>Not applicable</option><option>Less than 1 day</option><option>1-3 days</option><option>4-7 days</option><option>More than 1 week</option><option>More than 1 month</option></select></Field>
          </div>
          <Field label="Additional symptom details"><textarea rows="3" value={form.symptom_notes} onChange={e=>set("symptom_notes",e.target.value)} placeholder="Describe anything else you want the care team to know" /></Field>
        </div>
        <div className="actions"><button className="secondary" onClick={()=>setStep(1)}>Back</button><button className="primary" onClick={()=>setStep(3)}>Review <ArrowRight size={17}/></button></div>
      </>}
    </div> : review}
  </Page>
}

function Field({label,children}) {return <label>{label}{children}</label>}

function Visits({session}) {
  const [data,setData]=useState(null);
  useEffect(()=>{fetch(API+"/patient/me",{headers:{Authorization:"Bearer "+session.access_token}}).then(r=>r.json()).then(setData)},[]);
  return <Page title="My visits" subtitle="Previous readmission assessments">
    <div className="panel"><VisitTable visits={data?.visits||[]}/></div>
  </Page>
}

function VisitTable({visits}) {
  if(!visits.length) return <div className="empty"><ClipboardList size={30}/><h3>No visits yet</h3><p>Your completed assessments will appear here.</p></div>;
  return <div className="table-wrap"><table><thead><tr><th>Date</th><th>Assessment</th><th>Admission</th><th>Probability</th><th>Risk</th></tr></thead><tbody>{visits.map(v=><tr key={v.assessment_id}><td>{new Date(v.visit_date).toLocaleDateString()}</td><td>{v.assessment_id}</td><td>{v.admission_type}</td><td>{(v.probability*100).toFixed(1)}%</td><td><span className={"badge "+v.risk_level.toLowerCase().replaceAll(" ","-")}>{v.risk_level}</span></td></tr>)}</tbody></table></div>
}

function Profile({session}) {
  const [data,setData]=useState(null);
  useEffect(()=>{fetch(API+"/patient/me",{headers:{Authorization:"Bearer "+session.access_token}}).then(r=>r.json()).then(setData)},[]);
  return <Page title="My profile" subtitle="Your account information"><div className="panel profile"><UserRound size={42}/><h2>{data?.name||session.name}</h2><p>Patient ID: <b>{data?.patient_id||session.patient_id}</b></p><p>Age group: {data?.age_group||"—"}</p><p>Gender: {data?.gender||"—"}</p><p>Blood group: {data?.blood_group||"—"}</p><p>Phone: {data?.phone||"—"}</p></div></Page>
}

function AdminShell({session,page,setPage,logout}) {
  const nav=[{key:"dashboard",label:"Dashboard",icon:<Home size={18}/>},{key:"patients",label:"Patients",icon:<Users size={18}/>},{key:"visits",label:"Visit records",icon:<ClipboardList size={18}/>},{key:"model",label:"Model performance",icon:<BarChart3 size={18}/>}];
  return <Layout title="Administration" session={session} nav={nav} page={page} setPage={setPage} logout={logout}>
    {page==="dashboard"&&<AdminDashboard session={session}/>}
    {page==="patients"&&<AdminPatients session={session}/>}
    {page==="visits"&&<AdminPatients session={session}/>}
    {page==="model"&&<ModelPage/>}
  </Layout>
}

function AdminDashboard({session}) {
  const [s,setS]=useState(null);
  useEffect(()=>{fetch(API+"/admin/summary",{headers:{Authorization:"Bearer "+session.access_token}}).then(r=>r.json()).then(setS)},[]);
  return <Page title="Administration dashboard" subtitle="System overview">
    <div className="stat-grid"><Stat title="Registered patients" value={s?.patients??"—"} icon={<Users/>}/><Stat title="Assessments" value={s?.assessments??"—"} icon={<ClipboardList/>}/><Stat title="Elevated-risk assessments" value={s?.elevated_risk??"—"} icon={<AlertTriangle/>}/></div>
    <div className="panel"><div className="panel-head"><div><h3>Clinical decision-support portal</h3><p>Use the navigation to review patients and assessment activity.</p></div><ShieldCheck size={30}/></div></div>
  </Page>
}

function AdminPatients({session}) {
  const [rows,setRows]=useState([]);
  useEffect(()=>{fetch(API+"/admin/patients",{headers:{Authorization:"Bearer "+session.access_token}}).then(r=>r.json()).then(setRows)},[]);
  return <Page title="Patients" subtitle="Registered patient accounts and latest assessments"><div className="panel"><div className="table-wrap"><table><thead><tr><th>Patient ID</th><th>Name</th><th>Gender</th><th>Visits</th><th>Latest risk</th></tr></thead><tbody>{rows.map(r=><tr key={r.patient_id}><td>{r.patient_id}</td><td>{r.name}</td><td>{r.gender||"—"}</td><td>{r.visits}</td><td>{r.latest_probability==null?"—":`${(r.latest_probability*100).toFixed(1)}%`}</td></tr>)}</tbody></table></div></div></Page>
}

function ModelPage() {
  return <Page title="Model performance" subtitle="Elastic Net regularized Logistic Regression"><div className="panel"><div className="model-grid"><Metric label="Accuracy" value="67.79%"/><Metric label="Precision" value="17.16%"/><Metric label="Recall" value="49.32%"/><Metric label="F1-score" value="25.46%"/><Metric label="ROC-AUC" value="64.25%"/></div><div className="notice info">Metrics are from the compact patient-facing Elastic Net model trained on the supplied UCI hospital dataset with a stratified 80/20 holdout split. For real clinical use, independent clinical validation is required.</div></div></Page>
}
function Metric({label,value}){return <div className="metric"><span>{label}</span><strong>{value}</strong></div>}
function Page({title,subtitle,children}){return <><div className="page-heading"><div><h1>{title}</h1><p>{subtitle}</p></div></div>{children}</>}

createRoot(document.getElementById("root")).render(<App/>);
