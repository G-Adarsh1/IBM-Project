
    // ===== DATA
    let tasks = [];
    let schedule = {};
    let availability = {monday:4,tuesday:4,wednesday:4,thursday:4,friday:4,saturday:6,sunday:6};

    // ===== STORAGE =====
    function saveData(){
        localStorage.setItem('studyPlannerTasks',JSON.stringify(tasks));
        localStorage.setItem('studyPlannerAvailability',JSON.stringify(availability));
        localStorage.setItem('studyPlannerSchedule',JSON.stringify(schedule));
    }

    function loadData(){
        tasks = JSON.parse(localStorage.getItem('studyPlannerTasks') || '[]');
        availability = JSON.parse(localStorage.getItem('studyPlannerAvailability') || '{}');
        if(Object.keys(availability).length===0){
            availability={monday:4,tuesday:4,wednesday:4,thursday:4,friday:4,saturday:6,sunday:6};
        }
    }

    // ===== INIT =====
    function init(){
        loadData();
        setMinDate();
        renderAvailabilityInputs();
        generateSchedule();
        renderAll();

        // Task form
        document.getElementById('taskForm').addEventListener('submit',function(e){
            e.preventDefault();
            const task={
                id:Date.now(),
                title:document.getElementById('taskTitle').value,
                description:document.getElementById('taskDescription').value,
                deadline:document.getElementById('taskDeadline').value,
                estimatedHours:parseFloat(document.getElementById('taskHours').value),
                priority:document.getElementById('taskPriority').value,
                completedHours:0,
                createdAt:new Date().toISOString()
            };
            tasks.push(task);
            saveData();
            generateSchedule();
            renderAll();
            this.reset();
            setMinDate();
        });

        document.getElementById('updateAvailabilityBtn').addEventListener('click',()=>{
            updateAvailability();
        });
    }

    function setMinDate(){
        const today=new Date().toISOString().split('T')[0];
        document.getElementById('taskDeadline').min=today;
    }

    // ===== AVAILABILITY =====
    function renderAvailabilityInputs(){
        const grid=document.getElementById('availabilityGrid');
        grid.innerHTML='';
        Object.keys(availability).forEach(day=>{
            const row=document.createElement('div');
            row.className='availability-row';
            row.innerHTML=`
                <div class="day-label">${day.charAt(0).toUpperCase()+day.slice(1)}</div>
                <input type="number" min="0" step="0.5" value="${availability[day]}" id="avail-${day}">
            `;
            grid.appendChild(row);
        });
    }

    function updateAvailability(){
        Object.keys(availability).forEach(day=>{
            const val=parseFloat(document.getElementById(`avail-${day}`).value);
            if(!isNaN(val)) availability[day]=val;
        });
        saveData();
        generateSchedule();
        renderAll();
        alert('Availability updated!');
    }

    // ===== TASK RENDER =====
    function renderTasks(){
        const list=document.getElementById('tasksList');
        list.innerHTML='';
        if(tasks.length===0){
            list.innerHTML='<div class="empty-schedule">No tasks added yet.</div>';
            return;
        }
        tasks.sort((a,b)=>{
            const prio={'high':1,'medium':2,'low':3};
            return prio[a.priority]-prio[b.priority];
        });
        tasks.forEach(task=>{
            const card=document.createElement('div');
            card.className=`card task-card priority-${task.priority}`;
            card.innerHTML=`
                <div class="task-header">
                    <div class="task-title">${task.title}</div>
                    <div class="task-meta">${task.deadline}</div>
                </div>
                <div class="task-meta">${task.description}</div>
                <div class="progress-bar"><div class="progress-fill" style="width:${(task.completedHours/task.estimatedHours*100).toFixed(0)}%"></div></div>
                <div class="task-actions">
                    <button class="btn-small btn-secondary" onclick="updateProgress(${task.id},0.5)">+0.5h</button>
                    <button class="btn-small btn-secondary" onclick="updateProgress(${task.id},1)">+1h</button>
                    <button class="btn-small" onclick="completeTask(${task.id})">✅ Complete</button>
                    <button class="btn-small btn-danger" onclick="deleteTask(${task.id})">🗑 Delete</button>
                </div>
            `;
            list.appendChild(card);
        });
    }

    function updateProgress(id,hrs){
        const task=tasks.find(t=>t.id===id);
        if(task){
            task.completedHours=Math.min(task.completedHours+hrs,task.estimatedHours);
            saveData();
            renderAll();
        }
    }

    function completeTask(id){
        const task=tasks.find(t=>t.id===id);
        if(task){
            task.completedHours=task.estimatedHours;
            saveData();
            renderAll();
        }
    }

    function deleteTask(id){
        tasks=tasks.filter(t=>t.id!==id);
        saveData();
        generateSchedule();
        renderAll();
    }

    // ===== STATS =====
    function renderStats(){
        const grid=document.getElementById('statsGrid');
        const totalTasks=tasks.length;
        const completedTasks=tasks.filter(t=>t.completedHours>=t.estimatedHours).length;
        const pendingTasks=totalTasks-completedTasks;
        const totalHours=tasks.reduce((acc,t)=>acc+t.estimatedHours,0);
        const completedHours=tasks.reduce((acc,t)=>acc+t.completedHours,0);

        grid.innerHTML=`
            <div class="stat-card"><div class="stat-value">${totalTasks}</div><div class="stat-label">Total Tasks</div></div>
            <div class="stat-card"><div class="stat-value">${completedTasks}</div><div class="stat-label">Completed Tasks</div></div>
            <div class="stat-card"><div class="stat-value">${pendingTasks}</div><div class="stat-label">Pending Tasks</div></div>
            <div class="stat-card"><div class="stat-value">${totalHours.toFixed(1)}</div><div class="stat-label">Total Hours</div></div>
            <div class="stat-card"><div class="stat-value">${completedHours.toFixed(1)}</div><div class="stat-label">Hours Completed</div></div>
        `;
    }

    // ===== SCHEDULING =====
