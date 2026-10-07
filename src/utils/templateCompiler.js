/**
 * Làm sạch và loại bỏ các đoạn văn bản bị lặp lại (duplicate) trong nội dung thư mẫu
 */
export function cleanTemplateText(text) {
  if (!text) return '';
  let str = String(text);

  // 1. Nếu vô tình bị dính preview có chứa class "email-preview-content"
  const previewContentIndex = str.search(/class="[^"]*email-preview-content[^"]*"/i);
  if (previewContentIndex > 20) {
    const beforePreview = str.substring(0, previewContentIndex);
    const tagMatch = beforePreview.match(/<(?:div|section)[^>]*>(?:(?!<\/(?:div|section)>)[\s\S])*$/i);
    if (tagMatch && tagMatch.index > 20) {
      str = str.substring(0, tagMatch.index).trim();
    } else {
      str = beforePreview.trim();
    }
  }

  // 2. Nếu vô tình bị dính marker preview "Tiêu đề: ..." vào giữa nội dung
  const titleIndex = str.search(/Tiêu đề\s*:/i);
  if (titleIndex > 20) {
    const beforeTitle = str.substring(0, titleIndex);
    // Tìm vị trí mở thẻ container gần nhất trước Tiêu đề: (như <div, <p, <hr, v.v.)
    const tagMatch = beforeTitle.match(/<(?:div|p|hr|section)[^>]*>(?:(?!<\/(?:div|p|hr|section)>)[\s\S])*$/i);
    if (tagMatch && tagMatch.index > 20) {
      str = str.substring(0, tagMatch.index).trim();
    } else {
      str = beforeTitle.trim();
    }
  }

  // 3. Nếu khối lời chào mở đầu thư bị lặp lại từ 2 lần (VD: "Kính gửi sinh viên ... Kính gửi sinh viên ...")
  const greetingRegex = /(?:<p>)?\s*(?:Kính gửi|Chào bạn|Thân gửi)\s+[^,<\n]+,/gi;
  const matches = [...str.matchAll(greetingRegex)];
  if (matches.length >= 2) {
    const secondIndex = matches[1].index;
    if (secondIndex > 20) {
      const beforeSecond = str.substring(0, secondIndex);
      const tagMatch = beforeSecond.match(/<(?:div|p|hr|section)[^>]*>(?:(?!<\/(?:div|p|hr|section)>)[\s\S])*$/i);
      if (tagMatch && tagMatch.index > 20) {
        str = str.substring(0, tagMatch.index).trim();
      } else {
        str = beforeSecond.trim();
      }
    }
  }

  return str;
}

/**
 * Thay thế biến động {biến} trong tiêu đề và nội dung bằng giá trị thực tế của dòng dữ liệu
 */
export function compileTemplate(tmpl, rowData = {}, convertBr = false) {
  if (!tmpl) return '';
  const cleaned = cleanTemplateText(tmpl);
  let res = cleaned;
  for (const key of Object.keys(rowData)) {
    const val = rowData[key] !== undefined && rowData[key] !== null ? String(rowData[key]) : '';
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const reg = new RegExp(`\\{\\s*${escapedKey}\\s*\\}`, 'gi');
    res = res.replace(reg, val);
  }
  if (convertBr && !/<(p|div|br|ul|ol|table|h[1-6])/i.test(res)) {
    res = res.replace(/\n/g, '<br>');
  }
  return res;
}

/**
 * Trích xuất tất cả các biến {tên_biến} có trong văn bản
 */
export function extractVariables(text) {
  if (!text) return [];
  const matches = text.match(/\{([^}]+)\}/g) || [];
  return [...new Set(matches.map(m => m.slice(1, -1).trim()))];
}


