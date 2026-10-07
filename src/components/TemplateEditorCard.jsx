import React, { useRef, useState, useEffect } from 'react';
import { 
  Bookmark, Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Indent, Outdent, List, ListOrdered, Palette,
  Highlighter, Link as LinkIcon, RemoveFormatting,
  Code, Eye, ChevronLeft, ChevronRight, Plus, Users, Shield, Type, RotateCcw
} from 'lucide-react';
import { EMAIL_TEMPLATES } from '../constants/templates';
import { compileTemplate, cleanTemplateText } from '../utils/templateCompiler';


const TEXT_COLORS = [
  '#000000', '#1e293b', '#dc2626', '#d97706', 
  '#16a34a', '#2563eb', '#7c3aed', '#db2777'
];

const HIGHLIGHT_COLORS = [
  'transparent', '#fef08a', '#bbf7d0', '#bae6fd', 
  '#fbcfe8', '#fed7aa', '#e2e8f0'
];

export const FONT_FAMILIES = [
  { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Roboto', value: "'Roboto', sans-serif" },
  { label: 'Calibri', value: "Calibri, Candara, 'Segoe UI', Arial, sans-serif" },
  { label: 'Open Sans', value: "'Open Sans', sans-serif" },
  { label: 'Segoe UI', value: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: "'Courier New', Courier, monospace" }
];

export default function TemplateEditorCard({
  subject,
  setSubject,
  body,
  setBody,
  cc,
  setCc,
  bcc,
  setBcc,
  showCc,
  setShowCc,
  showBcc,
  setShowBcc,
  fontFamily = "'Times New Roman', Times, serif",
  setFontFamily,
  headers,
  records,
  selectedTemplateId,
  setSelectedTemplateId,
  onInsertVariable,
  lastFocusedInputRef,
  subjectRef
}) {
  const [editorTab, setEditorTab] = useState('edit'); // 'edit' | 'preview'
  const [previewRowIdx, setPreviewRowIdx] = useState(0);
  const [previewBg, setPreviewBg] = useState('light'); // 'light' | 'dark'
  const [lineSpacing, setLineSpacing] = useState('1.6');
  const [isHtmlSourceMode, setIsHtmlSourceMode] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  const editorRef = useRef(null);
  const rawHtmlTextareaRef = useRef(null);
  const savedRangeRef = useRef(null);

  // Đồng bộ nội dung editorRef khi body thay đổi từ ngoài
  useEffect(() => {
    if (editorRef.current && !isHtmlSourceMode) {
      if (editorRef.current.innerHTML !== body) {
        editorRef.current.innerHTML = body;
      }
    }
  }, [body, isHtmlSourceMode]);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0);
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  const executeCommand = (cmd, val = null) => {
    if (isHtmlSourceMode) return;
    if (editorRef.current) {
      editorRef.current.focus();
      restoreSelection();
      document.execCommand(cmd, false, val);
      setBody(editorRef.current.innerHTML);
      saveSelection();
    }
  };

  const handleApplyFontFamily = (font) => {
    if (setFontFamily) setFontFamily(font);
    if (isHtmlSourceMode) return;
    if (editorRef.current) {
      editorRef.current.focus();
      restoreSelection();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        document.execCommand('fontName', false, font);
      } else {
        editorRef.current.style.fontFamily = font;
      }
      setBody(editorRef.current.innerHTML);
      saveSelection();
    }
  };

  const handleApplyHeading = (tag) => {
    if (isHtmlSourceMode) return;
    executeCommand('formatBlock', `<${tag}>`);
  };

  const handleApplyFontSize = (sizePx) => {
    if (isHtmlSourceMode) return;
    if (editorRef.current) {
      editorRef.current.focus();
      restoreSelection();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        const span = document.createElement('span');
        span.style.fontSize = sizePx;
        const range = sel.getRangeAt(0);
        span.appendChild(range.extractContents());
        range.insertNode(span);
        setBody(editorRef.current.innerHTML);
      }
    }
  };

  const handleApplyTextColor = (color) => {
    executeCommand('foreColor', color);
    setShowColorPicker(false);
  };

  const handleApplyHighlightColor = (color) => {
    executeCommand('hiliteColor', color);
    setShowHighlightPicker(false);
  };

  const handleApplyLineSpacing = (spacing) => {
    setLineSpacing(spacing);
    if (editorRef.current) {
      editorRef.current.style.lineHeight = spacing;
    }
  };

  const handleInsertLink = () => {
    if (isHtmlSourceMode) return;
    const url = prompt('Nhập đường dẫn liên kết (URL):', 'https://');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  // Tự động làm sạch và chống duplicate nếu body bị dán trùng lặp
  useEffect(() => {
    if (body) {
      const cleaned = cleanTemplateText(body);
      if (cleaned !== body) {
        setBody(cleaned);
      }
    }
  }, [body, setBody]);

  const handleResetTemplate = () => {
    const tmpl = EMAIL_TEMPLATES.find(t => t.id === selectedTemplateId) || EMAIL_TEMPLATES[0];
    setSubject(tmpl.subject);
    setBody(tmpl.body);
    if (editorRef.current) {
      editorRef.current.innerHTML = tmpl.body;
    }
  };

  const handleInsertVar = (varName) => {
    const tag = `{${varName}}`;
    if (lastFocusedInputRef?.current === 'subject') {
      const el = subjectRef?.current;
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
      if (isHtmlSourceMode && rawHtmlTextareaRef.current) {
        const el = rawHtmlTextareaRef.current;
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;
        const nextVal = body.slice(0, start) + tag + body.slice(end);
        setBody(nextVal);
        setTimeout(() => {
          el.focus();
          el.selectionStart = el.selectionEnd = start + tag.length;
        }, 0);
      } else if (editorRef.current) {
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
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
        setBody(editorRef.current.innerHTML);
        saveSelection();
      } else {
        setBody(prev => prev + tag);
      }
    }
  };

  const handleTemplateChange = (templateId) => {
    setSelectedTemplateId(templateId);
    const tmpl = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (tmpl) {
      setSubject(tmpl.subject);
      setBody(tmpl.body);
      if (editorRef.current) {
        editorRef.current.innerHTML = tmpl.body;
      }
    }
  };

  // Xem trước email mẫu theo dòng dữ liệu
  const currentRecord = records.length > 0 ? records[previewRowIdx] || records[0] : {};
  const compiledPreviewSubject = compileTemplate(subject, currentRecord);
  const compiledPreviewBody = compileTemplate(body, currentRecord, true);
  const compiledPreviewCc = compileTemplate(cc, currentRecord);
  const compiledPreviewBcc = compileTemplate(bcc, currentRecord);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors duration-200">
      {/* Card Header */}
      <div className="bg-slate-50/80 dark:bg-slate-800/80 px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">2</span>
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
            Soạn Thảo Thư, CC/BCC, Phông Chữ &amp; Biến Động (Định Dạng Word)
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          {/* Chọn mẫu có sẵn */}
          <div className="flex items-center space-x-1.5 text-xs">
            <Bookmark className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {EMAIL_TEMPLATES.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleResetTemplate}
              className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
              title="Khôi phục lại nội dung mẫu thư chuẩn (loại bỏ đoạn văn bị trùng lặp nếu có)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Toggle Tab: Soạn thảo vs Xem trước */}
          <div className="bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg flex text-xs font-medium border border-transparent dark:border-slate-700">
            <button
              type="button"
              onClick={() => setEditorTab('edit')}
              className={`px-3 py-1 rounded-md transition ${editorTab === 'edit' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              Soạn thảo
            </button>
            <button
              type="button"
              onClick={() => setEditorTab('preview')}
              className={`px-3 py-1 rounded-md transition flex items-center space-x-1 ${editorTab === 'preview' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Xem trước</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* THANH ĐIỀU KHIỂN TIÊU ĐỀ & CC / BCC */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
              Tiêu đề thư (Subject):
            </label>
            <div className="flex items-center space-x-2 text-xs">
              {!showCc && (
                <button
                  type="button"
                  onClick={() => setShowCc(true)}
                  className="px-2 py-0.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-dashed border-indigo-300 dark:border-indigo-700 rounded-md transition font-medium flex items-center space-x-1"
                >
                  <Users className="w-3 h-3" />
                  <span>+ Thêm CC</span>
                </button>
              )}
              {!showBcc && (
                <button
                  type="button"
                  onClick={() => setShowBcc(true)}
                  className="px-2 py-0.5 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/60 border border-dashed border-purple-300 dark:border-purple-700 rounded-md transition font-medium flex items-center space-x-1"
                >
                  <Shield className="w-3 h-3" />
                  <span>+ Thêm BCC</span>
                </button>
              )}
            </div>
          </div>

          <input
            ref={subjectRef}
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onFocus={() => { if (lastFocusedInputRef) lastFocusedInputRef.current = 'subject'; }}
            placeholder="Ví dụ: Thông báo hồ sơ sinh viên - {Họ và tên} ({mssv})"
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition shadow-2xs"
          />

          {/* Ô NHẬP CC */}
          {showCc && (
            <div className="flex items-center space-x-2 animate-fade-in bg-indigo-50/60 dark:bg-indigo-950/40 p-2 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs">
              <span className="w-10 font-bold text-indigo-700 dark:text-indigo-300 text-right shrink-0">CC:</span>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="Nhập email đồng gửi hoặc biến {email_phu_huynh} (phân tách bởi dấu phẩy)"
                className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => { setCc(''); setShowCc(false); }}
                className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 font-bold px-2 py-1 transition"
                title="Đóng CC"
              >
                ✕
              </button>
            </div>
          )}

          {/* Ô NHẬP BCC */}
          {showBcc && (
            <div className="flex items-center space-x-2 animate-fade-in bg-purple-50/60 dark:bg-purple-950/40 p-2 rounded-xl border border-purple-200 dark:border-purple-800 text-xs">
              <span className="w-10 font-bold text-purple-700 dark:text-purple-300 text-right shrink-0">BCC:</span>
              <input
                type="text"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="Nhập email đồng gửi ẩn danh hoặc biến {email_gvcn} (người nhận không thấy nhau)"
                className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => { setBcc(''); setShowBcc(false); }}
                className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 font-bold px-2 py-1 transition"
                title="Đóng BCC"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* CÁC NÚT BIẾN ĐỘNG CÓ THỂ CHÈN */}
        {headers && headers.length > 0 && (
          <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                Nhấp để chèn biến từ Excel vào Tiêu đề, CC, BCC hoặc Nội dung:
              </span>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400">
                (Tự động chèn tại con trỏ đang đặt)
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {headers.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleInsertVar(h)}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-indigo-600 dark:hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 hover:text-white dark:hover:text-white border border-indigo-200 dark:border-indigo-700 hover:border-indigo-600 rounded-lg text-xs font-semibold shadow-2xs transition flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>{`{${h}}`}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {editorTab === 'edit' ? (
          /* TAB 1: SOẠN THẢO THƯ (RIBBON WORD) */
          <div className="border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition shadow-2xs">
            {/* WORD RIBBON TOOLBAR */}
            <div className="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 p-1.5 flex flex-wrap items-center gap-1 select-none text-slate-700 dark:text-slate-200">
              {/* CHỌN PHÔNG CHỮ (TIMES NEW ROMAN, ARIAL, ROBOTO...) */}
              <div className="flex items-center space-x-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-1.5 py-0.5 text-slate-800 dark:text-slate-100">
                <Type className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <select
                  value={fontFamily}
                  onChange={(e) => handleApplyFontFamily(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer pr-1"
                  title="Phông chữ (Font Family)"
                >
                  {FONT_FAMILIES.map(f => (
                    <option key={f.label} value={f.value} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" style={{ fontFamily: f.value }}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Định dạng khối (P, H1, H2, H3) */}
              <select
                onChange={(e) => handleApplyHeading(e.target.value)}
                defaultValue="p"
                className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none"
                title="Định dạng đoạn văn"
              >
                <option value="p">Văn bản thường</option>
                <option value="h1">Tiêu đề lớn (H1)</option>
                <option value="h2">Tiêu đề vừa (H2)</option>
                <option value="h3">Tiêu đề nhỏ (H3)</option>
              </select>

              {/* Cỡ chữ */}
              <select
                onChange={(e) => handleApplyFontSize(e.target.value)}
                defaultValue="14px"
                className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none"
                title="Cỡ chữ"
              >
                <option value="12px">12px</option>
                <option value="14px">14px (Chuẩn)</option>
                <option value="16px">16px</option>
                <option value="18px">18px</option>
                <option value="20px">20px</option>
                <option value="24px">24px</option>
              </select>

              <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 mx-0.5"></div>

              {/* Bold, Italic, Underline, Strikethrough */}
              <button
                type="button"
                onClick={() => executeCommand('bold')}
                className="p-1.5 hover:bg-slate-200 rounded-md transition font-bold"
                title="In đậm (Ctrl+B)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('italic')}
                className="p-1.5 hover:bg-slate-200 rounded-md transition italic"
                title="In nghiêng (Ctrl+I)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('underline')}
                className="p-1.5 hover:bg-slate-200 rounded-md transition underline"
                title="Gạch chân (Ctrl+U)"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('strikeThrough')}
                className="p-1.5 hover:bg-slate-200 rounded-md transition line-through"
                title="Gạch ngang chữ"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-[1px] bg-slate-300 mx-0.5"></div>

              {/* Chọn màu chữ */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="p-1.5 hover:bg-slate-200 rounded-md transition flex items-center space-x-0.5"
                  title="Màu chữ"
                >
                  <Palette className="w-3.5 h-3.5 text-indigo-600" />
                </button>
                {showColorPicker && (
                  <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-slate-200 rounded-xl shadow-lg z-20 flex gap-1">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleApplyTextColor(c)}
                        className="w-5 h-5 rounded-full border border-slate-200 hover:scale-110 transition"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Chọn màu nền đánh dấu (Highlighter) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                  className="p-1.5 hover:bg-slate-200 rounded-md transition flex items-center space-x-0.5"
                  title="Màu nền đánh dấu"
                >
                  <Highlighter className="w-3.5 h-3.5 text-amber-500" />
                </button>
                {showHighlightPicker && (
                  <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-slate-200 rounded-xl shadow-lg z-20 flex gap-1">
                    {HIGHLIGHT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleApplyHighlightColor(c)}
                        className="w-5 h-5 rounded-full border border-slate-300 hover:scale-110 transition flex items-center justify-center text-[10px]"
                        style={{ backgroundColor: c === 'transparent' ? '#fff' : c }}
                      >
                        {c === 'transparent' ? '✕' : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-4 w-[1px] bg-slate-300 mx-0.5"></div>

              {/* Căn lề: Trái, Giữa, Phải, Đều */}
              <button
                type="button"
                onClick={() => executeCommand('justifyLeft')}
                className="p-1.5 hover:bg-slate-200 rounded-md transition"
                title="Căn trái"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('justifyCenter')}
                className="p-1.5 hover:bg-slate-200 rounded-md transition"
                title="Căn giữa"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('justifyRight')}
                className="p-1.5 hover:bg-slate-200 rounded-md transition"
                title="Căn phải"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('justifyFull')}
                className="p-1.5 hover:bg-slate-200 rounded-md transition"
                title="Căn đều hai bên"
              >
                <AlignJustify className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-[1px] bg-slate-300 mx-0.5"></div>

              {/* Thụt dòng, Giãn dòng */}
              <button
                type="button"
                onClick={() => executeCommand('outdent')}
                className="p-1.5 hover:bg-slate-200 rounded-md transition"
                title="Giảm thụt dòng"
              >
                <Outdent className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('indent')}
                className="p-1.5 hover:bg-slate-200 rounded-md transition"
                title="Tăng thụt dòng"
              >
                <Indent className="w-3.5 h-3.5" />
              </button>

              {/* Danh sách */}
              <button
                type="button"
                onClick={() => executeCommand('insertUnorderedList')}
                className="p-1.5 hover:bg-slate-200 rounded-md transition"
                title="Danh sách dấu chấm"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => executeCommand('insertOrderedList')}
                className="p-1.5 hover:bg-slate-200 rounded-md transition"
                title="Danh sách số thứ tự"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 mx-0.5"></div>

              {/* Khoảng cách dòng (Line Spacing) */}
              <select
                value={lineSpacing}
                onChange={(e) => handleApplyLineSpacing(e.target.value)}
                className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none"
                title="Khoảng cách dòng"
              >
                <option value="1.2">Dòng 1.2x</option>
                <option value="1.4">Dòng 1.4x</option>
                <option value="1.6">Dòng 1.6x (Khuyên dùng)</option>
                <option value="1.8">Dòng 1.8x</option>
                <option value="2.0">Dòng 2.0x</option>
              </select>

              <button
                type="button"
                onClick={handleInsertLink}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition text-slate-700 dark:text-slate-200"
                title="Chèn liên kết"
              >
                <LinkIcon className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => executeCommand('removeFormat')}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition text-slate-700 dark:text-slate-200"
                title="Xóa định dạng"
              >
                <RemoveFormatting className="w-3.5 h-3.5" />
              </button>

              <div className="ml-auto flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setIsHtmlSourceMode(!isHtmlSourceMode)}
                  className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 transition ${isHtmlSourceMode ? 'bg-indigo-600 text-white' : 'bg-white hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700'}`}
                  title="Chuyển chế độ xem mã nguồn HTML"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>{isHtmlSourceMode ? 'Soạn thảo WYSIWYG' : 'Xem mã HTML'}</span>
                </button>
              </div>
            </div>

            {/* KHUNG SOẠN THẢO CHÍNH */}
            {isHtmlSourceMode ? (
              <textarea
                ref={rawHtmlTextareaRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onFocus={() => { if (lastFocusedInputRef) lastFocusedInputRef.current = 'body'; }}
                rows={12}
                className="w-full p-4 font-mono text-xs bg-slate-900 text-emerald-400 focus:outline-none resize-y leading-relaxed"
                placeholder="Nhập mã HTML..."
              />
            ) : (
              <div
                ref={editorRef}
                contentEditable
                onFocus={() => { if (lastFocusedInputRef) lastFocusedInputRef.current = 'body'; }}
                onBlur={saveSelection}
                onKeyUp={() => {
                  if (editorRef.current) setBody(editorRef.current.innerHTML);
                  saveSelection();
                }}
                onInput={() => {
                  if (editorRef.current) setBody(editorRef.current.innerHTML);
                }}
                style={{ lineHeight: lineSpacing, fontFamily: fontFamily, minHeight: '260px' }}
                className="rich-editor-content p-4 text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none min-h-[260px]"
              />
            )}
          </div>
        ) : (
          <div className="border border-indigo-200 dark:border-indigo-900 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center space-x-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Xem trước kết quả thay thế biến theo dòng dữ liệu:</span>
              </span>

              <div className="flex flex-wrap items-center gap-3">
                {/* Nút chuyển đổi xem trên nền trắng / nền đen */}
                <div className="flex items-center space-x-1 bg-slate-200/80 dark:bg-slate-700/80 p-0.5 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPreviewBg('light')}
                    className={`px-2.5 py-1 rounded-md transition flex items-center space-x-1 ${previewBg === 'light' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'}`}
                    title="Xem nội dung trên nền trắng (như email người nhận)"
                  >
                    <span>⚪ Nền trắng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewBg('dark')}
                    className={`px-2.5 py-1 rounded-md transition flex items-center space-x-1 ${previewBg === 'dark' ? 'bg-slate-900 text-white shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-300 hover:text-white'}`}
                    title="Xem nội dung trên nền tối (Dark Mode)"
                  >
                    <span>⚫ Nền đen</span>
                  </button>
                </div>

                {records.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      disabled={previewRowIdx <= 0}
                      onClick={() => setPreviewRowIdx(prev => Math.max(0, prev - 1))}
                      className="p-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition"
                      title="Dòng trước"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      Dòng {previewRowIdx + 1} / {records.length}
                    </span>
                    <button
                      type="button"
                      disabled={previewRowIdx >= records.length - 1}
                      onClick={() => setPreviewRowIdx(prev => Math.min(records.length - 1, prev + 1))}
                      className="p-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition"
                      title="Dòng kế tiếp"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* KHUNG EMAIL XEM TRƯỚC VỚI MÀU NỀN VÀ MÀU CHỮ CHUẨN XÁC */}
            <div className={`rounded-xl border-t  p-5 space-y-3 shadow-2xs transition-colors duration-150 ${
              previewBg === 'light'
                ? 'bg-white border-slate-200 text-slate-900'
                : 'bg-slate-900 border-slate-700 text-slate-100'
            }`}>
              <div className={`text-xs  pb-2.5 space-y-1.5 ${
                previewBg === 'light' ? 'border-slate-100' : 'border-slate-800'
              }`}>
                <div className="flex items-baseline space-x-1.5">
                  <span className={previewBg === 'light' ? 'text-slate-500 font-medium' : 'text-slate-400 font-medium'}>
                    Tiêu đề:
                  </span>
                  <strong className={`font-bold text-sm ${previewBg === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    {compiledPreviewSubject || '(Trống)'}
                  </strong>
                </div>

                {compiledPreviewCc && (
                  <div className={`text-[11px] ${previewBg === 'light' ? 'text-indigo-700' : 'text-indigo-400'}`}>
                    <span className="text-slate-400 font-medium">CC: </span>
                    <span className="font-mono">{compiledPreviewCc}</span>
                  </div>
                )}
                {compiledPreviewBcc && (
                  <div className={`text-[11px] ${previewBg === 'light' ? 'text-purple-700' : 'text-purple-400'}`}>
                    <span className="text-slate-400 font-medium">BCC: </span>
                    <span className="font-mono">{compiledPreviewBcc}</span>
                  </div>
                )}
              </div>

              <div 
                className={`email-preview-content ${previewBg === 'light' ? 'email-preview-white text-slate-900' : 'email-preview-dark text-slate-100'} text-xs leading-relaxed pt-2`}
                style={{ 
                  lineHeight: lineSpacing, 
                  fontFamily: fontFamily,
                  color: previewBg === 'light' ? '#0f172a' : '#f8fafc'
                }}
                dangerouslySetInnerHTML={{ __html: compiledPreviewBody }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
