/* Final clean script.js
   - Month (editable), Year (read-only), Summary (read-only)
   - Years 2025..2040
   - localStorage persistence
   - Voice support (Chrome Android recommended)
*/

const START_YEAR = 2025, END_YEAR = 2040;
const STATUS_KEYS = ["WFH", "OFC", "TRAIN", "SL/EL", "PH"];
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
  "earned leave": "EL",
  "el": "EL",
  "sick leave": "SL",
  "sl": "SL",
  "leave": "SL/EL",
  "public holiday": "PH",
  "ph": "PH",
  "holiday": "PH"
};

// application state
let schedule = {};
let selectedStatus = null; // e.g. "WFH" or "" for CLEAR single
let lastBaseStatus = "WFH"; // tracks last WFH/OFC for half-day leave
let current = new Date(); // current device date
let currentYear = current.getFullYear();
let currentMonth = current.getMonth() + 1; // 1..12
let summaryCurrentYear = currentYear;

// DOM refs
const monthContainer = document.getElementById('monthContainer');
const yearContainer = document.getElementById('yearContainer');
const monthView = document.getElementById('monthView');
const yearView = document.getElementById('yearView');
const summaryView = document.getElementById('summaryView');
const helpView = document.getElementById('helpView');
const monthYearLabel = document.getElementById('monthYearLabel');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const tabMonth = document.getElementById('tabMonth');
const tabYear = document.getElementById('tabYear');
const tabSummary = document.getElementById('tabSummary');
const tabHelp = document.getElementById('tabHelp');
const actionBar = document.getElementById('actionBar');
const summaryLabel = document.getElementById('summaryLabel');
const summaryPanelMonth = document.getElementById('summaryPanelMonth');
const summaryPrev = document.getElementById('summaryPrev');
const summaryNext = document.getElementById('summaryNext');
const statusBtns = document.querySelectorAll('.status-btn');
const clearSingleBtn = document.getElementById('clearSingleBtn');

const voiceBtnMonth = document.getElementById('voiceBtnMonth');
const voiceBtnYear = document.getElementById('voiceBtnYear');
const voiceBtnSummary = document.getElementById('voiceBtnSummary');

const summaryTabs = document.querySelectorAll('.summary-tab-btn');
const summaryMonthTab = document.getElementById('summaryMonth');
const summaryYearTab = document.getElementById('summaryYear');
const summaryRangeTab = document.getElementById('summaryRange');
const summaryYearLabel = document.getElementById('summaryYearLabel');
const summaryPanelYear = document.getElementById('summaryPanelYear');
const summaryYearPrev = document.getElementById('summaryYearPrev');
const summaryYearNext = document.getElementById('summaryYearNext');
const rangeStartInput = document.getElementById('rangeStart');
const rangeEndInput = document.getElementById('rangeEnd');
const generateRangeSummaryBtn = document.getElementById('generateRangeSummary');
const summaryPanelRange = document.getElementById('summaryPanelRange');

