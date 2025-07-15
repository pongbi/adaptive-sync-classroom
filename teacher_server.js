'use strict';

const http = require('http');
const express = require('express');
const socketIo = require('socket.io');

console.log('[Init] Libraries loaded.');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

console.log('[Init] Server instances created.');

// --- 학생 데이터 관리 및 이상 신호 탐지 로직 ---
const students = {};
const ERASE_THRESHOLD = 3;
const TIME_WINDOW_MS = 10000;

function checkAnomaly(studentId) {
    const student = students[studentId];
    if (!student) return;

    const now = Date.now();
    student.eraseTimestamps = student.eraseTimestamps.filter(ts => now - ts < TIME_WINDOW_MS);

    if (student.eraseTimestamps.length >= ERASE_THRESHOLD && !student.isAlerted) {
        student.isAlerted = true;
        console.log(`[ANOMALY] Anomaly DETECTED for ${studentId}! Sending alert.`);
        io.emit('anomaly_alert', { studentId: studentId });
    }
}

// --- Socket.IO 이벤트 핸들러 (모든 통신의 중심) ---
io.on('connection', (socket) => {
    // 새로운 클라이언트(학생 또는 교사)가 접속했을 때
    console.log(`[INFO] A client connected with ID: ${socket.id}`);

    // 학생이 자신의 ID를 가지고 접속했을 때
    socket.on('student_join', (data) => {
        const { studentId } = data;
        if (!students[studentId]) {
            students[studentId] = { socketId: socket.id, eraseTimestamps: [], isAlerted: false };
            console.log(`[INFO] Student ${studentId} has joined.`);
            // 모든 교사 대시보드에 새로운 학생 알림
            io.emit('student_join', { studentId });
        }
    });

    // 학생으로부터 '그리기' 이벤트를 받았을 때
    socket.on('drawing_event', (event) => {
        // 받은 이벤트를 모든 클라이언트에게 그대로 전달
        io.emit('new_drawing_event', event);
    });

    // 학생으로부터 '지우기' 이벤트를 받았을 때
    socket.on('erase_event', (event) => {
        const { studentId } = event;
        if (students[studentId]) {
            students[studentId].eraseTimestamps.push(Date.now());
            checkAnomaly(studentId);
        }
        // 지우기 이벤트도 모든 클라이언트에게 전달
        io.emit('new_erase_event', event);
    });

    // 교사 대시보드가 처음 접속했을 때
    socket.on('teacher_join', () => {
        console.log('[INFO] A teacher dashboard has connected.');
        socket.emit('student_list', Object.keys(students));
    });

    socket.on('disconnect', () => {
        console.log(`[INFO] A client disconnected: ${socket.id}`);
        // (선택적 기능) 연결이 끊긴 학생을 목록에서 제거하는 로직 추가 가능
    });
});

// --- 정적 파일 서버 및 메인 서버 실행 ---
app.use(express.static(__dirname)); 

const PORT = 3000;
server.listen(PORT, () => {
    console.log('----------------------------------------------------');
    console.log(`[SERVER READY] Main server is running on port ${PORT}`);
    console.log(`[ACTION] Teacher: Open http://localhost:${PORT}/teacher.html`);
    console.log(`[ACTION] Student: Open http://localhost:${PORT}/student.html`);
    console.log('----------------------------------------------------');
});
