/* scheduler PWA app.js
 - multi-year calendar, month/year navigation
 - button-based status selection
 - persistent storage (localStorage)
 - voice commands (Web Speech API)
*/

const START_YEAR = 2025;
const END_YEAR = 2040;
const statuses = ["WFH","OFFC","TRAIN","EL","SL","PH"];

// state
let schedule = {}; // map YYYY-MM-DD -> STATUS
let selectedStatus = "";
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth()+1; // 1..12

// elements
const tabMonth = document.getElementById("tabMonth");
const tabYear  = document.getElementById("tabYear");
const tabSummary = document.getElementById("tabSummary");
const monthView = document.getElementById("monthView");
const yearView  = document.getElementById("yearView");
const summaryView = document.getElementById("summaryView");
const prevMonth = document.getElementById("prevMonth");
const nextMonth = document.getElementById("nextMonth");
const currentMonthLabel = document.getElementById("currentMonthLabel");
const calendarContainer = document.getElementById("calendarContainer");
const yearLabel = document.getElementById("yearLabel");
const yearGrid = document.getElementById("yearGrid");
const prevYear = document.getElementById("prevYear");
const nextYear = document.getElementById("nextYear");
const statusButtons = document.getElementById("statusButtons");
const voiceBtn = document.getElementById("voiceBtn");
const summaryMonth = document.getElementById("summaryMonth");
const summaryYear = document.getElementById("summaryYear");
const summaryPanel = document.getElementById("summaryPanel");

// load storage
if(localStorage.getItem("scheduleData")){
  try{ schedule = JSON.parse(localStorage.getItem("scheduleData")) || {}; }catch(e){ schedule = {}; }
}
if(localStorage.getItem("currentYear")) currentYear = parseInt(localStorage.getItem("currentYear"));
if(localStorage.getItem("currentMonth")) currentMonth = parseInt(localStorage.getItem("currentMonth"));

// --- helper date functions ---
function pad(n){ return n.toString().padStart(2,'0'); }
function isoStr(y,m,d){ return `${y}-${pad(m)}-${pad(d)}`; }
function monthName(m){ return ["January","February","March","April","May","June","July","August","September","October","November","December"][m-1]; }

