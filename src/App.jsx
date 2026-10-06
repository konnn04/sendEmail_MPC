import React, { useState, useEffect, useRef } from 'react';
import { 
  Mail, Send, CheckCircle2, XCircle, AlertCircle, 
  FileSpreadsheet, Play, Pause, Square, Download, 
  Eye, RefreshCw, Plus, ShieldCheck, HelpCircle, 
  ClipboardPaste, Sparkles, Bookmark, RotateCcw, 
  Check, LogOut, UserCheck, ExternalLink,
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Indent, Outdent, List, ListOrdered, Palette,
  Highlighter, Type, Link as LinkIcon, RemoveFormatting,
  Code, Heading1, Heading2, Minus
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { parseExcelData, parseClipboardData } from './utils/excelParser';

const EMAIL_TEMPLATES = [
  {
    id: 'student_info',
    name: 'Mẫu 1: Xác nhận thông tin sinh viên',
    subject: 'Thông báo xác nhận thông tin sinh viên - {Họ và tên} (MSSV: {mssv})',
    body: `<p>Kính gửi sinh viên <strong>{Họ và tên}</strong>,</p>
<p>Phòng Đào tạo xin gửi thông tin xác nhận hồ sơ của bạn như sau:</p>
<ul>
  <li><strong>Họ và tên:</strong> {Họ và tên}</li>
  <li><strong>Mã số sinh viên:</strong> {mssv}</li>
  <li><strong>Số điện thoại:</strong> {Số điện thoại}</li>
  <li><strong>Email nhận tin:</strong> {email}</li>
</ul>
<p>Vui lòng kiểm tra kỹ các thông tin trên. Nếu có bất kỳ sai sót nào, bạn vui lòng phản hồi lại email này để được hỗ trợ kịp thời.</p>
<p>Chúc bạn học tập tốt!</p>
<p><strong>Trân trọng,</strong><br><em>Phòng Đào tạo &amp; Quản lý Sinh viên</em></p>`
  },
  {
    id: 'tuition_fee',
    name: 'Mẫu 2: Nhắc nhở hoàn tất thủ tục / học phí',
    subject: 'Nhắc nhở hoàn tất thủ tục học tập - Sinh viên {Họ và tên} ({mssv})',
    body: `<p>Chào bạn <strong>{Họ và tên}</strong>,</p>
<p>Hệ thống ghi nhận bạn (MSSV: <strong>{mssv}</strong>) hiện còn một số thủ tục cần hoàn tất.</p>
<p><strong>Thông tin liên hệ ghi nhận:</strong></p>
<ul>
  <li><strong>Số điện thoại:</strong> {Số điện thoại}</li>
  <li><strong>Email:</strong> {email}</li>
</ul>
<p style="color: #dc2626;"><strong>Đề nghị bạn kiểm tra và hoàn thành trước thời hạn quy định.</strong></p>
<p>Trân trọng,<br><em>Bộ phận Hỗ trợ Sinh viên</em></p>`
  },
  {
    id: 'custom_blank',
    name: 'Mẫu 3: Tự tạo mẫu thư mới',
    subject: 'Thông báo gửi {Họ và tên}',
    body: `<p>Xin chào <strong>{Họ và tên}</strong>,</p>
<p>Nội dung gửi đến số điện thoại {Số điện thoại} và email {email}.</p>
<p>Trân trọng!</p>`
  }
];

// Tự động nhận Google Client ID từ file .env
const ENV_GOOGLE_CLIENT_ID = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID)
  || (typeof __ENV_GOOGLE_CLIENT_ID__ !== 'undefined' ? __ENV_GOOGLE_CLIENT_ID__ : '')
  || '';

// Chẩn đoán và diễn giải chi tiết lỗi từ Google Gmail REST API thành tiếng Việt có hướng dẫn xử lý
const formatGmailApiError = (status, errJson, googleClientId = '') => {
  const msg = errJson?.error?.message || '';
  const reason = errJson?.error?.errors?.[0]?.reason || errJson?.error?.status || '';
  const proj = (googleClientId || '').split('-')[0] || '275736693360';

  if (status === 401) {
    return 'Phiên đăng nhập đã hết hạn (401). Vui lòng bấm "Đổi tài khoản" và đăng nhập lại!';
  }

  if (status === 403) {
    if (reason === 'insufficientPermissions' || msg.toLowerCase().includes('insufficient authentication scopes')) {
      return 'Lỗi 403 (Thiếu quyền gửi mail): Bạn chưa tích chọn ô vuông "Gửi email thay mặt bạn" (Send email on your behalf) khi đăng nhập Google. Hãy bấm nút "Cấp lại quyền gửi thư" ở Bước 1 và nhớ TÍCH CHỌN ô vuông này!';
    }
    if (reason === 'accessNotConfigured' || msg.toLowerCase().includes('has not been used in project') || msg.toLowerCase().includes('disabled')) {
      return `Lỗi 403 (Gmail API chưa được bật): Dịch vụ Gmail API chưa được BẬT trên Google Cloud Project ${proj}. Vui lòng truy cập https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=${proj} và nhấn nút "ENABLE" (BẬT).`;
    }
    if (reason === 'rateLimitExceeded' || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('limit')) {
      return 'Lỗi 403 (Vượt hạn mức): Đã đạt giới hạn gửi thư của tài khoản Gmail hôm nay (Gmail cá nhân: ~500 thư/ngày).';
    }
    return `Lỗi 403 (Bị từ chối quyền gửi thư): ${msg || 'Google từ chối yêu cầu. Vui lòng kiểm tra quyền tài khoản hoặc trạng thái Gmail API trên Google Cloud'}`;
  }

  return msg || `Lỗi Gmail API (Mã HTTP ${status})`;
};

