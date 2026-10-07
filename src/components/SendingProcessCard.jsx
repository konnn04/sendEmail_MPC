import React, { useState } from 'react';
import { 
  Play, Pause, Square, Download, Send, CheckCircle2, 
  XCircle, Clock, RefreshCw, AlertCircle, Calendar, 
  Timer, Sparkles, Sliders, ChevronDown, ChevronUp
} from 'lucide-react';

export default function SendingProcessCard({
  isSending,
  isPaused,
  currentIndex,
  recordsCount,
  sendLogs,
  onStartSending,
  onTogglePause,
  onStop,
  onExportExcel,
  hasSendScope,
  googleUser,
  // Scheduled Sending Props
  scheduleEnabled,
  setScheduleEnabled,
  scheduledDateTime,
  setScheduledDateTime,
  isScheduleWaiting,
  countdownText,
  onActivateSchedule,
  onCancelSchedule,
  // Delay & Rate Limit Props
  delaySec,
  setDelaySec,
  useRandomDelay,
  setUseRandomDelay,
  randomDelayRange,
  setRandomDelayRange,
  batchPauseEnabled,
  setBatchPauseEnabled,
  batchSize,
  setBatchSize,
  batchPauseSec,
  setBatchPauseSec
}) {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const processedCount = sendLogs.length;
  const successCount = sendLogs.filter(l => l.status === 'success').length;
  const failedCount = sendLogs.filter(l => l.status === 'failed').length;
  const percent = recordsCount > 0 ? Math.round((processedCount / recordsCount) * 100) : 0;

  // Tiện ích chọn nhanh thời gian hẹn
  const setQuickSchedule = (minutesFromNow) => {
    const d = new Date(Date.now() + minutesFromNow * 60 * 1000);
    // Format YYYY-MM-DDTHH:mm cho datetime-local
    const pad = (n) => String(n).padStart(2, '0');
    const str = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setScheduledDateTime(str);
    setScheduleEnabled(true);
  };

  const setTomorrowMorning = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(8, 0, 0, 0);
    const pad = (n) => String(n).padStart(2, '0');
    const str = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setScheduledDateTime(str);
    setScheduleEnabled(true);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Card Header */}
      <div className="bg-slate-50/80 px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">4</span>
          <h2 className="font-semibold text-slate-800 text-sm">
            Tiến Trình Gửi Thư Hàng Loạt &amp; Hẹn Giờ Gửi
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="text-xs font-medium text-slate-600 hover:text-indigo-600 flex items-center space-x-1.5 transition px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-500" />
            <span>Cài đặt thời gian &amp; Chống spam</span>
            {showAdvancedSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {sendLogs.length > 0 && (
            <button
              type="button"
              onClick={onExportExcel}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất file Excel báo cáo</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* KHUNG CÀI ĐẶT THỜI GIAN & CHỐNG SPAM */}
        {showAdvancedSettings && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-fade-in text-xs">
            <div className="font-bold text-slate-800 flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Cấu hình tốc độ &amp; Khoảng cách giãn cách giữa các Email</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Giãn cách gửi */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                <span className="font-semibold text-slate-700 block">Thời gian giãn cách:</span>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="delayType"
                      checked={!useRandomDelay}
                      onChange={() => setUseRandomDelay(false)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-700">Cố định:</span>
                    <input
                      type="number"
                      min="0.5"
                      max="10"
                      step="0.5"
                      disabled={useRandomDelay}
                      value={delaySec}
                      onChange={(e) => setDelaySec(parseFloat(e.target.value) || 1.5)}
                      className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-center font-bold text-xs"
                    />
                    <span className="text-slate-500">giây / email</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="delayType"
                      checked={useRandomDelay}
                      onChange={() => setUseRandomDelay(true)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-700">Ngẫu nhiên: từ</span>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      step="0.5"
                      disabled={!useRandomDelay}
                      value={randomDelayRange.min}
                      onChange={(e) => setRandomDelayRange(prev => ({ ...prev, min: parseFloat(e.target.value) || 1.5 }))}
                      className="w-14 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-center font-bold text-xs"
                    />
                    <span>đến</span>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      step="0.5"
                      disabled={!useRandomDelay}
                      value={randomDelayRange.max}
                      onChange={(e) => setRandomDelayRange(prev => ({ ...prev, max: parseFloat(e.target.value) || 3.5 }))}
                      className="w-14 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-center font-bold text-xs"
                    />
                    <span className="text-slate-500">giây (Chống spam Gmail)</span>
                  </label>
                </div>
              </div>

              {/* Tạm nghỉ theo đợt */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={batchPauseEnabled}
                    onChange={(e) => setBatchPauseEnabled(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Tạm nghỉ theo đợt (Khuyên dùng khi gửi trên 50 email):</span>
                </label>

                {batchPauseEnabled && (
                  <div className="pl-6 space-y-1 text-slate-600">
                    <div className="flex items-center space-x-1.5">
                      <span>Sau mỗi</span>
                      <input
                        type="number"
                        min="5"
                        max="200"
                        step="5"
                        value={batchSize}
                        onChange={(e) => setBatchSize(parseInt(e.target.value) || 20)}
                        className="w-14 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-center font-bold text-xs"
                      />
                      <span>email, tạm dừng</span>
                      <input
                        type="number"
                        min="10"
                        max="600"
                        step="10"
                        value={batchPauseSec}
                        onChange={(e) => setBatchPauseSec(parseInt(e.target.value) || 30)}
                        className="w-14 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-center font-bold text-xs"
                      />
                      <span>giây</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* KHUNG HẸN GIỜ GỬI TỰ ĐỘNG (SCHEDULED SENDING) */}
        {!isSending && (
          <div className="p-4 bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-slate-50 border border-indigo-100 rounded-2xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setScheduleEnabled(checked);
                    if (!checked && isScheduleWaiting) {
                      onCancelSchedule();
                    }
                  }}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="font-bold text-xs text-indigo-950 flex items-center space-x-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>Hẹn giờ gửi tự động (Đặt lịch phát thư vào thời gian cụ thể)</span>
                </span>
              </label>

              {scheduleEnabled && !isScheduleWaiting && (
                <div className="flex flex-wrap gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setQuickSchedule(15)}
                    className="px-2 py-0.5 bg-white hover:bg-indigo-50 border border-indigo-200 rounded text-indigo-700 font-medium transition"
                  >
                    +15 phút nữa
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickSchedule(30)}
                    className="px-2 py-0.5 bg-white hover:bg-indigo-50 border border-indigo-200 rounded text-indigo-700 font-medium transition"
                  >
                    +30 phút nữa
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickSchedule(60)}
                    className="px-2 py-0.5 bg-white hover:bg-indigo-50 border border-indigo-200 rounded text-indigo-700 font-medium transition"
                  >
                    +1 giờ nữa
                  </button>
                  <button
                    type="button"
                    onClick={setTomorrowMorning}
                    className="px-2 py-0.5 bg-white hover:bg-indigo-50 border border-indigo-200 rounded text-indigo-700 font-medium transition"
                  >
                    08:00 sáng mai
                  </button>
                </div>
              )}
            </div>

            {/* Khi bật hẹn giờ */}
            {scheduleEnabled && (
              <div className="pt-2 border-t border-indigo-100/70">
                {!isScheduleWaiting ? (
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-slate-600">Chọn thời điểm gửi:</span>
                    <input
                      type="datetime-local"
                      value={scheduledDateTime}
                      onChange={(e) => setScheduledDateTime(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-indigo-300 rounded-xl font-mono text-xs text-indigo-950 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={onActivateSchedule}
                      disabled={!scheduledDateTime || recordsCount === 0 || !googleUser || !hasSendScope}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl transition flex items-center space-x-1.5 shadow-2xs"
                    >
                      <Timer className="w-3.5 h-3.5" />
                      <span>Kích Hoạt Lịch Hẹn Gửi</span>
                    </button>
                  </div>
                ) : (
                  /* ĐANG CHỜ ĐẾN GIỜ HẸN (ĐẾM NGƯỢC) */
                  <div className="p-4 bg-indigo-600 text-white rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-md animate-pulse">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-white/20 rounded-xl">
                        <Clock className="w-6 h-6 text-white animate-spin" />
                      </div>
                      <div>
                        <div className="font-bold text-sm">
                          ĐÃ LÊN LỊCH: Tự động gửi lúc {new Date(scheduledDateTime).toLocaleString('vi-VN')}
                        </div>
                        <div className="text-xs text-indigo-100 mt-0.5">
                          Ứng dụng đang đếm ngược và sẽ tự động gửi khi hết giờ. Hãy giữ tab trình duyệt này mở!
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="bg-black/25 px-4 py-2 rounded-xl text-center font-mono">
                        <div className="text-[10px] text-indigo-200 uppercase tracking-widest font-sans">Đếm ngược</div>
                        <div className="text-xl font-bold tracking-wider">{countdownText || '--:--:--'}</div>
                      </div>

                      <button
                        type="button"
                        onClick={onStartSending}
                        className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition"
                      >
                        Gửi ngay
                      </button>

                      <button
                        type="button"
                        onClick={onCancelSchedule}
                        className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl text-xs transition"
                      >
                        Hủy lịch hẹn
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* THANH ĐIỀU KHIỂN NÚT GỬI TRỰC TIẾP */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="flex flex-wrap items-center gap-2.5">
            {!isSending ? (
              <button
                type="button"
                onClick={onStartSending}
                disabled={recordsCount === 0 || !googleUser || !hasSendScope || isScheduleWaiting}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-200 hover:shadow-lg transition flex items-center space-x-2"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Bắt Đầu Gửi Hàng Loạt ({recordsCount} Email)</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onTogglePause}
                  className={`px-4 py-2.5 text-white font-bold rounded-xl text-xs transition flex items-center space-x-1.5 ${isPaused ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  {isPaused ? <Play className="w-3.5 h-3.5 fill-white" /> : <Pause className="w-3.5 h-3.5 fill-white" />}
                  <span>{isPaused ? 'Tiếp tục gửi' : 'Tạm dừng'}</span>
                </button>

                <button
                  type="button"
                  onClick={onStop}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition flex items-center space-x-1.5"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Dừng hẳn</span>
                </button>
              </>
            )}
          </div>

          {/* THỐNG KÊ NHANH */}
          <div className="flex items-center space-x-4 text-xs font-mono">
            <div className="text-slate-600">
              Tổng số: <strong className="text-slate-900">{recordsCount}</strong>
            </div>
            <div className="text-emerald-700">
              Thành công: <strong className="text-emerald-600">{successCount}</strong>
            </div>
            <div className="text-rose-700">
              Thất bại: <strong className="text-rose-600">{failedCount}</strong>
            </div>
          </div>
        </div>

        {/* THANH TIẾN ĐỘ TIẾN TRÌNH */}
        {recordsCount > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Tiến độ gửi thư:</span>
              <span className="font-mono font-bold text-indigo-700">{percent}% ({processedCount}/{recordsCount})</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}

        {/* BẢNG NHẬT KÝ CHI TIẾT GỬI MAIL */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Nhật ký gửi thư chi tiết:
            </span>
            {sendLogs.length > 0 && (
              <span className="text-[11px] text-slate-500">
                (Đã xử lý {sendLogs.length} dòng)
              </span>
            )}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 border-b border-slate-200 z-10">
                  <tr>
                    <th className="px-3 py-2 text-slate-400 font-mono w-10 text-center">#</th>
                    <th className="px-3 py-2 whitespace-nowrap">Người nhận</th>
                    <th className="px-3 py-2 whitespace-nowrap">Email</th>
                    <th className="px-3 py-2 whitespace-nowrap">CC / BCC</th>
                    <th className="px-3 py-2 whitespace-nowrap">MSSV</th>
                    <th className="px-3 py-2 whitespace-nowrap">Thời gian</th>
                    <th className="px-3 py-2 whitespace-nowrap text-center">Trạng thái</th>
                    <th className="px-3 py-2 whitespace-nowrap">Chi tiết kết quả / Lỗi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sendLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        Chưa có nhật ký gửi thư nào. Hãy bấm "Bắt đầu gửi hàng loạt" ở trên.
                      </td>
                    </tr>
                  ) : (
                    [...sendLogs].reverse().map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-3 py-2 text-center text-slate-400 font-mono text-[11px]">{log.id}</td>
                        <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">{log.name}</td>
                        <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">{log.email}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {log.cc ? <span className="mr-1 text-indigo-700 font-semibold">CC: {log.cc}</span> : null}
                          {log.bcc ? <span className="text-purple-700 font-semibold">BCC: {log.bcc}</span> : null}
                          {!log.cc && !log.bcc ? '--' : null}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-600 whitespace-nowrap">{log.mssv}</td>
                        <td className="px-3 py-2 text-slate-500 font-mono text-[11px] whitespace-nowrap">{log.time}</td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          {log.status === 'success' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                              Thành công
                            </span>
                          )}
                          {log.status === 'failed' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              <XCircle className="w-3 h-3 mr-1 text-rose-600" />
                              Thất bại
                            </span>
                          )}
                          {log.status === 'sending' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                              <RefreshCw className="w-3 h-3 mr-1 animate-spin text-indigo-600" />
                              Đang gửi...
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-600 max-w-xs truncate" title={log.error}>
                          {log.error || (log.status === 'success' ? 'Đã gửi thành công' : '--')}
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
  );
}
