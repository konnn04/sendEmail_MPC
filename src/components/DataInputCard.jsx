import React, { useRef } from 'react';
import { 
  ClipboardPaste, FileSpreadsheet, Sparkles, Check, 
  RotateCcw, Eye, AlertCircle 
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
  onResetData
}) {
  const fileInputRef = useRef(null);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Card Header */}
      <div className="bg-slate-50/80 px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">2</span>
          <h2 className="font-semibold text-slate-800 text-sm">
            Dán Dữ Liệu Từ Excel (Họ và tên, email, Số điện thoại, mssv...)
          </h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="bg-slate-200/80 p-0.5 rounded-lg flex text-xs font-medium">
            <button 
              type="button"
              onClick={() => setInputMode('paste')}
              className={`px-3 py-1.5 rounded-md transition flex items-center space-x-1.5 ${inputMode === 'paste' ? 'bg-white shadow-xs text-indigo-700 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Dán trực tiếp từ Excel (Ctrl+V)</span>
            </button>
            <button 
              type="button"
              onClick={() => setInputMode('upload')}
              className={`px-3 py-1.5 rounded-md transition flex items-center space-x-1.5 ${inputMode === 'upload' ? 'bg-white shadow-xs text-indigo-700 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Tải file Excel / CSV</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {inputMode === 'paste' ? (
          /* CHẾ ĐỘ DÁN TRỰC TIẾP TỪ EXCEL */
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-500">
                Sao chép các dòng trong Excel (bao gồm cả dòng tiêu đề) rồi dán vào đây:
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onLoadSampleData}
                  className="px-2.5 py-1 text-xs text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition flex items-center space-x-1"
                >
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  <span>Nạp dữ liệu mẫu sinh viên (Huỳnh A, MSSV: 213...)</span>
                </button>
                {rawPastedText && (
                  <button
                    type="button"
                    onClick={onResetData}
                    className="px-2 py-1 text-xs text-slate-500 hover:text-rose-600 transition flex items-center space-x-1"
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
              className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition leading-relaxed"
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
              <span className="text-[11px] text-slate-500">
                💡 Dán hoặc chỉnh sửa văn bản thoải mái, sau đó bấm nút cập nhật để xem trước bảng dữ liệu.
              </span>
            </div>
          </div>
        ) : (
          /* CHẾ ĐỘ TẢI FILE EXCEL / CSV */
          <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/20 rounded-2xl p-8 text-center transition cursor-pointer">
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
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Nhấp để tải lên hoặc kéo thả tệp Excel / CSV
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Hỗ trợ định dạng .xlsx, .xls, .csv (Tự động nhận diện tiêu đề cột)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* HIỂN THỊ XEM TRƯỚC BẢNG DỮ LIỆU SAU KHI ĐƯỢC CẬP NHẬT */}
        {showPreview && records.length > 0 && (
          <div className="pt-4 border-t border-slate-200 space-y-4 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center space-x-2 text-xs">
                <span className="font-semibold text-slate-700">Nguồn dữ liệu:</span>
                <span className="font-bold text-indigo-700">{dataSourceName}</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
                  {records.length} dòng dữ liệu
                </span>
              </div>

              {/* Chọn cột chứa email người nhận */}
              <div className="flex items-center space-x-2">
                <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                  Cột chứa Email người nhận:
                </label>
                <select
                  value={emailCol}
                  onChange={(e) => setEmailCol(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Chọn cột Email --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h} {/email|mail/i.test(h) ? '✓ (Khuyên dùng)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bảng xem trước dữ liệu */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 border-b border-slate-200 z-10">
                    <tr>
                      <th className="px-3 py-2 text-slate-400 font-mono w-12 text-center">#</th>
                      {headers.map((header) => (
                        <th 
                          key={header} 
                          className={`px-3 py-2 whitespace-nowrap ${header === emailCol ? 'bg-indigo-50 text-indigo-800 font-bold' : ''}`}
                        >
                          {header}
                          {header === emailCol && (
                            <span className="ml-1 text-[10px] text-indigo-600 font-normal">(Người nhận)</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="px-3 py-1.5 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        {headers.map((header) => (
                          <td 
                            key={header} 
                            className={`px-3 py-1.5 whitespace-nowrap font-mono text-[11px] ${header === emailCol ? 'bg-indigo-50/40 text-indigo-900 font-semibold' : 'text-slate-700'}`}
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

