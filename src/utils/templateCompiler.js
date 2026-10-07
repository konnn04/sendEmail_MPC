/**
 * Thay thế biến động {biến} trong tiêu đề và nội dung bằng giá trị thực tế của dòng dữ liệu
 */
export function compileTemplate(tmpl, rowData = {}, convertBr = false) {
  if (!tmpl) return '';
  let res = tmpl;
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