// Tạo email MIME chuẩn RFC 2822 base64url cho Gmail REST API
const createBase64UrlEmail = ({ to, subject, html, fromName, fromEmail, lineSpacing = '1.6' }) => {
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const fromHeader = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
  const emailLines = [
    `From: ${fromHeader}`,
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: ${lineSpacing}; color: #1e293b;">${html}</div>`
  ];
  const raw = emailLines.join('\r\n');
  return btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

export default function App() {
  // --- Google OAuth State (Cách A: Gmail API Trực Tiếp) ---
  const [googleClientId, setGoogleClientId] = useState(ENV_GOOGLE_CLIENT_ID);
  const [googleAccessToken, setGoogleAccessToken] = useState('');
  const [googleUser, setGoogleUser] = useState(null); // { name, email, picture }
  const [hasSendScope, setHasSendScope] = useState(false);
  const [scopeChecking, setScopeChecking] = useState(false);
  const [testingSend, setTestingSend] = useState(false);
  const [testEmailTarget, setTestEmailTarget] = useState('');

  // Cấu hình người gửi & khoảng nghỉ
  const [senderDisplayName, setSenderDisplayName] = useState('Phòng Đào Tạo & Quản Lý');
  const [delaySec, setDelaySec] = useState(1.5);

  // Data Input
  const [inputMode, setInputMode] = useState('paste'); // 'paste' | 'upload'
  const [rawPastedText, setRawPastedText] = useState('');
  const [records, setRecords] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [emailCol, setEmailCol] = useState('');
  const [dataSourceName, setDataSourceName] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Email Template
  const [selectedTemplateId, setSelectedTemplateId] = useState('student_info');
  const [subject, setSubject] = useState(EMAIL_TEMPLATES[0].subject);
  const [body, setBody] = useState(EMAIL_TEMPLATES[0].body);
  const [autoBr, setAutoBr] = useState(true);
  const [previewRowIdx, setPreviewRowIdx] = useState(0);

  // Sending Process
  const [isSending, setIsSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sendLogs, setSendLogs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showGoogleGuideModal, setShowGoogleGuideModal] = useState(false);
  const [toast, setToast] = useState(null);

  // Refs
  const isPausedRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const subjectRef = useRef(null);
  const lastFocusedInputRef = useRef('body');

  // Rich Text Editor State & Refs (Định dạng Word)
  const editorRef = useRef(null);
  const rawHtmlTextareaRef = useRef(null);
  const savedRangeRef = useRef(null);
  const [isHtmlSourceMode, setIsHtmlSourceMode] = useState(false);
  const [lineSpacing, setLineSpacing] = useState('1.6');
  const [textColor, setTextColor] = useState('#000000');
  const [highlightColor, setHighlightColor] = useState('transparent');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  // --- Khởi tạo ứng dụng & Khôi phục phiên ---
  useEffect(() => {
    fetchConfig();

    const savedToken = localStorage.getItem('google_access_token');
    const savedEmail = localStorage.getItem('google_user_email');
    const savedName = localStorage.getItem('google_user_name');
    const savedPic = localStorage.getItem('google_user_picture');

    if (savedToken && savedEmail) {
      setGoogleUser({ 
        email: savedEmail, 
        name: savedName || 'Người dùng Google', 
        picture: savedPic || '' 
      });
      setGoogleAccessToken(savedToken);
      if (savedName) setSenderDisplayName(savedName);

      // Kiểm tra tính hợp lệ và quyền gửi mail (gmail.send) của token đã lưu
      verifyGoogleToken(savedToken);
    }

    const savedSubject = localStorage.getItem('user_subject');
    const savedBody = localStorage.getItem('user_body');
    const savedLineSpacing = localStorage.getItem('user_line_spacing');
    if (savedSubject) setSubject(savedSubject);
    if (savedBody) setBody(savedBody);
    if (savedLineSpacing) setLineSpacing(savedLineSpacing);
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        if (data.googleClientId) {
          setGoogleClientId(data.googleClientId);
        }
      }
    } catch (e) {
      console.warn('Lỗi fetch /api/config:', e);
    }
  };

  const showToastMsg = (text, type = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Xác thực quyền thực tế của Access Token từ Google OAuth server (Bao gồm gmail.send)
  const verifyGoogleToken = async (token) => {
    if (!token) {
      setHasSendScope(false);
      return false;
    }
    setScopeChecking(true);
    try {
      const res = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`);
      if (res.ok) {
        const info = await res.json();
        const scopes = (info.scope || '').split(' ');
        const canSend = scopes.some(s => s.includes('gmail.send'));
        setHasSendScope(canSend);
        if (!canSend) {
          console.warn('Token thiếu quyền https://www.googleapis.com/auth/gmail.send');
        }
        return canSend;
      } else {
        console.warn('Token đã hết hạn hoặc không hợp lệ.');
        handleGoogleLogout(false);
        setHasSendScope(false);
        return false;
      }
    } catch (err) {
      console.warn('Lỗi kiểm tra tokeninfo:', err);
      return false;
    } finally {
      setScopeChecking(false);
    }
  };

  const fetchGoogleUserInfo = async (token) => {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const uInfo = await res.json();
        setGoogleUser({
          email: uInfo.email,
          name: uInfo.name || 'Người dùng Google',
          picture: uInfo.picture || ''
        });
        if (uInfo.name) setSenderDisplayName(uInfo.name);

        localStorage.setItem('google_user_email', uInfo.email);
        localStorage.setItem('google_user_name', uInfo.name || '');
        localStorage.setItem('google_user_picture', uInfo.picture || '');

        return uInfo;
      }
    } catch (err) {
      console.warn('Lỗi lấy userinfo:', err);
    }
    return null;
  };

  // Đăng nhập Google & Xin quyền gửi Gmail trực tiếp (Chuẩn OAuth 2.0 Token Client)
  const handleGoogleLogin = () => {
    const cid = (googleClientId || ENV_GOOGLE_CLIENT_ID || '').trim();
    if (!cid) {
      showToastMsg('Chưa tìm thấy Google Client ID trong file .env!', 'warning');
      return;
    }

    if (typeof window.google === 'undefined' || !window.google.accounts || !window.google.accounts.oauth2) {
      showToastMsg('Thư viện Google đang tải, vui lòng thử lại sau vài giây!', 'warning');
      return;
    }

    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: cid,
        scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        callback: async (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            const token = tokenResponse.access_token;
            setGoogleAccessToken(token);
            localStorage.setItem('google_access_token', token);
            await fetchGoogleUserInfo(token);

            // Kiểm tra ngay xem người dùng có tích chọn ô 'Gửi email thay mặt bạn' không
            const grantedScope = tokenResponse.scope || '';
            let canSend = grantedScope.includes('gmail.send');

            if (!canSend) {
              canSend = await verifyGoogleToken(token);
            } else {
              setHasSendScope(true);
            }

            if (canSend) {
              showToastMsg('✓ Đã cấp đủ quyền gửi Gmail (gmail.send) thành công!', 'success');
            } else {
              showToastMsg('⚠️ Chú ý: Bạn chưa tích chọn ô vuông "Gửi email thay mặt bạn". Khi gửi sẽ bị lỗi 403!', 'error');
            }
          } else if (tokenResponse && tokenResponse.error) {
            showToastMsg(`Lỗi cấp quyền: ${tokenResponse.error}`, 'error');
          }
        },
        error_callback: (err) => {
          console.error('Lỗi OAuth:', err);
          showToastMsg('Lỗi đăng nhập: ' + (err.message || 'Kiểm tra quyền trên Google Cloud'), 'error');
        }
      });

      // Luôn dùng prompt: 'consent' để Google hiện lại màn hình cấp quyền có checkbox cho người dùng tích
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      console.error(err);
      showToastMsg(`Lỗi: ${err.message}`, 'error');
    }
  };

  const handleGoogleLogout = (notify = true) => {
    if (googleAccessToken && window.google?.accounts?.oauth2) {
      try {
        window.google.accounts.oauth2.revoke(googleAccessToken, () => {});
      } catch (_) {}
    }
    setGoogleAccessToken('');
    setGoogleUser(null);
    setHasSendScope(false);
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_user_email');
    localStorage.removeItem('google_user_name');
    localStorage.removeItem('google_user_picture');
    if (notify) showToastMsg('Đã đăng xuất tài khoản Google.', 'info');
  };

  // Gửi thử nghiệm 1 email qua Gmail API để kiểm tra kết nối ngay
  const handleTestSendGmail = async () => {
    if (!googleUser || !googleAccessToken) {
      showToastMsg('Vui lòng đăng nhập Google trước!', 'warning');
      return;
    }
    if (!hasSendScope) {
      showToastMsg('⚠️ Tài khoản chưa được tích chọn quyền gửi thư! Hãy bấm "Cấp lại quyền gửi Gmail" ở Bước 1 và tích chọn ô vuông cho phép.', 'error');
      return;
    }
    const target = testEmailTarget.trim() || googleUser.email;
    if (!target) {
      showToastMsg('Vui lòng nhập email người nhận thử nghiệm!', 'warning');
      return;
    }

    setTestingSend(true);
    try {
      const raw = createBase64UrlEmail({
        to: target,
        subject: 'Thử nghiệm gửi email qua Gmail API (Thành công)',
        html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 560px; margin: 0 auto; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #4f46e5; margin: 0; font-size: 20px;">✓ Kết nối Gmail API thành công!</h2>
          </div>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">Email này được gửi trực tiếp từ hộp thư Gmail của bạn (<strong>${googleUser.email}</strong>) thông qua Google OAuth 2.0 & Gmail REST API.</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #475569;">
            <strong>Người gửi:</strong> ${senderDisplayName || googleUser.name} &lt;${googleUser.email}&gt;<br/>
            <strong>Người nhận:</strong> ${target}<br/>
            <strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}
          </div>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Hệ thống đã sẵn sàng gửi thư hàng loạt!</p>
        </div>`,
        fromName: senderDisplayName || googleUser.name,
        fromEmail: googleUser.email
      });

      const gRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw })
      });

      if (!gRes.ok) {
        const errJson = await gRes.json().catch(() => ({}));
        const formattedErr = formatGmailApiError(gRes.status, errJson, googleClientId);
        if (gRes.status === 403 && (formattedErr.includes('chưa tích chọn') || formattedErr.includes('Thiếu quyền'))) {
          setHasSendScope(false);
        }
        throw new Error(formattedErr);
      }

      await gRes.json();
      showToastMsg(`✓ Đã gửi thử nghiệm thành công tới ${target}! Hãy kiểm tra hộp thư đến.`, 'success');
    } catch (e) {
      showToastMsg(e.message, 'error');
    } finally {
      setTestingSend(false);
    }
  };

  // --- Nạp Dữ Liệu Mẫu ---
  const loadDefaultUserSample = () => {
    const sampleHeaders = ['Họ và tên', 'email', 'Số điện thoại', 'mssv'];
    const sampleData = [
      {
        'Họ và tên': 'Huỳnh A',
        'email': 'abc@gmail.com',
        'Số điện thoại': '98989899',
        'mssv': '213'
      },
      {
        'Họ và tên': 'Nguyễn Văn Bình',
        'email': 'binh.nguyen@example.com',
        'Số điện thoại': '0901234567',
        'mssv': '214'
      },
      {
        'Họ và tên': 'Trần Thị Cúc',
        'email': 'cuc.tran@example.com',
        'Số điện thoại': '0912345678',
        'mssv': '215'
      }
    ];

    setHeaders(sampleHeaders);
    setRecords(sampleData);
    setEmailCol('email');
    setDataSourceName('Dữ liệu mẫu sinh viên (Huỳnh A, MSSV: 213...)');
    setRawPastedText(`Họ và tên\temail\tSố điện thoại\tmssv\nHuỳnh A\tabc@gmail.com\t98989899\t213\nNguyễn Văn Bình\tbinh.nguyen@example.com\t0901234567\t214\nTrần Thị Cúc\tcuc.tran@example.com\t0912345678\t215`);
    setShowPreview(true);
    showToastMsg('Đã nạp dữ liệu mẫu sinh viên!', 'info');
  };

  const applyData = (parsedHeaders, parsedData, sourceLabel) => {
    setHeaders(parsedHeaders);
    setRecords(parsedData);
    setDataSourceName(sourceLabel);

    let foundEmail = '';
    for (const h of parsedHeaders) {
      const lower = h.toLowerCase();
      if (lower.includes('email') || lower.includes('mail') || lower.includes('thư')) {
        foundEmail = h;
        break;
      }
    }
    setEmailCol(foundEmail || parsedHeaders[0] || '');
    setSendLogs([]);
    setCurrentIndex(0);
    setPreviewRowIdx(0);
  };

  // Nhận diện và cập nhật bảng dữ liệu khi người dùng bấm nút
  const handleManualParsePastedText = async () => {
    if (!rawPastedText.trim()) {
      showToastMsg('Vui lòng dán hoặc nhập dữ liệu vào khung trước!', 'warning');
      setShowPreview(false);
      setRecords([]);
      return;
    }

    try {
      const res = await parseExcelData(rawPastedText);
      if (!res || !res.data || res.data.length === 0) {
        throw new Error('Không tìm thấy dòng dữ liệu nào!');
      }
      applyData(res.headers, res.data, 'Dữ liệu vừa dán từ Excel');
      setShowPreview(true);
      showToastMsg(`✓ Đã nhận diện và cập nhật thành công ${res.data.length} dòng dữ liệu!`, 'success');
    } catch (err) {
      showToastMsg(`Lỗi nhận diện: ${err.message}`, 'error');
    }
  };

  // Tải file Excel
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const res = await parseExcelData(file);
      applyData(res.headers, res.data, `File: ${file.name}`);
      setShowPreview(true);
      showToastMsg(`✓ Đã đọc thành công ${res.data.length} dòng từ file ${file.name}!`, 'success');
    } catch (err) {
      showToastMsg(`Lỗi đọc file: ${err.message}`, 'error');
    }
  };

  // Mẫu thư gửi
  const handleSelectTemplate = (tmplId) => {
    setSelectedTemplateId(tmplId);
    const tmpl = EMAIL_TEMPLATES.find(t => t.id === tmplId);
    if (tmpl) {
      setSubject(tmpl.subject);
      setBody(tmpl.body);
      if (editorRef.current && !isHtmlSourceMode) {
        editorRef.current.innerHTML = tmpl.body;
      }
      showToastMsg(`Đã áp dụng ${tmpl.name}`, 'info');
    }
  };

  const handleSaveCurrentTemplate = () => {
    localStorage.setItem('user_subject', subject);
    localStorage.setItem('user_body', body);
    localStorage.setItem('user_line_spacing', lineSpacing);
    showToastMsg('Đã lưu mẫu thư gửi vào trình duyệt!', 'success');
  };

  // Đồng bộ nội dung vào editorRef khi body thay đổi từ ngoài
  useEffect(() => {
    if (editorRef.current && !isHtmlSourceMode) {
      if (editorRef.current.innerHTML !== body) {
        if (document.activeElement !== editorRef.current) {
          editorRef.current.innerHTML = body;
        }
      }
    }
  }, [body, isHtmlSourceMode]);

  // Quản lý vùng chọn (Selection Range) cho ContentEditable
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  // Các lệnh định dạng văn bản chuẩn Word
  const execCmd = (command, value = null) => {
    if (isHtmlSourceMode) return;
    if (editorRef.current) {
      editorRef.current.focus();
      restoreSelection();
      document.execCommand(command, false, value);
      setBody(editorRef.current.innerHTML);
      saveSelection();
    }
  };

  const applyTextColor = (color) => {
    setTextColor(color);
    execCmd('foreColor', color);
    setShowColorPicker(false);
  };

  const applyHighlightColor = (color) => {
    setHighlightColor(color);
    execCmd('hiliteColor', color);
    setShowHighlightPicker(false);
  };

  const applyFontSize = (size) => {
    if (isHtmlSourceMode) return;
    if (editorRef.current) {
      editorRef.current.focus();
      restoreSelection();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        const range = sel.getRangeAt(0);
        const span = document.createElement('span');
        span.style.fontSize = size;
        span.appendChild(range.extractContents());
        range.insertNode(span);
        sel.selectAllChildren(span);
        saveSelection();
      } else {
        document.execCommand('fontSize', false, '4');
      }
      setBody(editorRef.current.innerHTML);
    }
  };

  const applyHeading = (tag) => {
    if (isHtmlSourceMode) return;
    if (editorRef.current) {
      editorRef.current.focus();
      restoreSelection();
      document.execCommand('formatBlock', false, tag);
      setBody(editorRef.current.innerHTML);
      saveSelection();
    }
  };

  const handleInsertLink = () => {
    if (isHtmlSourceMode) return;
    const url = prompt('Nhập đường link web (URL):', 'https://');
    if (url && url.trim() && url !== 'https://') {
      execCmd('createLink', url.trim());
    }
  };

  const handleInsertHr = () => {
    execCmd('insertHorizontalRule');
  };

  const insertVariable = (varName) => {
    const tag = `{${varName}}`;
    if (lastFocusedInputRef.current === 'subject') {
      const el = subjectRef.current;
      if (el) {
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;
        const nextVal = subject.slice(0, start) + tag + subject.slice(end);
        setSubject(nextVal);
        setTimeout(() => {
          el.focus();
          el.selectionStart = el.selectionEnd = start + tag.length;
        }, 0);
      } else {
        setSubject(prev => prev + tag);
      }
    } else {
      if (isHtmlSourceMode) {
        const el = rawHtmlTextareaRef.current;
        if (el) {
          const start = el.selectionStart || 0;
          const end = el.selectionEnd || 0;
          const nextVal = body.slice(0, start) + tag + body.slice(end);
          setBody(nextVal);
          setTimeout(() => {
            el.focus();
            el.selectionStart = el.selectionEnd = start + tag.length;
          }, 0);
        } else {
          setBody(prev => prev + tag);
        }
      } else {
        if (editorRef.current) {
          editorRef.current.focus();
          restoreSelection();
          const success = document.execCommand('insertText', false, tag);
          if (!success) {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              const range = sel.getRangeAt(0);
              range.deleteContents();
              const textNode = document.createTextNode(tag);
              range.insertNode(textNode);
              range.setStartAfter(textNode);
              range.setEndAfter(textNode);
              sel.removeAllRanges();
              sel.addRange(range);
            } else {
              editorRef.current.innerHTML += tag;
            }
          }
          setBody(editorRef.current.innerHTML);
          saveSelection();
        }
      }
    }
    showToastMsg(`Đã chèn biến ${tag}`, 'info');
  };

  const compileTemplate = (tmpl, rowData, convertBr = false) => {
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
  };

  // Tạo email MIME chuẩn RFC 2822 base64url cho Gmail API
  const createBase64UrlEmail = ({ to, subject, html, fromName, fromEmail, lineSpacing = '1.6' }) => {
    const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
    const fromHeader = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
    const emailLines = [
      `From: ${fromHeader}`,
      `To: ${to}`,
      `Subject: ${utf8Subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: ${lineSpacing}; color: #1e293b;">${html}</div>`
    ];
    const raw = emailLines.join('\r\n');
    return btoa(unescape(encodeURIComponent(raw)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // --- TIẾN TRÌNH GỬI HÀNG LOẠT QUA GMAIL API ---
  const handleStartSending = async () => {
    if (records.length === 0 || !showPreview) {
      showToastMsg('Vui lòng dán dữ liệu và bấm "Nhận diện & Cập nhật bảng dữ liệu" ở Bước 2 trước khi gửi!', 'warning');
      return;
    }

    if (!googleUser || !googleAccessToken) {
      showToastMsg('Vui lòng bấm đăng nhập Google ở Bước 1 trước khi gửi!', 'warning');
      return;
    }

    if (!emailCol) {
      showToastMsg('Vui lòng chọn cột chứa Email người nhận!', 'warning');
      return;
    }

    if (!subject.trim() || !body.trim()) {
      showToastMsg('Vui lòng nhập tiêu đề và nội dung thư gửi!', 'warning');
      return;
    }

    setIsSending(true);
    setIsPaused(false);
    isPausedRef.current = false;
    stopRequestedRef.current = false;

    const startIdx = currentIndex >= records.length ? 0 : currentIndex;
    let successCount = 0;
    let failCount = 0;

    for (let i = startIdx; i < records.length; i++) {
      while (isPausedRef.current && !stopRequestedRef.current) {
        await sleep(300);
      }

      if (stopRequestedRef.current) {
        showToastMsg('Đã dừng tiến trình gửi!', 'warning');
        break;
      }

      setCurrentIndex(i);
      const row = records[i];
      const toEmail = (row[emailCol] || '').trim();
      const compiledSub = compileTemplate(subject, row);
      const compiledHtml = compileTemplate(body, row, autoBr);

      const logItem = {
        id: i + 1,
        email: toEmail,
        name: row['Họ và tên'] || row['Tên'] || row[headers[0]] || `Dòng ${i + 1}`,
        mssv: row['mssv'] || row['MSSV'] || '--',
        subject: compiledSub,
        status: 'sending',
        time: new Date().toLocaleTimeString('vi-VN'),
        error: ''
      };

      setSendLogs(prev => {
        const copy = [...prev];
        const exIdx = copy.findIndex(l => l.id === logItem.id);
        if (exIdx >= 0) copy[exIdx] = logItem;
        else copy.push(logItem);
        return copy;
      });

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!toEmail || !emailRegex.test(toEmail)) {
        logItem.status = 'failed';
        logItem.error = 'Email bị trống hoặc không hợp lệ';
        failCount++;
      } else {
        try {
          // Gửi trực tiếp qua Gmail REST API bằng Access Token
          const raw = createBase64UrlEmail({
            to: toEmail,
            subject: compiledSub,
            html: compiledHtml,
            fromName: senderDisplayName || googleUser.name,
            fromEmail: googleUser.email,
            lineSpacing
          });

          const gRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${googleAccessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ raw })
          });

          if (!gRes.ok) {
            const errJson = await gRes.json().catch(() => ({}));
            const errMsg = errJson.error?.message || `Lỗi Gmail (HTTP ${gRes.status})`;
            if (gRes.status === 401) {
              throw new Error('Phiên đăng nhập hết hạn (401). Vui lòng bấm Đăng xuất và đăng nhập lại!');
            }
            throw new Error(errMsg);
          }

          const gData = await gRes.json();
          logItem.status = 'success';
          logItem.error = `Đã gửi thành công (Gmail ID: ${gData.id})`;
          successCount++;
        } catch (err) {
          logItem.status = 'failed';
          logItem.error = err.message || 'Lỗi gửi thư';
          failCount++;
        }
      }

      setSendLogs(prev => {
        const copy = [...prev];
        const exIdx = copy.findIndex(l => l.id === logItem.id);
        if (exIdx >= 0) copy[exIdx] = { ...logItem };
        return copy;
      });

      if (i < records.length - 1 && !stopRequestedRef.current) {
        await sleep(Math.max(300, delaySec * 1000));
      }
    }

    setIsSending(false);
    setIsPaused(false);
    if (!stopRequestedRef.current) {
      showToastMsg(`Hoàn tất gửi danh sách! Thành công: ${successCount}, Thất bại: ${failCount}`, 'success');
    }
  };

  const handleTogglePause = () => {
    if (!isSending) return;
    const nextState = !isPaused;
    setIsPaused(nextState);
    isPausedRef.current = nextState;
    showToastMsg(nextState ? 'Đã tạm dừng gửi' : 'Tiếp tục gửi...', 'info');
  };

  const handleStop = () => {
    if (window.confirm('Bạn có chắc muốn dừng hẳn tiến trình gửi hiện tại?')) {
      stopRequestedRef.current = true;
      setIsPaused(false);
      isPausedRef.current = false;
      showToastMsg('Đang dừng gửi...', 'warning');
    }
  };

  const handleExportExcel = () => {
    if (sendLogs.length === 0) {
      showToastMsg('Chưa có lịch sử gửi để xuất báo cáo!', 'warning');
      return;
    }

    const exportRows = sendLogs.map(l => ({
      'STT': l.id,
      'Email nhận': l.email,
      'Họ và tên': l.name,
      'MSSV': l.mssv,
      'Tiêu đề gửi': l.subject,
      'Trạng thái': l.status === 'success' ? 'Thành công' : (l.status === 'failed' ? 'Thất bại' : 'Đang gửi'),
      'Chi tiết / Mã lỗi': l.error,
      'Thời gian': l.time
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'KetQuaGuiMail');
    XLSX.writeFile(wb, `BaoCao_GuiMail_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToastMsg('Đã tải xuống file báo cáo Excel!', 'success');
  };

  const totalCount = records.length;
  const processedCount = sendLogs.length;
  const successCount = sendLogs.filter(l => l.status === 'success').length;
  const failedCount = sendLogs.filter(l => l.status === 'failed').length;
  const progressPercent = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-fade-in">
          <div className={`px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2.5 text-xs font-semibold text-white ${
            toast.type === 'success' ? 'bg-emerald-600' :
            toast.type === 'error' ? 'bg-rose-600' :
            toast.type === 'warning' ? 'bg-amber-500' : 'bg-slate-800'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
            {toast.type === 'error' && <XCircle className="w-4 h-4" />}
            {toast.type === 'warning' && <AlertCircle className="w-4 h-4" />}
            {toast.type === 'info' && <ShieldCheck className="w-4 h-4" />}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-sm">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-lg text-slate-900 leading-none">Gửi Email Hàng Loạt Qua Gmail</h1>
              
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Đăng nhập tài khoản Gmail của bạn 
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
          
            {googleUser ? (
              <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
                {googleUser.picture ? (
                  <img src={googleUser.picture} alt="Avatar" className="w-5 h-5 rounded-full" />
                ) : (
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                )}
                <span className="text-xs font-semibold text-emerald-800">{googleUser.email}</span>
              </div>
            ) : (
              <span className="text-xs px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full font-medium">
                Chưa đăng nhập
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-grow">

        {/* STEP 1: ĐĂNG NHẬP GOOGLE VÀ CẤP QUYỀN GMAIL */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-slate-50/70 px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">1</span>
              <h2 className="font-semibold text-slate-800 text-sm">
                Đăng Nhập Tài Khoản Google & Cấp Quyền Gửi Gmail
              </h2>
            </div>
          </div>

          <div className="p-6">
            {!googleUser ? (
              /* KHI CHƯA ĐĂNG NHẬP */
              <div className="space-y-4">
                <div className="p-6 bg-gradient-to-r from-indigo-50/70 via-slate-50 to-indigo-50/40 border border-indigo-100 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-2 text-center md:text-left">
                 
                    <h3 className="text-base font-bold text-slate-800">
                      Đăng nhập để gửi email từ chính hộp thư Gmail của bạn
                    </h3>
                    <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                      Gửi địa chỉ email cho Quế Khoa để sài được nhé!!
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center shrink-0">
                    <button 
                      onClick={handleGoogleLogin}
                      className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 rounded-2xl text-xs font-bold shadow-sm hover:shadow transition flex items-center space-x-3 group"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      <span className="text-sm">Đăng nhập bằng tài khoản Google</span>
                    </button>
                  </div>
                </div>

                
              </div>
            ) : (
              /* KHI ĐÃ ĐĂNG NHẬP THÀNH CÔNG */
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center space-x-3.5">
                    {googleUser.picture ? (
                      <img src={googleUser.picture} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-emerald-400 shadow-xs" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
                        {googleUser.name?.charAt(0) || 'G'}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-emerald-950">{googleUser.name}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-800">
                          ✓ ĐÃ ĐĂNG NHẬP & SẴN SÀNG GỬI
                        </span>
                      </div>
                      <div className="text-xs font-mono text-emerald-900 font-bold mt-1 flex items-center space-x-1.5">
                        <span>Hộp thư gửi đi:</span>
                        <span className="bg-white px-2.5 py-0.5 rounded-md border border-emerald-300 text-emerald-700 font-bold">
                          {googleUser.email}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5">
                    <button 
                      onClick={handleGoogleLogout}
                      className="px-3 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold shadow-2xs transition flex items-center space-x-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Đổi tài khoản</span>
                    </button>
                  </div>
                </div>

     
                {/* Tên hiển thị người gửi & Khoảng nghỉ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Tên hiển thị người gửi (From Name)
                    </label>
                    <input 
                      type="text"
                      placeholder="Ví dụ: Phòng Đào Tạo & Quản Lý"
                      value={senderDisplayName}
                      onChange={(e) => setSenderDisplayName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Khoảng nghỉ giữa mỗi Email (Tránh gửi dồn dập)
                    </label>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="number"
                        min="0.5"
                        max="10"
                        step="0.5"
                        value={delaySec}
                        onChange={(e) => setDelaySec(parseFloat(e.target.value) || 1.5)}
                        className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-center font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                      />
                      <span className="text-xs text-slate-600">giây / email (Khuyên dùng: 1.5s)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* STEP 2: DÁN DỮ LIỆU TỪ EXCEL */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-slate-50/70 px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">2</span>
              <h2 className="font-semibold text-slate-800 text-sm">
                Dán Dữ Liệu Từ Excel (Họ và tên, email, Số điện thoại, mssv...)
              </h2>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="bg-slate-200/80 p-0.5 rounded-lg flex text-xs font-medium">
                <button 
                  onClick={() => setInputMode('paste')}
                  className={`px-3 py-1.5 rounded-md transition flex items-center space-x-1.5 ${inputMode === 'paste' ? 'bg-white shadow-xs text-indigo-700 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Dán trực tiếp từ Excel (Ctrl+V)</span>
                </button>
                <button 
                  onClick={() => setInputMode('upload')}
                  className={`px-3 py-1.5 rounded-md transition flex items-center space-x-1.5 ${inputMode === 'upload' ? 'bg-white shadow-xs text-indigo-700 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Tải file Excel (.xlsx, .xls)</span>
                </button>
              </div>

              <button 
                onClick={loadDefaultUserSample}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-700 font-semibold transition flex items-center space-x-1"
                title="Tải lại dữ liệu mẫu Huỳnh A, MSSV: 213..."
              >
                <RotateCcw className="w-3 h-3" />
                <span>Nạp mẫu Huỳnh A (213)</span>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {inputMode === 'paste' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                    <ClipboardPaste className="w-4 h-4 text-indigo-600" />
                    <span>Dán (Ctrl + V) bảng sao chép từ Excel vào khung dưới đây:</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    💡 Tự động nhận diện bảng Office HTML (mso-...), phím Tab (\t), CSV
                  </span>
                </div>

                <div className="relative">
                  <textarea 
                    rows={5}
                    placeholder="Bôi đen các ô trong Excel > Nhấn Ctrl + C > Bấm vào ô này và nhấn Ctrl + V để dán (hoặc tự do gõ / gắn thêm văn bản vào đây)..."
                    value={rawPastedText}
                    onChange={(e) => {
                      setRawPastedText(e.target.value);
                      if (showPreview) setShowPreview(false);
                    }}
                    className="w-full p-4 bg-slate-50 border-2 border-dashed border-indigo-200 hover:border-indigo-400 focus:border-indigo-600 focus:bg-white rounded-2xl text-xs font-mono focus:ring-0 focus:outline-none transition leading-relaxed"
                  />
                  
                  {rawPastedText && (
                    <button 
                      onClick={() => { 
                        setRawPastedText(''); 
                        setRecords([]); 
                        setHeaders([]); 
                        setShowPreview(false); 
                      }}
                      className="absolute top-3 right-3 text-xs text-slate-400 hover:text-rose-600 font-medium px-2 py-1 bg-white border border-slate-200 rounded-lg shadow-2xs"
                    >
                      Xóa nội dung
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button 
                    onClick={handleManualParsePastedText}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center space-x-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Nhận diện & Cập nhật bảng dữ liệu</span>
                  </button>

                
                </div>

                {!showPreview && rawPastedText.trim() && (
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Nội dung đã được đưa vào khung. Hãy bấm nút <strong>"Nhận diện & Cập nhật bảng dữ liệu"</strong> để hiển thị bảng preview!</span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/60 hover:bg-indigo-50/20 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition group">
                  <FileSpreadsheet className="w-10 h-10 text-emerald-600 group-hover:scale-105 transition" />
                  <span className="text-xs font-semibold text-slate-700 mt-2">
                    Bấm để chọn file Excel hoặc kéo thả vào đây
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    Hỗ trợ: .xlsx, .xls, .csv
                  </span>
                  <input 
                    type="file" 
                    accept=".xlsx,.xls,.csv,.html,.htm" 
                    onChange={handleFileUpload}
                    className="hidden" 
                  />
                </label>
              </div>
            )}

            {/* Bảng kết quả sau khi nạp / dán - Chỉ hiển thị khi showPreview = true */}
            {showPreview && records.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200">
                  <div className="flex items-center space-x-3 text-xs text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Đang nạp: <strong>{dataSourceName}</strong></span>
                    <span className="px-2.5 py-0.5 rounded-full font-bold bg-white text-emerald-800 border border-emerald-300">
                      {records.length} sinh viên / hàng
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-xs">
                    <span className="font-semibold text-slate-700">Cột chứa Email gửi đến:</span>
                    <select 
                      value={emailCol} 
                      onChange={(e) => setEmailCol(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-indigo-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-48 border border-slate-200 rounded-xl bg-white shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px]">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">#</th>
                        {headers.map(h => (
                          <th key={h} className="py-2 px-3 whitespace-nowrap">
                            {h} {h === emailCol && <span className="text-emerald-600 font-bold">(Email nhận)</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {records.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-center text-slate-400 font-sans">{idx + 1}</td>
                          {headers.map(h => (
                            <td key={h} className="py-2 px-3 whitespace-nowrap text-slate-700">
                              {String(row[h] || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* STEP 3: NHẬP MẪU THƯ GỬI */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-slate-50/70 px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">3</span>
              <h2 className="font-semibold text-slate-800 text-sm">Nhập Mẫu Thư Gửi & Tùy Biến Nội Dung</h2>
            </div>

            <div className="flex items-center space-x-2">
              <button 
                onClick={handleSaveCurrentTemplate}
                className="text-xs px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-semibold transition flex items-center space-x-1.5 shadow-2xs"
              >
                <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
                <span>Lưu mẫu thư này</span>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <span className="text-xs font-semibold text-slate-700 block mb-2">
                Chọn mẫu thư gửi có sẵn:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {EMAIL_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl.id)}
                    className={`p-3 rounded-xl border text-left text-xs transition ${
                      selectedTemplateId === tmpl.id 
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-semibold shadow-2xs' 
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <Sparkles className={`w-3.5 h-3.5 ${selectedTemplateId === tmpl.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span>{tmpl.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Các biến động chèn nhanh */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700">
                  Bấm vào thẻ biến để chèn vào vị trí con trỏ (trong Tiêu đề hoặc Nội dung):
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Định dạng: &#123;Tên_Cột&#125;
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {headers.map(h => (
                  <button 
                    key={h}
                    type="button"
                    onClick={() => insertVariable(h)}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 hover:border-transparent transition shadow-2xs"
                  >
                    <Plus className="w-3 h-3 mr-1 opacity-70" />
                    &#123;{h}&#125;
                  </button>
                ))}
              </div>
            </div>

            {/* Layout 2 cột: Soạn Thảo & Live Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Tiêu đề thư gửi (Subject)
                  </label>
                  <input 
                    ref={subjectRef}
                    type="text"
                    value={subject}
                    onFocus={() => { lastFocusedInputRef.current = 'subject'; }}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ví dụ: Thông báo gửi {Họ và tên} (MSSV: {mssv})"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                      <span>Nội dung thư gửi (Định dạng Word)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                        WYSIWYG
                      </span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      💡 Có thể sao chép &amp; dán trực tiếp từ Word, Google Docs
                    </span>
                  </div>

                  {/* Thanh công cụ định dạng Word */}
                  <div className="bg-slate-100/90 border border-slate-200 border-b-0 rounded-t-xl p-2 flex flex-wrap items-center gap-1 text-xs select-none shadow-2xs">
                    {/* Nhóm 1: Kiểu đoạn & Cỡ chữ */}
                    <div className="flex items-center space-x-1 pr-1.5 border-r border-slate-300">
                      <select
                        onChange={(e) => applyHeading(e.target.value)}
                        defaultValue="<p>"
                        title="Định dạng đoạn văn"
                        className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700 hover:border-slate-400 focus:outline-none"
                      >
                        <option value="<p>">Đoạn văn</option>
                        <option value="<h1>">Tiêu đề 1 (Lớn)</option>
                        <option value="<h2>">Tiêu đề 2 (Vừa)</option>
                        <option value="<h3>">Tiêu đề 3 (Nhỏ)</option>
                      </select>

                      <select
                        onChange={(e) => applyFontSize(e.target.value)}
                        defaultValue="14px"
                        title="Cỡ chữ"
                        className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700 hover:border-slate-400 focus:outline-none"
                      >
                        <option value="12px">12px (Nhỏ)</option>
                        <option value="14px">14px (Chuẩn)</option>
                        <option value="16px">16px (Vừa)</option>
                        <option value="18px">18px (Lớn)</option>
                        <option value="20px">20px (To)</option>
                        <option value="24px">24px (Rất to)</option>
                      </select>
                    </div>

                    {/* Nhóm 2: In đậm, nghiêng, gạch chân, gạch ngang */}
                    <div className="flex items-center space-x-0.5 px-1.5 border-r border-slate-300">
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }}
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-700 font-bold hover:text-slate-900 transition"
                        title="In đậm (Ctrl+B)"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }}
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-700 italic hover:text-slate-900 transition"
                        title="In nghiêng (Ctrl+I)"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCmd('underline'); }}
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-700 underline hover:text-slate-900 transition"
                        title="Gạch chân (Ctrl+U)"
                      >
                        <Underline className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCmd('strikeThrough'); }}
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-700 line-through hover:text-slate-900 transition"
                        title="Gạch ngang chữ"
                      >
                        <Strikethrough className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Nhóm 3: Màu chữ & Màu nền chữ */}
                    <div className="flex items-center space-x-1 px-1.5 border-r border-slate-300 relative">
                      {/* Màu chữ */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowColorPicker(!showColorPicker)}
                          className="p-1.5 hover:bg-slate-200 rounded text-slate-700 flex items-center space-x-0.5 transition"
                          title="Màu chữ"
                        >
                          <Palette className="w-3.5 h-3.5" style={{ color: textColor !== '#000000' ? textColor : undefined }} />
                        </button>

                        {showColorPicker && (
                          <div className="absolute top-full left-0 mt-1 bg-white p-2.5 rounded-xl shadow-xl border border-slate-200 z-50 flex flex-col space-y-1.5 min-w-[150px]">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Màu chữ</span>
                            <div className="grid grid-cols-4 gap-1.5">
                              {['#000000', '#475569', '#dc2626', '#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#0891b2'].map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onMouseDown={(e) => { e.preventDefault(); applyTextColor(c); }}
                                  className="w-5 h-5 rounded-full border border-slate-300 hover:scale-110 transition shadow-2xs"
                                  style={{ backgroundColor: c }}
                                  title={c}
                                />
                              ))}
                            </div>
                            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                              <span className="text-slate-600">Tùy chọn:</span>
                              <input
                                type="color"
                                value={textColor}
                                onChange={(e) => applyTextColor(e.target.value)}
                                className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Màu nền / Highlight */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                          className="p-1.5 hover:bg-slate-200 rounded text-slate-700 flex items-center space-x-0.5 transition"
                          title="Màu nền chữ (Highlight)"
                        >
                          <Highlighter className="w-3.5 h-3.5" />
                        </button>

                        {showHighlightPicker && (
                          <div className="absolute top-full left-0 mt-1 bg-white p-2.5 rounded-xl shadow-xl border border-slate-200 z-50 flex flex-col space-y-1.5 min-w-[150px]">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Màu đánh dấu</span>
                            <div className="grid grid-cols-3 gap-1.5">
                              {[
                                { color: 'transparent', label: 'Không' },
                                { color: '#fef08a', label: 'Vàng' },
                                { color: '#bbf7d0', label: 'Xanh lá' },
                                { color: '#bfdbfe', label: 'Xanh lam' },
                                { color: '#fbcfe8', label: 'Hồng' },
                                { color: '#fed7aa', label: 'Cam' },
                              ].map(({ color, label }) => (
                                <button
                                  key={color}
                                  type="button"
                                  onMouseDown={(e) => { e.preventDefault(); applyHighlightColor(color); }}
                                  className="px-1.5 py-1 text-[10px] rounded border border-slate-300 hover:scale-105 transition text-center"
                                  style={{ backgroundColor: color === 'transparent' ? '#ffffff' : color }}
                                  title={label}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Nhóm 4: Căn lề */}
                    <div className="flex items-center space-x-0.5 px-1.5 border-r border-slate-300">
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCmd('justifyLeft'); }}
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition"
                        title="Căn trái"
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCmd('justifyCenter'); }}
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition"
                        title="Căn giữa"
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCmd('justifyRight'); }}
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition"
                        title="Căn phải"
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCmd('justifyFull'); }}
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition"
                        title="Căn đều hai bên"
                      >
                        <AlignJustify className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Nhóm 5: Thụt dòng & Khoảng cách dòng */}
                    <div className="flex items-center space-x-1 px-1.5 border-r border-slate-300">
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCmd('outdent'); }}
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition"
                        title="Giảm thụt lề"
                      >
                        <Outdent className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCmd('indent'); }}
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition"
                        title="Tăng thụt lề (Thụt dòng)"
                      >
                        <Indent className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center space-x-1">
                        <span className="text-[11px] text-slate-500 font-medium">Giãn dòng:</span>
                        <select
                          value={lineSpacing}
                          onChange={(e) => setLineSpacing(e.target.value)}
                          title="Khoảng cách dòng (Line Height)"
                          className="px-1.5 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700 hover:border-slate-400 focus:outline-none"
                        >
                          <option value="1.2">1.2 (Sát)</option>
                          <option value="1.4">1.4 (Gọn)</option>
                          <option value="1.6">1.6 (Chuẩn Word)</option>
                          <option value="1.8">1.8 (Thoáng)</option>
                          <option value="2.0">2.0 (Giãn đôi)</option>
                        </select>
                      </div>
                    </div>

                    {/* Nhóm 6: Danh sách & Liên kết */}
                    <div className="flex items-center space-x-0.5 px-1.5 border-r border-slate-300">
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCmd('insertUnorderedList'); }}
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition"
                        title="Danh sách gạch đầu dòng"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCmd('insertOrderedList'); }}
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition"
                        title="Danh sách đánh số"
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleInsertLink(); }}
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition"
                        title="Chèn liên kết"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleInsertHr(); }}
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition"
                        title="Chèn đường kẻ ngang"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); execCmd('removeFormat'); }}
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-700 transition"
                        title="Xóa định dạng"
                      >
                        <RemoveFormatting className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Nhóm 7: Chế độ xem Mã HTML / Word */}
                    <div className="ml-auto flex items-center">
                      <button
                        type="button"
                        onClick={() => setIsHtmlSourceMode(!isHtmlSourceMode)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1.5 transition ${
                          isHtmlSourceMode 
                            ? 'bg-indigo-600 text-white shadow-2xs' 
                            : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                        }`}
                        title="Chuyển chế độ xem mã HTML hoặc soạn thảo Word"
                      >
                        <Code className="w-3.5 h-3.5" />
                        <span>{isHtmlSourceMode ? 'Đang xem HTML' : 'Mã HTML'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Vùng soạn thảo văn bản */}
                  {!isHtmlSourceMode ? (
                    <div
                      ref={editorRef}
                      contentEditable={true}
                      onFocus={() => { lastFocusedInputRef.current = 'body'; }}
                      onBlur={saveSelection}
                      onKeyUp={saveSelection}
                      onMouseUp={saveSelection}
                      onInput={(e) => setBody(e.currentTarget.innerHTML)}
                      style={{ lineHeight: lineSpacing, minHeight: '260px' }}
                      className="w-full p-4 bg-white border border-slate-200 rounded-b-xl text-slate-800 text-sm rich-editor-content focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition leading-relaxed overflow-y-auto max-h-[380px] shadow-inner"
                      placeholder="Nhập nội dung mẫu thư tại đây (có thể sao chép &amp; dán trực tiếp từ Word hoặc Google Docs)..."
                    />
                  ) : (
                    <textarea
                      ref={rawHtmlTextareaRef}
                      rows={12}
                      value={body}
                      onFocus={() => { lastFocusedInputRef.current = 'body'; }}
                      onChange={(e) => setBody(e.target.value)}
                      style={{ lineHeight: lineSpacing }}
                      className="w-full p-4 bg-slate-900 text-emerald-400 font-mono text-xs border border-slate-700 rounded-b-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition leading-relaxed overflow-y-auto max-h-[380px]"
                      placeholder="Nhập mã HTML..."
                    />
                  )}
                </div>
              </div>

              {/* Xem trước thực tế */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                    <Eye className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Xem trước email thực tế sẽ gửi:</span>
                  </span>

                  {records.length > 0 && (
                    <div className="flex items-center space-x-1.5 text-xs">
                      <span className="text-slate-500">Xem dòng:</span>
                      <select 
                        value={previewRowIdx}
                        onChange={(e) => setPreviewRowIdx(parseInt(e.target.value, 10))}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-bold text-slate-700"
                      >
                        {records.map((r, i) => (
                          <option key={i} value={i}>
                            #{i + 1} - {r['Họ và tên'] || r[headers[0]] || 'Sinh viên'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs flex-grow flex flex-col space-y-3 text-xs">
                  <div className="pb-3 border-b border-slate-100 space-y-1.5 text-slate-600">
                    <div>
                      <strong>Người gửi:</strong> {senderDisplayName} &lt;{googleUser?.email || 'email-cua-ban@gmail.com'}&gt;
                    </div>
                    <div><strong>Gửi đến:</strong> <span className="text-indigo-600 font-mono font-bold">{records[previewRowIdx]?.[emailCol] || '(Chưa có email)'}</span></div>
                    <div><strong>Tiêu đề:</strong> <span className="text-slate-900 font-bold">{compileTemplate(subject, records[previewRowIdx] || {})}</span></div>
                  </div>

                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Nội dung hiển thị (Live Preview):</span>
                    <span className="text-[11px] text-indigo-600 font-mono font-semibold">Giãn dòng: {lineSpacing}</span>
                  </div>

                  <div 
                    className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-slate-800 text-sm leading-relaxed flex-grow min-h-[160px] overflow-auto email-preview-content shadow-inner"
                    style={{ lineHeight: lineSpacing }}
                    dangerouslySetInnerHTML={{ __html: compileTemplate(body, records[previewRowIdx] || {}, autoBr) }}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* STEP 4: TIẾN TRÌNH GỬI HÀNG LOẠT */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-slate-50/70 px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">4</span>
              <h2 className="font-semibold text-slate-800 text-sm">
                Tiến Trình Gửi Hàng Loạt & Báo Cáo Realtime
              </h2>
            </div>
            
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleStartSending}
                disabled={isSending && !isPaused}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-40 text-white font-semibold rounded-xl text-xs shadow-xs transition flex items-center space-x-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isPaused ? 'TIẾP TỤC GỬI' : 'BẮT ĐẦU GỬI'}</span>
              </button>

              <button 
                onClick={handleTogglePause}
                disabled={!isSending}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-semibold rounded-xl text-xs transition flex items-center space-x-1.5"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>{isPaused ? 'Tiếp tục' : 'Tạm dừng'}</span>
              </button>

              <button 
                onClick={handleStop}
                disabled={!isSending}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-semibold rounded-xl text-xs transition flex items-center space-x-1.5"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Dừng hẳn</span>
              </button>

              <button 
                onClick={handleExportExcel}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Excel</span>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
                <span>
                  {isSending 
                    ? (isPaused ? 'Đang tạm dừng gửi...' : `Đang tiến hành gửi email qua Gmail... (${processedCount}/${totalCount})`) 
                    : (processedCount === totalCount && totalCount > 0 ? 'Đã hoàn tất gửi danh sách!' : 'Sẵn sàng gửi')}
                </span>
                <span className="font-mono text-indigo-700 font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden shadow-inner">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <span className="text-[11px] text-slate-500 block mb-0.5">Tổng số</span>
                <span className="text-lg font-bold text-slate-800">{totalCount}</span>
              </div>
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 text-center">
                <span className="text-[11px] text-indigo-600 block mb-0.5">Đã xử lý</span>
                <span className="text-lg font-bold text-indigo-700">{processedCount}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                <span className="text-[11px] text-emerald-600 block mb-0.5">Thành công</span>
                <span className="text-lg font-bold text-emerald-700">{successCount}</span>
              </div>
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-center">
                <span className="text-[11px] text-rose-600 block mb-0.5">Thất bại</span>
                <span className="text-lg font-bold text-rose-700">{failedCount}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">
                Nhật ký chi tiết từng email:
              </span>
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="overflow-y-auto max-h-64">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px]">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">#</th>
                        <th className="py-2 px-3">Họ và tên</th>
                        <th className="py-2 px-3">MSSV</th>
                        <th className="py-2 px-3">Email nhận</th>
                        <th className="py-2 px-3 w-28 text-center">Trạng thái</th>
                        <th className="py-2 px-3">Chi tiết / Thời gian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {sendLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-6 text-slate-400 font-sans italic">
                            Chưa có dữ liệu gửi. Bấm "BẮT ĐẦU GỬI" để tiến hành.
                          </td>
                        </tr>
                      ) : (
                        [...sendLogs].reverse().map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-center text-slate-400 font-sans">{log.id}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800 font-sans">{log.name}</td>
                            <td className="py-2 px-3 text-slate-600">{log.mssv}</td>
                            <td className="py-2 px-3 text-indigo-600 font-medium">{log.email}</td>
                            <td className="py-2 px-3 text-center font-sans">
                              {log.status === 'success' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  ✓ Thành công
                                </span>
                              )}
                              {log.status === 'failed' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                  ✕ Thất bại
                                </span>
                              )}
                              {log.status === 'sending' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 animate-pulse">
                                  Đang gửi...
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-500 font-sans text-[11px]">
                              {log.time} - <span className={log.status === 'failed' ? 'text-rose-600 font-semibold' : 'text-slate-500'}>{log.error}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* Modal: Hướng dẫn cấu hình Google Cloud */}
      {showGoogleGuideModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                <span>3 Bước Cấu Hình Google Cloud Để Gửi Thư Thành Công</span>
              </h3>
              <button 
                onClick={() => setShowGoogleGuideModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-emerald-900">
                <strong>1. Bật dịch vụ Gmail API:</strong>
                <p>Vào trang quản lý Gmail API trên Google Cloud và bấm nút <strong>ENABLE (ACTIVER)</strong> để dự án được phép gửi mail qua Gmail REST API.</p>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1 text-indigo-900">
                <strong>2. Thêm Test Users (Nếu dự án ở chế độ Testing):</strong>
                <p>Vào mục <strong>Audience</strong> &gt; kéo xuống tìm <strong>Test users (Utilisateurs test)</strong> &gt; Bấm <strong>+ ADD USERS</strong> và nhập email của bạn.</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-slate-800">
                <strong>3. Cấu hình JavaScript origins:</strong>
                <p>Trong mục Credentials &gt; Web Client ID &gt; Đảm bảo đã có <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-indigo-700">http://localhost:3000</code> trong danh sách <strong>Authorized JavaScript origins</strong>.</p>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setShowGoogleGuideModal(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
