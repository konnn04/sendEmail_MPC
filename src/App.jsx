import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Lock, AlertCircle, Play } from 'lucide-react';

// Constants & Utilities
import { EMAIL_TEMPLATES, DEFAULT_SAMPLE_DATA } from './constants/templates';
import { compileTemplate, cleanTemplateText } from './utils/templateCompiler';
import { parseClipboardData, parseExcelData } from './utils/excelParser';

// Services (Google OAuth, Gmail REST API & Google Sheets)
import { 
  createBase64UrlEmail, 
  verifyGoogleTokenScopes, 
  fetchGoogleUserProfile, 
  sendGmailMessage,
  fetchGoogleSheetFromUrl
} from './services/googleApi';

// Components
import Header from './components/Header';
import DataInputCard from './components/DataInputCard';
import TemplateEditorCard from './components/TemplateEditorCard';
import SendingProcessCard from './components/SendingProcessCard';
import Toast from './components/Toast';

// Key lưu trữ bản nháp trong localStorage
const DRAFT_KEY = 'bulk_email_draft_v2';

const getInitialDraft = () => {
  try {
    const item = localStorage.getItem(DRAFT_KEY);
    return item ? JSON.parse(item) : null;
  } catch (_) {
    return null;
  }
};

const initialDraft = getInitialDraft();

// Nhận Client ID từ môi trường build
const ENV_GOOGLE_CLIENT_ID = import.meta.env?.VITE_GOOGLE_CLIENT_ID;

