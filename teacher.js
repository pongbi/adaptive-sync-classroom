'use strict';

const socket = io();
const studentListUl = document.getElementById('students');
const canvas = document.getElementById('mirror-canvas');
const context = canvas.getContext('2d');
const mirroringTargetH2 = document.getElementById('mirroring-target');

let currentMirroringTarget = null;
const studentDrawings = {};

function addStudentToList(studentId) {
    if (document.getElementById(`li-${studentId}`)) return;
    
    studentDrawings[studentId] = [];

    const li = document.createElement('li');
    li.innerText = studentId;
    li.id = `li-${studentId}`;
    li.className = 'student-item';
    li.addEventListener('click', () => {
        selectStudent(studentId);
        li.classList.remove('alert');
    });
    studentListUl.appendChild(li);
}

function selectStudent(studentId) {
    if (currentMirroringTarget) {
        const prevLi = document.getElementById(`li-${currentMirroringTarget}`);
        if (prevLi) prevLi.classList.remove('active');
    }

    currentMirroringTarget = studentId;
    mirroringTargetH2.innerText = `Mirroring: ${studentId}`;
    
    const currentLi = document.getElementById(`li-${studentId}`);
    if (currentLi) currentLi.classList.add('active');

    redrawCanvas();
}

function redrawCanvas() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!currentMirroringTarget || !studentDrawings[currentMirroringTarget]) return;

    const events = studentDrawings[currentMirroringTarget];
    events.forEach(event => {
        // 이제 이벤트 구조가 약간 다르므로 payload를 확인
        if(event.type === 'draw') {
             drawOnMirror(event, false);
        }
    });
}

function drawOnMirror(event, shouldStore = true) {
    const { studentId, payload } = event;
    
    if (shouldStore && studentDrawings[studentId]) {
        studentDrawings[studentId].push(event);
    }
    
    if (studentId !== currentMirroringTarget) return;

    const { x, y, isStart } = payload;
    context.lineWidth = 5;
    context.lineCap = 'round';
    context.strokeStyle = 'blue';

    if (isStart) {
        context.beginPath();
        context.moveTo(x, y);
    } else {
        context.lineTo(x, y);
        context.stroke();
    }
}

// 이벤트 이름 변경: new_event -> new_drawing_event, new_erase_event
socket.on('new_drawing_event', (event) => {
    drawOnMirror(event);
});

socket.on('new_erase_event', (event) => {
    if(studentDrawings[event.studentId]){
        studentDrawings[event.studentId] = [];
    }
    if (event.studentId === currentMirroringTarget) {
        redrawCanvas();
    }
});

socket.on('anomaly_alert', (data) => {
    const { studentId } = data;
    alert(`[SYSTEM ALERT] Student ${studentId} may be struggling. Check the screen.`);
    const li = document.getElementById(`li-${studentId}`);
    if (li) {
        li.classList.add('alert');
    }
    selectStudent(studentId);
});

socket.on('student_list', (students) => {
    studentListUl.innerHTML = '';
    students.forEach(addStudentToList);
});

socket.on('student_join', (data) => {
    addStudentToList(data.studentId);
});

socket.on('connect', () => {
    console.log('[DASHBOARD] SUCCESS: Connected to server via Socket.IO');
    // 교사 대시보드임을 서버에 알림
    socket.emit('teacher_join');
});
