/* WF OFFICE PLANNER - script.js
   - Multi-year calendar 2025..2040
   - persistent localStorage
   - status-button selection + clear
   - multi-day drag select
   - voice command parsing (basic)
   - summary view with prev/next arrows
*/

// CONFIG
const START_YEAR = 2025;
const END_YEAR = 2040;
const statuses = ["WFH","OFFC","TRAIN","EL","SL","PH"];

// State
let schedule = {}; // { "YYYY-MM-DD": "WFH", ... }
let selectedStatus = null;
let dragSelecting = false;
let dragCells = new Set();
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1; // 1..12

// Elements
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
const summaryLabel = document.getElementById('summaryLabel');
const summaryPanel = document.getElementById('summaryPanel');
const summaryPrev = document.getElementById('summaryPrev');
const summaryNext = document.getElementById('summaryNext');

// Load schedule from localStorage
function loadSchedule(){
  try{
    const raw = localStorage.getItem('wf_schedule_v1');
    if(raw) schedule = JSON.parse(raw);
  }catch(e){ console.warn("load error",e); schedule = {}; }
}
function saveSchedule(){
  localStorage.setItem('wf_schedule_v1', JSON.stringify(schedule));
}

// Utilities
function pad(n){ return n.toString().padStart(2,'0'); }
function iso(y,m,d){ return `${y}-${pad(m)}-${pad(d)}`; }
function monthName(m){ return new Date(2000, m-1,1).toLocaleString('default',{month:'long'}).toUpperCase(); }

// Render one month card (used in month view)
function renderMonthCard(y,m){
  const card = document.createElement('div');
  card.className = 'month-card';
  const title = document.createElement('div');
  title.className = 'month-title';
  title.textContent = `${monthName(m)} ${y}`;
  card.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';
  // week day headers
  ["SUN","MON","TUE","WED","THU","FRI","SAT"].forEach(h=>{
    const hcell = document.createElement('div');
    hcell.className = 'day-cell';
    hcell.style.fontWeight = '700';
    hcell.textContent = h;
    grid.appendChild(hcell);
  });

  const first = new Date(y, m-1, 1);
  const firstDow = first.getDay(); // 0..6
  const days = new Date(y, m, 0).getDate();

  // blank cells before first day
  for(let i=0;i<firstDow;i++){
    const blank = document.createElement('div');
    blank.className = 'day-cell';
    blank.textContent = '';
    grid.appendChild(blank);
  }

  for(let d=1; d<=days; d++){
    const dateStr = iso(y,m,d);
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    cell.dataset.date = dateStr;
    cell.textContent = (schedule[dateStr] || d);
    // weekend
    const dow = new Date(y,m-1,d).getDay();
    if(dow===0 || dow===6){
      cell.classList.add('weekend');
      cell.textContent = ''; // blank weekend per your requirement
    } else {
      if(schedule[dateStr]){
        cell.classList.add(schedule[dateStr]);
        cell.textContent = schedule[dateStr];
      }
      // enable click & drag
      cell.addEventListener('mousedown', e => { if(!cell.classList.contains('weekend')) startDrag(cell); });
      cell.addEventListener('mouseenter', e => { if(dragSelecting && !cell.classList.contains('weekend')) hoverDrag(cell); });
      cell.addEventListener('mouseup', e => { if(dragSelecting) endDrag(); });
      cell.addEventListener('click', e => { if(!dragSelecting) singleClick(cell); });
      // touch events
      cell.addEventListener('touchstart', e => { if(!cell.classList.contains('weekend')) startDrag(cell); }, {passive:true});
      cell.addEventListener('touchmove', e => { }, {passive:true});
      cell.addEventListener('touchend', e => { if(dragSelecting) endDrag(); });
    }
    grid.appendChild(cell);
  }

  card.appendChild(grid);
  return card;
}

// Build month view (single month)
function buildMonthView(y,m){
  monthContainer.innerHTML = '';
  const card = renderMonthCard(y,m);
  monthContainer.appendChild(card);
  monthYearLabel.textContent = `${monthName(m)} ${y}`;
}

// Build year view (12 months for a year)
function buildYearView(y){
  yearContainer.innerHTML = '';
  const header = document.createElement('h2');
  header.textContent = y;
  const container = document.createElement('div');
  container.className = 'year-grid';
  // create 12 months in groups (use existing renderMonthCard but smaller)
  for(let mo=1; mo<=12; mo++){
    const card = renderMonthCard(y,mo);
    // style smaller for year grid
    card.classList.add('year-card');
    yearContainer.appendChild(card);
  }
  monthYearLabel.textContent = y;
}

// Single cell click (when not dragging)
function singleClick(cell){
  const dateStr = cell.dataset.date;
  if(!dateStr) return;
  if(selectedStatus === null) return;
  if(selectedStatus === ''){ // clear single
    delete schedule[dateStr];
    saveSchedule();
    refreshViews();
    return;
  }
  schedule[dateStr] = selectedStatus;
  saveSchedule();
  refreshViews();
}

