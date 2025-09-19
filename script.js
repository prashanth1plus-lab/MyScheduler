/* WF OFFICE PLANNER - clean, fixed version
   - years: 2025..2040
   - persistent localStorage
   - status buttons (hidden on summary tab)
   - Clear single / Clear month
   - month/year navigation
   - voice commands (basic patterns)
   - weekends black and blank
*/

const START_YEAR = 2025, END_YEAR = 2040;
const STATUS_KEYS = ["WFH","OFFC","TRAIN","EL","SL","PH"];

// state
let schedule = {};              // { "YYYY-MM-DD": "WFH", ... }
let selectedStatus = null;      // e.g. "WFH" or "" for clear single
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1; // 1..12

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


// localStorage helpers
function loadSchedule(){
  try{
    const raw = localStorage.getItem('wf_schedule_v2');
    if(raw) schedule = JSON.parse(raw);
  }catch(e){ console.warn(e); schedule = {}; }
}
function saveSchedule(){
  try{ localStorage.setItem('wf_schedule_v2', JSON.stringify(schedule)); }catch(e){ console.warn(e); }
}

// helpers
function pad(n){ return n.toString().padStart(2,'0'); }
function iso(y,m,d){ return `${y}-${pad(m)}-${pad(d)}`; }
function monthName(m){ return new Date(2000,m-1,1).toLocaleString('default',{month:'long'}); }

// render a single month card (full grid)
function renderMonthCard(y,m){
  const card = document.createElement('div');
  card.className = 'month-card';
  const title = document.createElement('div'); title.className='month-title'; title.textContent = `${monthName(m)} ${y}`;
  card.appendChild(title);

  const grid = document.createElement('div'); grid.className='calendar-grid';

  // headers
  ["SUN","MON","TUE","WED","THU","FRI","SAT"].forEach(h=>{
    const hcell = document.createElement('div');
    hcell.className = 'day-cell';
    hcell.style.fontWeight = '700';
    hcell.textContent = h;
    grid.appendChild(hcell);
  });

  const first = new Date(y, m-1, 1);
  const firstDow = first.getDay(); // 0..6
  const daysInMonth = new Date(y, m, 0).getDate();

  // blanks before first day
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
    // weekend: black and blank
    if(dow===0 || dow===6){
      cell.classList.add('weekend');
      cell.textContent = '';
      // do not attach editable handlers
    } else {
      if(schedule[dateStr]){
        cell.classList.add(schedule[dateStr]);
        cell.textContent = schedule[dateStr];
      } else {
        cell.textContent = d; // show day number if no status
      }
      // events
      cell.addEventListener('click', ()=> onCellClick(cell));
      cell.addEventListener('mousedown', ()=> startDrag(cell));
      cell.addEventListener('mouseenter', ()=> hoverDrag(cell));
      cell.addEventListener('mouseup', ()=> endDrag());
      // touch
      cell.addEventListener('touchstart', ()=> startDrag(cell), {passive:true});
      cell.addEventListener('touchend', ()=> endDrag(), {passive:true});
    }
    // highlight today if matches
    const today = new Date();
    if(y===today.getFullYear() && m===today.getMonth()+1 && d===today.getDate()){
      cell.classList.add('today');
    }
    grid.appendChild(cell);
  }

  card.appendChild(grid);
  return card;
}

// build views
function buildMonthView(y,m){
  monthContainer.innerHTML = '';
  const card = renderMonthCard(y,m);
  monthContainer.appendChild(card);
  monthYearLabel.textContent = `${monthName(m)} ${y}`;
  // store current visible
  currentYear = y; currentMonth = m;
}
function buildYearView(y){
  yearContainer.innerHTML = '';
  monthYearLabel.textContent = `${y}`;
  for(let mo=1; mo<=12; mo++){
    const card = renderMonthCard(y,mo);
    card.classList.add('year-card');
    yearContainer.appendChild(card);
  }
}

// cell click handling
let dragging = false;
let dragSet = new Set();

function onCellClick(cell){
  if(dragging) return; // ignore single click if dragging
  if(selectedStatus === null) return;
  const d = cell.dataset.date;
  if(!d) return;
  if(selectedStatus === ''){ // clear single
    delete schedule[d];
  } else {
    schedule[d] = selectedStatus;
  }
  saveSchedule();
  refreshViews();
}

