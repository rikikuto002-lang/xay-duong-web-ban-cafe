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

function buildSpecificFallback(question: string): string {
  const normalized = question.toLowerCase();

  if (normalized.includes('đặt bàn') || normalized.includes('đặt chỗ')) {
    return 'Để đặt bàn, bạn có thể đặt trực tuyến trên website hoặc gọi hotline +84 28 555 7788 để xác nhận thời gian và số lượng khách.';
  }

  if (normalized.includes('giờ mở cửa') || normalized.includes('mở cửa') || normalized.includes('giờ làm việc')) {
    return 'CafeZone mở cửa Thứ Hai - Thứ Sáu từ 07:00 - 21:00 và Thứ Bảy - Chủ Nhật từ 08:00 - 22:30.';
  }

  if (normalized.includes('địa chỉ') || normalized.includes('quán ở đâu') || normalized.includes('vị trí')) {
    return 'CafeZone nằm tại 45 Nguyễn Huệ, Quận 1, TP.HCM.';
  }

  if (normalized.includes('món nào') || normalized.includes('thực đơn') || normalized.includes('menu')) {
    return 'CafeZone nổi bật với cappuccino, latte, espresso, trà sữa matcha và bánh croissant. Nếu bạn mới uống cà phê, latte hoặc cappuccino là lựa chọn dễ thưởng thức nhất.';
  }

  return 'Tôi chưa có thông tin rõ ràng cho câu hỏi này. Hãy hỏi về menu, giờ mở cửa, địa chỉ hoặc cách đặt bàn, hoặc gọi hotline +84 28 555 7788 để được hỗ trợ.';
}

function normalizeFriendlyAnswer(raw: string): string {
  const cleaned = raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[*_#>`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';

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
              content: 'Bạn là trợ lý AI của quán CafeZone. Nói bằng tiếng Việt, chuyên nghiệp, thân thiện, ngắn gọn và rõ ràng. Chỉ trả lời các chủ đề về menu, giá, giờ mở cửa, địa chỉ, đặt bàn, giao hàng, thanh toán, và hoạt động của quán. Nếu không chắc chắn, nói rõ rằng bạn chưa có thông tin và đề nghị gọi hotline hoặc đặt câu hỏi khác. Không bịa thông tin.'
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

    if (!answer) {
      answer = buildSpecificFallback(message);
    }

    return c.json({
      answer,
      model: AI_RESPONSE_MODEL,
      source: cloudflareEnv?.AI ? 'cloudflare-ai' : 'docx-knowledge',
      safe: true,
      prompt: message
    });
  } catch (error) {
    const fallback = buildSpecificFallback(message);

    return c.json({
      answer: fallback,
      model: AI_RESPONSE_MODEL,
      source: 'fallback',
      safe: true,
      error: error instanceof Error ? error.message : 'unknown-error'
    });
  }
});

export default router;
