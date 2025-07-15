'use strict';

const studentId = 'student_' + Math.random().toString(16).substr(2, 8);
document.getElementById('studentIdDisplay').innerText = `Student ID: ${studentId}`;

const brokerAddress = `ws://${window.location.hostname}:${window.location.port}`;
const client = mqtt.connect(brokerAddress, { clientId: studentId });

client.on('connect', () => {
    console.log(`[STUDENT] SUCCESS: Connected to MQTT broker.`);
});

client.on('error', (err) => {
    console.error(`[STUDENT] ERROR: Connection error: `, err);
});

const canvas = document.getElementById('drawingCanvas');
const context = canvas.getContext('2d');
let isDrawing = false;

// --- 유틸리티 함수: 마우스와 터치 이벤트의 좌표를 동일한 형식으로 변환 ---
function getEventPosition(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    // 터치 이벤트인지 확인
    if (event.touches && event.touches.length > 0) {
        return {
            x: event.touches[0].clientX - rect.left,
            y: event.touches[0].clientY - rect.top
        };
    }
    // 마우스 이벤트
    return { 
        x: event.clientX - rect.left, 
        y: event.clientY - rect.top 
    };
}

// --- 그림 그리기 로직 함수 (마우스와 터치 공용) ---
function startDrawing(e) {
    // 터치 이벤트의 기본 스크롤 동작을 막음 (중요!)
    e.preventDefault(); 
    if (!client.connected) return;

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
    if (!isDrawing || !client.connected) return;

    const pos = getEventPosition(canvas, e);
    context.lineWidth = 5;
    context.lineCap = 'round';
    context.strokeStyle = 'blue';
    context.lineTo(pos.x, pos.y);
    context.stroke();
    publishDrawEvent(pos.x, pos.y, false);
}

// --- 이벤트 발행(Publish) 함수들 (변경 없음) ---
function publishEvent(type, payload = {}) {
    if (!client.connected) {
        console.warn('[STUDENT] WARN: Not connected, cannot publish event.');
        return;
    }
    const eventData = { studentId, type, payload };
    client.publish('class/events', JSON.stringify(eventData), { qos: 0 });
}

function publishDrawEvent(x, y, isStart) {
    publishEvent('draw', { x, y, isStart });
}

function publishEraseEvent() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    console.log(`[STUDENT] ACTION: Publishing erase event.`);
    publishEvent('erase');
}


// --- HTML 요소에 이벤트 리스너 연결 (마우스와 터치 모두 추가!) ---

// 마우스 이벤트 리스너
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);
canvas.addEventListener('mousemove', draw);

// 터치 이벤트 리스너
canvas.addEventListener('touchstart', startDrawing);
canvas.addEventListener('touchend', stopDrawing);
canvas.addEventListener('touchcancel', stopDrawing);
canvas.addEventListener('touchmove', draw);

document.getElementById('eraseButton').addEventListener('click', publishEraseEvent);
