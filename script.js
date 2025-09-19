/* Final clean script.js
   - Month (editable), Year (read-only), Summary (read-only)
   - Years 2025..2040
   - localStorage persistence
   - Voice support (Chrome Android recommended)
*/

const START_YEAR = 2025, END_YEAR = 2040;
const STATUS_KEYS = ["WFH", "OFFC", "TRAIN", "EL", "SL", "PH"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
const statusBtns = document.querySelectorAll('.status-btn');
const clearSingleBtn = document.getElementById('clearSingleBtn');
const clearMonthBtn = document.getElementById('clearMonthBtn');
const voiceBtn = document.getElementById('voiceBtn');

// event listeners
prevBtn.addEventListener('click', () => changeMonth(-1));
nextBtn.addEventListener('click', () => changeMonth(1));
tabMonth.addEventListener('click', () => showView('month'));
tabYear.addEventListener('click', () => showView('year'));
tabSummary.addEventListener('click', () => showView('summary'));
summaryPrev.addEventListener('click', () => updateSummary(currentYear, currentMonth - 1));
summaryNext.addEventListener('click', () => updateSummary(currentYear, currentMonth + 1));
clearSingleBtn.addEventListener('click', () => selectedStatus = "");
clearMonthBtn.addEventListener('click', () => clearMonth());
voiceBtn.addEventListener('click', () => startVoiceRecognition());

statusBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    statusBtns.forEach(b => b.classList.remove('active'));
    selectedStatus = btn.dataset.status;
    btn.classList.add('active');
  });
});

// data functions
function saveSchedule() {
  localStorage.setItem('schedule', JSON.stringify(schedule));
}

function loadSchedule() {
  const saved = localStorage.getItem('schedule');
  if (saved) {
    schedule = JSON.parse(saved);
  }
}

// view functions
function showView(viewName) {
  tabMonth.classList.remove('active');
  tabYear.classList.remove('active');
  tabSummary.classList.remove('active');
  monthView.style.display = 'none';
  yearView.style.display = 'none';
  summaryView.style.display = 'none';

  actionBar.style.display = 'flex';
  prevBtn.style.display = 'flex';
  nextBtn.style.display = 'flex';

  if (viewName === 'month') {
    tabMonth.classList.add('active');
    monthView.style.display = 'block';
    refreshViews();
  } else if (viewName === 'year') {
    tabYear.classList.add('active');
    yearView.style.display = 'block';
    refreshViews();
  } else if (viewName === 'summary') {
    tabSummary.classList.add('active');
    summaryView.style.display = 'block';
    actionBar.style.display = 'none';
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    refreshViews();
  }
}

function changeMonth(direction) {
  currentMonth += direction;
  if (currentMonth > 12) {
    currentMonth = 1;
    currentYear++;
  } else if (currentMonth < 1) {
    currentMonth = 12;
    currentYear--;
  }
  if (currentYear < START_YEAR) currentYear = START_YEAR;
  if (currentYear > END_YEAR) currentYear = END_YEAR;
  refreshViews();
}

