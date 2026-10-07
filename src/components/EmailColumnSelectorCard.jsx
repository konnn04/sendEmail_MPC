import React from 'react';
import { Mail, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

export default function EmailColumnSelectorCard({
  headers = [],
  records = [],
  emailCol,
  setEmailCol
}) {
  if (headers.length === 0) return null;

  // Đánh giá tỷ lệ email hợp lệ của 1 cột
  const evaluateColumnEmails = (colName) => {
    if (!records || records.length === 0) return { validCount: 0, total: 0, isLikelyEmail: false };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let validCount = 0;
    const total = records.length;

    records.forEach(row => {
      const val = String(row[colName] || '').trim();
      if (emailRegex.test(val)) validCount++;
    });

    return {
      validCount,
      total,
      isLikelyEmail: validCount > 0 && (validCount / total >= 0.5)
    };
  };

  const currentStats = evaluateColumnEmails(emailCol);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50/80 px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
            2
          </span>
          <h2 className="font-semibold text-slate-800 text-sm flex items-center space-x-2">
            <span>Chọn Cột Email Người Nhận</span>
            <span className="text-xs font-normal text-slate-500">
              (Hỗ trợ mọi tên cột: "Thư điện tử", "Mail SV", "Hòm thư", "F3"...)
            </span>
          </h2>
        </div>

        {/* Dropdown nhanh */}
        <div className="flex items-center space-x-2">
          <label className="text-xs text-slate-500 font-medium">Chọn nhanh:</label>
          <select
            value={emailCol}
            onChange={(e) => setEmailCol(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {headers.map(h => (
              <option key={h} value={h}>Cột: {h}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Hướng dẫn & Tình trạng cột hiện tại */}
        <div className={`p-4 rounded-xl border flex items-start space-x-3 ${
          currentStats.validCount === currentStats.total && currentStats.total > 0
            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
            : currentStats.validCount > 0
              ? 'bg-amber-50/60 border-amber-200 text-amber-800'
              : 'bg-rose-50/60 border-rose-200 text-rose-800'
        }`}>
          <div className="p-1 rounded-lg bg-white/80 shrink-0 mt-0.5">
            {currentStats.validCount > 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <div className="space-y-0.5 text-xs">
            <div className="font-bold">
              Đang chọn cột: <span className="underline decoration-indigo-400 font-mono text-indigo-700">"{emailCol}"</span>
            </div>
            <div>
              {currentStats.validCount > 0 ? (
                <span>
                  ✓ Phát hiện <strong>{currentStats.validCount}/{currentStats.total}</strong> dòng chứa địa chỉ email đúng định dạng.
                </span>
              ) : (
                <span>
                  ⚠️ Cột <strong>"{emailCol}"</strong> chưa chứa email hợp lệ nào. Vui lòng bấm chọn một cột khác bên dưới!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Danh sách các cột dạng thẻ bấm chọn trực quan */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-700">
            Bấm chọn cột trong bảng dữ liệu để làm địa chỉ nhận thư:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {headers.map((colName) => {
              const isSelected = emailCol === colName;
              const stats = evaluateColumnEmails(colName);
              // Lấy 2 mẫu giá trị
              const samples = records.slice(0, 2).map(r => String(r[colName] || '')).filter(Boolean);

              return (
                <button
                  key={colName}
                  type="button"
                  onClick={() => setEmailCol(colName)}
                  className={`text-left p-3.5 rounded-xl border transition relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className={`font-bold text-xs truncate ${isSelected ? 'text-indigo-800' : 'text-slate-800'}`}>
                      {colName}
                    </span>
                    {isSelected ? (
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold shrink-0">
                        ✓
                      </span>
                    ) : stats.isLikelyEmail ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 shrink-0">
                        Email
                      </span>
                    ) : null}
                  </div>

                  {/* Giá trị mẫu */}
                  <div className="text-[11px] text-slate-500 truncate font-mono">
                    {samples.length > 0 ? samples.join(', ') : '(Cột trống)'}
                  </div>

                  {/* Tỷ lệ email */}
                  <div className="mt-2 text-[10px] font-medium text-slate-400">
                    {stats.validCount > 0 ? (
                      <span className="text-emerald-600 font-semibold">✓ {stats.validCount}/{stats.total} email</span>
                    ) : (
                      <span>Không có email</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

