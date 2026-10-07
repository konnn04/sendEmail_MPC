import React from 'react';
import { 
  Check, LogOut, RefreshCw, Send, AlertCircle, 
  CheckCircle2, Mail 
} from 'lucide-react';

export default function GoogleAuthCard({
  googleUser,
  hasSendScope,
  scopeChecking,
  senderDisplayName,
  setSenderDisplayName,
  delaySec,
  setDelaySec,
  onLogin,
  onLogout,
  onTestSend,
  testingSend
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Card Header */}
      <div className="bg-slate-50/80 px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">1</span>
          <h2 className="font-semibold text-slate-800 text-sm">
            Kết Nối Tài Khoản Google &amp; Cấp Quyền Gửi Mail
          </h2>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {!googleUser ? (
          /* KHI CHƯA ĐĂNG NHẬP */
          <div className="space-y-4">
            <div className="p-6 bg-gradient-to-r from-indigo-50/70 via-slate-50 to-indigo-50/40 border border-indigo-100 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1.5 text-center md:text-left">
                <h3 className="text-base font-bold text-slate-800">
                  Đăng nhập để gửi email từ chính hộp thư Gmail của bạn
                </h3>
                <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                  Toàn bộ email sẽ được gửi an toàn trực tiếp qua Gmail REST API của Google mà không cần qua bất kỳ bên thứ ba nào.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center shrink-0">
                <button 
                  type="button"
                  onClick={onLogin}
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

            {/* Hướng dẫn quan trọng để tránh lỗi 403 */}
            <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start space-x-3">
              <div className="p-1.5 bg-blue-100 rounded-lg text-blue-700 shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <strong className="block text-blue-950 font-bold">Lưu ý quan trọng khi xuất hiện màn hình cấp quyền Google:</strong>
                <p className="text-blue-800 text-[11px] leading-relaxed">
                  Để tránh bị lỗi <strong>403 Forbidden</strong>, khi cửa sổ Google bật lên bạn <strong>hãy tích chọn vào ô vuông [✓] "Gửi email thay mặt bạn"</strong> (Send email on your behalf) trước khi nhấn <em>Tiếp tục</em>.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* KHI ĐÃ ĐĂNG NHẬP THÀNH CÔNG */
          <div className="space-y-4">
            <div className={`p-4 ${hasSendScope ? 'bg-emerald-50/90 border-emerald-200' : 'bg-amber-50/90 border-amber-300'} border rounded-2xl flex flex-wrap items-center justify-between gap-4`}>
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
                    <span className="font-bold text-sm text-slate-900">{googleUser.name}</span>
                    {scopeChecking ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 animate-pulse">
                        Đang kiểm tra quyền...
                      </span>
                    ) : hasSendScope ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-800 flex items-center space-x-1">
                        <Check className="w-3 h-3 inline" />
                        <span>ĐÃ CẤP QUYỀN GỬI GMAIL (gmail.send)</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-950 flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3 inline text-amber-700" />
                        <span>CHƯA CẤP QUYỀN GỬI THƯ (THIẾU QUYỀN)</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-slate-700 font-semibold mt-1 flex items-center space-x-1.5">
                    <span>Hộp thư gửi đi:</span>
                    <span className="bg-white px-2.5 py-0.5 rounded-md border border-slate-300 text-slate-800 font-bold">
                      {googleUser.email}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2.5">
                {!hasSendScope && (
                  <button 
                    type="button"
                    onClick={onLogin}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Cấp lại quyền gửi Gmail (Nhớ tích ô vuông)</span>
                  </button>
                )}
                <button 
                  type="button"
                  onClick={onLogout}
                  className="px-3 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold shadow-2xs transition flex items-center space-x-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đổi tài khoản</span>
                </button>
              </div>
            </div>

            {/* Cảnh báo hướng dẫn nếu chưa tích chọn quyền */}
            {!hasSendScope && !scopeChecking && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 space-y-2">
                <div className="font-bold flex items-center space-x-1.5 text-amber-900 text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Tại sao xuất hiện lỗi 403 Forbidden?</span>
                </div>
                <p className="leading-relaxed">
                  Bạn đã đăng nhập nhưng <strong>chưa tích chọn ô vuông "Gửi email thay mặt bạn"</strong> trên màn hình cấp quyền của Google. Khi thiếu quyền này, Gmail API sẽ chặn gửi thư và trả về mã lỗi 403.
                </p>
                <div className="p-3 bg-white rounded-xl border border-amber-300 font-medium text-amber-900 flex items-center space-x-2">
                  <div className="w-4 h-4 rounded border-2 border-amber-600 flex items-center justify-center bg-amber-500 text-white font-bold text-[10px]">✓</div>
                  <span>Tích chọn: <strong>"Gửi email thay mặt bạn"</strong> (hoặc "Send email on your behalf")</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  👉 Hãy bấm nút <strong>"Cấp lại quyền gửi Gmail (Nhớ tích ô vuông)"</strong> ở trên để Google hiện lại màn hình cấp quyền.
                </p>
              </div>
            )}


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
                  Khoảng nghỉ mặc định giữa mỗi Email
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
  );
}
