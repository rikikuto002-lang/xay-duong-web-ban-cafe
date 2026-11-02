const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun } = require('docx');

const knowledge = [
  'CafeZone là cửa hàng cà phê với không gian ấm áp, hương vị thủ công và thực đơn phong phú.',
  'Các món nổi bật gồm cappuccino, latte, espresso, trà sữa matcha, bánh croissant và các món ăn nhẹ.',
  'Nếu khách mới uống cà phê, nên thử cappuccino hoặc latte vì hương vị cân bằng và dễ uống.',
  'Khách hàng có thể xem sản phẩm, tìm kiếm theo danh mục, thêm vào giỏ hàng, đặt bàn trực tuyến, đặt hàng online và thanh toán trực tiếp.',
  'CafeZone phục vụ từ Thứ Hai đến Chủ Nhật với giờ mở cửa: Thứ Hai - Thứ Sáu 07:00 - 21:00, Thứ Bảy - Chủ Nhật 08:00 - 22:30.',
  'Địa chỉ: 45 Nguyễn Huệ, Quận 1, TP.HCM. Hotline: +84 28 555 7788.',
  'Admin quản lý sản phẩm, danh mục, đơn hàng, thống kê doanh thu và danh sách đặt bàn.',
  'Dự án được xây dựng bằng Svelte, Hono, Cloudflare D1, Cloudflare R2 và Cloudflare Pages.'
];

(async () => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ children: [new TextRun({ text: 'Kiến thức chatbot cafe', bold: true, size: 32 })] }),
        ...knowledge.map((item) => new Paragraph({ children: [new TextRun(item)] }))
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  const filePath = path.resolve(__dirname, '..', 'Kien_thuc_chatbot_cafe.docx');
  fs.writeFileSync(filePath, buffer);
  console.log('Created', filePath);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
