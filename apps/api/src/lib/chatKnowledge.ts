import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';

export const FALLBACK_KNOWLEDGE = `
CafeZone là cửa hàng cà phê với không gian ấm áp, hương vị thủ công và thực đơn phong phú.
Các món nổi bật gồm cappuccino, latte, espresso, trà sữa matcha, bánh croissant, bánh mì nóng và các món ăn nhẹ.
Nếu khách mới uống cà phê, nên thử cappuccino hoặc latte vì hương vị cân bằng, dễ uống và phù hợp với nhiều người.
Khách hàng có thể xem sản phẩm, tìm kiếm theo danh mục, thêm vào giỏ hàng, đặt bàn trực tuyến, đặt hàng online và thanh toán trực tiếp.
CafeZone phục vụ từ Thứ Hai đến Chủ Nhật với giờ mở cửa: Thứ Hai - Thứ Sáu 07:00 - 21:00, Thứ Bảy - Chủ Nhật 08:00 - 22:30.
Địa chỉ cửa hàng: 45 Nguyễn Huệ, Quận 1, TP.HCM.
Hotline hỗ trợ: +84 28 555 7788.
Admin quản lý sản phẩm, danh mục, đơn hàng, thống kê doanh thu và danh sách đặt bàn.
Dự án được xây dựng bằng Svelte, Hono, Cloudflare D1, Cloudflare R2 và Cloudflare Pages.
`;

const KNOWN_DOC_NAMES = [
  'Kien_thuc_chatbot_cafe.docx',
  'Bao_Cao_Cafe_Commerce.docx',
  'Kien_thuc_chatbot_cafe.doc',
  'Bao_Cao_Cafe_Commerce.doc'
];

const KNOWN_JSONL_NAMES = [
  'chatbot-data/eval.jsonl',
  'chatbot-data/eval.json',
  'chatbot-data/cafe-knowledge.json',
  'chatbot-data/faq-menu.json',
  'eval.jsonl',
  'eval.json',
  'cafe-knowledge.json',
  'faq-menu.json',
  'chatbot-data.jsonl',
  'chatbot-data.json'
];

function resolveKnownPaths() {
  const possibleRoots: string[] = [];
  const cwd = process.cwd();

  possibleRoots.push(cwd);
  possibleRoots.push(path.resolve(cwd, '..'));
  possibleRoots.push(path.resolve(cwd, '..', '..'));

  const seen = new Set<string>();
  const paths: string[] = [];

  for (const root of possibleRoots) {
    if (!root || seen.has(root)) continue;
    seen.add(root);
    for (const fileName of KNOWN_DOC_NAMES) {
      const p = path.join(root, fileName);
      if (!seen.has(p)) {
        paths.push(p);
        seen.add(p);
      }
    }
    for (const fileName of KNOWN_JSONL_NAMES) {
      const p = path.join(root, fileName);
      if (!seen.has(p)) {
        paths.push(p);
        seen.add(p);
      }
    }

    const explicitZipCandidates = [
      path.join(root, 'chatbot-data.zip'),
      path.join(root, 'data.zip'),
      path.join(root, 'chatbot-data-archive.zip')
    ];
    for (const zipCandidate of explicitZipCandidates) {
      if (!seen.has(zipCandidate)) {
        paths.push(zipCandidate);
        seen.add(zipCandidate);
      }
    }

    try {
      const rootEntries = fs.readdirSync(root, { withFileTypes: true });
      for (const entry of rootEntries) {
        if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.zip')) continue;
        const zipPath = path.join(root, entry.name);
        if (!seen.has(zipPath)) {
          paths.push(zipPath);
          seen.add(zipPath);
        }
      }
    } catch {
      // ignore unreadable directories
    }

    const zipDir = path.join(root, 'chatbot-data');
    if (!seen.has(zipDir)) {
      paths.push(zipDir);
      seen.add(zipDir);
    }
  }

  return paths;
}

function normalizeXmlText(raw: string) {
  return raw
    .replace(/<w:t[^>]*>/gi, ' ')
    .replace(/<\/w:t>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKnowledgeText(input: string) {
  return input.replace(/\s+/g, ' ').trim();
}

function extractJsonLineValues(entry: Record<string, unknown>): string[] {
  const values: string[] = [];
  const keyCandidates = [
    'question', 'prompt', 'input', 'query', 'instruction', 'message', 'messages',
    'answer', 'response', 'output', 'content', 'text', 'reply'
  ];

  for (const key of keyCandidates) {
    const value = entry[key];
    if (typeof value === 'string' && value.trim()) {
      values.push(value.trim());
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.trim()) {
          values.push(item.trim());
        } else if (item && typeof item === 'object') {
          const nested = extractJsonLineValues(item as Record<string, unknown>);
          values.push(...nested);
        }
      }
    } else if (value && typeof value === 'object') {
      values.push(...extractJsonLineValues(value as Record<string, unknown>));
    }
  }

  return values;
}

