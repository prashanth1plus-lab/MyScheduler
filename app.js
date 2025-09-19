// Sample schedule data (replace with localStorage or JSON load)
let schedule = {}; // {"2025-09-19": "WFH", ...}
let today = new Date();

function buildCalendar(year, month){
    const table = document.getElementById("calendarTable");
    table.innerHTML="";
    let firstDay = new Date(year, month-1,1).getDay();
    let daysInMonth = new Date(year, month,0).getDate();
    let tr = document.createElement("tr");
    // week headers
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
            if(schedule[dateStr]){ cell.classList.add(schedule[dateStr]); }
            if(j===0||j===6){ cell.classList.add("weekend"); }
            if(date===today.getDate() && month===today.getMonth()+1 && year===today.getFullYear()){ cell.classList.add("today"); }
            cell.addEventListener("click",()=>{ dayClickMobile(cell,dateStr,j===0||j===6); });
            row.appendChild(cell);
            date++;
        }
        table.appendChild(row);
    }
}

// Mobile-friendly modal
let selectedCells=[];
function dayClickMobile(cell, dateStr, isWeekend){
    if(isWeekend) return;
    selectedCells=[cell];
    document.getElementById("statusModal").style.display="block";
    document.getElementById("statusSelect").dataset.date=dateStr;
}

function applyStatus(){
    let status=document.getElementById("statusSelect").value;
    let dayStr=document.getElementById("statusSelect").dataset.date;
    if(status===""){ delete schedule[dayStr]; }
    else { schedule[dayStr]=status; }
    document.getElementById("statusModal").style.display="none";
    buildCalendar(today.getFullYear(), today.getMonth()+1);
    updateSummaryPanel();
}

function closeModal(){ document.getElementById("statusModal").style.display="none"; }

function updateSummaryPanel(){
    let counts={WFH:0,OFFC:0,EL:0,SL:0,PH:0,TRAIN:0};
    for(let d in schedule){ if(counts[schedule[d]]!==undefined){ counts[schedule[d]]++; } }
    let panel=document.getElementById("monthly-summary-panel");
    panel.innerHTML="";
    for(let s in counts){ let p=document.createElement("p"); p.textContent=`${s}: ${counts[s]}`; panel.appendChild(p);}
    let sumPanel=document.getElementById("monthly-summary-panel-summary-only");
    if(sumPanel){ sumPanel.innerHTML=""; for(let s in counts){ let p=document.createElement("p"); p.textContent=`${s}: ${counts[s]}`; sumPanel.appendChild(p); } }
}

document.getElementById("toggleViewBtn").addEventListener("click",function(){
    const cal=document.getElementById("calendarContainer");
    const sum=document.getElementById("summaryOnlyContainer");
    if(cal.style.display!=="none"){ cal.style.display="none"; sum.style.display="block"; this.textContent="Switch to Calendar View";}
    else{ cal.style.display="block"; sum.style.display="none"; this.textContent="Switch to Summary View"; }
});

document.addEventListener("DOMContentLoaded",()=>{
    buildCalendar(today.getFullYear(), today.getMonth()+1);
    updateSummaryPanel();
});
