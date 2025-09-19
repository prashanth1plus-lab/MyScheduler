/* Final clean script.js
   - Month (editable), Year (read-only), Summary (read-only)
   - Years 2025..2040
   - localStorage persistence
   - Voice support (Chrome Android recommended)
*/

const START_YEAR = 2025, END_YEAR = 2040;
const STATUS_KEYS = ["WFH","OFFC","TRAIN","EL","SL","PH"];

// application state
let schedule = {};
let selectedStatus = null; // e.g. "WFH" or "" for CLEAR single
let current = new Date(); // current device date
let currentYear = current.getFullYear();
let currentMonth = current.getMonth() + 1; // 1..12

// DOM refs
const monthContainer = document.getElementById('monthContainer');
const yearContainer = document.getElementById('yearContainer');
const monthView = document.getElementById('monthView');
const yearView = document.getElementById('yearView');
const summaryView = document.getElementById('summaryView');
const monthYearLabel = document.getElementById('monthYearLabel');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const tabMonth = document.getElementById('tabMonth');
const tabYear = document.getElementById('tabYear');
const tabSummary = document.getElementById('tabSummary');
const actionBar = document.getElementById('actionBar');
const summaryLabel = document.getElementById('summaryLabel');
const summaryPanel = document.getElementById('summaryPanel');
const summaryPrev = document.getElementById('summaryPrev');
const summaryNext = document.getElementById('summaryNext');
const voiceBtn = document.getElementById('voiceBtn');
const clearMonthBtn = document.getElementById('clearMonthBtn');
const clearSingleBtn = document.getElementById('clearSingleBtn');

// --- storage ---
function loadSchedule(){
  try {
    const raw = localStorage.getItem('wf_schedule_v_final');
    if(raw) schedule = JSON.parse(raw);
  } catch(e){ console.warn('load error', e); schedule = {}; }
}
function saveSchedule(){
  try { localStorage.setItem('wf_schedule_v_final', JSON.stringify(schedule)); } catch(e){ console.warn(e); }
}

// --- helpers ---
function pad(n){ return n.toString().padStart(2,'0'); }
function iso(y,m,d){ return `${y}-${pad(m)}-${pad(d)}`; }
function monthName(m){ return new Date(2000,m-1,1).toLocaleString('default',{month:'long'}); }

// --- render a month card ---
function renderMonthCard(y,m){
  const card = document.createElement('div');
  card.className = 'month-card';
  const title = document.createElement('div'); title.className='month-title'; title.textContent = `${monthName(m)} ${y}`;
  card.appendChild(title);

  const grid = document.createElement('div'); grid.className='calendar-grid';

  // weekday headers
  ["SUN","MON","TUE","WED","THU","FRI","SAT"].forEach(h=>{
    const hcell = document.createElement('div');
    hcell.className = 'day-cell';
    hcell.style.fontWeight = '700';
    hcell.textContent = h;
    grid.appendChild(hcell);
  });

  const first = new Date(y, m-1, 1);
  const firstDow = first.getDay(); // 0..6
  const daysInMonth = new Date(y,m,0).getDate();

  // blanks before the 1st
  for(let i=0;i<firstDow;i++){
    const empty = document.createElement('div');
    empty.className = 'day-cell';
    empty.textContent = '';
    grid.appendChild(empty);
  }

  for(let d=1; d<=daysInMonth; d++){
    const dateStr = iso(y,m,d);
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    cell.dataset.date = dateStr;

    const dow = new Date(y,m-1,d).getDay();
    if(dow===0 || dow===6){
      // weekend: black and blank
      cell.classList.add('weekend');
      cell.textContent = '';
    } else {
      if(schedule[dateStr]){
        cell.classList.add(schedule[dateStr]);
        cell.textContent = schedule[dateStr];
      } else {
        cell.textContent = d;
      }
      // attach click/drag only on month (editable) view -- handlers exist but Year view won't be editable
      cell.addEventListener('click', ()=> onCellClick(cell));
      // basic drag UX
      cell.addEventListener('mousedown', ()=> startDrag(cell));
      cell.addEventListener('mouseenter', ()=> hoverDrag(cell));
      cell.addEventListener('mouseup', ()=> endDrag());
      // touch
      cell.addEventListener('touchstart', ()=> startDrag(cell), {passive:true});
      cell.addEventListener('touchend', ()=> endDrag(), {passive:true});
    }

    // highlight today
    const td = new Date();
    if(y===td.getFullYear() && m===td.getMonth()+1 && d===td.getDate()){
      cell.classList.add('today');
    }

    grid.appendChild(cell);
  }

  card.appendChild(grid);
  return card;
}