function buildMonthView(year, month) {
  monthContainer.innerHTML = ''; // clear
  monthYearLabel.textContent = `${MONTH_NAMES[month - 1]} ${year}`;

  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0=Sun, 6=Sat
  const daysInMonth = new Date(year, month, 0).getDate();

  const dayHeaders = document.createElement('div');
  dayHeaders.classList.add('calendar-grid');
  DAY_NAMES.forEach(day => {
    const header = document.createElement('div');
    header.classList.add('day-header');
    header.textContent = day;
    dayHeaders.appendChild(header);
  });
  monthContainer.appendChild(dayHeaders);

  const grid = document.createElement('div');
  grid.classList.add('calendar-grid');

  // Add empty cells for the start of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.classList.add('empty-cell');
    grid.appendChild(emptyCell);
  }

  // Add day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayCell = document.createElement('div');
    dayCell.classList.add('day-cell');
    
    // Add day number
    const dayNumber = document.createElement('span');
    dayNumber.classList.add('day-number');
    dayNumber.textContent = day;
    dayCell.appendChild(dayNumber);

    // Check for weekend
    if (date.getDay() === 0 || date.getDay() === 6) {
      dayCell.classList.add('weekend');
    }

    // Add status label if saved
    const dateISO = iso(year, month, day);
    if (schedule[dateISO]) {
      dayCell.classList.add(schedule[dateISO]);
      const statusLabel = document.createElement('span');
      statusLabel.classList.add('day-label');
      statusLabel.textContent = schedule[dateISO];
      dayCell.appendChild(statusLabel);
    }

    dayCell.addEventListener('click', () => {
      if (dayCell.classList.contains('weekend')) return;
      if (selectedStatus === "CLEARMONTH") { return; }
      
      const prevStatus = schedule[dateISO];
      schedule[dateISO] = selectedStatus;
      if (selectedStatus) {
        dayCell.classList.remove(prevStatus);
        dayCell.classList.add(selectedStatus);
        
        // Remove and re-add label to prevent duplicates
        const existingLabel = dayCell.querySelector('.day-label');
        if (existingLabel) { existingLabel.remove(); }
        const newLabel = document.createElement('span');
        newLabel.classList.add('day-label');
        newLabel.textContent = selectedStatus;
        dayCell.appendChild(newLabel);
      } else {
        delete schedule[dateISO];
        dayCell.classList.remove(prevStatus);
        const existingLabel = dayCell.querySelector('.day-label');
        if (existingLabel) { existingLabel.remove(); }
      }
      saveSchedule();
    });

    grid.appendChild(dayCell);
  }
  monthContainer.appendChild(grid);
}

function buildYearView(year) {
  yearContainer.innerHTML = '';
  monthYearLabel.textContent = year;

  for (let m = 1; m <= 12; m++) {
    const card = document.createElement('div');
    card.classList.add('year-month-card');
    const monthHeader = document.createElement('h4');
    monthHeader.textContent = MONTH_NAMES[m - 1];
    card.appendChild(monthHeader);

    const grid = document.createElement('div');
    grid.classList.add('calendar-grid');
    grid.style.gap = '2px';
    const daysInMonth = new Date(year, m, 0).getDate();
    const firstDayOfMonth = new Date(year, m-1, 1).getDay();

    // Add empty cells
    for(let i=0; i<firstDayOfMonth; i++){
      const empty = document.createElement('div');
      empty.classList.add('empty-cell');
      empty.style.minHeight = '10px';
      grid.appendChild(empty);
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dayCell = document.createElement('div');
      dayCell.classList.add('day-cell');
      dayCell.style.minHeight = '10px';
      dayCell.style.padding = '5px';
      
      const date = new Date(year, m-1, d);
      if (date.getDay() === 0 || date.getDay() === 6) {
        dayCell.classList.add('weekend');
      }

      const dateISO = iso(year, m, d);
      if (schedule[dateISO]) {
        dayCell.classList.add(schedule[dateISO]);
      }
      grid.appendChild(dayCell);
    }
    card.appendChild(grid);
    yearContainer.appendChild(card);
  }
}

function updateSummary(year, month) {
  summaryPanel.innerHTML = '';
  if (month < 1) { month = 12; year--; }
  if (month > 12) { month = 1; year++; }
  currentYear = year;
  currentMonth = month;
  
  summaryLabel.textContent = `${MONTH_NAMES[month-1]} ${year}`;
  const counts = STATUS_KEYS.reduce((acc, status) => ({ ...acc, [status]: 0 }), {});
  
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const dateISO = iso(year, month, day);
    const status = schedule[dateISO];
    if (status && counts.hasOwnProperty(status)) {
      counts[status]++;
    }
  }

  for (const status in counts) {
    const item = document.createElement('div');
    item.classList.add('summary-item');
    item.innerHTML = `<span>${status}</span><span>${counts[status]}</span>`;
    summaryPanel.appendChild(item);
  }
}