// ===== INTELLIGENT SCHEDULING =====
function generateSchedule(){
    const days=['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    schedule={};

    // Reset schedule
    days.forEach(day => schedule[day]=[]);

    // Filter pending tasks and sort by deadline then priority
    const pendingTasks = tasks
        .filter(t => t.completedHours < t.estimatedHours)
        .sort((a,b) => {
            const dateA = new Date(a.deadline), dateB = new Date(b.deadline);
            if(dateA - dateB !== 0) return dateA - dateB; // Earliest deadline first
            const prio={'high':1,'medium':2,'low':3};
            return prio[a.priority]-prio[b.priority];
        });

    // Get today's day index
    const todayIndex = new Date().getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    // Map day index to our 'days' array
    const dayMap = [ 'sunday','monday','tuesday','wednesday','thursday','friday','saturday' ];

    // Distribute tasks
    pendingTasks.forEach(task => {
        let hoursLeft = task.estimatedHours - task.completedHours;

        // Try assigning to each day until deadline
        const taskDeadlineIndex = (new Date(task.deadline)).getDay();
        for(let i=0; i<7; i++){
            const dIndex = (todayIndex + i) % 7;
            const dayName = dayMap[dIndex];

            // Only schedule before deadline
            if(dIndex > taskDeadlineIndex) continue;

            const remainingHours = availability[dayName] - (schedule[dayName].reduce((acc,b)=>acc+b.hours,0));
            if(remainingHours <= 0) continue;

            const assignHours = Math.min(hoursLeft, remainingHours);
            schedule[dayName].push({taskId:task.id, hours:assignHours});
            hoursLeft -= assignHours;

            if(hoursLeft <= 0) break;
        }
    });

    saveData();
}

function renderDailySchedule() {
    const container = document.getElementById('dailySchedule');
    const today = new Date();
    const scheduleEntries = [];

    // Show next 7 days
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

        const daySchedule = schedule[dayName] || [];
        // Filter out completed tasks
        const tasksForDay = daySchedule
            .map(s => tasks.find(t => t.id === s.taskId))
            .filter(t => t && t.completedHours < t.estimatedHours);

        scheduleEntries.push({
            dayName,
            date: dateStr,
            availableHours: availability[dayName] || 4,
            scheduledHours: tasksForDay.reduce((sum,t)=>sum+t.estimatedHours-t.completedHours,0),
            tasks: tasksForDay.map(t => ({
                taskId: t.id,
                title: t.title,
                hours: t.estimatedHours - t.completedHours,
                priority: t.priority
            }))
        });
    }

    container.innerHTML = scheduleEntries.map(day => {
        const date = new Date(day.date);
        const displayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const isToday = day.date === today.toISOString().split('T')[0];

        return `
            <div class="day-card" style="${isToday ? 'border-color: #2563eb; border-width: 3px;' : ''}">
                <div class="day-header">
                    <div>
                        <div class="day-name">${day.dayName.charAt(0).toUpperCase() + day.dayName.slice(1)}</div>
                        <div style="font-size: 0.9em; color: #64748b;">${displayDate}</div>
                    </div>
                    <div class="day-hours">
                        ${day.scheduledHours.toFixed(1)}h / ${day.availableHours}h
                    </div>
                </div>
                ${day.tasks.length > 0 ? day.tasks.map(task => `
                    <div class="time-block">
                        <div class="time-block-header">
                            <div class="time-block-title">${task.title}</div>
                            <div class="time-block-duration">${task.hours}h</div>
                        </div>
                        <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                    </div>
                `).join('') : '<div style="text-align: center; padding: 20px; color: #94a3b8;">No tasks scheduled</div>'}
            </div>
        `;
    }).join('');
}


    function renderWeeklyView(){
        const container=document.getElementById('weeklySchedule');
        container.innerHTML='';
        const days=['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
        days.forEach(day=>{
            const dayBlocks=schedule[day]||[];
            const totalDayHours=dayBlocks.reduce((acc,b)=>acc+b.hours,0);
            const card=document.createElement('div');
            card.className='day-card';
            card.innerHTML=`<div class="day-name">${day.charAt(0).toUpperCase()+day.slice(1)}</div><div class="day-hours">Total: ${totalDayHours.toFixed(1)}h</div>`;
            container.appendChild(card);
        });
    }

    function renderAll(){
        renderStats();
        renderTasks();
        renderDailySchedule();
        renderWeeklyView();
    }

    // ===== VIEW SWITCH =====
    function switchView(view){
        document.querySelectorAll('.schedule-view').forEach(el=>el.style.display='none');
        document.getElementById(`${view}View`).style.display='block';
        document.querySelectorAll('.tab').forEach(btn=>btn.classList.remove('active'));
        event.currentTarget.classList.add('active');
    }

    // ===== GLOBAL FUNCTIONS =====
    window.updateProgress=updateProgress;
    window.completeTask=completeTask;
    window.deleteTask=deleteTask;
    window.updateAvailability=updateAvailability;
    window.switchView=switchView;

    // ===== INIT APP =====
    init();