// drag functions for multi-day select
function startDrag(cell){
  if(!cell || cell.classList.contains('weekend')) return;
  dragging = true;
  dragSet.clear();
  hoverDrag(cell);
}
function hoverDrag(cell){
  if(!dragging) return;
  if(!cell || cell.classList.contains('weekend')) return;
  dragSet.add(cell);
  cell.style.outline = '3px dashed rgba(0,0,0,0.12)';
}
function endDrag(){
  if(!dragging) return;
  dragSet.forEach(c=>{
    const d = c.dataset.date;
    if(selectedStatus === '') delete schedule[d]; else schedule[d] = selectedStatus;
    c.style.outline = '';
  });
  dragSet.clear();
  dragging = false;
  saveSchedule();
  refreshViews();
}

// clear month
function clearMonth(y,m){
  if(!confirm(`Clear all statuses for ${monthName(m)} ${y}?`)) return;
  Object.keys(schedule).forEach(k=>{
    const [yy,mm] = k.split('-').map(Number);
    if(yy===y && mm===m) delete schedule[k];
  });
  saveSchedule();
  refreshViews();
}

// summary
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

// show/hide tabs and action bar
function showTab(tab){
  tabMonth.classList.remove('active'); tabYear.classList.remove('active'); tabSummary.classList.remove('active');
  monthView.style.display='none'; yearView.style.display='none'; summaryView.style.display='none';
  if(tab==='month'){ tabMonth.classList.add('active'); monthView.style.display='block'; actionBar.style.display='flex'; buildMonthView(currentYear,currentMonth); }
  if(tab==='year'){ tabYear.classList.add('active'); yearView.style.display='block'; actionBar.style.display='flex'; buildYearView(currentYear); }
  if(tab==='summary'){ tabSummary.classList.add('active'); summaryView.style.display='block'; actionBar.style.display='none'; updateSummary(currentYear,currentMonth); }
}

// navigation
prevBtn.addEventListener('click', ()=>{
  if(tabMonth.classList.contains('active')){
    let y=currentYear, m=currentMonth-1;
    if(m<1){ m=12; y--; if(y<START_YEAR) { y=START_YEAR; m=1; } }
    currentYear=y; currentMonth=m; buildMonthView(y,m);
  } else if(tabYear.classList.contains('active')){
    currentYear = Math.max(START_YEAR, currentYear-1);
    buildYearView(currentYear);
  } else {
    // summary
    let y=parseInt(summaryLabel.dataset.year)||currentYear, m=parseInt(summaryLabel.dataset.month)||currentMonth;
    m--; if(m<1){ m=12; y--; if(y<START_YEAR){ y=START_YEAR; m=1; } }
    updateSummary(y,m);
    currentYear=y; currentMonth=m;
  }
});
nextBtn.addEventListener('click', ()=>{
  if(tabMonth.classList.contains('active')){
    let y=currentYear, m=currentMonth+1;
    if(m>12){ m=1; y++; if(y>END_YEAR){ y=END_YEAR; m=12; } }
    currentYear=y; currentMonth=m; buildMonthView(y,m);
  } else if(tabYear.classList.contains('active')){
    currentYear = Math.min(END_YEAR, currentYear+1);
    buildYearView(currentYear);
  } else {
    let y=parseInt(summaryLabel.dataset.year)||currentYear, m=parseInt(summaryLabel.dataset.month)||currentMonth;
    m++; if(m>12){ m=1; y++; if(y>END_YEAR){ y=END_YEAR; m=12; } }
    updateSummary(y,m);
    currentYear=y; currentMonth=m;
  }
});

// summary arrows
summaryPrev.addEventListener('click', ()=>{ let y=parseInt(summaryLabel.dataset.year), m=parseInt(summaryLabel.dataset.month); m--; if(m<1){ m=12; y--; } updateSummary(y,m); currentYear=y; currentMonth=m; });
summaryNext.addEventListener('click', ()=>{ let y=parseInt(summaryLabel.dataset.year), m=parseInt(summaryLabel.dataset.month); m++; if(m>12){ m=1; y++; } updateSummary(y,m); currentYear=y; currentMonth=m; });

// tab clicks
tabMonth.addEventListener('click', ()=>showTab('month'));
tabYear.addEventListener('click', ()=>showTab('year'));
tabSummary.addEventListener('click', ()=>showTab('summary'));

// status buttons
document.querySelectorAll('.status-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const s = btn.dataset.status;
    if(s === 'CLEARMONTH'){ clearMonth(currentYear,currentMonth); return; }
    selectedStatus = (s === '') ? '' : s; // '' signals clear single
    // highlight
    document.querySelectorAll('.status-btn').forEach(b=>b.style.boxShadow='none');
    btn.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.06) inset';
  });
});