const helpContent = document.getElementById('helpContent');
helpContent.innerHTML = `
    <h2>App Help Guide</h2>
    <p>This guide will help you understand how to use the "WF Office Planner" app, especially with the new voice assistant capabilities.</p>
    <h3>How to Use the App</h3>
    <p>The app has four main tabs:</p>
    <ul>
        <li><strong>MONTH (1st Tab):</strong> This is your main workspace. Use the buttons at the top to select a status (WFH, OFC, etc.), then click on any day to apply that status. You can also click and drag to select a range of dates. Use the "CLEAR" button to remove a status from a selected day.</li>
        <li><strong>YEAR (2nd Tab):</strong> This tab provides a read-only overview of your entire year. It shows all 12 months in one view, color-coded based on your entries. You can click on any month's card to jump to that month in the Month view.</li>
        <li><strong>SUMMARY (3rd Tab):</strong> This tab gives you a breakdown of your entries for a specific month, year, or a custom date range.</li>
        <li><strong>HELP (4th Tab):</strong> This tab contains this help guide.</li>
    </ul>
    <h3>Voice Commands</h3>
    <p>To use the voice assistant, click the <strong>"🎤 Voice"</strong> button on the active tab and speak your command.</p>
    <h4>Commands on the MONTH Tab:</h4>
    <ul>
        <li><strong>Update status for a specific date:</strong>
            <ul>
                <li>"Mark 15th to Office."</li>
                <li>"Set today to WFH."</li>
                <li>"Update next week with training."</li>
                <li>"Change 25th of October to public holiday."</li>
            </ul>
        </li>
        <li><strong>Update status for a date range:</strong>
            <ul>
                <li>"Mark 10th to 15th to EL."</li>
                <li>"Change 2nd to 5th of November to sick leave."</li>
            </ul>
        </li>
        <li><strong>Clear an entry:</strong>
            <ul>
                <li>"Clear the 20th."</li>
            </ul>
        </li>
        <li><strong>Navigate months:</strong>
            <ul>
                <li>"Next month."</li>
                <li>"Go to November."</li>
            </ul>
        </li>
    </ul>
    <h4>Commands on the YEAR Tab:</h4>
    <ul>
        <li><strong>Change the displayed year:</strong>
            <ul>
                <li>"Next year."</li>
                <li>"Previous year."</li>
            </ul>
        </li>
    </ul>
    <h4>Commands on the SUMMARY Tab:</h4>
    <ul>
        <li><strong>Get a summary for the current month:</strong>
            <ul>
                <li>"Show monthly summary."</li>
                <li>"Get a summary for this month."</li>
            </ul>
        </li>
        <li><strong>Get a summary for a specific month:</strong>
            <ul>
                <li>"Show summary for January."</li>
            </ul>
        </li>
        <li><strong>Get a summary for the year:</strong>
            <ul>
                <li>"Show yearly summary."</li>
                <li>"Get a summary for this year."</li>
            </ul>
        </li>
        <li><strong>Get a summary for a date range:</strong>
            <ul>
                <li>"Show summary from 10th to 15th of December."</li>
            </ul>
        </li>
    </ul>
`;


// voice functionality
const speechSynth = window.speechSynthesis;
function speak(text) {
  if (speechSynth.speaking) return;
  const utterance = new SpeechSynthesisUtterance(text);
  speechSynth.speak(utterance);
}

function startVoiceRecognition(parseFunction) {
  if (!('webkitSpeechRecognition' in window)) {
    speak('Voice recognition not supported. Try Chrome on Android.');
    return;
  }
  const recognition = new webkitSpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.toLowerCase();
    parseFunction(transcript);
  };
  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    speak('Voice recognition error. Please try again.');
  };
  recognition.start();
}

// event listeners
prevBtn.addEventListener('click', () => changeMonth(-1));
nextBtn.addEventListener('click', () => changeMonth(1));
tabMonth.addEventListener('click', () => showView('month'));
tabYear.addEventListener('click', () => showView('year'));
tabSummary.addEventListener('click', () => showView('summary'));
tabHelp.addEventListener('click', () => showView('help'));
summaryPrev.addEventListener('click', () => updateSummaryMonthly(currentYear, currentMonth - 1));
summaryNext.addEventListener('click', () => updateSummaryMonthly(currentYear, currentMonth + 1));
summaryYearPrev.addEventListener('click', () => updateSummaryYearly(summaryCurrentYear - 1));
summaryYearNext.addEventListener('click', () => updateSummaryYearly(summaryCurrentYear + 1));
generateRangeSummaryBtn.addEventListener('click', () => updateSummaryRange());
clearSingleBtn.addEventListener('click', () => selectedStatus = "");

voiceBtnMonth.addEventListener('click', () => startVoiceRecognition(parseVoiceMonth));
voiceBtnYear.addEventListener('click', () => startVoiceRecognition(parseVoiceYear));
voiceBtnSummary.addEventListener('click', () => startVoiceRecognition(parseVoiceSummary));

statusBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    statusBtns.forEach(b => b.classList.remove('active'));
    selectedStatus = btn.dataset.status;
    btn.classList.add('active');
    if (selectedStatus === 'WFH' || selectedStatus === 'OFC') {
        lastBaseStatus = selectedStatus;
    }
  });
});

summaryTabs.forEach(btn => {
  btn.addEventListener('click', (e) => {
    summaryTabs.forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    const tab = e.target.dataset.tab;
    summaryMonthTab.style.display = 'none';
    summaryYearTab.style.display = 'none';
    summaryRangeTab.style.display = 'none';
    if (tab === 'month') {
      summaryMonthTab.style.display = 'block';
      updateSummaryMonthly(currentYear, currentMonth);
    } else if (tab === 'year') {
      summaryYearTab.style.display = 'block';
      updateSummaryYearly(summaryCurrentYear);
    } else if (tab === 'range') {
      summaryRangeTab.style.display = 'block';
      updateSummaryRange();
    }
  });
});