// --- render month single view ---
function renderMonthView(y, m){
  currentYear = y; currentMonth = m;
  localStorage.setItem("currentYear", currentYear); localStorage.setItem("currentMonth", currentMonth);
  currentMonthLabel.textContent = `${monthName(m)} ${y}`;

  // weekday headers
  calendarContainer.innerHTML = "";
  const weekdays = document.createElement("div"); weekdays.className="weekdays";
  ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach(w=>{ let el=document.createElement("div"); el.textContent=w; weekdays.appendChild(el); });
  calendarContainer.appendChild(weekdays);

  // grid
  const grid = document.createElement("div"); grid.className="grid";
  const first = new Date(y, m-1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();

  // fill leading blanks
  for(let i=0;i<first;i++){
    const blank = document.createElement("div"); blank.className="cell"; blank.innerHTML=""; grid.appendChild(blank);
  }

  for(let d=1; d<=daysInMonth; d++){
    const cell = document.createElement("div"); cell.className="cell";
    const dateStr = isoStr(y,m,d);
    cell.dataset.date = dateStr;

    // date number
    const dn = document.createElement("div"); dn.className="date-num"; dn.textContent = d;
    cell.appendChild(dn);

    // status text
    const st = document.createElement("div"); st.className="status-text";
    if(schedule[dateStr]){ st.textContent = schedule[dateStr]; cell.classList.add(schedule[dateStr]); }
    cell.appendChild(st);

    // weekend
    const wk = new Date(y,m-1,d).getDay();
    if(wk===0 || wk===6){ cell.classList.add("weekend"); }

    // today highlight
    const td = new Date(); if(td.getFullYear()===y && td.getMonth()+1===m && td.getDate()===d) cell.classList.add("today");

    // click to apply selectedStatus
    cell.addEventListener("click", ()=> {
      if(cell.classList.contains("weekend")) return;
      if(selectedStatus===""){ // clear this date
        delete schedule[dateStr];
      } else {
        schedule[dateStr] = selectedStatus;
      }
      saveAndRerender();
    });

    grid.appendChild(cell);
  }

  // trailing blanks to fill 7x6 grid
  while(grid.childElementCount % 7 !== 0){
    const blank = document.createElement("div"); blank.className="cell"; grid.appendChild(blank);
  }

  calendarContainer.appendChild(grid);
}

// --- render year grid (12 small month cards) ---
function renderYearView(y){
  yearLabel.textContent = y;
  yearGrid.innerHTML="";
  for(let mo=1; mo<=12; mo++){
    const card = document.createElement("div"); card.className="month-card";
    const title = document.createElement("div"); title.className="month-title"; title.textContent = monthName(mo).toUpperCase();
    card.appendChild(title);
    // small 7x5 grid
    const smallGrid = document.createElement("div"); smallGrid.style.display="grid"; smallGrid.style.gridTemplateColumns="repeat(7,1fr)"; smallGrid.style.gap="4px";
    const first = new Date(y,mo-1,1).getDay();
    const days = new Date(y,mo,0).getDate();

    for(let i=0;i<first;i++){ let b=document.createElement("div"); b.style.height="18px"; smallGrid.appendChild(b); }
    for(let d=1; d<=days; d++){
      const sm = document.createElement("div"); sm.style.height="18px"; sm.style.borderRadius="3px"; sm.style.fontSize="9px"; sm.style.textAlign="center";
      const ds = isoStr(y,mo,d);
      if(schedule[ds]){
        sm.style.background = getStatusColor(schedule[ds]);
        sm.style.color = "#fff";
        sm.textContent = schedule[ds];
      } else {
        sm.style.background="#f0f0f0";
      }
      smallGrid.appendChild(sm);
    }
    card.appendChild(smallGrid);

    // click month card to jump to month view
    card.addEventListener("click", ()=> {
      showTab("month"); currentYear = y; currentMonth = mo; saveNav(); renderMonthView(currentYear,currentMonth);
    });

    yearGrid.appendChild(card);
  }
}

// --- summary for selected month/year ---
function renderSummary(y,m){
  const counts = {WFH:0,OFFC:0,TRAIN:0,EL:0,SL:0,PH:0,Weekends:0};
  for(const d in schedule){
    const [yy,mm,dd] = d.split("-").map(Number);
    if(yy===y && mm===m){
      const st = schedule[d];
      if(counts[st]!==undefined) counts[st]++;
    }
  }
  // weekends count separately if needed
  let html = `<h4>${monthName(m)} ${y}</h4><div class="summary-list">`;
  ["OFFC","WFH","TRAIN","EL","SL","PH"].forEach(k=>{
    html += `<div><strong>${k}</strong>: ${counts[k]||0}</div>`;
  });
  html += `</div>`;
  summaryPanel.innerHTML = html;
}

// helper color map
function getStatusColor(s){
  switch(s){
    case "WFH": return "#5dade2";
    case "OFFC": return "#2ecc71";
    case "TRAIN": return "#8e44ad";
    case "EL": case "SL": return "#e74c3c";
    case "PH": return "#f39c12";
    default: return "#95a5a6";
  }
}

// save and rerender helpers
function saveAndRerender(){
  localStorage.setItem("scheduleData", JSON.stringify(schedule));
  // re-render both views if visible
  if(!monthView.classList.contains("hidden")) renderMonthView(currentYear,currentMonth);
  if(!yearView.classList.contains("hidden")) renderYearView(currentYear);
  if(!summaryView.classList.contains("hidden")) renderSummary(parseInt(summaryYear.value), parseInt(summaryMonth.value));
}

// clear selection highlight
function clearButtonHighlight(){
  document.querySelectorAll(".status-btn").forEach(b=>b.style.border="none");
}

// --- attach controls ---
// tabs
tabMonth.addEventListener("click", ()=> showTab("month"));
tabYear.addEventListener("click", ()=> showTab("year"));
tabSummary.addEventListener("click", ()=> showTab("summary"));

function showTab(t){
  tabMonth.classList.remove("active"); tabYear.classList.remove("active"); tabSummary.classList.remove("active");
  monthView.classList.add("hidden"); yearView.classList.add("hidden"); summaryView.classList.add("hidden");
  if(t==="month"){ tabMonth.classList.add("active"); monthView.classList.remove("hidden"); renderMonthView(currentYear,currentMonth); }
  if(t==="year"){ tabYear.classList.add("active"); yearView.classList.remove("hidden"); renderYearView(currentYear); }
  if(t==="summary"){ tabSummary.classList.add("active"); summaryView.classList.remove("hidden"); populateSummarySelectors(); renderSummary(parseInt(summaryYear.value), parseInt(summaryMonth.value)); }
}

// prev/next month
prevMonth.addEventListener("click", ()=> {
  currentMonth--; if(currentMonth<1){ currentMonth=12; currentYear--; }
  saveNav(); renderMonthView(currentYear,currentMonth);
});
nextMonth.addEventListener("click", ()=> {
  currentMonth++; if(currentMonth>12){ currentMonth=1; currentYear++; }
  saveNav(); renderMonthView(currentYear,currentMonth);
});
function saveNav(){ localStorage.setItem("currentYear", currentYear); localStorage.setItem("currentMonth", currentMonth); }

// year nav
prevYear.addEventListener("click", ()=> { currentYear = Math.max(START_YEAR, currentYear-1); renderYearView(currentYear); });
nextYear.addEventListener("click", ()=> { currentYear = Math.min(END_YEAR, currentYear+1); renderYearView(currentYear); });

// status buttons
document.querySelectorAll(".status-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    selectedStatus = btn.dataset.status;
    clearButtonHighlight(); btn.style.border = "2px solid #000";
  });
});

