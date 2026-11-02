import { Hono } from 'hono';
import { buildAnswerFromKnowledge, loadKnowledgeBase } from '../lib/chatKnowledge.js';

const AI_RESPONSE_MODEL = '@cf/meta/llama-3.2-3b-instruct';
const SAFETY_MODEL = '@cf/meta/llama-guard-3-8b';

function extractAiText(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = extractAiText(item);
      if (text) return text;
    }
    return '';
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;

    for (const key of ['response', 'output', 'output_text', 'answer', 'text', 'content']) {
      const candidate = record[key];
      const text = extractAiText(candidate);
      if (text) return text;
    }

    for (const nested of Object.values(record)) {
      const text = extractAiText(nested);
      if (text) return text;
    }
  }

  return '';
}

function normalizeFriendlyAnswer(raw: string): string {
  const cleaned = raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[*_#>`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return 'CafeZone rất vui được hỗ trợ bạn.';

  const sentenceParts = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  const shortAnswer = sentenceParts.slice(0, 2).join(' ').trim();

  return shortAnswer || cleaned;
}

const router = new Hono();

router.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const message = typeof body?.message === 'string' ? body.message.trim() : '';

  if (!message) {
    return c.json({ message: 'Vui lòng nhập câu hỏi cho chatbot.' }, 400);
  }

  try {
    const knowledge = await loadKnowledgeBase();
    const cloudflareEnv = c.env as { AI?: { run?: (model: string, input: Record<string, unknown>) => Promise<unknown> } } | undefined;

    let safetyCheck: { safe: boolean; reason: string } = { safe: true, reason: 'ok' };
    if (cloudflareEnv?.AI && typeof cloudflareEnv.AI.run === 'function') {
      try {
        const safetyResult = await cloudflareEnv.AI.run(SAFETY_MODEL, {
          messages: [
            {
              role: 'system',
              content: 'Bạn là bộ kiểm tra an toàn cho chatbot quán cà phê. Chỉ trả về JSON: {"safe": true|false, "reason": "..."}.'
            },
            { role: 'user', content: `Câu hỏi: ${message}` }
          ]
        });

        const parsed = typeof safetyResult === 'string' ? JSON.parse(safetyResult) : safetyResult;
        if (parsed && typeof parsed === 'object' && typeof (parsed as { safe?: boolean }).safe === 'boolean') {
          const nextReason = typeof (parsed as { reason?: string }).reason === 'string'
            ? (parsed as { reason: string }).reason
            : 'guard-response';
          safetyCheck = {
            safe: Boolean((parsed as { safe: boolean }).safe),
            reason: nextReason
          };
        }
      } catch {
        safetyCheck = { safe: true, reason: 'guard-fallback' };
      }
    }

    if (!safetyCheck.safe) {
      return c.json({
        answer: 'Tôi chỉ hỗ trợ các câu hỏi liên quan đến quán cà phê, thực đơn, đặt bàn, thanh toán và quản lý cửa hàng.',
        model: SAFETY_MODEL,
        source: 'safety-check',
        safe: false
      });
    }

    let answer = normalizeFriendlyAnswer(buildAnswerFromKnowledge(message, knowledge));
    if (cloudflareEnv?.AI && typeof cloudflareEnv.AI.run === 'function') {
      try {
        const modelResponse = await cloudflareEnv.AI.run(AI_RESPONSE_MODEL, {
          messages: [
            {
              role: 'system',
              content: 'Bạn là trợ lý AI của quán CafeZone, nói chuyện như một nhân viên quán thân thiện và chuyên nghiệp. Trả lời bằng tiếng Việt, tự nhiên, ngắn gọn, rõ ràng, không quá dài, không dùng markdown lạ. Chỉ trả lời các chủ đề liên quan đến menu, giá, giờ mở cửa, địa chỉ, hotline, đặt bàn, giao hàng, thanh toán, và hoạt động của quán. Nếu không chắc chắn, hãy nói thật rằng bạn chưa có thông tin và đề nghị khách gọi hotline hoặc đến trực tiếp để được hỗ trợ. Không bịa thông tin, không lặp lại nhiều câu dài, và hãy giữ giọng điệu ấm áp, dễ hiểu.'
            },
            {
              role: 'user',
              content: `Dữ liệu tham khảo:\n${knowledge}\n\nCâu hỏi: ${message}`
            }
          ]
        });

        const generatedText = normalizeFriendlyAnswer(extractAiText(modelResponse));
        if (generatedText) {
          answer = generatedText;
        }
      } catch {
        answer = normalizeFriendlyAnswer(buildAnswerFromKnowledge(message, knowledge));
      }
    }

    return c.json({
      answer,
      model: AI_RESPONSE_MODEL,
      source: cloudflareEnv?.AI ? 'cloudflare-ai' : 'docx-knowledge',
      safe: true,
      prompt: message
    });
  } catch (error) {
    const fallback = 'Dựa trên kiến thức của quán CafeZone: cửa hàng phục vụ cà phê thủ công, bánh tươi, đặt bàn trực tuyến, giỏ hàng, đơn hàng và mô hình triển khai Cloudflare.';

    return c.json({
      answer: fallback,
      model: '@cf/meta/llama-guard-3-8b',
      source: 'fallback',
      safe: true,
      error: error instanceof Error ? error.message : 'unknown-error'
    });
  }
});

export default router;