// data functions
function saveSchedule() {
  localStorage.setItem('wf_schedule_v_final', JSON.stringify(schedule));
}

function loadSchedule() {
  try {
    const raw = localStorage.getItem('wf_schedule_v_final');
    if (raw) schedule = JSON.parse(raw);
  } catch (e) {
    console.warn('load error', e);
    schedule = {};
  }
}

// view functions
function showView(viewName) {
  tabMonth.classList.remove('active');
  tabYear.classList.remove('active');
  tabSummary.classList.remove('active');
  tabHelp.classList.remove('active');
  monthView.style.display = 'none';
  yearView.style.display = 'none';
  summaryView.style.display = 'none';
  helpView.style.display = 'none';

  // The controls section (prev/next buttons) and the action bar are only visible on the Month and Year views
  const showControls = viewName === 'month' || viewName === 'year';
  document.querySelector('.controls').style.display = showControls ? 'flex' : 'none';
  
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
    const activeTab = document.querySelector('.summary-tab-btn.active').dataset.tab;
    if (activeTab === 'month') updateSummaryMonthly(currentYear, currentMonth);
    else if (activeTab === 'year') updateSummaryYearly(summaryCurrentYear);
    else if (activeTab === 'range') updateSummaryRange();
  } else if (viewName === 'help') {
    tabHelp.classList.add('active');
    helpView.style.display = 'block';
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

function buildMonthView(y, m) {
  monthContainer.innerHTML = '';
  monthYearLabel.textContent = `${monthName(m)} ${y}`;
  currentYear = y;
  currentMonth = m;

  const firstDayOfMonth = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();

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

  for (let i = 0; i < firstDayOfMonth; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.classList.add('empty-cell');
    grid.appendChild(emptyCell);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m - 1, d);
    const dateISO = iso(y, m, d);
    const dayCell = document.createElement('div');
    dayCell.classList.add('day-cell');
    dayCell.dataset.date = dateISO;

    const dayNumber = document.createElement('span');
    dayNumber.classList.add('day-number');
    dayNumber.textContent = d;
    dayCell.appendChild(dayNumber);

    if (date.getDay() === 0 || date.getDay() === 6) {
      dayCell.classList.add('weekend');
    }

    if (schedule[dateISO]) {
      const status = schedule[dateISO];
      const parts = status.split('_');
      if (parts.length === 2) {
          dayCell.classList.add('half-day');
          const firstPart = document.createElement('span');
          firstPart.classList.add('half-day-leave', parts[0]);
          firstPart.textContent = parts[0];
          dayCell.appendChild(firstPart);

          const secondPart = document.createElement('span');
          secondPart.classList.add('half-day-status', parts[1]);
          secondPart.textContent = parts[1];
          dayCell.appendChild(secondPart);
      } else {
        dayCell.classList.add(status);
        const statusLabel = document.createElement('span');
        statusLabel.classList.add('day-label');
        statusLabel.textContent = status;
        dayCell.appendChild(statusLabel);
      }
    }
    
    // highlight today
    const td = new Date();
    if (y === td.getFullYear() && m === td.getMonth() + 1 && d === td.getDate()) {
      dayCell.classList.add('today');
    }

    dayCell.addEventListener('click', () => {
      if (dayCell.classList.contains('weekend') || selectedStatus === null) return;
      const prevStatus = schedule[dateISO];
      
      if (selectedStatus === 'SL/EL') {
          // Create the in-place dropdown/menu
          const menu = document.createElement('div');
          menu.classList.add('leave-menu');
          
          const fullDayBtn = document.createElement('button');
          fullDayBtn.textContent = 'Full Day';
          fullDayBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              schedule[dateISO] = 'SL/EL';
              saveSchedule();
              refreshViews();
              menu.remove();
          });
          
          const halfDayBtn = document.createElement('button');
          halfDayBtn.textContent = 'Half Day';
          halfDayBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              const existingStatus = schedule[dateISO];
              let workStatus = 'WFH'; // Default to WFH
              if (existingStatus === 'WFH' || existingStatus === 'OFC' || existingStatus === 'TRAIN') {
                workStatus = existingStatus;
              } else if (lastBaseStatus) {
                workStatus = lastBaseStatus;
              }
              const finalStatus = `SL/EL_${workStatus}`;
              schedule[dateISO] = finalStatus;
              saveSchedule();
              refreshViews();
              menu.remove();
          });
          
          menu.appendChild(fullDayBtn);
          menu.appendChild(halfDayBtn);
          
          dayCell.appendChild(menu);
          
      } else if (selectedStatus === '') {
          delete schedule[dateISO];
          saveSchedule();
          refreshViews();
      } else {
          schedule[dateISO] = selectedStatus;
          saveSchedule();
          refreshViews();
      }
    });

    grid.appendChild(dayCell);
  }
  monthContainer.appendChild(grid);
}