async function extractDocxText(filePath: string): Promise<string | null> {
  try {
    const buffer = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(buffer);
    const xmlFile = zip.file('word/document.xml');

    if (!xmlFile) {
      return null;
    }

    const xml = await xmlFile.async('string');
    const text = normalizeXmlText(xml);
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

async function extractJsonlText(filePath: string): Promise<string | null> {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const entries: string[] = [];

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as Record<string, unknown>;
        const found = extractJsonLineValues(parsed)
          .map((value) => normalizeKnowledgeText(value))
          .filter((value) => value.length > 0);
        entries.push(...found);
      } catch {
        // ignore broken lines in JSONL data
      }
    }

    const text = entries.join(' ');
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

function extractObjectText(value: unknown, output: string[] = []): string[] {
  if (typeof value === 'string') {
    const cleaned = normalizeKnowledgeText(value);
    if (cleaned) output.push(cleaned);
    return output;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      extractObjectText(item, output);
    }
    return output;
  }

  if (value && typeof value === 'object') {
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      const normalizedKey = key.toLowerCase();
      if (['id', 'slug', 'image', 'url', 'icon', 'src', 'alt'].includes(normalizedKey)) {
        continue;
      }
      extractObjectText(nestedValue, output);
    }
  }

  return output;
}

async function extractJsonKnowledgeText(filePath: string): Promise<string | null> {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content) as unknown;
    const values = extractObjectText(parsed);
    const text = values.join(' ');
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

async function extractZipJsonlText(filePath: string): Promise<string | null> {
  try {
    const buffer = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(buffer);
    const entry = zip.file(/(?:^|\/)(?:chatbot-data\/)?eval\.jsonl$/i)?.[0] ?? null;
    const candidate = entry ?? zip.file(/.*\.jsonl$/i)?.[0] ?? null;

    if (!candidate) {
      return null;
    }

    const content = await candidate.async('string');
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const entries: string[] = [];

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as Record<string, unknown>;
        const found = extractJsonLineValues(parsed)
          .map((value) => normalizeKnowledgeText(value))
          .filter((value) => value.length > 0);
        entries.push(...found);
      } catch {
        // ignore broken lines in zip JSONL
      }
    }

    const text = entries.join(' ');
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

export async function loadKnowledgeBase(): Promise<string> {
  const isNodeRuntime = typeof process !== 'undefined' && typeof process.cwd === 'function' && typeof process.cwd() === 'string';

  if (!isNodeRuntime) {
    return FALLBACK_KNOWLEDGE;
  }

  const candidates = resolveKnownPaths();
  const knowledgeParts: string[] = [];

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;

    if (candidate.endsWith('.jsonl')) {
      const text = await extractJsonlText(candidate);
      if (text && text.length > 0) {
        knowledgeParts.push(text);
      }
      continue;
    }

    if (candidate.endsWith('.json')) {
      const text = await extractJsonKnowledgeText(candidate);
      if (text && text.length > 0) {
        knowledgeParts.push(text);
      }
      continue;
    }

    if (candidate.endsWith('.zip')) {
      const text = await extractZipJsonlText(candidate);
      if (text && text.length > 0) {
        knowledgeParts.push(text);
      }
      continue;
    }

    if (candidate.endsWith('.docx') || candidate.endsWith('.doc')) {
      const text = await extractDocxText(candidate);
      if (text && text.length > 200) {
        knowledgeParts.push(text);
      }
    }

    if (candidate.endsWith('chatbot-data') && fs.statSync(candidate).isDirectory()) {
      const datasetFiles = [
        path.join(candidate, 'eval.jsonl'),
        path.join(candidate, 'eval.json'),
        path.join(candidate, 'dataset.jsonl'),
        path.join(candidate, 'dataset.json')
      ];

      for (const datasetFile of datasetFiles) {
        if (!fs.existsSync(datasetFile)) continue;
        const text = await extractJsonlText(datasetFile);
        if (text && text.length > 0) {
          knowledgeParts.push(text);
        }
      }
    }
  }

  if (knowledgeParts.length > 0) {
    return knowledgeParts.join(' ');
  }

  return FALLBACK_KNOWLEDGE;
}

export type ChatIntent = 'reservation' | 'menu' | 'hours' | 'general';

export function detectChatIntent(question: string): ChatIntent {
  const q = question.toLowerCase();

  if (/(đặt bàn|đặt chỗ|reservation|book table|reserve|đặt chỗ tối nay)/.test(q)) {
    return 'reservation';
  }

  if (/(món nào|thực đơn|menu|sản phẩm|bạn có thể gợi ý|món ngon|cà phê nào)/.test(q)) {
    return 'menu';
  }

  if (/(giờ mở cửa|mở cửa|giờ làm việc|thời gian làm việc|thứ hai|thứ bảy|làm việc)/.test(q)) {
    return 'hours';
  }

  return 'general';
}

