import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as recharts from "recharts";
import _ from "lodash";
import {
  Shield, MapPin, BarChart3, FileText, AlertTriangle, TrendingUp,
  Database, Clock, Filter, RefreshCw, Eye, Send, Plus, X, Check,
  Loader2, Layers, Activity, Target, Zap, Globe, Bell, Users,
  MessageSquare, ThumbsUp, MapPinned, Phone, ChevronRight,
  ArrowUpRight, ArrowDownRight, Search, Star, Heart, Flag,
  Megaphone, UserCheck, AlertCircle, Info, CheckCircle2, Radio,
  Navigation, Bookmark, Hash, Award, Flame, CircleDot
} from "lucide-react";


const {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart,
  Scatter, ZAxis, ComposedChart
} = recharts;

/* ═══════════════════════════════════════════════════════════════
   THEME & PALETTE — "Midnight Operations" aesthetic
   ═══════════════════════════════════════════════════════════════ */
const T = {
  bg: "#ffffff",
  bgAlt: "#f8fafc",

  surface: "#ffffff",
  surfaceHover: "#f1f5f9",
  surfaceAlt: "#f8fafc",
  surfaceBright: "#ffffff",

  border: "#e5e7eb",
  borderLight: "#eef2f7",

  accent: "#2563eb",
  accentDim: "rgba(37,99,235,.08)",
  accentMid: "rgba(37,99,235,.18)",
  accentBright: "#1d4ed8",

  blue: "#2563eb",
  blueDim: "rgba(37,99,235,.08)",

  red: "#dc2626",
  redDim: "rgba(220,38,38,.08)",

  amber: "#d97706",
  amberDim: "rgba(217,119,6,.08)",

  purple: "#7c3aed",
  purpleDim: "rgba(124,58,237,.08)",

  cyan: "#0891b2",
  cyanDim: "rgba(8,145,178,.08)",

  rose: "#e11d48",
  pink: "#db2777",

  text: "#0f172a",
  textSecondary: "#334155",
  textMuted: "#64748b",
  textDim: "#94a3b8",
};


const COLORS_CHART = [T.accent, T.blue, T.amber, T.purple, T.cyan, T.rose, T.pink, "#fb923c", "#34d399", "#818cf8", "#a3e635", "#e879f9"];

/* ═══════════════════════════════════════════════════════════════
   MOCK DATA GENERATORS
   ═══════════════════════════════════════════════════════════════ */