function buildYearView(y) {
  yearContainer.innerHTML = '';
  monthYearLabel.textContent = y;

  for (let m = 1; m <= 12; m++) {
    const card = document.createElement('div');
    card.classList.add('year-month-card');
    card.dataset.year = y;
    card.dataset.month = m;

    const monthHeader = document.createElement('h4');
    monthHeader.classList.add('month-title');
    monthHeader.textContent = MONTH_NAMES[m - 1];
    card.appendChild(monthHeader);

    const dayHeaders = document.createElement('div');
    dayHeaders.classList.add('calendar-grid');
    DAY_NAMES.forEach(day => {
      const header = document.createElement('div');
      header.classList.add('day-header');
      header.textContent = day.substring(0, 1);
      dayHeaders.appendChild(header);
    });
    card.appendChild(dayHeaders);

    const grid = document.createElement('div');
    grid.classList.add('calendar-grid');
    const daysInMonth = new Date(y, m, 0).getDate();
    const firstDayOfMonth = new Date(y, m - 1, 1).getDay();

    for (let i = 0; i < firstDayOfMonth; i++) {
      const empty = document.createElement('div');
      empty.classList.add('empty-cell');
      grid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dayCell = document.createElement('div');
      dayCell.classList.add('day-cell');

      const dayNumber = document.createElement('span');
      dayNumber.textContent = d;
      dayCell.appendChild(dayNumber);

      const date = new Date(y, m - 1, d);
      if (date.getDay() === 0 || date.getDay() === 6) {
        dayCell.classList.add('weekend');
      }

      const dateISO = iso(y, m, d);
      const status = schedule[dateISO];
      if (status) {
          const parts = status.split('_');
          if (parts.length === 2) {
              dayCell.classList.add('half-day');
              const firstPart = document.createElement('span');
              firstPart.classList.add('half-day-leave-mini', parts[0]);
              firstPart.textContent = parts[0];
              dayCell.appendChild(firstPart);

              const secondPart = document.createElement('span');
              secondPart.classList.add('half-day-status-mini', parts[1]);
              secondPart.textContent = parts[1];
              dayCell.appendChild(secondPart);
          } else {
              dayCell.classList.add(status);
          }
      }
      grid.appendChild(dayCell);
    }
    card.appendChild(grid);
    yearContainer.appendChild(card);

    card.addEventListener('click', () => {
      currentYear = y;
      currentMonth = m;
      showView('month');
    });
  }
}

function updateSummaryMonthly(year, month) {
  summaryPanelMonth.innerHTML = '';
  if (month < 1) {
    month = 12;
    year--;
  }
  if (month > 12) {
    month = 1;
    year++;
  }
  currentYear = year;
  currentMonth = month;

  summaryLabel.textContent = `${MONTH_NAMES[month-1]} ${year}`;
  const counts = { "WFH": 0, "OFC": 0, "TRAIN": 0, "SL": 0, "EL": 0, "PH": 0, "SL/EL": 0 };

  const daysInMonth = new Date(year, month, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const dateISO = iso(year, month, day);
    const status = schedule[dateISO];
    if (status) {
      const parts = status.split('_');
      if (parts.length === 2) {
          counts[parts[0]] += 0.5;
          counts[parts[1]] += 0.5;
      } else if (counts.hasOwnProperty(status)) {
        counts[status]++;
      } else {
        // Handle cases like SL/EL
        if (status === 'SL/EL') {
          counts['SL/EL']++;
        }
      }
    }
  }

  for (const status in counts) {
    if (counts[status] === 0) continue;
    const item = document.createElement('div');
    item.classList.add('summary-row', status);
    item.innerHTML = `<div>${status}</div><div>${counts[status]}</div>`;
    summaryPanelMonth.appendChild(item);
  }
  return counts;
}