// build the month view (single month)
function buildMonthView(y,m){
  monthContainer.innerHTML = '';
  const card = renderMonthCard(y,m);
  monthContainer.appendChild(card);
  monthYearLabel.textContent = `${monthName(m)} ${y}`;
  currentYear = y; currentMonth = m;
}

// build the year view (12 mini months)
function buildYearView(y){
  yearContainer.innerHTML = '';
  monthYearLabel.textContent = `${y}`;
  for(let mo=1; mo<=12; mo++){
    const c = renderMonthCard(y,mo);
    c.classList.add('year-card');
    // remove editable handlers for year view: clone without events (read-only)
    // (renderMonthCard attached handlers; to ensure read-only, we will strip events)
    // cloning node without listeners:
    const clone = c.cloneNode(true);
    // replace element with clone (listeners will be removed)
    yearContainer.appendChild(clone);
  }
}

// --- cell interactions (month editable only) ---
let dragging = false;
let dragSet = new Set();

function onCellClick(cell){
  // only allow edits when Month tab is active
  if(!tabMonth.classList.contains('active')) return;
  if(!cell.dataset.date) return;
  if(selectedStatus === null) return;
  const key = cell.dataset.date;
  if(selectedStatus === '') { // Clear single
    delete schedule[key];
  } else {
    schedule[key] = selectedStatus;
  }
  saveSchedule();
  refreshViews();
}

// drag selection helpers (simple)
function startDrag(cell){
  if(!tabMonth.classList.contains('active')) return;
  if(!cell || cell.classList.contains('weekend')) return;
  dragging = true;
  dragSet.clear();
  hoverDrag(cell);
}
function hoverDrag(cell){
  if(!dragging) return;
  if(cell.classList.contains('weekend')) return;
  // visual highlight while dragging
  cell.style.outline = '3px dashed rgba(0,0,0,0.12)';
  dragSet.add(cell);
}
function endDrag(){
  if(!dragging) return;
  dragSet.forEach(c=>{
    const d = c.dataset.date;
    if(selectedStatus === '') delete schedule[d];
    else schedule[d] = selectedStatus;
    c.style.outline = '';
  });
  dragSet.clear();
  dragging = false;
  saveSchedule();
  refreshViews();
}

// clear month
clearMonthBtn.addEventListener('click', ()=>{
  if(!confirm(`Clear all statuses for ${monthName(currentMonth)} ${currentYear}?`)) return;
  Object.keys(schedule).forEach(k=>{
    const [yy,mm] = k.split('-').map(Number);
    if(yy===currentYear && mm===currentMonth) delete schedule[k];
  });
  saveSchedule();
  refreshViews();
});

// prev/next navigation behaviour
prevBtn.addEventListener('click', ()=>{
  if(tabMonth.classList.contains('active')){
    let y=currentYear, m=currentMonth-1;
    if(m<1){ m=12; y--; if(y<START_YEAR){ y=START_YEAR; m=1; } }
    buildMonthView(y,m);
  } else if(tabYear.classList.contains('active')){
    currentYear = Math.max(START_YEAR, currentYear-1);
    buildYearView(currentYear);
  } else {
    // summary prev month
    let y = parseInt(summaryLabel.dataset.year) || currentYear;
    let m = parseInt(summaryLabel.dataset.month) || currentMonth;
    m--; if(m<1){ m=12; y--; if(y<START_YEAR){ y=START_YEAR; m=1; } }
    updateSummary(y,m);
  }
});
nextBtn.addEventListener('click', ()=>{
  if(tabMonth.classList.contains('active')){
    let y=currentYear, m=currentMonth+1;
    if(m>12){ m=1; y++; if(y>END_YEAR){ y=END_YEAR; m=12; } }
    buildMonthView(y,m);
  } else if(tabYear.classList.contains('active')){
    currentYear = Math.min(END_YEAR, currentYear+1);
    buildYearView(currentYear);
  } else {
    let y = parseInt(summaryLabel.dataset.year) || currentYear;
    let m = parseInt(summaryLabel.dataset.month) || currentMonth;
    m++; if(m>12){ m=1; y++; if(y>END_YEAR){ y=END_YEAR; m=12; } }
    updateSummary(y,m);
  }
});