const CRIME_TYPES = ["Anti-social behaviour","Burglary","Criminal damage","Drugs","Public order","Robbery","Shoplifting","Theft","Vehicle crime","Violence"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const UK_REGIONS = [
  { name:"London", lat:51.5074, lng:-0.1278, crimes:84230, trend:-2.3, pop:8982000 },
  { name:"Manchester", lat:53.4808, lng:-2.2426, crimes:32450, trend:1.8, pop:553230 },
  { name:"Birmingham", lat:52.4862, lng:-1.8904, crimes:28900, trend:-0.5, pop:1144900 },
  { name:"Leeds", lat:53.8008, lng:-1.5491, crimes:21340, trend:3.1, pop:812000 },
  { name:"Liverpool", lat:53.4084, lng:-2.9916, crimes:19870, trend:-1.2, pop:496784 },
  { name:"Bristol", lat:51.4545, lng:-2.5879, crimes:15230, trend:0.9, pop:472400 },
  { name:"Sheffield", lat:53.3811, lng:-1.4701, crimes:14560, trend:2.4, pop:584853 },
  { name:"Newcastle", lat:54.9783, lng:-1.6178, crimes:12890, trend:-3.1, pop:302820 },
  { name:"Nottingham", lat:52.9548, lng:-1.1581, crimes:11200, trend:1.5, pop:337100 },
  { name:"Glasgow", lat:55.8642, lng:-4.2518, crimes:18760, trend:-0.8, pop:635640 },
  { name:"Edinburgh", lat:55.9533, lng:-3.1883, crimes:10340, trend:-1.9, pop:542598 },
  { name:"Cardiff", lat:51.4816, lng:-3.1791, crimes:9870, trend:0.3, pop:369202 },
  { name:"Southampton", lat:50.9097, lng:-1.4044, crimes:8450, trend:2.1, pop:256698 },
  { name:"Leicester", lat:52.6369, lng:-1.1398, crimes:10980, trend:1.7, pop:368600 },
  { name:"Coventry", lat:52.4068, lng:-1.5197, crimes:9230, trend:-0.4, pop:379387 },
];

const genMonthly = () => MONTHS.map((m, i) => {
  const row = { month: m };
  CRIME_TYPES.forEach(ct => {
    const base = { "Violence": 5200, "Theft": 3100, "Anti-social behaviour": 4200, "Shoplifting": 2400, "Criminal damage": 2100, "Vehicle crime": 1900, "Burglary": 1800, "Public order": 1500, "Drugs": 1200, "Robbery": 800 }[ct] || 1500;
    row[ct] = base + Math.floor(Math.random() * base * 0.4 - base * 0.2 + Math.sin(i / 2) * base * 0.15);
  });
  row.total = CRIME_TYPES.reduce((s, t) => s + row[t], 0);
  return row;
});

const genPredictions = () => ["Jan'27","Feb'27","Mar'27","Apr'27","May'27","Jun'27"].map((m, i) => ({
  month: m,
  predicted: 22000 + Math.floor(Math.sin(i / 1.5) * 3000 + Math.random() * 1000),
  lower: 19000 + Math.floor(Math.sin(i / 1.5) * 2500),
  upper: 25000 + Math.floor(Math.sin(i / 1.5) * 3500 + Math.random() * 500),
}));

const genBreakdown = () => CRIME_TYPES.map((t, i) => ({
  name: t, value: Math.floor(Math.random() * 8000 + 2000), color: COLORS_CHART[i]
}));

const genHeatmap = () => {
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  return days.flatMap((d, di) => Array.from({ length: 24 }, (_, h) => ({
    day: d, dayIdx: di, hour: h,
    value: Math.floor(20 + Math.random() * 80 + (h >= 18 && h <= 23 ? 40 : 0) + (h >= 0 && h <= 4 ? 30 : 0) + (di >= 4 ? 25 : 0))
  })));
};

const SAMPLE_REPORTS = [
  { id:1, type:"Theft", location:"Oxford Street, London", date:"2026-04-12", status:"Under Review", severity:"Medium", desc:"Phone snatched near tube station", anonymous:false, name:"Sarah M." },
  { id:2, type:"Anti-social behaviour", location:"Piccadilly Gardens, Manchester", date:"2026-04-11", status:"Acknowledged", severity:"Low", desc:"Group causing disturbance in park area", anonymous:true },
  { id:3, type:"Burglary", location:"Edgbaston, Birmingham", date:"2026-04-10", status:"Investigating", severity:"High", desc:"Break-in at residential property, items stolen", anonymous:false, name:"James W." },
  { id:4, type:"Vehicle crime", location:"Headingley, Leeds", date:"2026-04-09", status:"Resolved", severity:"Medium", desc:"Car window smashed, GPS unit stolen", anonymous:false, name:"Priya K." },
  { id:5, type:"Violence", location:"Temple Bar, Bristol", date:"2026-04-08", status:"Investigating", severity:"High", desc:"Assault reported outside nightclub", anonymous:true },
];

const COMMUNITY_POSTS = [
  { id:1, author:"PC Sarah Chen", role:"officer", avatar:"SC", title:"Neighbourhood Watch Update — Riverside Ward", body:"We've seen a 15% drop in burglaries this quarter thanks to increased patrols and your reports. Keep an eye out for suspicious activity near garages.", time:"2 hours ago", likes:34, replies:8, pinned:true, category:"update" },
  { id:2, author:"Mark Thompson", role:"resident", avatar:"MT", title:"Suspicious activity on Elm Street after dark", body:"Noticed an unmarked van parked outside number 42 for three consecutive nights between 11pm-2am. Different people each time.", time:"5 hours ago", likes:12, replies:15, category:"concern" },
  { id:3, author:"Neighbourhood Watch", role:"organisation", avatar:"NW", title:"Community Safety Meeting — April 20th", body:"Join us at St. Andrew's Community Hall at 7pm. Topics include bike theft prevention, CCTV funding, and the new street lighting proposal.", time:"1 day ago", likes:28, replies:4, category:"event" },
  { id:4, author:"DCI Roberts", role:"officer", avatar:"DR", title:"Operation Nightfall — Results", body:"Our targeted operation resulted in 12 arrests for drug-related offences in the Westgate area. Thank you for the community intelligence that made this possible.", time:"2 days ago", likes:89, replies:21, pinned:true, category:"success" },
  { id:5, author:"Fatima Al-Hassan", role:"resident", avatar:"FA", title:"Thank you to officers on Park Lane!", body:"Quick response to a shoplifting incident yesterday. The officers were professional and kept everyone safe.", time:"3 days ago", likes:45, replies:6, category:"praise" },
  { id:6, author:"Tom Davies", role:"volunteer", avatar:"TD", title:"Volunteer patrol schedule — Week 16", body:"We need volunteers for Tuesday and Thursday evening shifts. Sign up via the community hub or reply here.", time:"3 days ago", likes:18, replies:11, category:"volunteer" },
];

const SAFETY_ALERTS = [
  { id:1, area:"Riverside Ward", type:"Burglary spike", level:"high", msg:"3 break-ins reported this week targeting ground-floor flats. Secure windows before leaving." },
  { id:2, area:"City Centre", type:"Pickpocketing", level:"medium", msg:"Increased reports near market square. Keep valuables secure in busy areas." },
  { id:3, area:"Westgate", type:"Drug activity", level:"low", msg:"Following Operation Nightfall, activity has decreased. Remain vigilant." },
];

/* ═══════════════════════════════════════════════════════════════
   REUSABLE COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

const Glow = ({ color = T.accent, size = 200, top, right, left, bottom, opacity = 0.03 }) => (
  <div style={{ position:"absolute", width:size, height:size, borderRadius:"50%", background:`radial-gradient(circle, ${color}, transparent 70%)`, opacity, top, right, left, bottom, pointerEvents:"none" }} />
);

function StatCard({ icon: Icon, label, value, change, color = T.accent, subtitle }) {
  const up = change > 0;
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, padding:"20px 22px", position:"relative", overflow:"hidden", transition:"border-color .25s" }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
      <Glow color={color} size={100} top={-30} right={-30} opacity={0.1} />
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <div style={{ width:38, height:38, borderRadius:10, background:`${color}15`, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Icon size={18} color={color} />
        </div>
        <span style={{ fontSize:11, color:T.textSecondary, textTransform:"uppercase", letterSpacing:1.2, fontFamily:"'IBM Plex Mono', monospace" }}>{label}</span>
      </div>
      <div style={{ fontSize:30, fontWeight:800, color:T.text, fontFamily:"'Sora', sans-serif", letterSpacing:"-0.5px" }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {subtitle && <div style={{ fontSize:11, color:T.textMuted, marginTop:4 }}>{subtitle}</div>}
      {change !== undefined && (
        <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:8, fontSize:12, color:up ? T.red : T.accent, fontFamily:"'IBM Plex Mono', monospace" }}>
          {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {Math.abs(change)}% vs last month
        </div>
      )}
    </div>
  );
}

function Badge({ children, color = T.accent, small }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", fontSize: small ? 10 : 11, padding: small ? "2px 7px" : "3px 10px", borderRadius:20, background:`${color}18`, color, fontFamily:"'IBM Plex Mono', monospace", fontWeight:500, whiteSpace:"nowrap" }}>
      {children}
    </span>
  );
}

function TabButton({ active, onClick, icon: Icon, label, badge }) {
  return (
    <button onClick={onClick} style={{
      padding:"9px 18px", borderRadius:10, border:"none", cursor:"pointer",
      background: active ? T.accentDim : "transparent",
      color: active ? T.accent : T.textSecondary,
      fontSize:13, fontWeight:500, display:"flex", alignItems:"center", gap:7,
      transition:"all .2s", fontFamily:"'Sora', sans-serif", position:"relative",
    }}>
      <Icon size={15} />{label}
      {badge && <span style={{ position:"absolute", top:4, right:6, width:8, height:8, borderRadius:"50%", background:T.red }} />}
    </button>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, right }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
      <div>
        <h2 style={{ fontSize:24, fontWeight:800, margin:0, fontFamily:"'Sora', sans-serif", display:"flex", alignItems:"center", gap:12 }}>
          <Icon size={24} color={T.accent} style={{ opacity:.8 }} />{title}
        </h2>
        {subtitle && <p style={{ color:T.textSecondary, fontSize:13, margin:"6px 0 0", maxWidth:500 }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function Panel({ children, style: s = {}, hover }) {
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, padding:22, position:"relative", overflow:"hidden", transition:"border-color .2s", ...s }}
      onMouseEnter={hover ? e => e.currentTarget.style.borderColor = T.borderLight : undefined}
      onMouseLeave={hover ? e => e.currentTarget.style.borderColor = T.border : undefined}>
      {children}
    </div>
  );
}

function InputField({ label, value, onChange, type = "text", placeholder, options, rows }) {
  const shared = { width:"100%", padding:"10px 14px", background:T.surfaceAlt, border:`1px solid ${T.border}`, borderRadius:9, color:T.text, fontSize:13, fontFamily:"'Sora', sans-serif", boxSizing:"border-box", outline:"none", transition:"border-color .2s" };
  return (
    <div>
      {label && <label style={{ fontSize:11, color:T.textSecondary, textTransform:"uppercase", letterSpacing:1.2, marginBottom:7, display:"block", fontFamily:"'IBM Plex Mono', monospace" }}>{label}</label>}
      {options ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={shared} onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.border}>
          {options.map(o => <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>{typeof o === "string" ? o : o.label}</option>)}
        </select>
      ) : rows ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder} style={{ ...shared, resize:"vertical" }} onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.border} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={shared} onFocus={e => e.target.style.borderColor = T.accent} onBlur={e => e.target.style.borderColor = T.border} />
      )}
    </div>
  );
}

function PrimaryBtn({ children, onClick, disabled, variant = "primary", small, icon: Icon }) {
  const styles = {primary: {background: T.accent, color: "#ffffff",boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
  },secondary: { background: T.surfaceHover, color: T.text, border: `1px solid ${T.border}` },danger: { 
    background: T.red, 
    color: "#ffffff" 
  },ghost: { 
    background: "transparent", 
    color: T.textSecondary, 
    border: `1px solid ${T.border}` 
  },
};
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small ? "7px 14px" : "11px 22px", borderRadius:9, border:"none", cursor: disabled ? "wait" : "pointer",
      fontWeight:700, fontSize: small ? 12 : 13, display:"inline-flex", alignItems:"center", gap:7,
      fontFamily:"'Sora', sans-serif", transition:"all .2s", opacity: disabled ? .6 : 1,
      ...styles[variant],
    }}>
      {Icon && <Icon size={small ? 13 : 15} />}{children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LEAFLET MAP
   ═══════════════════════════════════════════════════════════════ */
function LeafletMap({ regions, selectedRegion, onSelect }) {
  const mapRef = useRef(null);
  const mapObjRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || mapObjRef.current) return;
    const link = document.createElement("link");
    link.rel = "stylesheet"; 
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.crossOrigin = "anonymous";
    script.onload = () => {
      const L = window.L;
      const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([54.0, -2.5], 6);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
      regions.forEach(r => {
        const intensity = Math.min(r.crimes / 85000, 1);
        const radius = 8 + intensity * 32;
        const color = r.trend > 0 ? "#ef4444" : "#22d3a7";
        const circle = L.circleMarker([r.lat, r.lng], { radius, fillColor: color, color, weight: 2, opacity: 0.9, fillOpacity: 0.3 }).addTo(map);
        circle.bindTooltip(`<div style="font-family:'Sora',sans-serif;font-weight:700;font-size:13px;margin-bottom:2px">${r.name}</div><div style="font-size:11px;color:#8494b0">${r.crimes.toLocaleString()} crimes &bull; ${r.trend > 0 ? "+" : ""}${r.trend}%</div>`, { className: "cmap-tip", direction: "top" });
        circle.on("click", () => onSelect(r));
      });
      mapObjRef.current = map;
    };
    document.head.appendChild(script);
    return () => { if (mapObjRef.current) mapObjRef.current.remove(); mapObjRef.current = null; };
  }, []);

  useEffect(() => {
    if (mapObjRef.current && selectedRegion) mapObjRef.current.flyTo([selectedRegion.lat, selectedRegion.lng], 10, { duration: 1 });
  }, [selectedRegion]);

  return (
    <div style={{ borderRadius:14, overflow:"hidden", border:`1px solid ${T.border}`, position:"relative" }}>
      <div ref={mapRef} style={{ height:480, width:"100%", background:T.bg }} />
      <style>{`.cmap-tip{background:${T.surface}!important;border:1px solid ${T.border}!important;color:${T.text}!important;border-radius:10px!important;padding:10px 14px!important;box-shadow:0 12px 40px rgba(0,0,0,.6)!important}.cmap-tip::before{border-top-color:${T.border}!important}.leaflet-control-zoom a{background:${T.surface}!important;color:${T.accent}!important;border-color:${T.border}!important}`}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HEATMAP GRID
   ═══════════════════════════════════════════════════════════════ */
function HeatmapGrid({ data }) {
  const maxVal = Math.max(...data.map(d => d.value));
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const [hovered, setHovered] = useState(null);
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"50px repeat(24, 1fr)", gap:2, minWidth:650 }}>
        <div />
        {Array.from({ length: 24 }, (_, i) => (
          <div key={i} style={{ fontSize:9, color:T.textDim, textAlign:"center", fontFamily:"'IBM Plex Mono', monospace" }}>{i.toString().padStart(2, "0")}</div>
        ))}
        {days.map((day, di) => (
          <React.Fragment key={di}>
            <div style={{ fontSize:11, color:T.textSecondary, display:"flex", alignItems:"center", fontFamily:"'IBM Plex Mono', monospace" }}>{day}</div>
            {Array.from({ length: 24 }, (_, h) => {
              const cell = data.find(d => d.dayIdx === di && d.hour === h);
              const val = cell?.value || 0;
              const intensity = val / maxVal;
              const isHovered = hovered?.d === di && hovered?.h === h;
              return (
                <div key={`${di}-${h}`} style={{
                  aspectRatio:"1", borderRadius:3, cursor:"crosshair",
                  background: `rgba(34, 211, 167, ${intensity * 0.85})`,
                  transform: isHovered ? "scale(1.5)" : "scale(1)",
                  transition:"transform .12s", zIndex: isHovered ? 10 : 1, position:"relative",
                }}
                  onMouseEnter={() => setHovered({ d: di, h })}
                  onMouseLeave={() => setHovered(null)}
                  title={`${day} ${h}:00 — ${val} incidents`}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:16, justifyContent:"center" }}>
        <span style={{ fontSize:10, color:T.textDim }}>Low</span>
        {[.08,.2,.35,.5,.65,.8].map(o => <div key={o} style={{ width:22, height:12, borderRadius:3, background:`rgba(34,211,167,${o})` }} />)}
        <span style={{ fontSize:10, color:T.textDim }}>High</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCRAPER PANEL
   ═══════════════════════════════════════════════════════════════ */
function ScraperView() {
  const [source, setSource] = useState("police-api");
  const [dateRange, setDateRange] = useState("2026-03");
  const [force, setForce] = useState("metropolitan");
  const [scraping, setScraping] = useState(false);
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);

  const startScrape = () => {
    setLogs([]); setScraping(true); setProgress(0);
    const steps = [
      { t:400, msg:"Initialising BeautifulSoup scraper...", p:5 },
      { t:1100, msg:`Connecting to data.police.uk API endpoint...`, p:12 },
      { t:1900, msg:`GET /api/crimes-no-location?force=${force}&date=${dateRange}`, p:20 },
      { t:2600, msg:"Response 200 OK — Parsing JSON response...", p:30 },
      { t:3300, msg:"Fallback: Scraping HTML with BeautifulSoup (lxml parser)...", p:40 },
      { t:3900, msg:"Extracting <table> elements and <tr> rows from DOM...", p:50 },
      { t:4500, msg:"Parsing CSV download links found in page...", p:58 },
      { t:5100, msg:"Cleaning: Removing 247 null/empty records...", p:65 },
      { t:5600, msg:"Normalising crime category slugs to standard taxonomy...", p:72 },
      { t:6100, msg:"Validating UK coordinate bounds (lat 49-61, lng -11 to 2)...", p:80 },
      { t:6600, msg:"Deduplicating by persistent_id — 847 duplicates removed", p:88 },
      { t:7100, msg:"Bulk inserting 24,831 cleaned records into Django ORM...", p:95 },
      { t:7600, msg:"✓ Pipeline complete — 24,831 records stored in PostgreSQL", p:100 },
    ];
    steps.forEach(({ t, msg, p }) => setTimeout(() => {
      setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg }]);
      setProgress(p);
    }, t));
    setTimeout(() => setScraping(false), 7700);
  };

  return (
    <div style={{ animation:"fadeUp .4s ease" }}>
      <SectionHeader icon={Database} title="Data Scraper" subtitle="Scrape, parse, clean, and ingest UK crime data using BeautifulSoup from official police sources" />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:24 }}>
        <Panel>
          <h3 style={{ fontSize:15, fontWeight:700, marginBottom:20, fontFamily:"'Sora', sans-serif", display:"flex", alignItems:"center", gap:8 }}>
            <Database size={15} color={T.accent} />Scrape Configuration
          </h3>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <InputField label="Data Source" value={source} onChange={setSource} options={[
              { value:"police-api", label:"data.police.uk (Official API)" },
              { value:"ons", label:"ONS Crime Statistics" },
              { value:"home-office", label:"Home Office Data Hub" }
            ]} />
            <InputField label="Police Force" value={force} onChange={setForce} options={[
              { value:"metropolitan", label:"Metropolitan Police" },
              { value:"gmp", label:"Greater Manchester Police" },
              { value:"west-midlands", label:"West Midlands Police" },
              { value:"west-yorkshire", label:"West Yorkshire Police" },
              { value:"merseyside", label:"Merseyside Police" },
              { value:"all", label:"All Forces (UK-wide)" },
            ]} />
            <InputField label="Date Range" value={dateRange} onChange={setDateRange} type="month" />
            <PrimaryBtn onClick={startScrape} disabled={scraping} icon={scraping ? Loader2 : Zap}>
              {scraping ? "Scraping..." : "Start Scrape"}
            </PrimaryBtn>
          </div>
        </Panel>
        <Panel>
          <h3 style={{ fontSize:15, fontWeight:700, marginBottom:12, fontFamily:"'Sora', sans-serif", display:"flex", alignItems:"center", gap:8 }}>
            <Activity size={15} color={T.accent} />Scrape Log
          </h3>
          {scraping && (
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:T.textSecondary, marginBottom:5 }}>
                <span>Progress</span><span style={{ fontFamily:"'IBM Plex Mono', monospace" }}>{progress}%</span>
              </div>
              <div style={{ height:6, background:T.surfaceAlt, borderRadius:3, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${progress}%`, background:`linear-gradient(90deg, ${T.accent}, ${T.accentBright})`, borderRadius:3, transition:"width .4s ease" }} />
              </div>
            </div>
          )}
          <div style={{ maxHeight:310, overflowY:"auto", fontFamily:"'IBM Plex Mono', monospace", fontSize:11.5 }}>
            {logs.length === 0 ? (
              <div style={{ color:T.textDim, padding:30, textAlign:"center" }}>Awaiting scrape command...</div>
            ) : logs.map((l, i) => (
              <div key={i} style={{ padding:"5px 0", borderBottom:`1px solid ${T.border}15`, display:"flex", gap:10, animation:"fadeUp .25s ease" }}>
                <span style={{ color:T.textDim, whiteSpace:"nowrap", flexShrink:0 }}>{l.time}</span>
                <span style={{ color: l.msg.startsWith("✓") ? T.accent : l.msg.startsWith("GET") ? T.blue : T.text }}>{l.msg}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel>
        <h3 style={{ fontSize:15, fontWeight:700, marginBottom:18, fontFamily:"'Sora', sans-serif" }}>Data Pipeline Architecture</h3>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:14 }}>
          {[
            { step:"01", title:"Scrape", desc:"BeautifulSoup + Requests fetch HTML/JSON from data.police.uk", icon:Globe, color:T.accent },
            { step:"02", title:"Parse", desc:"Extract tables, rows, CSV links, and structured data from DOM", icon:Search, color:T.blue },
            { step:"03", title:"Clean", desc:"Remove nulls, normalise categories, validate coordinates", icon:Filter, color:T.amber },
            { step:"04", title:"Store", desc:"Bulk insert cleaned records via Django ORM to PostgreSQL", icon:Database, color:T.purple },
            { step:"05", title:"Analyse", desc:"Run ARIMA forecasting, hotspot detection, trend analysis", icon:TrendingUp, color:T.rose },
          ].map((s, i) => (
            <div key={s.step} style={{ background:T.surfaceAlt, border:`1px solid ${T.border}`, borderRadius:12, padding:18, textAlign:"center", position:"relative" }}>
              <div style={{ position:"absolute", top:10, left:12, fontSize:10, color:T.textDim, fontFamily:"'IBM Plex Mono', monospace" }}>{s.step}</div>
              <div style={{ width:44, height:44, borderRadius:"50%", background:`${s.color}14`, display:"flex", alignItems:"center", justifyContent:"center", margin:"4px auto 12px" }}>
                <s.icon size={20} color={s.color} />
              </div>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:6, fontFamily:"'Sora', sans-serif" }}>{s.title}</div>
              <div style={{ fontSize:11, color:T.textSecondary, lineHeight:1.5 }}>{s.desc}</div>
              {i < 4 && <ChevronRight size={16} color={T.textDim} style={{ position:"absolute", right:-10, top:"50%", transform:"translateY(-50%)" }} />}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   REPORT PORTAL
   ═══════════════════════════════════════════════════════════════ */
function ReportPortal({ reports, onSubmit }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type:"Theft", location:"", desc:"", severity:"Medium", name:"", email:"", anonymous:false });
  const [filter, setFilter] = useState("All");
  const statusColor = { "Under Review":T.amber, "Acknowledged":T.blue, "Investigating":T.accent, "Resolved":"#34d399" };
  const sevColor = { Low:T.blue, Medium:T.amber, High:T.red };
  const filtered = filter === "All" ? reports : reports.filter(r => r.status === filter);

  return (
    <div style={{ animation:"fadeUp .4s ease" }}>
      <SectionHeader icon={FileText} title="Report Portal" subtitle="Submit, track, and manage crime incident reports with full lifecycle tracking"
        right={<PrimaryBtn onClick={() => setShowForm(!showForm)} icon={showForm ? X : Plus}>{showForm ? "Cancel" : "New Report"}</PrimaryBtn>} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:14, marginBottom:24 }}>
        <StatCard icon={FileText} label="Total Reports" value={reports.length} color={T.accent} />
        <StatCard icon={Eye} label="Under Review" value={reports.filter(r => r.status === "Under Review").length} color={T.amber} />
        <StatCard icon={Search} label="Investigating" value={reports.filter(r => r.status === "Investigating").length} color={T.blue} />
        <StatCard icon={CheckCircle2} label="Resolved" value={reports.filter(r => r.status === "Resolved").length} color="#34d399" />
      </div>
      {showForm && (
        <Panel style={{ borderColor:T.accent+"30", marginBottom:20, animation:"fadeUp .3s ease" }}>
          <h3 style={{ fontSize:16, fontWeight:700, marginBottom:18, fontFamily:"'Sora', sans-serif" }}>Submit Incident Report</h3>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
            <InputField label="Crime Type" value={form.type} onChange={v => setForm({...form, type:v})} options={CRIME_TYPES} />
            <InputField label="Severity" value={form.severity} onChange={v => setForm({...form, severity:v})} options={["Low","Medium","High"]} />
            <InputField label="Your Name (optional)" value={form.name} onChange={v => setForm({...form, name:v})} placeholder="Leave blank for anonymous" />
            <div style={{ gridColumn:"1 / -1" }}>
              <InputField label="Location" value={form.location} onChange={v => setForm({...form, location:v})} placeholder="e.g. Oxford Street, London" />
            </div>
            <div style={{ gridColumn:"1 / 3" }}>
              <InputField label="Description" value={form.desc} onChange={v => setForm({...form, desc:v})} rows={3} placeholder="Describe the incident in detail..." />
            </div>
            <div>
              <InputField label="Email (optional)" value={form.email} onChange={v => setForm({...form, email:v})} type="email" placeholder="For status updates" />
              <label style={{ display:"flex", alignItems:"center", gap:8, marginTop:12, fontSize:12, color:T.textSecondary, cursor:"pointer" }}>
                <input type="checkbox" checked={form.anonymous} onChange={e => setForm({...form, anonymous:e.target.checked})} />
                Submit anonymously
              </label>
            </div>
          </div>
          <div style={{ marginTop:18, display:"flex", gap:10 }}>
            <PrimaryBtn onClick={() => { onSubmit(form); setShowForm(false); setForm({ type:"Theft", location:"", desc:"", severity:"Medium", name:"", email:"", anonymous:false }); }} icon={Send}>Submit Report</PrimaryBtn>
            <PrimaryBtn variant="ghost" onClick={() => setShowForm(false)}>Cancel</PrimaryBtn>
          </div>
        </Panel>
      )}
      <div style={{ display:"flex", gap:6, marginBottom:16 }}>
        {["All","Under Review","Investigating","Acknowledged","Resolved"].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding:"6px 14px", borderRadius:20, border:`1px solid ${filter===s ? T.accent : T.border}`,
            background: filter===s ? T.accentDim : "transparent",
            color: filter===s ? T.accent : T.textSecondary, fontSize:12, cursor:"pointer", fontFamily:"'Sora', sans-serif",
          }}>{s}</button>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filtered.map(r => (
          <div key={r.id} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:"16px 20px", display:"flex", alignItems:"center", gap:16, transition:"border-color .2s", cursor:"pointer" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = T.borderLight}
            onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
            <div style={{ width:42, height:42, borderRadius:10, background:`${sevColor[r.severity]}14`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <AlertTriangle size={18} color={sevColor[r.severity]} />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:5 }}>
                <span style={{ fontWeight:700, fontSize:14, fontFamily:"'Sora', sans-serif" }}>{r.type}</span>
                <Badge color={statusColor[r.status]}>{r.status}</Badge>
                <Badge color={sevColor[r.severity]} small>{r.severity}</Badge>
                {r.anonymous && <Badge color={T.textMuted} small>Anonymous</Badge>}
              </div>
              <div style={{ fontSize:12, color:T.textSecondary }}>{r.desc}</div>
            </div>
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <div style={{ fontSize:12, color:T.textSecondary, fontFamily:"'IBM Plex Mono', monospace" }}>{r.date}</div>
              <div style={{ fontSize:11, color:T.textMuted, marginTop:3, display:"flex", alignItems:"center", gap:4, justifyContent:"flex-end" }}>
                <MapPin size={10} />{r.location}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMMUNITY POLICING PORTAL
   ═══════════════════════════════════════════════════════════════ */
function CommunityPortal() {
  const [posts, setPosts] = useState(COMMUNITY_POSTS);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title:"", body:"", category:"concern" });
  const [catFilter, setCatFilter] = useState("all");
  const [alerts] = useState(SAFETY_ALERTS);
  const [activeTab, setActiveTab] = useState("feed");

  const roleStyles = {
    officer: { color:T.blue, bg:T.blueDim, label:"Police Officer" },
    resident: { color:T.accent, bg:T.accentDim, label:"Resident" },
    organisation: { color:T.purple, bg:T.purpleDim, label:"Organisation" },
    volunteer: { color:T.amber, bg:T.amberDim, label:"Volunteer" },
  };

  const catIcons = { update:Info, concern:AlertCircle, event:Megaphone, success:Award, praise:Heart, volunteer:Users };
  const catColors = { update:T.blue, concern:T.amber, event:T.purple, success:T.accent, praise:T.rose, volunteer:T.cyan };
  const alertLevelColor = { high:T.red, medium:T.amber, low:T.accent };

  const filteredPosts = catFilter === "all" ? posts : posts.filter(p => p.category === catFilter);

  const submitPost = () => {
    setPosts(prev => [{
      id: prev.length + 1, author:"You", role:"resident", avatar:"YO",
      title:newPost.title, body:newPost.body, time:"Just now",
      likes:0, replies:0, category:newPost.category,
    }, ...prev]);
    setShowNewPost(false);
    setNewPost({ title:"", body:"", category:"concern" });
  };
  const [users, setUsers] = useState([
  { id:1, name:"John Smith", role:"officer", email:"john@police.uk" },
  { id:2, name:"Sarah Ahmed", role:"resident", email:"sarah@email.com" },
]);
  

const [newUser, setNewUser] = useState({ name:"", email:"", alias:"", role:"resident" });

  return (
    <div style={{ animation:"fadeUp .4s ease" }}>
      <SectionHeader icon={Users} title="Community Policing Hub" subtitle="Connect with your local police, report concerns, share safety information, and strengthen your neighbourhood" />

      {/* Sub-tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:24 }}>
        {[
          { id:"feed", label:"Community Feed", icon:MessageSquare },
          { id:"alerts", label:"Safety Alerts", icon:Bell },
          { id:"report", label:"Report Crime", icon:Flag },
          { id:"resources", label:"Resources", icon:Bookmark },
          { id:"admin", label:"Admin Portal", icon:Shield },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding:"10px 20px", borderRadius:10, border:`1px solid ${activeTab===t.id ? T.accent : T.border}`,
            background: activeTab===t.id ? T.accentDim : T.surface,
            color: activeTab===t.id ? T.accent : T.textSecondary,
            fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:7,
            fontFamily:"'Sora', sans-serif", transition:"all .2s",
          }}>
            <t.icon size={15} />{t.label}
          </button>
        ))}
      </div>

      {/* ── COMMUNITY FEED ── */}
      {activeTab === "feed" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:20 }}>
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {["all","update","concern","event","success","praise","volunteer"].map(c => (
                  <button key={c} onClick={() => setCatFilter(c)} style={{
                    padding:"5px 12px", borderRadius:16, border:`1px solid ${catFilter===c ? (catColors[c]||T.accent) : T.border}`,
                    background: catFilter===c ? `${catColors[c]||T.accent}15` : "transparent",
                    color: catFilter===c ? (catColors[c]||T.accent) : T.textMuted, fontSize:11, cursor:"pointer",
                    textTransform:"capitalize", fontFamily:"'Sora', sans-serif",
                  }}>{c === "all" ? "All Posts" : c}</button>
                ))}
              </div>
              <PrimaryBtn small onClick={() => setShowNewPost(!showNewPost)} icon={showNewPost ? X : Plus}>
                {showNewPost ? "Cancel" : "New Post"}
              </PrimaryBtn>
            </div>

            {showNewPost && (
              <Panel style={{ marginBottom:16, borderColor:T.accent+"30", animation:"fadeUp .25s ease" }}>
                <h4 style={{ fontSize:14, fontWeight:700, marginBottom:14, fontFamily:"'Sora', sans-serif" }}>Share with your community</h4>
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:12 }}>
                    <InputField label="Title" value={newPost.title} onChange={v => setNewPost({...newPost, title:v})} placeholder="What's on your mind?" />
                    <InputField label="Category" value={newPost.category} onChange={v => setNewPost({...newPost, category:v})} options={[
                      { value:"concern", label:"Safety Concern" },
                      { value:"praise", label:"Praise / Thanks" },
                      { value:"event", label:"Community Event" },
                      { value:"volunteer", label:"Volunteer Call" },
                    ]} />
                  <div><InputField label="Alias" value={newPost.alias || ""} onChange={v => setNewPost({...newPost, alias:v})}placeholder="Alias"
/></div>
                  </div>
                  <InputField label="Details" value={newPost.body} onChange={v => setNewPost({...newPost, body:v})} rows={3} placeholder="Share details, context, or information that could help your community..." />
                  <PrimaryBtn onClick={submitPost} icon={Send} small>Post to Community</PrimaryBtn>
                </div>
              </Panel>
            )}

            {filteredPosts.map(post => {
              const CatIcon = catIcons[post.category] || Info;
              return (
                <div key={post.id} style={{ background:T.surface, border:`1px solid ${post.pinned ? T.accent+"30" : T.border}`, borderRadius:14, padding:20, marginBottom:10, transition:"border-color .2s", position:"relative" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = T.borderLight}
                  onMouseLeave={e => e.currentTarget.style.borderColor = post.pinned ? T.accent+"30" : T.border}>
                  {post.pinned && <div style={{ position:"absolute", top:12, right:14, display:"flex", alignItems:"center", gap:4, fontSize:10, color:T.accent }}>
                    <CircleDot size={10} />PINNED
                  </div>}
                  <div style={{ display:"flex", gap:14 }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:roleStyles[post.role].bg, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:14, color:roleStyles[post.role].color, flexShrink:0, fontFamily:"'Sora', sans-serif" }}>
                      {post.avatar}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3, flexWrap:"wrap" }}>
                        <span style={{ fontWeight:700, fontSize:14, fontFamily:"'Sora', sans-serif" }}>{post.author}</span>
                        <Badge color={roleStyles[post.role].color} small>{roleStyles[post.role].label}</Badge>
                        <Badge color={catColors[post.category]} small>
                          <CatIcon size={9} style={{ marginRight:3 }} />{post.category}
                        </Badge>
                        <span style={{ fontSize:11, color:T.textDim }}>{post.time}</span>
                      </div>
                      <h4 style={{ fontSize:14, fontWeight:600, margin:"6px 0", fontFamily:"'Sora', sans-serif", color:T.text }}>{post.title}</h4>
                      <p style={{ fontSize:13, color:T.textSecondary, margin:0, lineHeight:1.6 }}>{post.body}</p>
                      <div style={{ display:"flex", gap:16, marginTop:14 }}>
                        <button style={{ background:"none", border:"none", color:T.textMuted, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontFamily:"'Sora', sans-serif" }}
                          onClick={() => setPosts(prev => prev.map(p => p.id === post.id ? {...p, likes:p.likes+1} : p))}>
                          <ThumbsUp size={13} /> {post.likes}
                        </button>
                        <button style={{ background:"none", border:"none", color:T.textMuted, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontFamily:"'Sora', sans-serif" }}>
                          <MessageSquare size={13} /> {post.replies} replies
                        </button>
                        <button style={{ background:"none", border:"none", color:T.textMuted, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontFamily:"'Sora', sans-serif" }}>
                          <Flag size={13} /> Report
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sidebar */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Panel>
              <h4 style={{ fontSize:13, fontWeight:700, marginBottom:14, fontFamily:"'IBM Plex Mono', monospace", color:T.textSecondary, letterSpacing:1, textTransform:"uppercase" }}>Community Stats</h4>
              {[
                { icon:Users, label:"Active Members", value:"2,847", color:T.accent },
                { icon:MessageSquare, label:"Posts This Week", value:"142", color:T.blue },
                { icon:UserCheck, label:"Police Officers", value:"23", color:T.purple },
                { icon:Shield, label:"Issues Resolved", value:"89%", color:"#34d399" },
                { icon:Star, label:"Community Rating", value:"4.7/5", color:T.amber },
              ].map(s => (
                <div key={s.label} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:`1px solid ${T.border}15` }}>
                  <s.icon size={14} color={s.color} />
                  <span style={{ flex:1, fontSize:12, color:T.textSecondary }}>{s.label}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:T.text, fontFamily:"'IBM Plex Mono', monospace" }}>{s.value}</span>
                </div>
              ))}
            </Panel>
            <Panel>
              <h4 style={{ fontSize:13, fontWeight:700, marginBottom:14, fontFamily:"'IBM Plex Mono', monospace", color:T.textSecondary, letterSpacing:1, textTransform:"uppercase" }}>Your Local Team</h4>
              {[
                { name:"PC Sarah Chen", area:"Riverside Ward", online:true },
                { name:"PCSO James Hall", area:"City Centre", online:true },
                { name:"DCI Emily Roberts", area:"District Lead", online:false },
              ].map(o => (
                <div key={o.name} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:`1px solid ${T.border}15` }}>
                  <div style={{ width:30, height:30, borderRadius:8, background:T.blueDim, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:T.blue }}>
                    {o.name.split(" ").map(n => n[0]).join("").slice(0,2)}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:600 }}>{o.name}</div>
                    <div style={{ fontSize:10, color:T.textMuted }}>{o.area}</div>
                  </div>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:o.online ? T.accent : T.textDim }} />
                </div>
              ))}
              <button style={{ width:"100%", marginTop:12, padding:"8px", borderRadius:8, border:`1px solid ${T.border}`, background:"transparent", color:T.accent, fontSize:12, cursor:"pointer", fontFamily:"'Sora', sans-serif" }}>
                <Phone size={12} style={{ verticalAlign:-2, marginRight:5 }} />Contact Your Team
              </button>
            </Panel>
            <Panel>
              <h4 style={{ fontSize:13, fontWeight:700, marginBottom:14, fontFamily:"'IBM Plex Mono', monospace", color:T.textSecondary, letterSpacing:1, textTransform:"uppercase" }}>
                <Radio size={12} style={{ marginRight:6, verticalAlign:-1 }} />Live Alerts
              </h4>
              {alerts.map(a => (
                <div key={a.id} style={{ padding:"10px 0", borderBottom:`1px solid ${T.border}15` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:alertLevelColor[a.level] }} />
                    <span style={{ fontSize:12, fontWeight:700, fontFamily:"'Sora', sans-serif" }}>{a.area}</span>
                    <Badge color={alertLevelColor[a.level]} small>{a.type}</Badge>
                  </div>
                  <p style={{ fontSize:11, color:T.textSecondary, margin:0, lineHeight:1.5 }}>{a.msg}</p>
                </div>
              ))}
            </Panel>
          </div>
        </div>
      )}
      {activeTab === "admin" && (
  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>

    {/* CREATE USER */}
    <Panel>
      <h4 style={{ fontSize:14, fontWeight:700, marginBottom:14, fontFamily:"'Sora', sans-serif" }}>
        Create New User
      </h4>

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

        <InputField
          label="Full Name"
          value={newUser.name}
          onChange={v => setNewUser({ ...newUser, name:v })}
          placeholder="Enter name"
        />

        <InputField
          label="Email"
          value={newUser.email}
          onChange={v => setNewUser({ ...newUser, email:v })}
          placeholder="Enter email"
        />

        <InputField
          label="Alias"
          value={newUser.alias}
          onChange={v => setNewUser({ ...newUser, alias:v })}
          placeholder="Enter alias"
        />

        <InputField
          label="Role"
          value={newUser.role}
          onChange={v => setNewUser({ ...newUser, role:v })}
          options={[
            { value:"resident", label:"Resident" },
            { value:"officer", label:"Police Officer" },
            { value:"organisation", label:"Organisation" },
            { value:"volunteer", label:"Volunteer" },
          ]}
        />

        <PrimaryBtn
          onClick={() => {
            if (!newUser.name || !newUser.email) return;

            setUsers(prev => [
              {
                id: prev.length + 1,
                ...newUser
              },
              ...prev
            ]);

            setNewUser({ name:"", email:"", role:"resident" });
          }}
          icon={Plus}
          small
        >
          Create User
        </PrimaryBtn>

      </div>
    </Panel>

    {/* USER LIST */}
    <Panel>
      <h4 style={{ fontSize:14, fontWeight:700, marginBottom:14, fontFamily:"'Sora', sans-serif" }}>
        Manage Users
      </h4>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

        {users.map(user => (
          <div key={user.id} style={{
            padding:"12px",
            border:`1px solid ${T.border}`,
            borderRadius:10,
            display:"flex",
            justifyContent:"space-between",
            alignItems:"center"
          }}>

            <div>
              <div style={{ fontWeight:600, fontSize:13 }}>{user.name}</div>
              <div style={{ fontSize:11, color:T.textSecondary }}>{user.email}</div>
              <Badge color={roleStyles[user.role].color} small>
                {roleStyles[user.role].label}
              </Badge>
            </div>

            <button
              onClick={() => setUsers(prev => prev.filter(u => u.id !== user.id))}
              style={{
                background:"none",
                border:"none",
                color:T.red,
                cursor:"pointer",
                fontSize:12,
                fontFamily:"'Sora', sans-serif"
              }}
            >
              Delete
            </button>

          </div>
        ))}

      </div>
    </Panel>

  </div>
)}
      {/* ── SAFETY ALERTS ── */}
      {activeTab === "alerts" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:14, marginBottom:24 }}>
            <StatCard icon={AlertTriangle} label="Active Alerts" value={3} color={T.red} />
            <StatCard icon={Shield} label="Areas Monitored" value={12} color={T.accent} />
            <StatCard icon={CheckCircle2} label="Resolved (30d)" value={28} color="#34d399" />
          </div>
          {[
            { area:"Riverside Ward", type:"Burglary Spike", level:"critical", desc:"3 break-ins reported this week targeting ground-floor flats with rear access. All occurred between 2-5pm on weekdays. Secure windows and consider timer-activated lights.", time:"2 hours ago", icon:Flame },
            { area:"City Centre", type:"Pickpocketing Increase", level:"warning", desc:"Increased reports near market square and bus station during peak hours (12pm-3pm). Keep valuables secure and bags zipped in crowded areas.", time:"6 hours ago", icon:AlertTriangle },
            { area:"Westgate District", type:"Drug Activity — Reduced", level:"info", desc:"Following Operation Nightfall, reported drug activity has decreased by 60%. Continue reporting any suspicious behaviour to the community hub.", time:"1 day ago", icon:Info },
            { area:"Parklands Estate", type:"Vehicle Crime", level:"warning", desc:"Several reports of catalytic converter thefts from SUVs parked on residential streets overnight. Consider anti-theft devices.", time:"2 days ago", icon:AlertCircle },
          ].map((a, i) => {
            const colors = { critical:T.red, warning:T.amber, info:T.blue };
            return (
              <Panel key={i} style={{ marginBottom:12, borderLeftWidth:3, borderLeftColor:colors[a.level] }}>
                <div style={{ display:"flex", gap:16 }}>
                  <div style={{ width:48, height:48, borderRadius:12, background:`${colors[a.level]}14`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <a.icon size={22} color={colors[a.level]} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                      <span style={{ fontWeight:700, fontSize:15, fontFamily:"'Sora', sans-serif" }}>{a.area}</span>
                      <Badge color={colors[a.level]}>{a.type}</Badge>
                      <span style={{ fontSize:11, color:T.textDim, marginLeft:"auto" }}>{a.time}</span>
                    </div>
                    <p style={{ fontSize:13, color:T.textSecondary, margin:0, lineHeight:1.6 }}>{a.desc}</p>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {/* ── QUICK REPORT ── */}
      {activeTab === "report" && (
        <CommunityReportForm />
      )}

      {/* ── RESOURCES ── */}
      {activeTab === "resources" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:16 }}>
          {[
            { title:"Emergency: 999", desc:"For crimes in progress, immediate danger, or medical emergencies", icon:Phone, color:T.red },
            { title:"Non-Emergency: 101", desc:"Report non-urgent crimes, suspicious activity, or get advice", icon:Phone, color:T.blue },
            { title:"Crimestoppers", desc:"Report anonymously: 0800 555 111. 100% anonymous, always.", icon:Shield, color:T.accent },
            { title:"Victim Support", desc:"Free support for victims and witnesses. Call 0808 168 9111", icon:Heart, color:T.rose },
            { title:"Neighbourhood Watch", desc:"Join or start a watch scheme in your area", icon:Eye, color:T.amber },
            { title:"Crime Prevention Advice", desc:"Tips on securing your home, car, and personal safety", icon:Target, color:T.purple },
          ].map(r => (
            <Panel key={r.title} hover>
              <div style={{ width:50, height:50, borderRadius:12, background:`${r.color}14`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
                <r.icon size={24} color={r.color} />
              </div>
              <h3 style={{ fontSize:16, fontWeight:700, marginBottom:6, fontFamily:"'Sora', sans-serif" }}>{r.title}</h3>
              <p style={{ fontSize:13, color:T.textSecondary, margin:0, lineHeight:1.5 }}>{r.desc}</p>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );

}

function CommunityReportForm() {
  const [form, setForm] = useState({ type:"", location:"", when:"", desc:"", anonymous:true, contact:"", urgency:"non-urgent" });
  const [submitted, setSubmitted] = useState(false);

  if (submitted) return (
    <Panel style={{ textAlign:"center", padding:60 }}>
      <div style={{ width:70, height:70, borderRadius:"50%", background:T.accentDim, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
        <CheckCircle2 size={36} color={T.accent} />
      </div>
      <h3 style={{ fontSize:22, fontWeight:800, marginBottom:8, fontFamily:"'Sora', sans-serif" }}>Report Submitted</h3>
      <p style={{ color:T.textSecondary, fontSize:14, maxWidth:400, margin:"0 auto 20px" }}>
        Your report has been received and will be reviewed by your local policing team. {!form.anonymous && "You'll receive updates via the contact details provided."}
      </p>
      <p style={{ color:T.textMuted, fontSize:12, fontFamily:"'IBM Plex Mono', monospace" }}>Reference: #CR-{Date.now().toString(36).toUpperCase()}</p>
      <PrimaryBtn onClick={() => setSubmitted(false)} variant="ghost" style={{ marginTop:16 }}>Submit Another</PrimaryBtn>
    </Panel>
  );

  return (
    <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:20 }}>
      <Panel>
        <h3 style={{ fontSize:18, fontWeight:700, marginBottom:20, fontFamily:"'Sora', sans-serif" }}>
          <Flag size={18} color={T.accent} style={{ marginRight:8, verticalAlign:-3 }} />Report a Crime or Concern
        </h3>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <InputField label="What happened?" value={form.type} onChange={v => setForm({...form, type:v})} options={[
              { value:"", label:"Select type..." },
              ...CRIME_TYPES.map(t => ({ value:t, label:t })),
              { value:"suspicious-activity", label:"Suspicious Activity" },
              { value:"noise", label:"Noise Complaint" },
              { value:"other", label:"Other" },
            ]} />
            <InputField label="Urgency" value={form.urgency} onChange={v => setForm({...form, urgency:v})} options={[
              { value:"non-urgent", label:"Non-urgent (101 level)" },
              { value:"soon", label:"Needs attention soon" },
              { value:"urgent", label:"Urgent (but not 999)" },
            ]} />
          </div>
          <InputField label="Where did it happen?" value={form.location} onChange={v => setForm({...form, location:v})} placeholder="Street name, landmark, postcode..." />
          <InputField label="When did it happen?" value={form.when} onChange={v => setForm({...form, when:v})} placeholder="e.g. Yesterday evening around 9pm, or Tuesday 8 April" />
          <InputField label="Tell us what happened" value={form.desc} onChange={v => setForm({...form, desc:v})} rows={4} placeholder="Include as much detail as you can: what you saw, descriptions of people involved, vehicle details, direction of travel..." />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div>
              <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:T.textSecondary, cursor:"pointer", marginBottom:8 }}>
                <input type="checkbox" checked={form.anonymous} onChange={e => setForm({...form, anonymous:e.target.checked})} />
                Report anonymously
              </label>
              {!form.anonymous && <InputField label="Contact (email or phone)" value={form.contact} onChange={v => setForm({...form, contact:v})} placeholder="For follow-up" />}
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <PrimaryBtn onClick={() => setSubmitted(true)} icon={Send}>Submit Report</PrimaryBtn>
            <PrimaryBtn variant="ghost" onClick={() => setForm({ type:"", location:"", when:"", desc:"", anonymous:true, contact:"", urgency:"non-urgent" })}>Clear Form</PrimaryBtn>
          </div>
        </div>
      </Panel>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <Panel>
          <h4 style={{ fontSize:13, fontWeight:700, marginBottom:12, color:T.textSecondary, fontFamily:"'IBM Plex Mono', monospace", letterSpacing:1 }}>BEFORE REPORTING</h4>
          <div style={{ fontSize:12, color:T.textSecondary, lineHeight:1.7 }}>
            <p style={{ margin:"0 0 10px" }}><strong style={{ color:T.red }}>If it's an emergency, always call 999.</strong></p>
            <p style={{ margin:"0 0 10px" }}>This form is for non-emergency reports and community concerns. Your local policing team will review all submissions.</p>
            <p style={{ margin:0 }}>Anonymous reports are sent via Crimestoppers protocols — your identity is never recorded.</p>
          </div>
        </Panel>
        <Panel>
          <h4 style={{ fontSize:13, fontWeight:700, marginBottom:12, color:T.textSecondary, fontFamily:"'IBM Plex Mono', monospace", letterSpacing:1 }}>HELPFUL DETAILS</h4>
          <ul style={{ fontSize:12, color:T.textSecondary, lineHeight:1.8, paddingLeft:16, margin:0 }}>
            <li>Physical descriptions (height, build, clothing)</li>
            <li>Vehicle make, model, colour, registration</li>
            <li>Direction of travel</li>
            <li>Exact time and location</li>
            <li>Names or nicknames if known</li>
            <li>CCTV or dashcam footage availability</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN APPLICATION
   ═══════════════════════════════════════════════════════════════ */
export default function CrimeMindApp() {
  const [tab, setTab] = useState("dashboard");
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [reports, setReports] = useState(SAMPLE_REPORTS);
  const [monthlyData] = useState(genMonthly);
  const [breakdown] = useState(genBreakdown);
  const [predictions] = useState(genPredictions);
  const [heatmapData] = useState(genHeatmap);
  const [analysisView, setAnalysisView] = useState("trends");
  const [trendYear, setTrendYear] = useState("2026");
  const [distYear, setDistYear] = useState("2026");

  const totalCrimes = UK_REGIONS.reduce((s, r) => s + r.crimes, 0);
  const avgTrend = (UK_REGIONS.reduce((s, r) => s + r.trend, 0) / UK_REGIONS.length).toFixed(1);

  const handleReport = (form) => {
    setReports(prev => [{ id:prev.length+1, type:form.type, location:form.location, desc:form.desc, severity:form.severity, date:new Date().toISOString().split("T")[0], status:"Under Review", anonymous:form.anonymous, name:form.name }, ...prev]);
  };

  const radarData = CRIME_TYPES.map(t => ({
    category: t.length > 14 ? t.slice(0,14)+"…" : t,
    current: Math.floor(Math.random()*100+30),
    previous: Math.floor(Math.random()*100+20),
  }));

  const tabs = [
    { id:"dashboard", label:"Dashboard", icon:Layers },
    { id:"scraper", label:"Scraper", icon:Database },
    { id:"analysis", label:"Analysis", icon:BarChart3 },
    { id:"predictions", label:"Predictions", icon:TrendingUp },
    { id:"reports", label:"Reports", icon:FileText },
    { id:"community", label:"Community", icon:Users, badge:true },
  ];

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.text, fontFamily:"'Sora', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.5 } }
        ::-webkit-scrollbar { width:5px } ::-webkit-scrollbar-track { background:transparent } ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:3px }
        select, input, textarea { outline:none } select:focus, input:focus, textarea:focus { border-color:${T.accent}!important }
        .recharts-default-tooltip { background:${T.surface}!important; border:1px solid ${T.border}!important; border-radius:10px!important }
        * { box-sizing:border-box }
      `}</style>

      {/* ── HEADER ── */}
      <header style={{ background:`${T.surface}e0`, borderBottom:`1px solid ${T.border}`, padding:"0 32px", display:"flex", alignItems:"center", height:60, position:"sticky", top:0, zIndex:200, backdropFilter:"blur(16px)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:11, marginRight:36 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:`linear-gradient(135deg, ${T.accent}, #1aae8a)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Shield size={18} color="#060e0a" />
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:800, letterSpacing:-0.3 }}>CrimeMind</div>
            <div style={{ fontSize:9, color:T.textDim, fontFamily:"'IBM Plex Mono', monospace", letterSpacing:1.5 }}>UK CRIME INTELLIGENCE</div>
          </div>
        </div>
        <nav style={{ display:"flex", gap:3, flex:1 }}>
          {tabs.map(t => <TabButton key={t.id} active={tab===t.id} onClick={() => setTab(t.id)} icon={t.icon} label={t.label} badge={t.badge} />)}
        </nav>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ fontSize:11, color:T.textDim, fontFamily:"'IBM Plex Mono', monospace" }}>
            <Clock size={11} style={{ verticalAlign:-1, marginRight:4 }} />
            {new Date().toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })}
          </span>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main style={{ padding:"28px 32px", maxWidth:1440, margin:"0 auto" }}>

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div style={{ animation:"fadeUp .4s ease" }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:14, marginBottom:24 }}>
              <StatCard icon={Shield} label="Total Crimes" value={totalCrimes} change={-1.4} />
              <StatCard icon={MapPin} label="Regions" value={UK_REGIONS.length} color={T.blue} subtitle="Active monitoring" />
              <StatCard icon={TrendingUp} label="Avg Trend" value={`${avgTrend}%`} change={parseFloat(avgTrend)} color={parseFloat(avgTrend) > 0 ? T.red : T.accent} />
              <StatCard icon={FileText} label="Active Reports" value={reports.filter(r => r.status !== "Resolved").length} color={T.amber} />
              <StatCard icon={Users} label="Community" value="2,847" color={T.purple} subtitle="Active members" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 360px", gap:20, marginBottom:24 }}>
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <h2 style={{ fontSize:18, fontWeight:700, margin:0, display:"flex", alignItems:"center", gap:8 }}>
                    <Globe size={18} color={T.accent} />Crime Hotspot Map
                  </h2>
                  {selectedRegion && <PrimaryBtn small variant="ghost" onClick={() => setSelectedRegion(null)}>Reset View</PrimaryBtn>}
                </div>
                <LeafletMap regions={UK_REGIONS} selectedRegion={selectedRegion} onSelect={setSelectedRegion} />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
  
  <h3 style={{
    fontSize:12,
    fontWeight:700,
    color:T.textSecondary,
    margin:0,
    fontFamily:"'IBM Plex Mono', monospace",
    letterSpacing:1.2,
    textTransform:"uppercase"
  }}>
    Region Selection
  </h3>

  {/* Dropdown */}
  <select
    value={selectedRegion?.name || "All"}
    onChange={(e) => {
      const value = e.target.value;
      if (value === "All") {
        setSelectedRegion(null);
      } else {
        const region = UK_REGIONS.find(r => r.name === value);
        setSelectedRegion(region);
      }
    }}
    style={{
      padding:"10px 12px",
      borderRadius:10,
      border:`1px solid ${T.border}`,
      background:T.surface,
      color:T.text,
      fontSize:13,
      fontFamily:"'Sora', sans-serif",
      outline:"none",
      cursor:"pointer"
    }}
  >
    <option value="All">All Regions</option>
    {[...UK_REGIONS]
      .sort((a,b) => b.crimes - a.crimes)
      .map(r => (
        <option key={r.name} value={r.name}>
          {r.name} ({r.crimes.toLocaleString()})
        </option>
      ))
    }
  </select>

  {/* Selected Region Display (optional but recommended) */}
  {selectedRegion && (
    <div style={{
      marginTop:10,
      padding:"12px",
      border:`1px solid ${T.border}`,
      borderRadius:10,
      background:T.surfaceAlt,
      fontSize:13
    }}>
      <strong>{selectedRegion.name}</strong><br />
      <span style={{ color:T.textSecondary }}>
        {selectedRegion.crimes.toLocaleString()} incidents • {selectedRegion.trend}% trend
      </span>
    </div>
  )}

