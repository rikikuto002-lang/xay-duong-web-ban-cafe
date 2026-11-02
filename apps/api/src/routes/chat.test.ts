import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../index.js';

test('POST /api/chat accepts a valid message and returns a specific answer', async () => {
  const res = await app.request('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Giờ mở cửa của quán là mấy giờ?' })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(typeof data.answer, 'string');
  assert.ok(data.answer.length > 0);
  assert.notEqual(data.answer, 'CafeZone rất vui được hỗ trợ bạn.');
  assert.match(data.answer, /07:00|08:00|Thứ Hai|Thứ Bảy/i);
  assert.equal(data.safe, true);
  assert.equal(data.prompt, 'Giờ mở cửa của quán là mấy giờ?');
});

test('POST /api/chat returns a question-specific answer for reservation requests', async () => {
  const res = await app.request('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Làm sao để đặt bàn?' })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.answer.toLowerCase().includes('đặt bàn') || data.answer.toLowerCase().includes('hotline'));
  assert.notEqual(data.answer, 'CafeZone rất vui được hỗ trợ bạn.');
});

test('POST /api/chat rejects empty message', async () => {
  const res = await app.request('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '' })
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.message, 'Vui lòng nhập câu hỏi cho chatbot.');
});
