'use strict';

const socket = io();

const studentId = 'student_' + Math.random().toString(16).substr(2, 8);
document.getElementById('studentIdDisplay').innerText = `Student ID: ${studentId}`;

socket.on('connect', () => {
    console.log(`[STUDENT] SUCCESS: Connected to server with socket ID ${socket.id}`);
    socket.emit('student_join', { studentId: studentId });
});

const canvas = document.getElementById('drawingCanvas');
const context = canvas.getContext('2d');
let isDrawing = false;

// 마우스와 터치 이벤트의 좌표를 동일한 형식으로 변환
function getEventPosition(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    if (event.touches && event.touches.length > 0) {
        return {
            x: event.touches[0].clientX - rect.left,
            y: event.touches[0].clientY - rect.top
        };
    }
    return { 
        x: event.clientX - rect.left, 
        y: event.clientY - rect.top 
    };
}

// 그림 그리기 로직 (마우스와 터치 공용)
function startDrawing(e) {
    e.preventDefault();
    isDrawing = true;
    const pos = getEventPosition(canvas, e);
    context.beginPath();
    context.moveTo(pos.x, pos.y);
    publishDrawEvent(pos.x, pos.y, true);
}

function stopDrawing(e) {
    e.preventDefault();
    isDrawing = false;
}



function draw(e) {
    e.preventDefault();
    if (!isDrawing) return;
    const pos = getEventPosition(canvas, e);
    context.lineWidth = 5;
    context.lineCap = 'round';
    context.strokeStyle = 'blue';
    context.lineTo(pos.x, pos.y);
    context.stroke();
    publishDrawEvent(pos.x, pos.y, false);
}

// Socket.IO를 사용한 이벤트 전송
function publishDrawEvent(x, y, isStart) {
    const eventData = { studentId: studentId, payload: { x, y, isStart } };
    socket.emit('drawing_event', eventData);
}

function publishEraseEvent() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    console.log(`[STUDENT] ACTION: Emitting erase event.`);
    const eventData = { studentId: studentId };
    socket.emit('erase_event', eventData);
}

// 마우스와 터치 이벤트 리스너 모두 등록
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);
canvas.addEventListener('mousemove', draw);

canvas.addEventListener('touchstart', startDrawing);
canvas.addEventListener('touchend', stopDrawing);
canvas.addEventListener('touchcancel', stopDrawing);
canvas.addEventListener('touchmove', draw);

document.getElementById('eraseButton').addEventListener('click', publishEraseEvent);
