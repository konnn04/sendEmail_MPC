import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';

// Constants & Utilities
import { EMAIL_TEMPLATES, DEFAULT_SAMPLE_DATA } from './constants/templates';
import { compileTemplate } from './utils/templateCompiler';
import { parseClipboardData, parseExcelData } from './utils/excelParser';

// Services (Google OAuth & Gmail REST API)
import { 
  createBase64UrlEmail, 
  verifyGoogleTokenScopes, 
  fetchGoogleUserProfile, 
  sendGmailMessage 
} from './services/googleApi';

// Components (Kiến trúc React Component hóa)
import Header from './components/Header';
import GoogleAuthCard from './components/GoogleAuthCard';
import DataInputCard from './components/DataInputCard';
import TemplateEditorCard from './components/TemplateEditorCard';
import SendingProcessCard from './components/SendingProcessCard';
import Toast from './components/Toast';

// Nhận Client ID từ môi trường build
const ENV_GOOGLE_CLIENT_ID = import.meta.env?.VITE_GOOGLE_CLIENT_ID;

export default function App() {
  const [googleClientId, setGoogleClientId] = useState(() => {
    return localStorage.getItem('custom_google_client_id') || ENV_GOOGLE_CLIENT_ID || '';
  });
  const [googleAccessToken, setGoogleAccessToken] = useState('');
  const [googleUser, setGoogleUser] = useState(null); // { name, email, picture }
  const [hasSendScope, setHasSendScope] = useState(false);
  const [scopeChecking, setScopeChecking] = useState(false);
  const [testingSend, setTestingSend] = useState(false);
  const [senderDisplayName, setSenderDisplayName] = useState('Phòng Đào Tạo & Quản Lý');

  const [inputMode, setInputMode] = useState('paste'); // 'paste' | 'upload'
  const [rawPastedText, setRawPastedText] = useState('');
  const [records, setRecords] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [emailCol, setEmailCol] = useState('');
  const [dataSourceName, setDataSourceName] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // --- STATE 3: MẪU THƯ, CC, BCC & FONT ---
  const [selectedTemplateId, setSelectedTemplateId] = useState('student_info');
  const [subject, setSubject] = useState(EMAIL_TEMPLATES[0].subject);
  const [body, setBody] = useState(EMAIL_TEMPLATES[0].body);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [fontFamily, setFontFamily] = useState("'Times New Roman', Times, serif");

  // --- STATE 4: CÀI ĐẶT THỜI GIAN & HẸN GIỜ (SCHEDULED SENDING) ---
  const [delaySec, setDelaySec] = useState(1.5);
  const [useRandomDelay, setUseRandomDelay] = useState(false);
  const [randomDelayRange, setRandomDelayRange] = useState({ min: 1.5, max: 3.5 });
  const [batchPauseEnabled, setBatchPauseEnabled] = useState(false);
  const [batchSize, setBatchSize] = useState(20);
  const [batchPauseSec, setBatchPauseSec] = useState(30);

  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [isScheduleWaiting, setIsScheduleWaiting] = useState(false);
  const [countdownText, setCountdownText] = useState('');

  // --- STATE 5: TIẾN TRÌNH GỬI THƯ ---
  const [isSending, setIsSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sendLogs, setSendLogs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // --- UI STATE (TOAST, REFS) ---
  const [toast, setToast] = useState(null);

  const isPausedRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const subjectRef = useRef(null);
  const lastFocusedInputRef = useRef('body');

  const showToastMsg = (text, type = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    // Tải cấu hình từ server nếu có
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
      if (savedName) setSenderDisplayName(savedName);

      setScopeChecking(true);
      verifyGoogleTokenScopes(savedToken)
        .then(result => {
          if (result.valid) {
            setHasSendScope(result.canSend);
          } else {
            console.warn('Phiên đăng nhập đã hết hạn.');
            handleGoogleLogout(false);
          }
        })
        .finally(() => setScopeChecking(false));
    }
  }, []);

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
        showToastMsg('Đã đến giờ hẹn! Hệ thống bắt đầu tự động gửi email hàng loạt...', 'success');
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
      showToastMsg('Vui lòng dán dữ liệu sinh viên/khách hàng ở Bước 2 trước khi lên lịch!', 'warning');
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
      showToastMsg('Chưa cấu hình Google Client ID! Vui lòng nhập ở Bước 1.', 'warning');
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

            // Lấy thông tin user
            const profile = await fetchGoogleUserProfile(token);
            if (profile) {
              setGoogleUser(profile);
              if (profile.name) setSenderDisplayName(profile.name);
              localStorage.setItem('google_user_email', profile.email || '');
              localStorage.setItem('google_user_name', profile.name || '');
              localStorage.setItem('google_user_picture', profile.picture || '');
            }

            // Kiểm tra scope đã được người dùng cấp
            setScopeChecking(true);
            const tokenInfo = await verifyGoogleTokenScopes(token);
            setScopeChecking(false);

            if (tokenInfo.canSend) {
              setHasSendScope(true);
              showToastMsg(`✓ Đã cấp đủ quyền gửi Gmail (gmail.send) thành công!`, 'success');
            } else {
              setHasSendScope(false);
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

  // --- GỬI EMAIL THỬ NGHIỆM ---
  const handleTestSend = async () => {
    if (!googleUser || !googleAccessToken) {
      showToastMsg('Vui lòng đăng nhập Google trước!', 'warning');
      return;
    }

    if (!hasSendScope) {
      showToastMsg('⚠️ Tài khoản chưa được tích chọn quyền gửi thư! Hãy bấm "Cấp lại quyền gửi Gmail" và tích chọn ô vuông cho phép.', 'error');
      return;
    }

    setTestingSend(true);
    try {
      const rawEmail = createBase64UrlEmail({
        to: googleUser.email,
        cc,
        bcc,
        subject: 'Thử nghiệm gửi email qua Gmail API (Thành công)',
        html: `<div style="font-family: ${fontFamily}; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 560px; margin: 0 auto; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #4f46e5; margin: 0; font-size: 20px;">✓ Kết nối Gmail API thành công!</h2>
          </div>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">Email này được gửi trực tiếp từ hộp thư Gmail của bạn (<strong>${googleUser.email}</strong>) thông qua Google OAuth 2.0 &amp; Gmail REST API.</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #475569;">
            <strong>Người gửi:</strong> ${senderDisplayName || googleUser.name} &lt;${googleUser.email}&gt;<br/>
            <strong>Người nhận:</strong> ${googleUser.email}<br/>
            ${cc ? `<strong>CC:</strong> ${cc}<br/>` : ''}
            ${bcc ? `<strong>BCC:</strong> ${bcc}<br/>` : ''}
            <strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}
          </div>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Hệ thống đã sẵn sàng gửi thư hàng loạt!</p>
        </div>`,
        fromName: senderDisplayName || googleUser.name,
        fromEmail: googleUser.email,
        fontFamily
      });

      await sendGmailMessage({
        token: googleAccessToken,
        rawEmail,
        googleClientId
      });

      showToastMsg(`✓ Đã gửi thử nghiệm thành công tới ${googleUser.email}! Hãy kiểm tra hộp thư đến.`, 'success');
    } catch (err) {
      if (err.status === 403 && (err.message.includes('chưa tích chọn') || err.message.includes('Thiếu quyền'))) {
        setHasSendScope(false);
      }
      showToastMsg(err.message, 'error');
    } finally {
      setTestingSend(false);
    }
  };

  // --- DATA INPUT HANDLERS (EXCEL) ---
  const applyData = (parsedHeaders, parsedData, sourceLabel) => {
    setHeaders(parsedHeaders);
    setRecords(parsedData);
    setDataSourceName(sourceLabel);
    setShowPreview(true);
    setSendLogs([]);
    setCurrentIndex(0);

    // Tự động tìm cột email
    const foundEmail = parsedHeaders.find(h => /email|mail|e-mail|thu_dien_tu/i.test(h));
    if (foundEmail) {
      setEmailCol(foundEmail);
    } else if (parsedHeaders.length > 0) {
      setEmailCol(parsedHeaders[0]);
    }

    showToastMsg(`✓ Nhận diện thành công ${parsedData.length} dòng dữ liệu (${parsedHeaders.length} cột)!`, 'success');
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

  // --- CHÈN BIẾN ĐỘNG VÀO TIÊU ĐỀ HOẶC NỘI DUNG ---
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

    if (!hasSendScope) {
      showToastMsg('⚠️ Tài khoản chưa được tích chọn quyền gửi thư! Hãy bấm "Cấp lại quyền gửi Gmail" ở Bước 1 và tích chọn ô vuông cho phép.', 'error');
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

    // Nếu đang chờ hẹn giờ, dừng đếm ngược và bắt đầu gửi ngay
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

          // Nếu lỗi do hết hạn phiên (401) hoặc thiếu quyền / chưa bật API (403), dừng ngay
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

      // TÍNH TOÁN KHOẢNG NGHỈ GIỮA CÁC EMAIL & CHIA ĐỢT
      if (i < records.length - 1 && !stopRequestedRef.current) {
        // Kiểm tra tạm nghỉ theo đợt
        if (batchPauseEnabled && (i + 1) % batchSize === 0) {
          showToastMsg(`Đã gửi đợt ${i + 1} email. Tạm nghỉ ${batchPauseSec}s trước khi gửi tiếp...`, 'info');
          await sleep(batchPauseSec * 1000);
        } else {
          // Tính thời gian giãn cách: Cố định hoặc ngẫu nhiên
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* HEADER */}
      <Header 
        googleUser={googleUser}
        hasSendScope={hasSendScope}
      />

      {/* NỘI DUNG CHÍNH (4 BƯỚC) */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* BƯỚC 1: KẾT NỐI GOOGLE API & CẤP QUYỀN */}
        <GoogleAuthCard 
          googleUser={googleUser}
          hasSendScope={hasSendScope}
          scopeChecking={scopeChecking}
          senderDisplayName={senderDisplayName}
          setSenderDisplayName={setSenderDisplayName}
          delaySec={delaySec}
          setDelaySec={setDelaySec}
          onLogin={handleGoogleLogin}
          onLogout={handleGoogleLogout}
          onTestSend={handleTestSend}
          testingSend={testingSend}
        />

        {/* BƯỚC 2: DÁN DỮ LIỆU TỪ EXCEL */}
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
        />

        {/* BƯỚC 3: SOẠN THẢO THƯ, CC, BCC, FONT & CHÈN BIẾN */}
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

        {/* BƯỚC 4: TIẾN TRÌNH GỬI HÀNG LOẠT & HẸN GIỜ GỬI */}
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
          // Scheduled sending
          scheduleEnabled={scheduleEnabled}
          setScheduleEnabled={setScheduleEnabled}
          scheduledDateTime={scheduledDateTime}
          setScheduledDateTime={setScheduledDateTime}
          isScheduleWaiting={isScheduleWaiting}
          countdownText={countdownText}
          onActivateSchedule={handleActivateSchedule}
          onCancelSchedule={handleCancelSchedule}
          // Delay & Rate limit
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
        />
      </main>

     

      {/* TOAST THÔNG BÁO */}
      <Toast 
        toast={toast}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