// populate summary selects
function populateSummarySelectors(){
  summaryMonth.innerHTML=""; summaryYear.innerHTML="";
  for(let i=1;i<=12;i++){ let o=document.createElement("option"); o.value=i; o.text=`${monthName(i)}`; if(i===currentMonth) o.selected=true; summaryMonth.append(o); }
  for(let y=START_YEAR;y<=END_YEAR;y++){ let o=document.createElement("option"); o.value=y; o.text=y; if(y===currentYear) o.selected=true; summaryYear.append(o); }
  summaryMonth.onchange = ()=> renderSummary(parseInt(summaryYear.value), parseInt(summaryMonth.value));
  summaryYear.onchange = ()=> renderSummary(parseInt(summaryYear.value), parseInt(summaryMonth.value));
}

// voice integration
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if(SpeechRecognition){
  const rec = new SpeechRecognition();
  rec.lang = 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  voiceBtn.addEventListener("click", ()=>{
    try{ rec.start(); voiceBtn.textContent="🎤 Listening..."; } catch(e){ alert("Voice unavailable"); }
  });

  rec.addEventListener("result", (ev)=>{
    const txt = ev.results[0][0].transcript.toLowerCase();
    voiceBtn.textContent="🎤 Voice";
    parseVoiceCommand(txt);
  });

  rec.addEventListener("end", ()=> voiceBtn.textContent="🎤 Voice");
} else {
  voiceBtn.disabled = true; voiceBtn.textContent = "🎤 Not supported";
}

