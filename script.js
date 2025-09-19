/* Final clean script.js
   - Month (editable), Year (read-only), Summary (read-only)
   - Years 2025..2040
   - localStorage persistence
   - Voice support (Chrome Android recommended)
*/

const START_YEAR = 2025, END_YEAR = 2040;
const STATUS_KEYS = ["WFH", "OFC", "TRAIN", "LEAVE", "PH"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Map full voice phrases to their shortcut keys
const VOICE_STATUS_MAP = {
  "work from home": "WFH",
  "wfh": "WFH",
  "office": "OFC",
  "ofc": "OFC",
  "training": "TRAIN",
  "train": "TRAIN",
  "leave": "LEAVE",
  "sick leave": "LEAVE",
  "earned leave": "LEAVE",
  "el": "LEAVE",
  "sl": "LEAVE",
  "public holiday": "PH",
  "ph": "PH",
  "holiday": "PH"
};

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
    header.textContent = day.substring(0, 3);
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
    card.dataset.year = year;
    card.dataset.month = m;

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
      dayCell.style.padding = '2px';
      
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

    // Event listener to switch to Month tab
    card.addEventListener('click', () => {
      currentYear = year;
      currentMonth = m;
      showView('month');
    });
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
    item.classList.add('summary-row', status);
    item.innerHTML = `<div>${status}</div><div>${counts[status]}</div>`;
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
  alert('All entries for this month have been cleared.');
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

// Helper to get a date from a phrase like "today", "tomorrow", "next monday"
function getDateFromPhrase(phrase) {
  const today = new Date();
  const lowerPhrase = phrase.toLowerCase();
  
  if (lowerPhrase.includes("today")) {
    return today;
  }
  if (lowerPhrase.includes("tomorrow")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow;
  }
  if (lowerPhrase.includes("this")) {
    const dayName = lowerPhrase.split('this ')[1];
    const dayIndex = DAY_NAMES.map(d => d.toLowerCase()).indexOf(dayName);
    if (dayIndex !== -1) {
      const day = new Date(today);
      const diff = dayIndex - day.getDay();
      day.setDate(day.getDate() + diff);
      return day;
    }
  }
  if (lowerPhrase.includes("next")) {
    const dayName = lowerPhrase.split('next ')[1];
    const dayIndex = DAY_NAMES.map(d => d.toLowerCase()).indexOf(dayName);
    if (dayIndex !== -1) {
      const day = new Date(today);
      const diff = dayIndex - day.getDay();
      day.setDate(day.getDate() + 7 + (diff > 0 ? diff : diff + 7));
      return day;
    }
  }
  return null;
}

function parseVoice(text) {
  const statusPhrases = Object.keys(VOICE_STATUS_MAP).join('|');
  const monthNamesRegex = MONTH_NAMES.map(m=>m.toLowerCase()).join('|');
  
  // Get status from phrase
  const getStatus = (t) => {
    for (const phrase in VOICE_STATUS_MAP) {
      if (t.includes(phrase)) {
        return VOICE_STATUS_MAP[phrase];
      }
    }
    return null;
  };

  // 1. Handle "Clear" commands
  const clearMonthMatch = text.match(/clear this month/);
  if (clearMonthMatch) {
    clearMonth();
    return;
  }
  const clearDateMatch = text.match(new RegExp(`(?:clear|remove) (?:the )?(\\d+)(?:st|nd|rd|th)?(?: of )?(${monthNamesRegex})?`));
  if (clearDateMatch) {
    const day = parseInt(clearDateMatch[1]);
    const monthName = clearDateMatch[2];
    const monthIdx = monthName ? MONTH_NAMES.map(m=>m.toLowerCase()).indexOf(monthName) : currentMonth - 1;
    const dateISO = iso(currentYear, monthIdx + 1, day);
    if (schedule[dateISO]) {
      delete schedule[dateISO];
      saveSchedule();
      refreshViews();
      alert(`Cleared entry for ${day} ${MONTH_NAMES[monthIdx]}.`);
    } else {
      alert(`No entry found for ${day} ${MONTH_NAMES[monthIdx]}.`);
    }
    return;
  }

  // 2. Handle simple status assignments with relative dates (Today, Tomorrow, Weekdays)
  const relativeDateMatch = text.match(new RegExp(`(${DAY_NAMES.map(d=>d.toLowerCase()).join('|')}|today|tomorrow|this\\s*${DAY_NAMES.map(d=>d.toLowerCase()).join('|')}|next\\s*${DAY_NAMES.map(d=>d.toLowerCase()).join('|')}) is (${statusPhrases})`));
  if (relativeDateMatch) {
    const phrase = relativeDateMatch[1];
    const status = getStatus(relativeDateMatch[2]);
    const date = getDateFromPhrase(phrase);
    if(date && status) {
      const dateISO = iso(date.getFullYear(), date.getMonth() + 1, date.getDate());
      schedule[dateISO] = status;
      saveSchedule(); refreshViews();
      alert(`Set ${phrase} to ${status}.`);
      return;
    }
  }
  
  // 3. Handle "next week..."
  const nextWeekMatch = text.match(new RegExp(`next week (${statusPhrases})`));
  if (nextWeekMatch) {
    const selectedStatus = getStatus(nextWeekMatch[1]);
    if (selectedStatus) {
      const today = new Date();
      const nextMonday = new Date(today);
      nextMonday.setDate(today.getDate() + (8 - today.getDay()));
      for (let i = 0; i < 5; i++) {
        const d = new Date(nextMonday);
        d.setDate(nextMonday.getDate() + i);
        const dateISO = iso(d.getFullYear(), d.getMonth() + 1, d.getDate());
        schedule[dateISO] = selectedStatus;
      }
      saveSchedule(); refreshViews();
      alert(`Set next week to ${selectedStatus}.`);
      return;
    }
  }

  // 4. Handle date ranges
  const rangeMatch = text.match(new RegExp(`(\\d+)\\s*(?:to|-)\\s*(\\d+)(?:th)?\\s*(${monthNamesRegex})\\s*(${statusPhrases})`));
  if (rangeMatch) {
    const fromDay = parseInt(rangeMatch[1]);
    const toDay = parseInt(rangeMatch[2]);
    const monthName = rangeMatch[3];
    const monthIdx = MONTH_NAMES.map(m=>m.toLowerCase()).indexOf(monthName);
    const status = getStatus(rangeMatch[4]);

    if (monthIdx !== -1 && fromDay <= toDay && status) {
      for (let day = fromDay; day <= toDay; day++) {
        const dateISO = iso(currentYear, monthIdx + 1, day);
        schedule[dateISO] = status;
      }
      saveSchedule(); refreshViews();
      alert(`Set ${fromDay} to ${toDay} ${monthName} to ${status}.`);
      return;
    }
  }

  // 5. Handle single-day assignments
  const singleDayMatch = text.match(new RegExp(`(?:mark|on)?\\s*(\\d+)(?:st|nd|rd|th)?\\s*(?:of)?\\s*(${monthNamesRegex})?\\s*(${statusPhrases})`));
  if (singleDayMatch) {
    const day = parseInt(singleDayMatch[1]);
    const monthName = singleDayMatch[2];
    const status = getStatus(singleDayMatch[3]);
    let monthIdx = currentMonth - 1;
    if (monthName) {
      monthIdx = MONTH_NAMES.map(m=>m.toLowerCase()).indexOf(monthName);
    }
    
    if(!isNaN(day) && status) {
      const dateISO = iso(currentYear, monthIdx + 1, day);
      schedule[dateISO] = status;
      saveSchedule(); refreshViews();
      alert(`Set ${day} ${MONTH_NAMES[monthIdx]} to ${status}.`);
      return;
    }
  }

  alert('Could not parse voice command. Try a different format like "next week WFH" or "5 to 10 March sick leave".');
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