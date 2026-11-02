import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildAnswerFromKnowledge, detectChatIntent, buildScenarioPrompt, loadKnowledgeBase } from './chatKnowledge.js';

test('buildAnswerFromKnowledge responds with CafeZone recommendations for new customers', () => {
  const answer = buildAnswerFromKnowledge('Món nào phù hợp cho người mới uống cà phê?', 'CafeZone là quán cà phê, có cappuccino, latte, espresso, trà sữa matcha và bánh croissant. Khách hàng có thể đặt bàn trực tuyến hoặc đặt hàng online.');

  assert.match(answer.toLowerCase(), /cappuccino|latte|espresso|matcha|croissant/i);
  assert.match(answer.toLowerCase(), /đặt bàn|đặt hàng|cà phê/i);
});

test('loadKnowledgeBase should read chatbot-data/eval.jsonl when present', async () => {
  const originalCwd = process.cwd();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatbot-data-'));

  try {
    const datasetDir = path.join(tempDir, 'chatbot-data');
    fs.mkdirSync(datasetDir, { recursive: true });
    fs.writeFileSync(
      path.join(datasetDir, 'eval.jsonl'),
      [
        JSON.stringify({ question: 'Cà phê nào ngon nhất?', answer: 'CafeZone khuyên dùng cappuccino và latte vì được rang mới mỗi ngày.' }),
        JSON.stringify({ prompts: 'Giờ mở cửa là mấy giờ?', response: 'Quán mở cửa từ 07:00 đến 21:00 từ Thứ Hai đến Thứ Sáu.' }),
        JSON.stringify({ input: 'Đặt bàn như thế nào?', output: 'Khách hàng có thể đặt bàn trực tuyến hoặc gọi hotline +84 28 555 7788.' })
      ].join('\n')
    );

    process.chdir(tempDir);
    const knowledge = await loadKnowledgeBase();

    assert.match(knowledge, /cappuccino/i);
    assert.match(knowledge, /07:00/i);
    assert.match(knowledge, /đặt bàn/i);
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('loadKnowledgeBase should read structured JSON knowledge data when present', async () => {
  const originalCwd = process.cwd();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatbot-data-json-'));

  try {
    const datasetDir = path.join(tempDir, 'chatbot-data');
    fs.mkdirSync(datasetDir, { recursive: true });
    fs.writeFileSync(
      path.join(datasetDir, 'cafe-knowledge.json'),
      JSON.stringify({
        shop: {
          name: 'CafeZone',
          hours: 'Thứ Hai - Chủ Nhật: 07:00 - 22:30',
          address: '45 Nguyễn Huệ, Quận 1, TP.HCM',
          hotline: '+84 28 555 7788'
        },
        faq: [
          { question: 'Làm sao để đặt bàn?', answer: 'Bạn có thể đặt bàn trực tuyến hoặc gọi hotline để xác nhận.' },
          { question: 'Món nào nên thử?', answer: 'CafeZone khuyên dùng cappuccino và latte.' }
        ]
      }, null, 2)
    );

    process.chdir(tempDir);
    const knowledge = await loadKnowledgeBase();

    assert.match(knowledge, /CafeZone/i);
    assert.match(knowledge, /45 Nguyễn Huệ/i);
    assert.match(knowledge, /Làm sao để đặt bàn/i);
    assert.match(knowledge, /cappuccino/i);
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('detectChatIntent categorizes reservation, menu, and hours questions into specific scenarios', () => {
  assert.equal(detectChatIntent('Tôi muốn đặt bàn tối nay'), 'reservation');
  assert.equal(detectChatIntent('Món nào ngon nhất ở đây?'), 'menu');
  assert.equal(detectChatIntent('Quán mở cửa mấy giờ?'), 'hours');
  assert.equal(detectChatIntent('Cho tôi xin chai nước?'), 'general');
});

test('buildScenarioPrompt generates scenario-specific instruction for the model', () => {
  const reservationPrompt = buildScenarioPrompt('reservation', 'Làm sao để đặt bàn?');
  const menuPrompt = buildScenarioPrompt('menu', 'Cà phê nào phù hợp cho người mới?');
  const hoursPrompt = buildScenarioPrompt('hours', 'Giờ mở cửa của quán là mấy giờ?');

  assert.match(reservationPrompt, /đặt bàn|đặt chỗ/i);
  assert.match(menuPrompt, /thực đơn|món|cà phê/i);
  assert.match(hoursPrompt, /giờ mở cửa|giờ làm việc/i);
});