export default function App() {
  // --- THEME (DARK / LIGHT MODE) ---
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('app_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches || false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('app_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('app_theme', 'light');
    }
  }, [isDark]);

  const handleToggleTheme = () => {
    setIsDark(prev => !prev);
  };

  // --- STATE 1: GOOGLE API & AUTH ---
  const [googleClientId, setGoogleClientId] = useState(() => {
    return localStorage.getItem('custom_google_client_id') || ENV_GOOGLE_CLIENT_ID || '';
  });
  const [googleAccessToken, setGoogleAccessToken] = useState('');
  const [googleUser, setGoogleUser] = useState(null); // { name, email, picture }
  const [hasSendScope, setHasSendScope] = useState(false);
  const [scopeChecking, setScopeChecking] = useState(false);
  const [senderDisplayName, setSenderDisplayName] = useState(
    () => initialDraft?.senderDisplayName || 'Phòng Đào Tạo & Quản Lý'
  );

  // --- STATE 2: DỮ LIỆU ĐẦU VÀO (EXCEL / GOOGLE SHEETS) ---
  const [inputMode, setInputMode] = useState(() => initialDraft?.inputMode || 'paste'); // 'paste' | 'upload' | 'drive'
  const [rawPastedText, setRawPastedText] = useState(() => initialDraft?.rawPastedText || '');
  const [records, setRecords] = useState(() => initialDraft?.records || []);
  const [headers, setHeaders] = useState(() => initialDraft?.headers || []);
  const [emailCol, setEmailCol] = useState(() => initialDraft?.emailCol || '');
  const [dataSourceName, setDataSourceName] = useState(() => initialDraft?.dataSourceName || '');
  const [showPreview, setShowPreview] = useState(() => initialDraft?.showPreview || false);
  const [driveLoading, setDriveLoading] = useState(false);

  // --- STATE 3: MẪU THƯ, CC, BCC & FONT ---
  const [selectedTemplateId, setSelectedTemplateId] = useState(() => initialDraft?.selectedTemplateId || 'student_info');
  const [subject, setSubject] = useState(() => initialDraft?.subject !== undefined ? initialDraft.subject : EMAIL_TEMPLATES[0].subject);
  const [body, setBody] = useState(() => {
    if (initialDraft?.body !== undefined) {
      return cleanTemplateText(initialDraft.body);
    }
    return EMAIL_TEMPLATES[0].body;
  });
  const [cc, setCc] = useState(() => initialDraft?.cc || '');
  const [bcc, setBcc] = useState(() => initialDraft?.bcc || '');
  const [showCc, setShowCc] = useState(() => initialDraft?.showCc || false);
  const [showBcc, setShowBcc] = useState(() => initialDraft?.showBcc || false);
  const [fontFamily, setFontFamily] = useState(() => initialDraft?.fontFamily || "'Times New Roman', Times, serif");

  // --- STATE 4: CÀI ĐẶT THỜI GIAN & HẸN GIỜ (SCHEDULED SENDING) ---
  const [delaySec, setDelaySec] = useState(() => initialDraft?.delaySec || 1.5);
  const [useRandomDelay, setUseRandomDelay] = useState(() => initialDraft?.useRandomDelay || false);
  const [randomDelayRange, setRandomDelayRange] = useState(() => initialDraft?.randomDelayRange || { min: 1.5, max: 3.5 });
  const [batchPauseEnabled, setBatchPauseEnabled] = useState(() => initialDraft?.batchPauseEnabled || false);
  const [batchSize, setBatchSize] = useState(() => initialDraft?.batchSize || 20);
  const [batchPauseSec, setBatchPauseSec] = useState(() => initialDraft?.batchPauseSec || 30);

  const [scheduleEnabled, setScheduleEnabled] = useState(() => initialDraft?.scheduleEnabled || false);
  const [scheduledDateTime, setScheduledDateTime] = useState(() => initialDraft?.scheduledDateTime || '');
  const [isScheduleWaiting, setIsScheduleWaiting] = useState(false);
  const [countdownText, setCountdownText] = useState('');

  // --- STATE 5: TIẾN TRÌNH GỬI THƯ ---
  const [isSending, setIsSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sendLogs, setSendLogs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // --- UI STATE (LƯU TẠM & TOAST) ---
  const [lastSavedTime, setLastSavedTime] = useState('');
  const [toast, setToast] = useState(null);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailColValid = Boolean(
    emailCol &&
    records.length > 0 &&
    records.some(r => emailRegex.test(String(r[emailCol] || '').trim()))
  );
  const hasValidEmailColumn = isEmailColValid;


  const isPausedRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const subjectRef = useRef(null);
  const lastFocusedInputRef = useRef('body');

  const showToastMsg = (text, type = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  };

  // --- TỰ ĐỘNG LƯU BẢN NHÁP (LOCALSTORAGE AUTO-SAVE) ---
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stateToSave = {
          rawPastedText, records, headers, dataSourceName, showPreview, inputMode,
          emailCol, subject, body, cc, bcc, showCc, showBcc, fontFamily, selectedTemplateId,
          delaySec, useRandomDelay, randomDelayRange, batchPauseEnabled, batchSize, batchPauseSec,
          scheduleEnabled, scheduledDateTime, senderDisplayName
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(stateToSave));
        setLastSavedTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
      } catch (e) {
        console.warn('Lỗi lưu tạm:', e);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [
    rawPastedText, records, headers, dataSourceName, showPreview, inputMode,
    emailCol, subject, body, cc, bcc, showCc, showBcc, fontFamily, selectedTemplateId,
    delaySec, useRandomDelay, randomDelayRange, batchPauseEnabled, batchSize, batchPauseSec,
    scheduleEnabled, scheduledDateTime, senderDisplayName
  ]);

  const handleClearDraft = () => {
    if (window.confirm('Bạn có chắc muốn xóa bản lưu tạm và đặt lại toàn bộ dữ liệu về mặc định?')) {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch (_) {}
      setRawPastedText('');
      setRecords([]);
      setHeaders([]);
      setEmailCol('');
      setDataSourceName('');
      setShowPreview(false);
      setInputMode('paste');
      setSubject(EMAIL_TEMPLATES[0].subject);
      setBody(EMAIL_TEMPLATES[0].body);
      setCc('');
      setBcc('');
      setShowCc(false);
      setShowBcc(false);
      setFontFamily("'Times New Roman', Times, serif");
      setSelectedTemplateId('student_info');
      setLastSavedTime('');
      showToastMsg('Đã xóa toàn bộ bản lưu tạm!', 'info');
    }
  };

  // --- KHỞI TẠO & KHÔI PHỤC PHIÊN ĐĂNG NHẬP GOOGLE ---
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.googleClientId && !localStorage.getItem('custom_google_client_id')) {
          setGoogleClientId(data.googleClientId);
        }
      })
      .catch(() => {});

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
      if (savedName && !initialDraft?.senderDisplayName) {
        setSenderDisplayName(savedName);
      }

      const savedSendScope = localStorage.getItem('google_has_send_scope');
      setHasSendScope(savedSendScope !== 'false');

      setScopeChecking(true);
      verifyGoogleTokenScopes(savedToken)
        .then(result => {
          if (result && result.valid) {
            setHasSendScope(result.canSend);
          }
        })
        .finally(() => setScopeChecking(false));
    }
  }, []);

  // --- ĐẾM NGƯỢC HẸN GIỜ GỬI TỰ ĐỘNG ---
  useEffect(() => {
    if (!isScheduleWaiting || !scheduledDateTime) return;

    const targetTime = new Date(scheduledDateTime).getTime();
    if (isNaN(targetTime)) return;

    const checkTimer = () => {
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setIsScheduleWaiting(false);
        setCountdownText('00:00:00');
        showToastMsg('⏰ Đã đến giờ hẹn! Hệ thống bắt đầu tự động gửi email hàng loạt...', 'success');
        handleStartSending();
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        const pad = (n) => String(n).padStart(2, '0');
        setCountdownText(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      }
    };

    checkTimer();
    const interval = setInterval(checkTimer, 1000);
    return () => clearInterval(interval);
  }, [isScheduleWaiting, scheduledDateTime]);

  const handleActivateSchedule = () => {
    if (!scheduledDateTime) {
      showToastMsg('Vui lòng chọn ngày và giờ hẹn gửi!', 'warning');
      return;
    }
    const target = new Date(scheduledDateTime).getTime();
    if (isNaN(target) || target <= Date.now()) {
      showToastMsg('Thời điểm hẹn gửi phải lớn hơn thời gian hiện tại!', 'warning');
      return;
    }
    if (records.length === 0) {
      showToastMsg('Vui lòng nạp dữ liệu ở Bước 1 trước khi lên lịch hẹn!', 'warning');
      return;
    }
    setIsScheduleWaiting(true);
    showToastMsg(`✓ Đã kích hoạt lịch hẹn! Sẽ tự động gửi lúc ${new Date(scheduledDateTime).toLocaleString('vi-VN')}`, 'success');
  };

  const handleCancelSchedule = () => {
    setIsScheduleWaiting(false);
    setCountdownText('');
    showToastMsg('Đã hủy lịch hẹn gửi thư.', 'info');
  };

  // --- GOOGLE OAUTH 2.0 HANDLERS ---
  const handleGoogleLogin = () => {
    const cid = (googleClientId || '').trim();
    if (!cid) {
      showToastMsg('Chưa cấu hình Google Client ID trong file .env!', 'warning');
      return;
    }

    if (typeof window.google === 'undefined' || !window.google.accounts || !window.google.accounts.oauth2) {
      showToastMsg('Thư viện Google đang tải, vui lòng thử lại sau vài giây!', 'warning');
      return;
    }

    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: cid,
        scope: 'https://mail.google.com/ https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        callback: async (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            const token = tokenResponse.access_token;
            setGoogleAccessToken(token);
            localStorage.setItem('google_access_token', token);

            const profile = await fetchGoogleUserProfile(token);
            if (profile) {
              setGoogleUser(profile);
              if (profile.name && !senderDisplayName) setSenderDisplayName(profile.name);
              localStorage.setItem('google_user_email', profile.email || '');
              localStorage.setItem('google_user_name', profile.name || '');
              localStorage.setItem('google_user_picture', profile.picture || '');
            }

            setHasSendScope(true);
            localStorage.setItem('google_has_send_scope', 'true');
            showToastMsg(`✓ Đăng nhập Google & cấp quyền gửi thư thành công!`, 'success');
          } else if (tokenResponse && tokenResponse.error) {
            showToastMsg(`Lỗi cấp quyền: ${tokenResponse.error}`, 'error');
          }
        },
        error_callback: (err) => {
          console.error('Lỗi OAuth:', err);
          showToastMsg('Lỗi khi đăng nhập Google!', 'error');
        }
      });

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

  // --- DATA INPUT HANDLERS (EXCEL / GOOGLE SHEETS) ---
  const applyData = (parsedHeaders, parsedData, sourceLabel) => {
    setHeaders(parsedHeaders);
    setRecords(parsedData);
    setDataSourceName(sourceLabel);
    setShowPreview(true);
    setSendLogs([]);
    setCurrentIndex(0);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // 1. Tìm cột nào chứa ít nhất 1 email hợp lệ trong dữ liệu
    let detectedEmailCol = parsedHeaders.find(col => {
      return parsedData.some(row => emailRegex.test(String(row[col] || '').trim()));
    });

    // 2. Nếu chưa thấy bằng regex dữ liệu, thử tìm theo tên cột email
    if (!detectedEmailCol) {
      detectedEmailCol = parsedHeaders.find(h => /^(email|e-mail|mail|thu_dien_tu|hom_thu)$/i.test(h.trim()))
        || parsedHeaders.find(h => /email|mail|e-mail|thu_dien_tu|hom_thu/i.test(h));
    }

    // 3. Nếu vẫn chưa thấy, tìm cột có chứa ký tự '@'
    if (!detectedEmailCol) {
      detectedEmailCol = parsedHeaders.find(col => parsedData.some(row => String(row[col] || '').includes('@')));
    }

    // 4. Mặc định chọn cột đầu tiên nếu có dữ liệu để không bị để trống
    if (!detectedEmailCol && parsedHeaders.length > 0) {
      detectedEmailCol = parsedHeaders[0];
    }

    if (detectedEmailCol) {
      setEmailCol(detectedEmailCol);
      showToastMsg(`✓ Nhận diện thành công ${parsedData.length} dòng dữ liệu! Đã chọn cột Email: "${detectedEmailCol}"`, 'success');
    }
  };


  const handleApplyPastedData = async () => {
    if (!rawPastedText.trim()) {
      showToastMsg('Vui lòng dán văn bản từ Excel vào ô trước khi bấm Cập nhật!', 'warning');
      return;
    }

    try {
      const res = await parseClipboardData(rawPastedText);
      if (!res || !res.data || res.data.length === 0) {
        showToastMsg('Không nhận diện được bảng dữ liệu. Hãy kiểm tra định dạng dán từ Excel!', 'error');
        return;
      }
      applyData(res.headers, res.data, `Dữ liệu dán trực tiếp (${res.data.length} dòng)`);
    } catch (err) {
      console.error('Lỗi nhận diện bảng:', err);
      showToastMsg(err.message || 'Không nhận diện được bảng dữ liệu. Hãy kiểm tra định dạng dán từ Excel!', 'error');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await parseExcelData(file);
      if (!res || !res.data || res.data.length === 0) {
        showToastMsg('File Excel không có dữ liệu!', 'warning');
        return;
      }
      applyData(res.headers, res.data, `Tệp: ${file.name}`);
    } catch (err) {
      console.error('Lỗi đọc file Excel:', err);
      showToastMsg(`Lỗi đọc file: ${err.message}`, 'error');
    }
  };

  const handleLoadSampleData = () => {
    setHeaders(DEFAULT_SAMPLE_DATA.headers);
    setRecords(DEFAULT_SAMPLE_DATA.records);
    setEmailCol('email');
    setDataSourceName('Dữ liệu mẫu sinh viên (Huỳnh A, MSSV: 213...)');
    setRawPastedText(DEFAULT_SAMPLE_DATA.rawText);
    setShowPreview(true);
    showToastMsg('Đã nạp dữ liệu mẫu sinh viên!', 'info');
  };

  const handleResetData = () => {
    setRawPastedText('');
    setRecords([]);
    setHeaders([]);
    setShowPreview(false);
    showToastMsg('Đã xóa dữ liệu đầu vào.', 'info');
  };

  // --- GOOGLE SHEETS LINK IMPORT ---
  const handleImportGoogleSheetUrl = async (sheetUrl) => {
    if (!sheetUrl.trim()) {
      showToastMsg('Vui lòng nhập đường dẫn Google Sheets!', 'warning');
      return;
    }

    setDriveLoading(true);
    showToastMsg('Đang nạp dữ liệu từ Google Sheets...', 'info');
    try {
      const csvText = await fetchGoogleSheetFromUrl(sheetUrl, googleAccessToken);
      const res = await parseExcelData(csvText);
      if (!res || !res.data || res.data.length === 0) {
        showToastMsg('Google Sheet không có dữ liệu!', 'warning');
        return;
      }
      applyData(res.headers, res.data, `Google Sheet: ${sheetUrl.slice(0, 32)}...`);
      showToastMsg(`✓ Đã nạp thành công ${res.data.length} dòng từ Google Sheet!`, 'success');
    } catch (err) {
      console.error(err);
      showToastMsg(err.message || 'Lỗi nạp Google Sheet từ URL', 'error');
    } finally {
      setDriveLoading(false);
    }
  };

  const handleInsertVariable = (varName) => {
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
      document.execCommand('insertText', false, tag);
      setBody(prev => prev + tag);
    }
    showToastMsg(`Đã chèn biến ${tag}`, 'info');
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const handleStartSending = async () => {
    if (records.length === 0) {
      showToastMsg('Vui lòng nạp hoặc dán dữ liệu ở Bước 1 trước khi gửi!', 'warning');
      return;
    }

    if (!googleUser || !googleAccessToken) {
      showToastMsg('Vui lòng đăng nhập Google để cấp quyền gửi thư. Đang mở hộp thoại đăng nhập...', 'info');
      handleGoogleLogin();
      return;
    }

    if (!hasSendScope) {
      setHasSendScope(true);
    }

    if (!emailCol) {
      if (headers.length > 0) {
        setEmailCol(headers[0]);
      } else {
        showToastMsg('Vui lòng chọn cột Email người nhận ở Bước 1 trước khi gửi!', 'warning');
        return;
      }
    }

    if (!isEmailColValid) {
      showToastMsg(`❌ Lỗi: Cột "${emailCol}" không phải định dạng email hợp lệ! Vui lòng chọn lại cột email ở Bước 1.`, 'error');
      return;
    }

    if (!subject.trim() || !body.trim()) {
      showToastMsg('Vui lòng nhập tiêu đề và nội dung thư gửi!', 'warning');
      return;
    }

    if (isScheduleWaiting) {
      setIsScheduleWaiting(false);
    }

    setIsSending(true);
    setIsPaused(false);
    isPausedRef.current = false;
    stopRequestedRef.current = false;

    const startIdx = currentIndex >= records.length ? 0 : currentIndex;
    let successCount = 0;
    let failCount = 0;
    let fatalAuthError = false;

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
      const compiledHtml = compileTemplate(body, row, true);
      const compiledCc = compileTemplate(cc, row);
      const compiledBcc = compileTemplate(bcc, row);

      const logItem = {
        id: i + 1,
        email: toEmail,
        name: row['Họ và tên'] || row['Tên'] || row[headers[0]] || `Dòng ${i + 1}`,
        cc: compiledCc,
        bcc: compiledBcc,
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
        logItem.error = 'Email bị trống hoặc không đúng định dạng';
        failCount++;
      } else {
        try {
          const rawEmail = createBase64UrlEmail({
            to: toEmail,
            cc: compiledCc,
            bcc: compiledBcc,
            subject: compiledSub,
            html: compiledHtml,
            fromName: senderDisplayName || googleUser.name,
            fromEmail: googleUser.email,
            fontFamily
          });

          const gData = await sendGmailMessage({
            token: googleAccessToken,
            rawEmail,
            googleClientId
          });

          logItem.status = 'success';
          logItem.error = `Đã gửi thành công (Gmail ID: ${gData.id})`;
          successCount++;
        } catch (err) {
          logItem.status = 'failed';
          logItem.error = err.message || 'Lỗi gửi thư';
          failCount++;

          if (err.status === 401 || err.status === 403) {
            if (err.status === 403 && (err.message.includes('chưa tích chọn') || err.message.includes('Thiếu quyền'))) {
              setHasSendScope(false);
            }
            fatalAuthError = true;
            showToastMsg(err.message, 'error');
            setSendLogs(prev => {
              const copy = [...prev];
              const exIdx = copy.findIndex(l => l.id === logItem.id);
              if (exIdx >= 0) copy[exIdx] = { ...logItem };
              return copy;
            });
            break;
          }
        }
      }

      setSendLogs(prev => {
        const copy = [...prev];
        const exIdx = copy.findIndex(l => l.id === logItem.id);
        if (exIdx >= 0) copy[exIdx] = { ...logItem };
        return copy;
      });

      if (i < records.length - 1 && !stopRequestedRef.current) {
        if (batchPauseEnabled && (i + 1) % batchSize === 0) {
          showToastMsg(`Đã gửi đợt ${i + 1} email. Tạm nghỉ ${batchPauseSec}s trước khi gửi tiếp...`, 'info');
          await sleep(batchPauseSec * 1000);
        } else {
          let waitMs = delaySec * 1000;
          if (useRandomDelay) {
            const minMs = Math.max(500, randomDelayRange.min * 1000);
            const maxMs = Math.max(minMs, randomDelayRange.max * 1000);
            waitMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
          }
          await sleep(Math.max(300, waitMs));
        }
      }
    }

    setIsSending(false);
    setIsPaused(false);
    if (!stopRequestedRef.current && !fatalAuthError) {
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
      showToastMsg('Chưa có dữ liệu gửi nào để xuất file!', 'warning');
      return;
    }

    const exportRows = sendLogs.map(l => ({
      'STT': l.id,
      'Họ và tên': l.name,
      'Email người nhận': l.email,
      'CC': l.cc || '',
      'BCC': l.bcc || '',
      'MSSV': l.mssv,
      'Tiêu đề thư': l.subject,
      'Thời gian': l.time,
      'Trạng thái': l.status === 'success' ? 'Thành công' : 'Thất bại',
      'Chi tiết / Lỗi': l.error
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Báo Cáo Gửi Email');
    XLSX.writeFile(wb, `Bao_Cao_Gui_Email_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToastMsg('✓ Đã xuất file báo cáo Excel thành công!', 'success');
  };

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} flex flex-col font-sans transition-colors duration-200`}>
      <Header 
        googleUser={googleUser}
        hasSendScope={hasSendScope}
        onLogin={handleGoogleLogin}
        onLogout={handleGoogleLogout}
        lastSavedTime={lastSavedTime}
        onClearDraft={handleClearDraft}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
      />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!googleUser ? (
          <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-8 flex flex-col items-center justify-center">
             {/* Ảnh to lên và căn giữa hoàn toàn */}
             <div className="flex flex-col items-center justify-center space-y-4">
               <img
                 src="https://res.cloudinary.com/ds11ggie4/image/upload/v1791383134/Emo1_nmkeka.png"
                 alt="Logo"
                 className="w-40 h-40 object-contain shrink-0 animate-pulse"
               />
               <h1 className="font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-white tracking-wide">
                 GỬI EMAIL TỰ ĐỘNG
               </h1>
             </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Đăng Nhập Tài Khoản Google Để Bắt Đầu
              </h2>
              
            </div>

            {/* Nút Đăng Nhập Rực Lửa (Hiệu ứng lửa cháy Gradient Cam - Đỏ - Vàng rực rỡ) */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 w-full">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="relative px-8 py-4 bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 hover:from-red-500 hover:via-orange-400 hover:to-amber-400 text-white rounded-2xl text-sm sm:text-base font-extrabold shadow-lg shadow-orange-500/40 hover:shadow-orange-500/70 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center space-x-3 group border border-amber-300/40 overflow-hidden"
              >
                {/* Hiệu ứng tia sáng quét qua (Glow flare) */}
                <span className="absolute inset-0 w-full h-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                
                <svg className="w-6 h-6 shrink-0 relative z-10 filter drop-shadow" viewBox="0 0 24 24">
                  <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span className="relative z-10 tracking-wide drop-shadow-sm">🔥 ĐĂNG NHẬP GOOGLE NGAY 🔥</span>
              </button>
            </div>

          
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
            <div className="lg:col-span-7 space-y-6">
              <DataInputCard 
                inputMode={inputMode}
                setInputMode={setInputMode}
                rawPastedText={rawPastedText}
                setRawPastedText={setRawPastedText}
                records={records}
                headers={headers}
                emailCol={emailCol}
                setEmailCol={setEmailCol}
                dataSourceName={dataSourceName}
                showPreview={showPreview}
                onApplyPastedData={handleApplyPastedData}
                onFileUpload={handleFileUpload}
                onLoadSampleData={handleLoadSampleData}
                onResetData={handleResetData}
                onImportGoogleSheetUrl={handleImportGoogleSheetUrl}
                driveLoading={driveLoading}
                hasValidEmailColumn={hasValidEmailColumn}
              />

              <TemplateEditorCard 
                subject={subject}
                setSubject={setSubject}
                body={body}
                setBody={setBody}
                cc={cc}
                setCc={setCc}
                bcc={bcc}
                setBcc={setBcc}
                showCc={showCc}
                setShowCc={setShowCc}
                showBcc={showBcc}
                setShowBcc={setShowBcc}
                fontFamily={fontFamily}
                setFontFamily={setFontFamily}
                headers={headers}
                records={records}
                selectedTemplateId={selectedTemplateId}
                setSelectedTemplateId={setSelectedTemplateId}
                onInsertVariable={handleInsertVariable}
                lastFocusedInputRef={lastFocusedInputRef}
                subjectRef={subjectRef}
              />
            </div>

            <div className="lg:col-span-3 space-y-6 lg:sticky lg:top-20">
              <SendingProcessCard 
                isSending={isSending}
                isPaused={isPaused}
                currentIndex={currentIndex}
                recordsCount={records.length}
                sendLogs={sendLogs}
                onStartSending={handleStartSending}
                onTogglePause={handleTogglePause}
                onStop={handleStop}
                onExportExcel={handleExportExcel}
                hasSendScope={hasSendScope}
                googleUser={googleUser}
                senderDisplayName={senderDisplayName}
                setSenderDisplayName={setSenderDisplayName}
                scheduleEnabled={scheduleEnabled}
                setScheduleEnabled={setScheduleEnabled}
                scheduledDateTime={scheduledDateTime}
                setScheduledDateTime={setScheduledDateTime}
                isScheduleWaiting={isScheduleWaiting}
                countdownText={countdownText}
                onActivateSchedule={handleActivateSchedule}
                onCancelSchedule={handleCancelSchedule}
                delaySec={delaySec}
                setDelaySec={setDelaySec}
                useRandomDelay={useRandomDelay}
                setUseRandomDelay={setUseRandomDelay}
                randomDelayRange={randomDelayRange}
                setRandomDelayRange={setRandomDelayRange}
                batchPauseEnabled={batchPauseEnabled}
                setBatchPauseEnabled={setBatchPauseEnabled}
                batchSize={batchSize}
                setBatchSize={setBatchSize}
                batchPauseSec={batchPauseSec}
                setBatchPauseSec={setBatchPauseSec}
                emailCol={emailCol}
                hasValidEmailColumn={hasValidEmailColumn}
                isEmailColValid={isEmailColValid}
              />
            </div>
          </div>
        )}
      </main>


      <Toast 
        toast={toast}
        onClose={() => setToast(null)}
      />
    </div>
  );
}