// summary arrows
summaryPrev.addEventListener('click', ()=> {
  let y = parseInt(summaryLabel.dataset.year) || currentYear;
  let m = parseInt(summaryLabel.dataset.month) || currentMonth;
  m--; if(m<1){ m=12; y--; }
  updateSummary(y,m);
  currentYear=y; currentMonth=m;
});
summaryNext.addEventListener('click', ()=> {
  let y = parseInt(summaryLabel.dataset.year) || currentYear;
  let m = parseInt(summaryLabel.dataset.month) || currentMonth;
  m++; if(m>12){ m=1; y++; }
  updateSummary(y,m);
  currentYear=y; currentMonth=m;
});

// tabs
tabMonth.addEventListener('click', ()=> showTab('month'));
tabYear.addEventListener('click', ()=> showTab('year'));
tabSummary.addEventListener('click', ()=> showTab('summary'));
function showTab(t){
  tabMonth.classList.remove('active'); tabYear.classList.remove('active'); tabSummary.classList.remove('active');
  monthView.style.display='none'; yearView.style.display='none'; summaryView.style.display='none';
  if(t==='month'){ tabMonth.classList.add('active'); monthView.style.display='block'; actionBar.style.display='flex'; buildMonthView(currentYear,currentMonth); }
  if(t==='year'){ tabYear.classList.add('active'); yearView.style.display='block'; actionBar.style.display='flex'; buildYearView(currentYear); }
  if(t==='summary'){ tabSummary.classList.add('active'); summaryView.style.display='block'; actionBar.style.display='none'; updateSummary(currentYear,currentMonth); }
  refreshViews();
}

// status buttons (select status)
document.querySelectorAll('.status-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const s = btn.dataset.status;
    if(s === 'CLEARMONTH') { /* handled above */ return; }
    selectedStatus = (s === '') ? '' : s;
    // highlight selection
    document.querySelectorAll('.status-btn').forEach(b=>b.style.boxShadow='none');
    btn.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.06) inset';
  });
});

// clear single (select CLEAR then click a day) - we keep as a toggle that sets selectedStatus=''
clearSingleBtn.addEventListener('click', ()=>{
  selectedStatus = '';
  document.querySelectorAll('.status-btn').forEach(b=>b.style.boxShadow='none');
  clearSingleBtn.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.06) inset';
});

// --- summary ---
function updateSummary(y,m){
  summaryLabel.textContent = `${monthName(m)} ${y}`;
  summaryLabel.dataset.year = y; summaryLabel.dataset.month = m;
  const counts = {WFH:0,OFFC:0,TRAIN:0,EL:0,SL:0,PH:0};
  Object.keys(schedule).forEach(k=>{
    const [yy,mm] = k.split('-').map(Number);
    if(yy===y && mm===m && counts[schedule[k]]!==undefined) counts[schedule[k]]++;
  });
  summaryPanel.innerHTML = '';
  Object.keys(counts).forEach(k=>{
    const row = document.createElement('div'); row.className='summary-row';
    row.innerHTML = `<div>${k}</div><div>${counts[k]}</div>`;
    summaryPanel.appendChild(row);
  });
}

// --- voice integration (Web Speech API) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if(SpeechRecognition){
  const rec = new SpeechRecognition();
  rec.lang = 'en-US'; rec.interimResults = false;
  voiceBtn.addEventListener('click', ()=> { try{ rec.start(); voiceBtn.textContent='🎤 Listening...'; }catch(e){} });
  rec.addEventListener('result', e=>{
    const text = e.results[0][0].transcript.toLowerCase();
    voiceBtn.textContent = '🎤 Voice';
    parseVoice(text);
  });
  rec.addEventListener('end', ()=> { voiceBtn.textContent = '🎤 Voice'; });
} else { voiceBtn.disabled=true; voiceBtn.title='Voice not supported in this browser'; }