function clearMonth() {
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const dateISO = iso(currentYear, currentMonth, day);
    delete schedule[dateISO];
  }
  saveSchedule();
  refreshViews();
}

// voice recognition logic
function startVoiceRecognition() {
  if (!('webkitSpeechRecognition' in window)) {
    alert('Voice recognition not supported. Try Chrome on Android.');
    return;
  }
  const recognition = new webkitSpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.start();
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.toLowerCase();
    parseVoice(transcript);
  };
  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    alert('Voice recognition error. Please try again.');
  };
}

function parseVoice(text) {
  const statusPattern = STATUS_KEYS.map(s => s.toLowerCase()).join('|');

  // Handle "next week..."
  const nextWeekMatch = text.match(new RegExp(`next week (${statusPattern})`));
  if (nextWeekMatch) {
    const selectedStatus = nextWeekMatch[1].toUpperCase();
    const today = new Date();
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + (7 - today.getDay()));
    for (let i = 0; i < 5; i++) {
      const d = new Date(nextSunday);
      d.setDate(nextSunday.getDate() + i + 1);
      const dateISO = iso(d.getFullYear(), d.getMonth() + 1, d.getDate());
      schedule[dateISO] = selectedStatus;
    }
    saveSchedule(); refreshViews(); return;
  }
  
  // Handle "1 to 5 march..."
  const rangeMatch = text.match(/(\d+)\s*(?:to|-)\s*(\d+)\s*(\w+)\s*(\w+)?/);
  if (rangeMatch) {
    const fromDay = parseInt(rangeMatch[1]);
    const toDay = parseInt(rangeMatch[2]);
    const monthName = rangeMatch[3].charAt(0).toUpperCase() + rangeMatch[3].slice(1);
    const monthIdx = MONTH_NAMES.indexOf(monthName);
    const status = (rangeMatch[4] || "").toUpperCase();

    if (monthIdx !== -1 && fromDay <= toDay && status) {
      for (let day = fromDay; day <= toDay; day++) {
        const dateISO = iso(currentYear, monthIdx + 1, day);
        schedule[dateISO] = status;
      }
      saveSchedule(); refreshViews(); return;
    }
  }

  // Handle "mark 10 april train" or similar
  const markSingleDayMatch = text.match(new RegExp(`(?:mark|on)?\\s*(\\d+)(?:st|nd|rd|th)?\\s*(${MONTH_NAMES.map(m=>m.toLowerCase()).join('|')})\\s*(${statusPattern})`));
  if (markSingleDayMatch) {
    const day = parseInt(markSingleDayMatch[1]);
    const monthName = markSingleDayMatch[2];
    const status = markSingleDayMatch[3].toUpperCase();
    const monthIdx = MONTH_NAMES.map(m=>m.toLowerCase()).indexOf(monthName);
    if(monthIdx !== -1 && !isNaN(day)) {
      const dateISO = iso(currentYear, monthIdx + 1, day);
      schedule[dateISO] = status;
      saveSchedule(); refreshViews(); return;
    }
  }

  alert('Could not parse dates from voice. Try "next week WFH", "1 to 5 March OFFC", or "Mark 10 April TRAIN".');
}


// helper function for ISO format
function iso(year, month, day) {
  const d = new Date(year, month - 1, day);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// refresh views logic
function refreshViews() {
  if (tabMonth.classList.contains('active')) buildMonthView(currentYear, currentMonth);
  if (tabYear.classList.contains('active')) buildYearView(currentYear);
  if (tabSummary.classList.contains('active')) updateSummary(currentYear, currentMonth);
}

// initialize
function initApp() {
  loadSchedule();
  const now = new Date();
  if (now.getFullYear() < START_YEAR) {
    currentYear = START_YEAR;
    currentMonth = 1;
  }
  refreshViews();
}

initApp();