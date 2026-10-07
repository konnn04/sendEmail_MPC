/**
 * Google API & Gmail REST API Service
 * Xử lý xác thực Google OAuth 2.0 và gửi email trực tiếp qua Gmail API
 */

// Chẩn đoán và giải thích chi tiết lỗi từ Google Gmail REST API thành tiếng Việt có hướng dẫn cụ thể
export function formatGmailApiError(status, errJson, googleClientId = '') {
  const msg = errJson?.error?.message || '';
  const reason = errJson?.error?.errors?.[0]?.reason || errJson?.error?.status || '';
  const proj = (googleClientId || '').split('-')[0] || '275736693360';

  if (status === 401) {
    return 'Phiên đăng nhập đã hết hạn (401). Vui lòng bấm "Đổi tài khoản" và đăng nhập lại!';
  }

  if (status === 403) {
    if (reason === 'insufficientPermissions' || msg.toLowerCase().includes('insufficient authentication scopes')) {
      return 'Lỗi 403 (Thiếu quyền gửi mail): Bạn chưa tích chọn ô vuông "Gửi email thay mặt bạn" (Send email on your behalf) khi đăng nhập Google. Hãy bấm "Cấp lại quyền gửi thư" ở Bước 1 và nhớ TÍCH CHỌN ô vuông này!';
    }
    if (reason === 'accessNotConfigured' || msg.toLowerCase().includes('has not been used in project') || msg.toLowerCase().includes('disabled')) {
      return `Lỗi 403 (Gmail API chưa được bật): Dịch vụ Gmail API chưa được BẬT trên Google Cloud Project ${proj}. Vui lòng truy cập https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=${proj} và nhấn nút "ENABLE" (BẬT).`;
    }
    if (reason === 'rateLimitExceeded' || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('limit')) {
      return 'Lỗi 403 (Vượt hạn mức): Đã đạt giới hạn gửi thư của tài khoản Gmail hôm nay (Gmail cá nhân: ~500 thư/ngày, Workspace: ~2000 thư/ngày).';
    }
    return `Lỗi 403 (Bị từ chối quyền gửi thư): ${msg || 'Google từ chối yêu cầu. Vui lòng kiểm tra quyền tài khoản hoặc trạng thái Gmail API trên Google Cloud'}`;
  }

  return msg || `Lỗi Gmail API (Mã HTTP ${status})`;
}

// Tạo chuỗi MIME RFC 2822 chuẩn hóa Base64URL tương thích Gmail REST API (Hỗ trợ CC, BCC và Font chữ)
export function createBase64UrlEmail({ to, cc, bcc, subject, html, fromName, fromEmail, lineSpacing = '1.6', fontFamily = "'Times New Roman', Times, serif" }) {
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const fromHeader = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
  const emailLines = [
    `From: ${fromHeader}`,
    `To: ${to}`
  ];

  if (cc && cc.trim()) {
    emailLines.push(`Cc: ${cc.trim()}`);
  }
  if (bcc && bcc.trim()) {
    emailLines.push(`Bcc: ${bcc.trim()}`);
  }

  emailLines.push(
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    `<div style="font-family: ${fontFamily}; font-size: 14px; line-height: ${lineSpacing}; color: #1e293b;">${html}</div>`
  );

  const raw = emailLines.join('\r\n');
  return btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Kiểm tra quyền thực tế (Scopes) của token qua endpoint Google OAuth tokeninfo
export async function verifyGoogleTokenScopes(token) {
  if (!token) return { valid: false, canSend: false, scopes: [] };
  try {
    const res = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`);
    if (res.ok) {
      const data = await res.json();
      const scopes = (data.scope || '').split(' ');
      const canSend = scopes.some(s => s.includes('gmail.send'));
      return {
        valid: true,
        canSend,
        email: data.email || '',
        scopes
      };
    }
  } catch (err) {
    console.warn('Lỗi kiểm tra tokeninfo:', err);
  }
  return { valid: false, canSend: false, scopes: [] };
}

export async function fetchGoogleUserProfile(token) {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Lỗi fetch Google userinfo:', err);
  }
  return null;
}

// Gửi 1 email trực tiếp qua Gmail REST API
export async function sendGmailMessage({ token, rawEmail, googleClientId = '' }) {
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: rawEmail })
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    const errorText = formatGmailApiError(res.status, errJson, googleClientId);
    const err = new Error(errorText);
    err.status = res.status;
    err.details = errJson;
    throw err;
  }

  return await res.json();
}

