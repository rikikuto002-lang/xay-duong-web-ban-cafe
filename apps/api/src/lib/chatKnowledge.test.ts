import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildAnswerFromKnowledge, loadKnowledgeBase } from './chatKnowledge.js';

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
