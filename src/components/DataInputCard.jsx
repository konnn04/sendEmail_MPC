import React, { useRef, useState } from 'react';
import { 
  ClipboardPaste, FileSpreadsheet, Sparkles, Check, 
  RotateCcw, Link as LinkIcon, Loader2, AlertCircle, XCircle, CheckCircle2 
} from 'lucide-react';

export default function DataInputCard({
  inputMode,
  setInputMode,
  rawPastedText,
  setRawPastedText,
  records,
  headers,
  emailCol,
  setEmailCol,
  dataSourceName,
  showPreview,
  onApplyPastedData,
  onFileUpload,
  onLoadSampleData,
  onResetData,
  onImportGoogleSheetUrl,
  driveLoading = false,
  hasValidEmailColumn = false
}) {

  const fileInputRef = useRef(null);
  const [sheetUrlInput, setSheetUrlInput] = useState('');

  const handleImportSheet = () => {
    if (!sheetUrlInput.trim()) return;
    onImportGoogleSheetUrl?.(sheetUrlInput);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors duration-200">
      {/* Card Header */}
      <div className="bg-slate-50/80 dark:bg-slate-800/80 px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">1</span>
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
            Nguồn Dữ Liệu (Excel, Dán Trực Tiếp hoặc Google Sheets)
          </h2>
        </div>
        
        {/* Chế độ nhập liệu */}
        <div className="flex items-center space-x-2">
          <div className="bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg flex text-xs font-medium border border-transparent dark:border-slate-700">
            <button 
              type="button"
              onClick={() => setInputMode('paste')}
              className={`px-3 py-1.5 rounded-md transition flex items-center space-x-1.5 ${inputMode === 'paste' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Dán từ Excel</span>
            </button>
            <button 
              type="button"
              onClick={() => setInputMode('upload')}
              className={`px-3 py-1.5 rounded-md transition flex items-center space-x-1.5 ${inputMode === 'upload' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Tải file</span>
            </button>
            <button 
              type="button"
              onClick={() => setInputMode('drive')}
              className={`px-3 py-1.5 rounded-md transition flex items-center space-x-1.5 ${inputMode === 'drive' ? 'bg-white dark:bg-slate-700 shadow-xs text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <LinkIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Google Sheets</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {inputMode === 'paste' ? (
          /* CHẾ ĐỘ 1: DÁN TRỰC TIẾP TỪ EXCEL */
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Sao chép các dòng trong Excel (bao gồm cả dòng tiêu đề) rồi dán vào đây:
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onLoadSampleData}
                  className="px-2.5 py-1 text-xs text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-lg transition flex items-center space-x-1"
                >
                  <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  <span>Nạp dữ liệu mẫu sinh viên (Huỳnh A, MSSV: 213...)</span>
                </button>
                {rawPastedText && (
                  <button
                    type="button"
                    onClick={onResetData}
                    className="px-2 py-1 text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Xóa</span>
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={4}
              value={rawPastedText}
              onChange={(e) => setRawPastedText(e.target.value)}
              placeholder="Họ và tên&#9;email&#9;Số điện thoại&#9;mssv&#10;Huỳnh A&#9;abc@gmail.com&#9;98989899&#9;213&#10;Nguyễn Văn Bình&#9;binh.nguyen@example.com&#9;0901234567&#9;214"
              className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition leading-relaxed"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={onApplyPastedData}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition flex items-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>✓ Nhận diện &amp; Cập nhật bảng dữ liệu</span>
              </button>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                💡 Tự động nhận diện tab, dấu phẩy, bảng HTML hoặc các dòng dữ liệu.
              </span>
            </div>
          </div>
        ) : inputMode === 'upload' ? (
          /* CHẾ ĐỘ 2: TẢI FILE EXCEL / CSV TỪ MÁY */
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50 dark:bg-slate-800/40 hover:bg-indigo-50/20 dark:hover:bg-slate-800/80 rounded-2xl p-8 text-center transition cursor-pointer">
            <input 
              type="file" 
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              onChange={onFileUpload}
              className="hidden" 
            />
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center space-y-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Nhấp để tải lên hoặc kéo thả tệp Excel / CSV
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Hỗ trợ định dạng .xlsx, .xls, .csv (Tự động nhận diện tiêu đề cột)
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* CHẾ ĐỘ 3: DÁN LIÊN KẾT GOOGLE SHEETS (ĐÃ BỎ PHẦN PICKER THEO YÊU CẦU) */
          <div className="space-y-3">
            <div className="border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 rounded-2xl p-5 space-y-3">
              <div className="flex items-start space-x-3">
                <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 shrink-0">
                  <LinkIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Dán liên kết Google Sheets
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Dán URL Google Sheet đã có quyền truy cập
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="url"
                  value={sheetUrlInput}
                  onChange={(e) => setSheetUrlInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                  className="flex-1 px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none truncate"
                />
                <button
                  type="button"
                  onClick={handleImportSheet}
                  disabled={driveLoading || !sheetUrlInput.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50 shrink-0"
                >
                  {driveLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang nạp...</span>
                    </>
                  ) : (
                    <span>Nạp Google Sheet</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HIỂN THỊ XEM TRƯỚC BẢNG DỮ LIỆU & CHỌN CỘT EMAIL NGƯỜI NHẬN */}
        {showPreview && records.length > 0 && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              

              {/* CHỌN CỘT CHỨA EMAIL NGƯỜI NHẬN GỌN GÀNG TẠI ĐÂY */}
              {(() => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const isSelectedColFormatValid = Boolean(
                  emailCol && records.length > 0 && records.some(r => emailRegex.test(String(r[emailCol] || '').trim()))
                );

                return (
                  <div className="w-full space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center space-x-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          Cột Email người nhận:
                        </label>
                        <select
                          value={emailCol}
                          onChange={(e) => setEmailCol(e.target.value)}
                          className={`px-3 py-1.5 bg-white dark:bg-slate-900 border rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none transition ${
                            emailCol && !isSelectedColFormatValid
                              ? 'border-rose-500 dark:border-rose-600 text-rose-700 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/40'
                              : 'border-indigo-300 dark:border-indigo-600 text-indigo-900 dark:text-indigo-200'
                          }`}
                        >
                          <option value="">-- Chọn cột Email --</option>
                          {headers.map((h) => (
                            <option key={h} value={h}>
                              Cột: {h} {/email|mail/i.test(h) ? '✓ (Khuyên dùng)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Trạng thái hợp lệ của cột email */}
                      <div>
                        {emailCol && isSelectedColFormatValid ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Cột "{emailCol}" đúng định dạng email</span>
                          </span>
                        ) : emailCol && !isSelectedColFormatValid ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold animate-pulse">
                            <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            <span>Cột "{emailCol}" không phải định dạng email</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Chưa chọn cột email</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Hiển thị lỗi nếu cột chọn làm email không phải định dạng email */}
                    {emailCol && !isSelectedColFormatValid && (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Lỗi định dạng Email: Không tìm thấy cột email hợp lệ</span>
                          
                        </div>
                      </div>
                    )}

                    {/* Hướng dẫn nếu chưa chọn cột */}
                    {!emailCol && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Lưu ý: </span>
                          <span>Vui lòng chọn cột chứa địa chỉ Email người nhận từ danh sách trên để hệ thống gửi thư.</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Bảng xem trước dữ liệu */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold sticky top-0 border-b border-slate-200 dark:border-slate-700 z-10">
                    <tr>
                      <th className="px-3 py-2 text-slate-400 dark:text-slate-500 font-mono w-12 text-center">#</th>
                      {headers.map((header) => (
                        <th 
                          key={header} 
                          className={`px-3 py-2 whitespace-nowrap ${header === emailCol ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 font-bold' : ''}`}
                        >
                          {header}
                          {header === emailCol && (
                            <span className="ml-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-normal">(Cột Email)</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {records.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                        <td className="px-3 py-1.5 text-center text-slate-400 dark:text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                        {headers.map((header) => (
                          <td 
                            key={header} 
                            className={`px-3 py-1.5 whitespace-nowrap font-mono text-[11px] ${header === emailCol ? 'bg-indigo-50/40 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}
                          >
                            {row[header] !== undefined && row[header] !== null ? String(row[header]) : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
