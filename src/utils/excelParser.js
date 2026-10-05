import * as XLSX from 'xlsx';

/**
 * Phân tích dữ liệu bảng từ chuỗi HTML (hỗ trợ đầy đủ định dạng table mso của Excel)
 */
export function parseHtmlTable(htmlString) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const table = doc.querySelector('table');
    
    if (!table) return null;

    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return null;

    // Lấy tiêu đề các cột từ dòng đầu tiên
    const headerCells = Array.from(rows[0].querySelectorAll('th, td'));
    const headers = headerCells.map((cell, idx) => {
      const text = cell.textContent.trim();
      return text || `Cột ${idx + 1}`;
    });

    if (headers.length === 0) return null;

    const data = [];
    for (let i = 1; i < rows.length; i++) {
      const cells = Array.from(rows[i].querySelectorAll('td, th'));
      if (cells.length === 0) continue;
      
      const rowObj = {};
      let hasValue = false;
      
      headers.forEach((header, idx) => {
        const cell = cells[idx];
        let val = '';
        if (cell) {
          const mailLink = cell.querySelector('a[href^="mailto:"]');
          if (mailLink) {
            val = mailLink.textContent.trim() || mailLink.getAttribute('href').replace('mailto:', '').trim();
          } else {
            val = cell.textContent.trim();
          }
        }
        if (val) hasValue = true;
        rowObj[header] = val;
      });

      if (hasValue) {
        data.push(rowObj);
      }
    }

    if (data.length > 0) {
      return { headers, data };
    }
  } catch (err) {
    console.warn('Lỗi parseHtmlTable:', err);
  }
  return null;
}

/**
 * Phân tích chuỗi tab-separated (\t) hoặc comma (,) khi copy từ Excel
 */
export function parseDelimitedText(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return null;

  // Lọc bỏ dòng style mso nếu có
  const cleanLines = lines.filter(l => 
    !l.startsWith('table {') && 
    !l.startsWith('tr {') && 
    !l.startsWith('col {') && 
    !l.startsWith('td {') && 
    !l.startsWith('.xl') && 
    !l.includes('mso-')
  );

  if (cleanLines.length < 2) return null;

  const firstLine = cleanLines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : (firstLine.includes(',') ? ',' : (firstLine.includes(';') ? ';' : null));

  if (!delimiter) return null;

  const headers = firstLine.split(delimiter).map((h, i) => h.trim().replace(/^["']|["']$/g, '') || `Cột ${i + 1}`);
  const data = [];

  for (let i = 1; i < cleanLines.length; i++) {
    const cols = cleanLines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length === 0 || cols.every(c => c === '')) continue;
    
    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = cols[idx] !== undefined ? cols[idx] : '';
    });
    data.push(rowObj);
  }

  return { headers, data };
}

/**
 * Phân tích dữ liệu khi người dùng dán text dạng chuỗi từng dòng
 * (như: Họ và tên \n email \n Số điện thoại \n mssv \n Huỳnh A \n abc@gmail.com...)
 */
export function parseRawLineTokens(str) {
  // Lọc bỏ các đoạn css mso
  let cleaned = str.replace(/table\s*\{[^}]*\}/gi, '')
                   .replace(/tr\s*\{[^}]*\}/gi, '')
                   .replace(/col\s*\{[^}]*\}/gi, '')
                   .replace(/td\s*\{[^}]*\}/gi, '')
                   .replace(/\.xl\w*\s*\{[^}]*\}/gi, '');

  const tokens = cleaned.split(/\r?\n/)
    .map(t => t.trim())
    .filter(t => t.length > 0 && !t.includes('mso-') && !t.startsWith('{') && !t.startsWith('}'));

  if (tokens.length >= 8) {
    // Kiểm tra nếu 4 dòng đầu là các cột quen thuộc: Tên, email, sđt, mssv
    const potentialHeaders = tokens.slice(0, 4);
    const hasKnownKey = potentialHeaders.some(h => {
      const lower = h.toLowerCase();
      return lower.includes('tên') || lower.includes('email') || lower.includes('thoại') || lower.includes('mssv');
    });

    if (hasKnownKey) {
      const headers = potentialHeaders;
      const data = [];
      const colCount = headers.length;

      for (let i = colCount; i < tokens.length; i += colCount) {
        const rowObj = {};
        headers.forEach((h, idx) => {
          rowObj[h] = tokens[i + idx] || '';
        });
        data.push(rowObj);
      }

      if (data.length > 0) {
        return { headers, data };
      }
    }
  }

  return null;
}

/**
 * Xử lý dữ liệu bảng từ clipboard (sự kiện Paste)
 */
export async function parseClipboardData(clipboardData) {
  if (!clipboardData) return null;

  // 1. Thử lấy dữ liệu dạng HTML (Excel copy vào clipboard sẽ có HTML table với style mso)
  const html = clipboardData.getData('text/html');
  if (html) {
    const resHtml = parseHtmlTable(html);
    if (resHtml && resHtml.data.length > 0) {
      return resHtml;
    }
  }

  // 2. Lấy dữ liệu plain text (Excel sẽ ngăn cách các ô bằng tab \t)
  const text = clipboardData.getData('text/plain');
  if (text) {
    return await parseExcelData(text);
  }

  return null;
}

/**
 * Phân tích tổng hợp: nhận diện File, HTML Table, Text dán từ Excel
 */
export async function parseExcelData(input) {
  // 1. Nếu là File (.xlsx, .xls, .csv, .html)
  if (input instanceof File || input instanceof Blob) {
    const textSample = await input.slice(0, 4096).text();
    
    // Nếu là file HTML giả lập xls (rất phổ biến từ các hệ thống trường học / đào tạo)
    if (textSample.includes('<table') || textSample.includes('mso-displayed-decimal-separator') || textSample.includes('<html')) {
      const fullText = await input.text();
      const htmlResult = parseHtmlTable(fullText);
      if (htmlResult && htmlResult.data.length > 0) {
        return htmlResult;
      }
    }

    // Nếu là file Excel chuẩn hoặc CSV -> Dùng SheetJS
    const arrayBuffer = await input.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!json || json.length === 0) {
      throw new Error('File không có dữ liệu hoặc trang tính trống!');
    }

    const headers = Object.keys(json[0]);
    return { headers, data: json };
  }

  // 2. Nếu là chuỗi ký tự (String từ textarea hoặc paste)
  if (typeof input === 'string') {
    const str = input.trim();
    if (!str) {
      throw new Error('Dữ liệu dán bị trống!');
    }

    // A. Thử parse dạng HTML table nếu có thẻ <table> hoặc <tr
    if (str.includes('<table') || str.includes('mso-') || str.includes('<tr')) {
      let htmlToParse = str;
      if (!htmlToParse.includes('<table')) {
        htmlToParse = `<table>${htmlToParse}</table>`;
      }
      const htmlResult = parseHtmlTable(htmlToParse);
      if (htmlResult && htmlResult.data.length > 0) {
        return htmlResult;
      }
    }

    // B. Thử parse dạng văn bản phân tách tab (\t) hoặc phẩy (,)
    const textResult = parseDelimitedText(str);
    if (textResult && textResult.data.length > 0) {
      return textResult;
    }

    // C. Thử parse danh sách dòng token
    const tokenResult = parseRawLineTokens(str);
    if (tokenResult && tokenResult.data.length > 0) {
      return tokenResult;
    }

    throw new Error('Không thể nhận diện định dạng bảng từ nội dung đã dán. Hãy copy các ô từ Excel và thử dán lại!');
  }

  throw new Error('Dữ liệu không hợp lệ!');
}