function updateSummaryYearly(year) {
  summaryPanelYear.innerHTML = '';
  summaryCurrentYear = year;
  summaryYearLabel.textContent = year;

  const counts = { "WFH": 0, "OFC": 0, "TRAIN": 0, "SL": 0, "EL": 0, "PH": 0, "SL/EL": 0 };

  for (let m = 1; m <= 12; m++) {
    const daysInMonth = new Date(year, m, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateISO = iso(year, m, day);
      const status = schedule[dateISO];
      if (status) {
        const parts = status.split('_');
        if (parts.length === 2) {
            counts[parts[0]] += 0.5;
            counts[parts[1]] += 0.5;
        } else if (counts.hasOwnProperty(status)) {
          counts[status]++;
        } else {
          // Handle cases like SL/EL
          if (status === 'SL/EL') {
            counts['SL/EL']++;
          }
        }
      }
    }
  }

  for (const status in counts) {
    if (counts[status] === 0) continue;
    const item = document.createElement('div');
    item.classList.add('summary-row', status);
    item.innerHTML = `<div>${status}</div><div>${counts[status]}</div>`;
    summaryPanelYear.appendChild(item);
  }
  return counts;
}

function updateSummaryRange() {
  const startDate = new Date(rangeStartInput.value);
  const endDate = new Date(rangeEndInput.value);
  summaryPanelRange.innerHTML = '';

  if (isNaN(startDate) || isNaN(endDate) || startDate > endDate) {
    summaryPanelRange.innerHTML = '<p>Please select a valid date range.</p>';
    return {};
  }

  const counts = { "WFH": 0, "OFC": 0, "TRAIN": 0, "SL": 0, "EL": 0, "PH": 0, "SL/EL": 0 };
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateISO = iso(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
    const status = schedule[dateISO];
    if (status) {
        const parts = status.split('_');
        if (parts.length === 2) {
            counts[parts[0]] += 0.5;
            counts[parts[1]] += 0.5;
        } else if (counts.hasOwnProperty(status)) {
          counts[status]++;
        } else {
          // Handle cases like SL/EL
          if (status === 'SL/EL') {
            counts['SL/EL']++;
          }
        }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  for (const status in counts) {
    if (counts[status] === 0) continue;
    const item = document.createElement('div');
    item.classList.add('summary-row', status);
    item.innerHTML = `<div>${status}</div><div>${counts[status]}</div>`;
    summaryPanelRange.appendChild(item);
  }
  return counts;
}

// voice parsing functions
function parseVoiceMonth(text) {
  const statusPhrases = Object.keys(VOICE_STATUS_MAP).join('|');
  const monthNamesRegex = MONTH_NAMES.map(m => m.toLowerCase()).join('|');

  const getStatus = (t) => {
    for (const phrase in VOICE_STATUS_MAP) {
      if (t.includes(phrase)) {
        return VOICE_STATUS_MAP[phrase];
      }
    }
    return null;
  };

  const navMonthMatch = text.match(new RegExp(`(?:go to|show|display) (?:the )?(${monthNamesRegex})`));
  if (navMonthMatch) {
    const monthName = navMonthMatch[1];
    const monthIdx = MONTH_NAMES.map(m => m.toLowerCase()).indexOf(monthName);
    if (monthIdx !== -1) {
      currentMonth = monthIdx + 1;
      showView('month');
      speak(`Navigating to ${monthName}.`);
      return;
    }
  }

  const nextPrevMatch = text.match(new RegExp(`(next|previous) month`));
  if (nextPrevMatch) {
    const direction = nextPrevMatch[1] === 'next' ? 1 : -1;
    changeMonth(direction);
    speak(`${nextPrevMatch[1]} month.`);
    return;
  }

  const clearDateMatch = text.match(new RegExp(`(?:clear|remove) (?:the )?(\\d+)(?:st|nd|rd|th)?(?: of )?(${monthNamesRegex})?`));
  if (clearDateMatch) {
    const day = parseInt(clearDateMatch[1]);
    const monthName = clearDateMatch[2];
    const monthIdx = monthName ? MONTH_NAMES.map(m => m.toLowerCase()).indexOf(monthName) : currentMonth - 1;
    const dateISO = iso(currentYear, monthIdx + 1, day);
    if (schedule[dateISO]) {
      delete schedule[dateISO];
      saveSchedule();
      refreshViews();
      speak(`Cleared entry for ${day} ${MONTH_NAMES[monthIdx]}.`);
    } else {
      speak(`No entry found for ${day} ${MONTH_NAMES[monthIdx]}.`);
    }
    return;
  }

  const relativeDateMatch = text.match(new RegExp(`(${DAY_NAMES.map(d => d.toLowerCase()).join('|')}|today|tomorrow|this\\s*${DAY_NAMES.map(d => d.toLowerCase()).join('|')}|next\\s*${DAY_NAMES.map(d => d.toLowerCase()).join('|')}) is (${statusPhrases})`));
  if (relativeDateMatch) {
    const phrase = relativeDateMatch[1];
    const status = getStatus(relativeDateMatch[2]);
    const date = getDateFromPhrase(phrase);
    if (date && status) {
      const dateISO = iso(date.getFullYear(), date.getMonth() + 1, date.getDate());
      schedule[dateISO] = status;
      saveSchedule();
      refreshViews();
      speak(`Set ${phrase} to ${status}.`);
      return;
    }
  }

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
      saveSchedule();
      refreshViews();
      speak(`Set next week to ${selectedStatus}.`);
      return;
    }
  }

  const fullMonthMatch = text.match(new RegExp(`(mark|update|add) (${statusPhrases}) for full month`));
  if(fullMonthMatch) {
      const status = getStatus(fullMonthMatch[2]);
      if (status) {
          const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
          for (let d = 1; d <= daysInMonth; d++) {
              const dow = new Date(currentYear, currentMonth - 1, d).getDay();
              if (dow !== 0 && dow !== 6) {
                  schedule[iso(currentYear, currentMonth, d)] = status;
              }
          }
          saveSchedule();
          refreshViews();
          speak(`Marked full month to ${status}`);
          return;
      }
  }
  
  const rangeMatch = text.match(new RegExp(`(\\d+)\\s*(?:to|-)\\s*(\\d+)(?:th)?\\s*(?:of)?\\s*(${monthNamesRegex})?\\s*(?:as|to)?\\s*(${statusPhrases})`));
  if (rangeMatch) {
    const fromDay = parseInt(rangeMatch[1]);
    const toDay = parseInt(rangeMatch[2]);
    const monthName = rangeMatch[3];
    const status = getStatus(rangeMatch[4]);
    const monthIdx = monthName ? MONTH_NAMES.map(m => m.toLowerCase()).indexOf(monthName) : currentMonth - 1;

    if (monthIdx !== -1 && fromDay <= toDay && status) {
      for (let day = fromDay; day <= toDay; day++) {
        const dateISO = iso(currentYear, monthIdx + 1, day);
        schedule[dateISO] = status;
      }
      saveSchedule();
      refreshViews();
      speak(`Set ${fromDay} to ${toDay} of ${monthName || MONTH_NAMES[currentMonth-1]} to ${status}.`);
      return;
    }
  }

  const singleDayMatch = text.match(new RegExp(`(?:mark|on|update|add)?\\s*(\\d+)(?:st|nd|rd|th)?\\s*(?:of)?\\s*(${monthNamesRegex})?\\s*(?:as|to)?\\s*(${statusPhrases})`));
  if (singleDayMatch) {
    const day = parseInt(singleDayMatch[1]);
    const monthName = singleDayMatch[2];
    const status = getStatus(singleDayMatch[3]);
    let monthIdx = currentMonth - 1;
    if (monthName) {
      monthIdx = MONTH_NAMES.map(m => m.toLowerCase()).indexOf(monthName);
    }

    if (!isNaN(day) && status) {
        if(status === 'SL/EL') {
            const finalStatus = `EL_${lastBaseStatus}`;
            schedule[iso(currentYear, monthIdx + 1, day)] = finalStatus;
        } else {
            schedule[iso(currentYear, monthIdx + 1, day)] = status;
        }
      saveSchedule();
      refreshViews();
      speak(`Set ${day} ${MONTH_NAMES[monthIdx]} to ${schedule[iso(currentYear, monthIdx + 1, day)]}.`);
      return;
    }
  }
  speak('Could not parse voice command. Try a different format.');
}