// Drag helpers
function startDrag(cell){
  dragSelecting = true;
  dragCells.clear();
  hoverDrag(cell);
}
function hoverDrag(cell){
  cell.classList.add('selected-temp');
  dragCells.add(cell);
}
function endDrag(){
  // apply selectedStatus to all dragCells
  dragCells.forEach(c => {
    const dateStr = c.dataset.date;
    if(!dateStr) return;
    if(selectedStatus === '') delete schedule[dateStr];
    else schedule[dateStr] = selectedStatus;
  });
  dragSelecting = false;
  dragCells.forEach(c => c.classList.remove('selected-temp'));
  dragCells.clear();
  saveSchedule();
  refreshViews();
}

// Refresh current views
function refreshViews(){
  if(monthView.style.display !== 'none'){
    buildMonthView(parseInt(currentYear), parseInt(currentMonth));
  }
  if(yearView.style.display !== 'none'){
    buildYearView(parseInt(currentYear));
  }
  updateSummaryPanel();
  highlightSelectedStatusButton();
}

// Status selection
document.querySelectorAll('.status-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const s = btn.dataset.status;
    // CLEAR MONTH button special
    if(s === 'CLEARMONTH'){
      if(!confirm('Clear all entries for this month?')) return;
      clearMonth(parseInt(currentYear), parseInt(currentMonth));
      return;
    }
    selectedStatus = s === '' ? '' : s;
    highlightSelectedStatusButton();
  });
});
function highlightSelectedStatusButton(){
  document.querySelectorAll('.status-btn').forEach(b=>{
    b.style.outline = (b.dataset.status === selectedStatus) ? '3px solid #333' : 'none';
  });
}

// clear month
function clearMonth(y,m){
  const keys = Object.keys(schedule);
  keys.forEach(k=>{
    const [yy,mm,dd] = k.split('-').map(Number);
    if(yy===y && mm===m) delete schedule[k];
  });
  saveSchedule();
  refreshViews();
}

// Tabs
tabMonth.addEventListener('click', ()=>{ showTab('month'); });
tabYear.addEventListener('click', ()=>{ showTab('year'); });
tabSummary.addEventListener('click', ()=>{ showTab('summary'); });
function showTab(t){
  tabMonth.classList.remove('active');
  tabYear.classList.remove('active');
  tabSummary.classList.remove('active');
  if(t==='month'){ tabMonth.classList.add('active'); monthView.style.display='block'; yearView.style.display='none'; summaryView.style.display='none'; }
  if(t==='year'){ tabYear.classList.add('active'); monthView.style.display='none'; yearView.style.display='block'; summaryView.style.display='none'; }
  if(t==='summary'){ tabSummary.classList.add('active'); monthView.style.display='none'; yearView.style.display='none'; summaryView.style.display='block'; }
  refreshViews();
}

// Prev/Next navigation (for month/year depending on tab)
prevBtn.addEventListener('click', ()=>{
  if(tabMonth.classList.contains('active')){
    // go previous month
    let y = currentYear, m = currentMonth-1;
    if(m<1){ m=12; y--;}
    currentYear = y; currentMonth = m;
    buildMonthView(y,m);
  } else if(tabYear.classList.contains('active')){
    currentYear = parseInt(currentYear)-1;
    buildYearView(currentYear);
  } else {
    // summary - prev month
    let [y,m] = [parseInt(summaryLabel.dataset.year), parseInt(summaryLabel.dataset.month)];
    m--; if(m<1){ m=12; y--; }
    updateSummary(y,m);
  }
});
nextBtn.addEventListener('click', ()=>{
  if(tabMonth.classList.contains('active')){
    let y = currentYear, m = currentMonth+1;
    if(m>12){ m=1; y++; }
    currentYear = y; currentMonth = m;
    buildMonthView(y,m);
  } else if(tabYear.classList.contains('active')){
    currentYear = parseInt(currentYear)+1;
    buildYearView(currentYear);
  } else {
    let [y,m] = [parseInt(summaryLabel.dataset.year), parseInt(summaryLabel.dataset.month)];
    m++; if(m>12){ m=1; y++; }
    updateSummary(y,m);
  }
});