function parseVoice(text){
  // detect status
  const map = {
    'wfh':'WFH','work from home':'WFH',
    'office':'OFFC','offc':'OFFC',
    'train':'TRAIN','training':'TRAIN',
    'leave':'EL','el':'EL',
    'sick':'SL','sick leave':'SL',
    'holiday':'PH','public holiday':'PH','ph':'PH'
  };
  let found = null;
  for(const k in map) if(text.includes(k)) { found = map[k]; break; }
  if(!found){ alert('Status not detected. Say: "Next week WFH" or "2025-09-22 to 2025-09-26 WFH"'); return; }
  selectedStatus = found;

  // ISO range
  const isoRange = text.match(/(\d{4}-\d{2}-\d{2})\s*(?:to|-)\s*(\d{4}-\d{2}-\d{2})/);
  if(isoRange){
    const s = new Date(isoRange[1]), e = new Date(isoRange[2]);
    let cur = new Date(s);
    while(cur <= e){
      const dow = cur.getDay();
      if(dow!==0 && dow!==6) schedule[iso(cur.getFullYear(),cur.getMonth()+1,cur.getDate())] = selectedStatus;
      cur.setDate(cur.getDate()+1);
    }
    saveSchedule(); refreshViews(); return;
  }
  const isoSingle = text.match(/(\d{4}-\d{2}-\d{2})/);
  if(isoSingle){
    const d = new Date(isoSingle[1]);
    if(d.getDay()!==0 && d.getDay()!==6) schedule[iso(d.getFullYear(),d.getMonth()+1,d.getDate())] = selectedStatus;
    saveSchedule(); refreshViews(); return;
  }
  if(text.includes('next week')){
    const now = new Date(); const nextSunday = new Date(now); nextSunday.setDate(now.getDate() + (7 - now.getDay()));
    for(let i=1;i<=5;i++){
      const d = new Date(nextSunday); d.setDate(nextSunday.getDate()+i);
      schedule[iso(d.getFullYear(),d.getMonth()+1,d.getDate())] = selectedStatus;
    }
    saveSchedule(); refreshViews(); return;
  }
  // weekday range like "monday to friday"
  const wdRange = text.match(/(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s*(?:to|-)\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/);
  if(wdRange){
    const mapDay = { sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6 };
    const sIdx = mapDay[wdRange[1]]; const eIdx = mapDay[wdRange[2]];
    const base = new Date(); const sunday = new Date(base); sunday.setDate(base.getDate() - base.getDay());
    for(let i=sIdx;i<=eIdx;i++){
      const d = new Date(sunday); d.setDate(sunday.getDate()+i);
      if(d.getDay()!==0 && d.getDay()!==6) schedule[iso(d.getFullYear(),d.getMonth()+1,d.getDate())] = selectedStatus;
    }
    saveSchedule(); refreshViews(); return;
  }

  alert('Could not parse dates from voice. Try "next week WFH" or "2025-09-22 to 2025-09-26 WFH".');
}

// refresh views logic
function refreshViews(){
  if(tabMonth.classList.contains('active')) buildMonthView(currentYear,currentMonth);
  if(tabYear.classList.contains('active')) buildYearView(currentYear);
  if(tabSummary.classList.contains('active')) updateSummary(currentYear,currentMonth);
  // actionBar visible only on month & year tabs
  actionBar.style.display = tabSummary.classList.contains('active') ? 'none' : 'flex';
}

// initialize
function initApp(){
  loadSchedule();
  const now = new Date();
  // start on device's current month/year but clamp to allowed range
  if(now.getFullYear() < START_YEAR) { currentYear = START_YEAR; currentMonth = 1; }
  else if(now.getFullYear() > END_YEAR) { currentYear = START_YEAR; currentMonth = 1; }
  else { currentYear = now.getFullYear(); currentMonth = now.getMonth()+1; }

  buildMonthView(currentYear,currentMonth);
  buildYearView(currentYear);
  updateSummary(currentYear,currentMonth);
  showTab('month');
}
initApp();
