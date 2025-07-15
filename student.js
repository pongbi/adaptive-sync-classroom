'use strict';

const socket = io(); // 서버에 Socket.IO 연결

const studentId = 'student_' + Math.random().toString(16).substr(2, 8);
document.getElementById('studentIdDisplay').innerText = `Student ID: ${studentId}`;

// 서버에 연결되면, 나의 학생 ID를 알림
socket.on('connect', () => {
    console.log(`[STUDENT] SUCCESS: Connected to server with socket ID ${socket.id}`);
    socket.emit('student_join', { studentId: studentId });
});

const canvas = document.getElementById('drawingCanvas');
const context = canvas.getContext('2d');
let isDrawing = false;

function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
}

function startDrawing(e) {
    isDrawing = true;
    const pos = getMousePos(canvas, e);
    context.beginPath();
    context.moveTo(pos.x, pos.y);
    publishDrawEvent(pos.x, pos.y, true);
}

function stopDrawing() {
    isDrawing = false;
}

function draw(e) {
    if (!isDrawing) return;
    const pos = getMousePos(canvas, e);
    context.lineWidth = 5;
    context.lineCap = 'round';
    context.strokeStyle = 'blue';
    context.lineTo(pos.x, pos.y);
    context.stroke();
    publishDrawEvent(pos.x, pos.y, false);
}

// 이제 MQTT publish가 아니라 socket.emit을 사용
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

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);
canvas.addEventListener('mousemove', draw);

document.getElementById('eraseButton').addEventListener('click', publishEraseEvent);