// clear single button is implemented by selecting Clear (selectedStatus === '')
// clear month handled separately by CLEARMONTH above

// voice integration
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if(SpeechRecognition){
  const rec = new SpeechRecognition();
  rec.lang = 'en-US'; rec.interimResults = false;
  voiceBtn.addEventListener('click', ()=>{ try{ rec.start(); voiceBtn.textContent='🎤 Listening...'; }catch(e){} });
  rec.addEventListener('result', e=>{
    const text = e.results[0][0].transcript.toLowerCase();
    voiceBtn.textContent = '🎤 Voice';
    parseVoice(text);
  });
  rec.addEventListener('end', ()=>{ voiceBtn.textContent = '🎤 Voice'; });
} else {
  voiceBtn.disabled=true; voiceBtn.title='Voice not supported in this browser';
}

// improved voice parser (supports several patterns)
function parseVoice(text){
  // status detection
  const map = {
    'wfh':'WFH','work from home':'WFH',
    'office':'OFFC','offc':'OFFC',
    'train':'TRAIN','training':'TRAIN',
    'leave':'EL','el':'EL',
    'sick':'SL','sick leave':'SL','sl':'SL',
    'public holiday':'PH','holiday':'PH','ph':'PH'
  };
  let found = null;
  for(const k in map) if(text.includes(k)) { found = map[k]; break; }
  if(!found){ alert('Status not detected. Speak: "Next week WFH" or "2025-09-22 to 2025-09-26 WFH"'); return; }
  selectedStatus = found;

  // ISO date range: 2025-09-22 to 2025-09-26
  const isoRange = text.match(/(\d{4}-\d{2}-\d{2})\s*(?:to|-)\s*(\d{4}-\d{2}-\d{2})/);
  if(isoRange){
    const s = new Date(isoRange[1]); const e = new Date(isoRange[2]);
    let cur = new Date(s);
    while(cur <= e){
      const dow = cur.getDay();
      if(dow!==0 && dow!==6) schedule[iso(cur.getFullYear(),cur.getMonth()+1,cur.getDate())] = selectedStatus;
      cur.setDate(cur.getDate()+1);
    }
    saveSchedule(); refreshViews(); return;
  }
  // single ISO date
  const isoSingle = text.match(/(\d{4}-\d{2}-\d{2})/);
  if(isoSingle){
    const d = new Date(isoSingle[1]);
    if(d.getDay()!==0 && d.getDay()!==6) schedule[iso(d.getFullYear(),d.getMonth()+1,d.getDate())] = selectedStatus;
    saveSchedule(); refreshViews(); return;
  }
  // next week pattern
  if(text.includes('next week')){
    const now = new Date();
    const nextSunday = new Date(now); nextSunday.setDate(now.getDate() + (7 - now.getDay()));
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
    // apply to current week
    const base = new Date(); const sunday = new Date(base); sunday.setDate(base.getDate() - base.getDay());
    for(let i=sIdx;i<=eIdx;i++){
      const d = new Date(sunday); d.setDate(sunday.getDate()+i);
      if(d.getDay()!==0 && d.getDay()!==6) schedule[iso(d.getFullYear(),d.getMonth()+1,d.getDate())] = selectedStatus;
    }
    saveSchedule(); refreshViews(); return;
  }

  alert('Could not parse dates from voice. Try "next week WFH" or "2025-09-22 to 2025-09-26 WFH".');
}

// refresh views
function refreshViews(){
  if(tabMonth.classList.contains('active')) buildMonthView(currentYear,currentMonth);
  if(tabYear.classList.contains('active')) buildYearView(currentYear);
  if(tabSummary.classList.contains('active')) updateSummary(currentYear,currentMonth);
  // hide or show actionBar depending on tab
  if(tabSummary.classList.contains('active')) actionBar.style.display = 'none'; else actionBar.style.display = 'flex';
}

// initial load
function init(){
  loadSchedule();
  if(currentYear < START_YEAR) { currentYear = START_YEAR; currentMonth = 1; }
  if(currentYear > END_YEAR) { currentYear = START_YEAR; currentMonth = 1; }
  // clamp currentYear
  if(currentYear < START_YEAR) currentYear = START_YEAR;
  if(currentYear > END_YEAR) currentYear = END_YEAR;
  // default populate month
  buildMonthView(currentYear,currentMonth);
  buildYearView(currentYear);
  updateSummary(currentYear,currentMonth);
  showTab('month');
}

init();