function parseVoiceYear(text) {
  const yearMatch = text.match(/(next|previous) year/);
  if (yearMatch) {
    const direction = yearMatch[1] === 'next' ? 1 : -1;
    currentYear += direction;
    if (currentYear < START_YEAR) currentYear = START_YEAR;
    if (currentYear > END_YEAR) currentYear = END_YEAR;
    refreshViews();
    speak(`${yearMatch[1]} year. Now showing ${currentYear}.`);
    return;
  }
  speak('I can only change the year here. Try saying "next year" or "previous year".');
}

function parseVoiceSummary(text) {
  const monthNamesRegex = MONTH_NAMES.map(m => m.toLowerCase()).join('|');
  const summaryTypeMatch = text.match(/(monthly|yearly|range) summary/);
  if (summaryTypeMatch) {
    const tabName = summaryTypeMatch[1];
    document.querySelector(`.summary-tab-btn[data-tab="${tabName}"]`).click();
    speak(`Showing ${tabName} summary.`);
    return;
  }

  const monthlyNavMatch = text.match(new RegExp(`(?:show|display|get) (?:monthly summary for )?(${monthNamesRegex})`));
  if (monthlyNavMatch) {
    const monthName = monthlyNavMatch[1];
    const monthIdx = MONTH_NAMES.map(m => m.toLowerCase()).indexOf(monthName);
    if (monthIdx !== -1) {
      document.querySelector(`.summary-tab-btn[data-tab="month"]`).click();
      const counts = updateSummaryMonthly(currentYear, monthIdx + 1);
      let response = `Summary for ${monthName}.`;
      for (const status in counts) {
        if (counts[status] > 0) {
          response += ` ${counts[status]} days of ${status}.`;
        }
      }
      speak(response);
      return;
    }
  }

  const rangeSummaryMatch = text.match(new RegExp(`(?:show|display|get) summary from (\\d+)\\s*(?:to|-)\\s*(\\d+) of (${monthNamesRegex})`));
  if (rangeSummaryMatch) {
    const fromDay = parseInt(rangeSummaryMatch[1]);
    const toDay = parseInt(rangeSummaryMatch[2]);
    const monthName = rangeSummaryMatch[3];
    const monthIdx = MONTH_NAMES.map(m => m.toLowerCase()).indexOf(monthName);
    if (monthIdx !== -1) {
      document.querySelector('.summary-tab-btn[data-tab="range"]').click();
      rangeStartInput.value = iso(currentYear, monthIdx + 1, fromDay);
      rangeEndInput.value = iso(currentYear, monthIdx + 1, toDay);
      const counts = updateSummaryRange();
      let response = `Summary from ${fromDay} to ${toDay} of ${monthName}.`;
      for (const status in counts) {
        if (counts[status] > 0) {
          response += ` ${counts[status]} days of ${status}.`;
        }
      }
      speak(response);
      return;
    }
  }

  const yearSummaryMatch = text.match(/(?:show|display|get) yearly summary/);
  if (yearSummaryMatch) {
    document.querySelector('.summary-tab-btn[data-tab="year"]').click();
    const counts = updateSummaryYearly(summaryCurrentYear);
    let response = `Yearly summary for ${summaryCurrentYear}.`;
    for (const status in counts) {
      if (counts[status] > 0) {
        response += ` ${counts[status]} days of ${status}.`;
      }
    }
    speak(response);
    return;
  }

  speak('Could not parse summary command. Try a different format like "show monthly summary for January" or "show yearly summary".');
}

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

// helper function for ISO format
function pad(n) {
  return n.toString().padStart(2, '0');
}
function iso(year, month, day) {
  const d = new Date(year, month - 1, day);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function monthName(m) {
  return new Date(2000, m - 1, 1).toLocaleString('default', {
    month: 'long'
  });
}

// refresh views logic
function refreshViews() {
  if (tabMonth.classList.contains('active')) buildMonthView(currentYear, currentMonth);
  if (tabYear.classList.contains('active')) buildYearView(currentYear);
  if (tabSummary.classList.contains('active')) {
    const activeTab = document.querySelector('.summary-tab-btn.active').dataset.tab;
    if (activeTab === 'month') updateSummaryMonthly(currentYear, currentMonth);
    else if (activeTab === 'year') updateSummaryYearly(summaryCurrentYear);
    else if (activeTab === 'range') updateSummaryRange();
  }
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