export function buildScenarioPrompt(intent: ChatIntent, question: string): string {
  const normalizedQuestion = question.trim();

  if (intent === 'reservation') {
    return 'Bạn đang xử lý tình huống KHÁCH HÀNG MUỐN ĐẶT BÀN. Hãy trả lời ngắn gọn, hướng dẫn rõ 2 cách: đặt trực tuyến hoặc gọi hotline, nêu rõ cần có thời gian, số lượng khách, khu vực muốn ngồi.';
  }

  if (intent === 'menu') {
    return 'Bạn đang xử lý tình huống KHÁCH HÀNG HỎI THỰC ĐƠN. Hãy gợi ý món theo thực đơn của quán, ưu tiên cappuccino, latte, espresso, trà sữa matcha và bánh croissant. Tránh nói mơ hồ, hãy đưa gợi ý phù hợp cho người mới và kèm nhắc về giá ước lượng nếu cần.';
  }

  if (intent === 'hours') {
    return 'Bạn đang xử lý tình huống KHÁCH HÀNG HỎI GIỜ MỞ CỬA. Hãy trả lời chính xác: Thứ Hai - Thứ Sáu 07:00 - 21:00, Thứ Bảy - Chủ Nhật 08:00 - 22:30. Nói rõ quán mở cửa theo lịch và không lẫn lộn với thời gian đặt hàng.';
  }

  return `Bạn là trợ lý quán cà phê CafeZone. Hãy trả lời câu hỏi khách hàng sau bằng tiếng Việt, rõ ràng, thân thiện và ngắn gọn. Câu hỏi: ${normalizedQuestion}`;
}

export function buildAnswerFromKnowledge(question: string, knowledge: string) {
  const q = question.toLowerCase();
  const lines = knowledge
    .split(/\s{2,}|\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const directMatches: string[] = [];

  const keywordMap: Array<[string[], string]> = [
    [['cappuccino', 'latte', 'espresso', 'matcha', 'croissant', 'trà sữa', 'bánh', 'menu', 'thực đơn', 'sản phẩm', 'đồ uống', 'người mới', 'món nào'], 'CafeZone nổi bật với cappuccino, latte, espresso, trà sữa matcha và bánh croissant. Nếu bạn mới uống cà phê, latte hoặc cappuccino là lựa chọn dễ thưởng thức nhất.'],
    [['giờ mở cửa', 'mở cửa', 'giờ làm việc', 'thời gian', 'làm việc', 'thứ hai', 'thứ bảy'], 'CafeZone mở cửa Thứ Hai - Thứ Sáu 07:00 - 21:00 và Thứ Bảy - Chủ Nhật 08:00 - 22:30.'],
    [['giỏ hàng', 'đặt hàng', 'mua', 'thanh toán', 'đơn hàng', 'giao hàng', 'checkout'], 'Khách hàng có thể xem sản phẩm, thêm vào giỏ hàng, thanh toán và theo dõi đơn hàng trực tuyến.'],
    [['đặt bàn', 'đặt chỗ', 'reservation', 'bàn', 'đặt chỗ tối nay'], 'Khách hàng có thể đặt bàn trực tuyến hoặc gọi hotline +84 28 555 7788 để xác nhận thời gian, số lượng khách và khu vực mong muốn.'],
    [['admin', 'quản trị', 'danh mục', 'thống kê', 'doanh thu', 'sản phẩm'], 'Admin quản lý sản phẩm, danh mục, đơn hàng và thống kê doanh thu.'],
    [['cloudflare', 'd1', 'r2', 'workers', 'pages', 'triển khai', 'hệ thống', 'công nghệ'], 'Dự án được triển khai trên Cloudflare Workers, D1, R2 và Pages cho khả năng chạy serverless và mở rộng.'],
    [['địa chỉ', 'vị trí', 'quán ở đâu', 'map', 'địa điểm', '45 nguyễn huệ'], 'CafeZone nằm tại 45 Nguyễn Huệ, Quận 1, TP.HCM.'],
    [['hotline', 'liên hệ', 'hỗ trợ', 'gọi', 'contact'], 'Bạn có thể liên hệ CafeZone qua hotline +84 28 555 7788.'],
    [['không gian', 'cà phê', 'thương hiệu', 'giới thiệu', 'môi trường'], 'CafeZone là cửa hàng cà phê thân thiện với không gian ấm áp, hương vị thủ công và khoảnh khắc thư giãn.']
  ];

  for (const [keywords, sentence] of keywordMap) {
    if (keywords.some((keyword) => q.includes(keyword))) {
      directMatches.push(sentence);
    }
  }

  if (directMatches.length === 0) {
    for (const line of lines) {
      if (line.toLowerCase().includes(q) || q.includes(line.toLowerCase().split(' ').slice(0, 2).join(' '))) {
        directMatches.push(line);
      }
    }
  }

  if (directMatches.length > 0) {
    return directMatches.slice(0, 3).join(' ');
  }

  return 'CafeZone tập trung vào cà phê thủ công, không gian ấm áp, đặt hàng trực tuyến và quản lý thương hiệu theo mô hình hiện đại. Dữ liệu hỗ trợ dựa trên kiến thức dự án liên quan.';
}