// SUMMARY panel
summaryPrev.addEventListener('click', ()=>{
  let y = parseInt(summaryLabel.dataset.year), m = parseInt(summaryLabel.dataset.month);
  m--; if(m<1){ m=12; y--; }
  updateSummary(y,m);
});
summaryNext.addEventListener('click', ()=>{
  let y = parseInt(summaryLabel.dataset.year), m = parseInt(summaryLabel.dataset.month);
  m++; if(m>12){ m=1; y++; }
  updateSummary(y,m);
});
function updateSummary(y,m){
  summaryLabel.textContent = `${monthName(m)} ${y}`;
  summaryLabel.dataset.year = y; summaryLabel.dataset.month = m;
  // compute counts for month
  let counts = {WFH:0,OFFC:0,TRAIN:0,EL:0,SL:0,PH:0};
  for(const k in schedule){
    const [yy,mm,dd] = k.split('-').map(Number);
    if(yy===y && mm===m && counts[schedule[k]]!==undefined) counts[schedule[k]]++;
  }
  summaryPanel.innerHTML = '';
  Object.keys(counts).forEach(k=>{
    const row = document.createElement('div'); row.className='summary-row';
    row.innerHTML = `<div>${k}</div><div>${counts[k]}</div>`;
    summaryPanel.appendChild(row);
  });
}

// Voice integration (Web Speech API)
const voiceBtn = document.getElementById('voiceBtn');
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if(SpeechRecognition){
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  voiceBtn.addEventListener('click', ()=> {
    try{
      recognition.start();
      voiceBtn.textContent = '🎤 Listening...';
    }catch(e){}
  });

  recognition.addEventListener('result', e=>{
    const t = e.results[0][0].transcript.toLowerCase();
    voiceBtn.textContent = '🎤 Voice';
    parseVoice(t);
  });
  recognition.addEventListener('end', ()=> { voiceBtn.textContent = '🎤 Voice'; });
} else {
  voiceBtn.disabled = true; voiceBtn.title = 'Voice not supported in this browser';
}

// Basic voice parser supporting patterns:
// - "next week WFH"
// - "monday to friday WFH"
// - "2025-09-22 to 2025-09-26 WFH"
// - "2025-09-22 WFH"
function parseVoice(text){
  // find status word
  const statusWords = { wfh: "WFH", offc: "OFFC", office:"OFFC", train:"TRAIN", training:"TRAIN", ph:"PH", "public holiday":"PH", el:"EL", sl:"SL", leave:"EL" };
  let foundStatus = null;
  for(const k in statusWords){
    if(text.includes(k)) { foundStatus = statusWords[k]; break; }
  }
  if(!foundStatus){ alert('Status not found in voice text. Say e.g. "Next week WFH"'); return; }
  selectedStatus = foundStatus;
  // date range patterns
  const isoRange = text.match(/(\d{4}-\d{2}-\d{2})\s*(?:to|-)\s*(\d{4}-\d{2}-\d{2})/);
  if(isoRange){
    const start = new Date(isoRange[1]), end = new Date(isoRange[2]);
    let cur = new Date(start);
    while(cur<=end){
      const dow = cur.getDay();
      if(dow!==0 && dow!==6){
        schedule[iso(cur.getFullYear(),cur.getMonth()+1,cur.getDate())] = selectedStatus;
      }
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
  // next week pattern
  if(text.includes('next week')){
    const now = new Date();
    // start from next sunday
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + (7 - now.getDay()));
    for(let i=1;i<=5;i++){
      const d = new Date(nextSunday);
      d.setDate(nextSunday.getDate() + i);
      schedule[iso(d.getFullYear(),d.getMonth()+1,d.getDate())] = selectedStatus;
    }
    saveSchedule(); refreshViews(); return;
  }
  // weekday range like "monday to friday"
  const wdRange = text.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*(?:to|-)\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
  if(wdRange){
    // apply to current week
    const map = { sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6 };
    const startIdx = map[wdRange[1]];
    const endIdx = map[wdRange[2]];
    const base = new Date(); // current week
    const sunday = new Date(base); sunday.setDate(base.getDate() - base.getDay());
    for(let i=startIdx;i<=endIdx;i++){
      const d = new Date(sunday); d.setDate(sunday.getDate() + i);
      if(d.getDay()!==0 && d.getDay()!==6) schedule[iso(d.getFullYear(),d.getMonth()+1,d.getDate())] = selectedStatus;
    }
    saveSchedule(); refreshViews(); return;
  }
  alert('Could not parse date range from voice. Try "Next week WFH" or "2025-09-22 to 2025-09-26 WFH"');
}

// Initialize app
function init(){
  loadSchedule();
  // set default to current month/year within allowed range
  if(currentYear < START_YEAR) currentYear = START_YEAR;
  if(currentYear > END_YEAR) currentYear = START_YEAR;
  buildMonthView(currentYear, currentMonth);
  buildYearView(currentYear);
  updateSummary(currentYear, currentMonth);
  showTab('month');
  highlightSelectedStatusButton();
}
init();

/* helpers to render month and year on demand */
function buildMonthView(y,m){
  currentYear = y; currentMonth = m;
  monthContainer.innerHTML = '';
  const card = renderMonthCard(y,m);
  monthContainer.appendChild(card);
  monthYearLabel.textContent = `${monthName(m)} ${y}`;
}
