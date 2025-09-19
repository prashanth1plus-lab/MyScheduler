let schedule = {};
let today = new Date();
let selectedStatus = "";

// Build calendar
function buildCalendar(year, month){
    const table = document.getElementById("calendarTable");
    table.innerHTML="";
    let firstDay = new Date(year, month-1,1).getDay();
    let daysInMonth = new Date(year, month,0).getDate();
    let tr = document.createElement("tr");
    ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach(d=>{
        let th=document.createElement("th"); th.textContent=d; tr.appendChild(th);
    });
    table.appendChild(tr);
    let date=1;
    for(let i=0;i<6;i++){
        let row=document.createElement("tr");
        for(let j=0;j<7;j++){
            let cell=document.createElement("td");
            if(i===0 && j<firstDay){ cell.innerHTML=""; row.appendChild(cell); continue;}
            if(date>daysInMonth){ cell.innerHTML=""; row.appendChild(cell); continue;}
            let dateStr=`${year}-${month.toString().padStart(2,'0')}-${date.toString().padStart(2,'0')}`;
            cell.textContent=date;
            if(schedule[dateStr]){
                cell.className=schedule[dateStr];
                cell.textContent=schedule[dateStr];
            }
            if(j===0||j===6){ cell.classList.add("weekend"); }
            if(date===today.getDate() && month===today.getMonth()+1 && year===today.getFullYear()){ cell.classList.add("today"); }
            cell.addEventListener("click",()=>{ dayClick(cell,dateStr,j===0||j===6); });
            row.appendChild(cell);
            date++;
        }
        table.appendChild(row);
    }
}

// Calendar cell click
function dayClick(cell, dateStr, isWeekend){
    if(isWeekend) return;
    if(!selectedStatus) return;
    if(selectedStatus===""){ 
        delete schedule[dateStr]; 
        cell.textContent=dateStr.split("-")[2]; 
        cell.className="";
    } else { 
        schedule[dateStr]=selectedStatus;
        cell.className=selectedStatus;
        cell.textContent=selectedStatus;
    }
    buildCalendar(today.getFullYear(), today.getMonth()+1);
    updateSummaryPanel();
}

// Update summary-only panel
function updateSummaryPanel(){
    let counts={WFH:0,OFFC:0,EL:0,SL:0,PH:0,TRAIN:0};
    for(let d in schedule){
        if(counts[schedule[d]]!==undefined){ counts[schedule[d]]++; }
    }
    let sumPanel=document.getElementById("monthly-summary-panel-summary-only");
    if(sumPanel){ 
        sumPanel.innerHTML=""; 
        for(let s in counts){ 
            let p=document.createElement("p"); 
            p.textContent=`${s}: ${counts[s]}`; 
            sumPanel.appendChild(p); 
        } 
    }
}

// Toggle calendar/summary view
document.getElementById("toggleViewBtn").addEventListener("click",function(){
    const cal=document.getElementById("calendarContainer");
    const sum=document.getElementById("summaryOnlyContainer");
    if(cal.style.display!=="none"){ cal.style.display="none"; sum.style.display="block"; this.textContent="Switch to Calendar View";}
    else{ cal.style.display="block"; sum.style.display="none"; this.textContent="Switch to Summary View"; }
});

// Status button selection
document.querySelectorAll(".status-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
        selectedStatus = btn.dataset.status;
        document.querySelectorAll(".status-btn").forEach(b=>b.style.border="none");
        btn.style.border="2px solid #000";
    });
});

// Voice command integration
const voiceBtn = document.getElementById("voiceBtn");
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if(SpeechRecognition){
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    voiceBtn.addEventListener("click", ()=>{ recognition.start(); voiceBtn.textContent="🎤 Listening..."; });

    recognition.addEventListener("result", (e)=>{
        const transcript = e.results[0][0].transcript.toLowerCase();
        voiceBtn.textContent="🎤 Start Voice Command";
        parseVoiceCommand(transcript);
    });
    recognition.addEventListener("end", ()=>{ voiceBtn.textContent="🎤 Start Voice Command"; });
} else { voiceBtn.disabled=true; voiceBtn.textContent="🎤 Not Supported"; }

// Simple voice parser
function parseVoiceCommand(command){
    const statuses = ["wfh","offc","el","sl","ph","train"];
    let status = statuses.find(s => command.includes(s));
    if(!status){ alert("Status not recognized"); return; }
    selectedStatus = status.toUpperCase();

    let datesToApply=[];
    const todayDate = new Date();
    const todayDay = todayDate.getDay();
    if(command.includes("next week")){
        let nextWeekStart = new Date(todayDate);
        nextWeekStart.setDate(todayDate.getDate() + (7 - todayDay)); // Next Sunday
        for(let i=1;i<=5;i++){
            let d = new Date(nextWeekStart);
            d.setDate(nextWeekStart.getDate()+i);
            let dateStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
            datesToApply.push(dateStr);
        }
    }

    datesToApply.forEach(dateStr => { schedule[dateStr] = selectedStatus; });
    buildCalendar(today.getFullYear(), today.getMonth()+1);
    updateSummaryPanel();
}

// Initialize
document.addEventListener("DOMContentLoaded", ()=>{
    buildCalendar(today.getFullYear(), today.getMonth()+1);
    updateSummaryPanel();
});