// Voice parsing — supports:
// - "next week monday to friday wfh"
// - "monday to wednesday next week offc"
// - "from 22 december 2025 to 26 december 2025 wfh"
// - "wfh next month monday to friday"
function parseVoiceCommand(command){
  // find status
  const st = statuses.find(s=> command.includes(s.toLowerCase()));
  if(!st){ alert("Status not recognized in voice command."); return; }
  selectedStatus = st;
  // attempt to find explicit date range pattern "from ... to ..."
  const fromTo = command.match(/from\s+([0-9]{1,2}\s+\w+\s+[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})\s+to\s+([0-9]{1,2}\s+\w+\s+[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/i);
  let dates = [];
  if(fromTo){
    const a = parseFlexibleDate(fromTo[1]);
    const b = parseFlexibleDate(fromTo[2]);
    if(a && b){
      for(let d=new Date(a); d<=b; d.setDate(d.getDate()+1)){
        dates.push(isoStr(d.getFullYear(), d.getMonth()+1, d.getDate()));
      }
    }
  } else if(command.includes("next week")){
    // default Mon-Fri next week or "monday to friday next week"
    const wdRange = parseWeekdayRange(command);
    const base = getNextWeekStart(new Date());
    if(wdRange){
      wdRange.forEach(wd => {
        const dd = new Date(base); dd.setDate(base.getDate() + (wd)); // base is Sunday -> +1 = Monday
        dates.push(isoStr(dd.getFullYear(), dd.getMonth()+1, dd.getDate()));
      });
    } else {
      // default Mon-Fri
      for(let i=1;i<=5;i++){
        const dd = new Date(base); dd.setDate(base.getDate()+i);
        dates.push(isoStr(dd.getFullYear(), dd.getMonth()+1, dd.getDate()));
      }
    }
  } else if(command.includes("next month")){
    // apply to next month's weekdays range if mentioned
    const next = new Date(); next.setMonth(next.getMonth()+1); next.setDate(1);
    const year = next.getFullYear(), month = next.getMonth()+1;
    const wdRange = parseWeekdayRange(command);
    if(wdRange){
      // collect matching weekdays across month
      for(let d=1; d<=new Date(year,month,0).getDate(); d++){
        const dd = new Date(year, month-1, d);
        if(wdRange.includes(dd.getDay())) dates.push(isoStr(year,month,d));
      }
    }
  } else {
    // try to parse "monday to friday" nearest week / current month
    const wdRange = parseWeekdayRange(command);
    if(wdRange){
      // default to current week starting Sunday
      const base = getWeekStart(new Date());
      wdRange.forEach(wd => {
        const dd = new Date(base); dd.setDate(base.getDate() + wd);
        dates.push(isoStr(dd.getFullYear(), dd.getMonth()+1, dd.getDate()));
      });
    } else {
      // try single date like "22 december 2025" or YYYY-MM-DD
      const datematch = command.match(/([0-9]{4}-[0-9]{2}-[0-9]{2})|([0-9]{1,2}\s+\w+\s+[0-9]{4})/i);
      if(datematch){
        const d = parseFlexibleDate(datematch[0]);
        if(d) dates.push(isoStr(d.getFullYear(), d.getMonth()+1, d.getDate()));
      } else {
        alert("Could not parse dates from voice. Try: 'next week Monday to Friday WFH' or 'from 22 December 2025 to 26 December 2025 WFH'.");
        return;
      }
    }
  }

  // apply
  dates.forEach(ds => { schedule[ds] = selectedStatus; });
  saveAndRerender();
  alert(`Applied ${selectedStatus} to ${dates.length} date(s).`);
}

// parse flexible date strings like "22 December 2025" or "2025-12-22"
function parseFlexibleDate(text){
  text = text.trim();
  // try YYYY-MM-DD
  const iso = text.match(/([0-9]{4}-[0-9]{2}-[0-9]{2})/);
  if(iso) return new Date(iso[1]);
  // try D M Y
  try {
    const dt = new Date(text);
    if(!isNaN(dt.getTime())) return dt;
  } catch(e){}
  return null;
}

// parse "monday to friday" returns array of weekday numbers (0 Sun..6 Sat) or null
function parseWeekdayRange(cmd){
  const wnames = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const m = cmd.match(/(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s*(?:to|-|and)\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i);
  if(!m) return null;
  const a = wnames.indexOf(m[1].toLowerCase());
  const b = wnames.indexOf(m[2].toLowerCase());
  if(a<=b){
    const arr=[]; for(let i=a;i<=b;i++) arr.push(i); return arr;
  } else {
    const arr=[]; for(let i=a;i<=6;i++) arr.push(i); for(let i=0;i<=b;i++) arr.push(i); return arr;
  }
}

function getNextWeekStart(dt){
  const d = new Date(dt);
  const diff = 7 - d.getDay(); // days to next Sunday
  d.setDate(d.getDate() + diff);
  return d;
}
function getWeekStart(dt){
  const d = new Date(dt);
  d.setDate(d.getDate() - d.getDay()); // previous Sunday
  return d;
}

// initial population
function init(){
  // set currentYear/currentMonth defaults if out of range
  if(currentYear < START_YEAR) currentYear = START_YEAR;
  if(currentYear > END_YEAR) currentYear = END_YEAR;
  if(currentMonth < 1) currentMonth = 1; if(currentMonth>12) currentMonth=1;

  // wire year prev/next already done via handlers earlier
  renderMonthView(currentYear,currentMonth);
  renderYearView(currentYear);
  populateSummarySelectors();
  showTab("month");
}

function renderMonthView(y,m){ renderMonthViewImpl(y,m); } // adapter below
function renderMonthViewImpl(y,m){
  // wrapper to call the previously declared function
  window.renderMonthView = window.renderMonthView || function(){};
}

// Replace placeholder with actual function defined earlier at top
// But we already implemented renderMonthView earlier in file; call it:
renderMonthView = function(y,m){ renderMonthView(y,m); };

// start
init();