</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
              <Panel>
                <h3 style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Monthly Crime Trends</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={monthlyData}>
                    <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent} stopOpacity={.3}/><stop offset="100%" stopColor={T.accent} stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                    <XAxis dataKey="month" tick={{ fill:T.textMuted, fontSize:11 }} axisLine={{ stroke:T.border }} />
                    <YAxis tick={{ fill:T.textMuted, fontSize:11 }} axisLine={{ stroke:T.border }} />
                    <Tooltip contentStyle={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.text }} />
                    <Area type="monotone" dataKey="total" stroke={T.accent} fill="url(#ag)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </Panel>
              <Panel>
                <h3 style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Crime Distribution</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={breakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={2} strokeWidth={0}>
                      {breakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.text, fontSize:12 }} />
                    <Legend wrapperStyle={{ fontSize:10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Panel>
            </div>
          </div>
        )}

        {/* SCRAPER */}
        {tab === "scraper" && <ScraperView />}

        {/* ANALYSIS */}
        {tab === "analysis" && (
          <div style={{ animation:"fadeUp .4s ease" }}>
            <SectionHeader icon={BarChart3} title="Crime Analysis" subtitle="Deep-dive analytics on cleaned UK crime datasets"
              right={<div style={{ display:"flex", gap:6 }}>
                {["trends","heatmap","comparison"].map(v => (
                  <button key={v} onClick={() => setAnalysisView(v)} style={{
                    padding:"8px 16px", borderRadius:8, border:`1px solid ${analysisView===v ? T.accent : T.border}`,
                    background:analysisView===v ? T.accentDim : "transparent",
                    color:analysisView===v ? T.accent : T.textSecondary, fontSize:12, cursor:"pointer",
                    textTransform:"capitalize", fontFamily:"'Sora', sans-serif", fontWeight:500,
                  }}>{v}</button>
                ))}
              </div>} />
            {analysisView === "trends" && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
                <Panel>
                  <h3 style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Crime by Category</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                      <XAxis dataKey="month" tick={{ fill:T.textMuted, fontSize:11 }} axisLine={{ stroke:T.border }} />
                      <YAxis tick={{ fill:T.textMuted, fontSize:11 }} axisLine={{ stroke:T.border }} />
                      <Tooltip contentStyle={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.text, fontSize:11 }} />
                      <Legend wrapperStyle={{ fontSize:10 }} />
                      <Bar dataKey="Violence" fill={T.red} radius={[2,2,0,0]} />
                      <Bar dataKey="Theft" fill={T.accent} radius={[2,2,0,0]} />
                      <Bar dataKey="Burglary" fill={T.amber} radius={[2,2,0,0]} />
                      <Bar dataKey="Drugs" fill={T.purple} radius={[2,2,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Panel>
                <Panel>
                  <h3 style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Category Radar</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke={T.border} />
                      <PolarAngleAxis dataKey="category" tick={{ fill:T.textMuted, fontSize:9 }} />
                      <PolarRadiusAxis tick={{ fill:T.textDim, fontSize:9 }} />
                      <Radar name="Current" dataKey="current" stroke={T.accent} fill={T.accent} fillOpacity={.2} />
                      <Radar name="Previous" dataKey="previous" stroke={T.amber} fill={T.amber} fillOpacity={.1} />
                      <Legend wrapperStyle={{ fontSize:11 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </Panel>
              </div>
            )}
            {analysisView === "heatmap" && (
              <Panel>
                <h3 style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>Crime Frequency Heatmap</h3>
                <p style={{ color:T.textSecondary, fontSize:12, marginBottom:20, margin:"0 0 20px" }}>Incident density by day and hour — hover cells for detail</p>
                <HeatmapGrid data={heatmapData} />
              </Panel>
            )}
            {analysisView === "comparison" && (
              <Panel>
                <h3 style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Regional Comparison</h3>
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart data={[...UK_REGIONS].sort((a,b) => b.crimes-a.crimes).slice(0,10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} horizontal={false} />
                    <XAxis type="number" tick={{ fill:T.textMuted, fontSize:11 }} axisLine={{ stroke:T.border }} />
                    <YAxis type="category" dataKey="name" width={105} tick={{ fill:T.textMuted, fontSize:12 }} axisLine={{ stroke:T.border }} />
                    <Tooltip contentStyle={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.text }} />
                    <Bar dataKey="crimes" radius={[0,5,5,0]}>
                      {[...UK_REGIONS].sort((a,b) => b.crimes-a.crimes).slice(0,10).map((r, i) => <Cell key={i} fill={r.trend>0 ? T.red : T.accent} fillOpacity={.7} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
            )}
          </div>
        )}

        {/* PREDICTIONS */}
        {tab === "predictions" && (
          <div style={{ animation:"fadeUp .4s ease" }}>
            <SectionHeader icon={TrendingUp} title="Predictive Analytics" subtitle="ML-powered crime forecasting using ARIMA and seasonal decomposition" />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:20, marginBottom:24 }}>
              <Panel>
                <h3 style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>6-Month Forecast</h3>
                <ResponsiveContainer width="100%" height={340}>
                  <ComposedChart data={[...monthlyData.slice(-4).map(d => ({ month:d.month, predicted:d.total, lower:d.total, upper:d.total })), ...predictions]}>
                    <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent} stopOpacity={.2}/><stop offset="100%" stopColor={T.accent} stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                    <XAxis dataKey="month" tick={{ fill:T.textMuted, fontSize:11 }} axisLine={{ stroke:T.border }} />
                    <YAxis tick={{ fill:T.textMuted, fontSize:11 }} axisLine={{ stroke:T.border }} />
                    <Tooltip contentStyle={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, color:T.text }} />
                    <Area type="monotone" dataKey="upper" stroke="none" fill={T.cyanDim} />
                    <Area type="monotone" dataKey="lower" stroke="none" fill={T.bg} />
                    <Line type="monotone" dataKey="predicted" stroke={T.accent} strokeWidth={2.5} dot={{ fill:T.accent, r:4 }} />
                    <Legend wrapperStyle={{ fontSize:11 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Panel>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <Panel>
                  <h4 style={{ fontSize:12, fontWeight:700, color:T.textSecondary, marginBottom:14, fontFamily:"'IBM Plex Mono', monospace", letterSpacing:1 }}>MODEL METRICS</h4>
                  {[{ l:"MAE", v:"342.7", g:true },{ l:"R² Score", v:"0.847", g:true },{ l:"RMSE", v:"518.2" },{ l:"Confidence", v:"92.3%", g:true },{ l:"Seasonality", v:"Detected", g:true }].map(m => (
                    <div key={m.l} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${T.border}15` }}>
                      <span style={{ fontSize:12, color:T.textSecondary }}>{m.l}</span>
                      <span style={{ fontSize:13, fontWeight:700, color:m.g ? T.accent : T.amber, fontFamily:"'IBM Plex Mono', monospace" }}>{m.v}</span>
                    </div>
                  ))}
                </Panel>
                <Panel>
                  <h4 style={{ fontSize:12, fontWeight:700, color:T.textSecondary, marginBottom:14, fontFamily:"'IBM Plex Mono', monospace", letterSpacing:1 }}>CONFIG</h4>
                  <div style={{ fontSize:12, color:T.textSecondary, lineHeight:2, fontFamily:"'IBM Plex Mono', monospace" }}>
                    <div>algo: <span style={{ color:T.accent }}>ARIMA(2,1,2)</span></div>
                    <div>seasonal: <span style={{ color:T.accent }}>True (12m)</span></div>
                    <div>features: <span style={{ color:T.accent }}>14</span></div>
                    <div>split: <span style={{ color:T.accent }}>80/20</span></div>
                    <div>horizon: <span style={{ color:T.accent }}>6 months</span></div>
                  </div>
                </Panel>
              </div>
            </div>
            <Panel>
              <h3 style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>High-Risk Predictions</h3>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:12 }}>
                {UK_REGIONS.filter(r => r.trend>0).sort((a,b) => b.trend-a.trend).slice(0,6).map(r => (
                  <div key={r.name} style={{ background:T.surfaceAlt, border:`1px solid ${T.red}18`, borderRadius:11, padding:16, display:"flex", alignItems:"center", gap:14 }}>
                    <div style={{ width:44, height:44, borderRadius:"50%", background:T.redDim, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Target size={20} color={T.red} />
                    </div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700 }}>{r.name}</div>
                      <div style={{ fontSize:11, color:T.red, fontFamily:"'IBM Plex Mono', monospace" }}>+{r.trend}% predicted</div>
                      <div style={{ fontSize:11, color:T.textDim }}>{Math.floor(r.crimes*(1+r.trend/100)).toLocaleString()} est. next month</div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {/* REPORTS */}
        {tab === "reports" && <ReportPortal reports={reports} onSubmit={handleReport} />}

        {/* COMMUNITY */}
        {tab === "community" && <CommunityPortal />}
      </main>
    </div>
  );
}
