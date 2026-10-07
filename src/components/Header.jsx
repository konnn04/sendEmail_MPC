import React, { useState } from 'react';
import { 
  ShieldCheck, AlertCircle, LogOut, 
  HelpCircle, RotateCcw, Check, User, Sun, Moon
} from 'lucide-react';

export default function Header({ 
  googleUser, 
  hasSendScope, 
  onLogin, 
  onLogout, 
  lastSavedTime,
  onClearDraft,
  isDark = false,
  onToggleTheme
}) {
  const [showTips, setShowTips] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* BÊN TRÁI: NÚT THAY ĐỔI GIAO DIỆN TỐI / SÁNG & LOGO */}
        <div className="flex items-center space-x-3">
          {/* NÚT THAY ĐỔI GIAO DIỆN TỐI / SÁNG Ở GÓC TRÊN BÊN TRÁI */}
          <button
            type="button"
            onClick={onToggleTheme}
            title={isDark ? "Chuyển sang giao diện Sáng (Light Mode)" : "Chuyển sang giao diện Tối (Dark Mode)"}
            className="p-2 rounded-xl border transition flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-amber-400 dark:border-slate-700 shadow-2xs group"
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
                <span className="text-xs font-bold hidden sm:inline text-amber-300">Sáng</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-600 group-hover:-rotate-12 transition-transform" />
                <span className="text-xs font-bold hidden sm:inline text-slate-700">Tối</span>
              </>
            )}
          </button>

          {/* LOGO & TITLE */}
          <div className="flex items-center space-x-2.5">
            <img
              src="https://res.cloudinary.com/ds11ggie4/image/upload/v1791346257/events/speakers/61158a28d2cb4d05887f65175a7026bf.png"
              alt="Logo"
              className="w-9 h-9 object-contain shrink-0"
            />
            <div>
              <h1 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight flex items-center space-x-2">
                GỬI EMAIL TỰ ĐỘNG
              </h1>
            
            </div>
          </div>
        </div>

        {/* RIGHT CONTROLS: DRAFT STATUS, LOGIN/USERMENU & TIPS */}
        <div className="flex items-center space-x-2.5">
          {/* TỰ ĐỘNG LƯU TẠM (DRAFT STATUS) */}
          {googleUser && lastSavedTime && (
            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Đã lưu lúc {lastSavedTime}</span>
              {onClearDraft && (
                <button
                  type="button"
                  onClick={onClearDraft}
                  title="Xóa bản lưu tạm và đặt lại mặc định"
                  className="ml-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setShowTips(true)}
              onMouseLeave={() => setShowTips(false)}
              onClick={() => setShowTips(!showTips)}
              className="p-1.5 rounded-xl text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 transition flex items-center space-x-1 group"
              title="Lưu ý khi cấp quyền Google"
            >
              <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-semibold hidden sm:inline">Lưu ý cấp quyền</span>
            </button>

            {showTips && (
              <div 
                className="absolute right-0 top-full mt-2 w-80 sm:w-96 p-4 bg-slate-900 text-white rounded-2xl shadow-xl z-50 text-xs space-y-2 border border-slate-700 animate-in fade-in zoom-in-95 duration-150"
                onMouseEnter={() => setShowTips(true)}
                onMouseLeave={() => setShowTips(false)}
              >
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm border-b border-slate-800 pb-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Lưu ý quan trọng khi cấp quyền Google</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Khi Google xuất hiện màn hình cấp quyền tài khoản, bạn <strong className="text-amber-300">BẮT BUỘC</strong> phải tích chọn vào ô vuông:
                </p>
                <div className="p-2.5 bg-slate-800/90 rounded-xl border border-slate-700 font-medium text-emerald-400 flex items-center space-x-2">
                  <span className="w-4 h-4 rounded border border-emerald-400 flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span>"Gửi email thay mặt bạn" (gmail.send)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  ⚠️ Nếu bỏ qua ô này, Google sẽ từ chối gửi thư .
                </p>
              </div>
            )}
          </div>

          {googleUser  && (
            <div className="flex items-center space-x-2">
              {/* TRẠNG THÁI QUYỀN GỬI */}
              {hasSendScope ? (
                <span className="hidden sm:inline-flex items-center px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                  <span>Sẵn sàng gửi</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onLogin}
                  className="inline-flex items-center px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition"
                  title="Bấm để đăng nhập lại và tích chọn quyền gửi thư"
                >
                  <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-600 dark:text-amber-400" />
                  <span>Cấp lại quyền</span>
                </button>
              )}

              {/* USER PROFILE & LOGOUT DROPDOWN */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center space-x-2 p-1 pl-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition"
                >
                  {googleUser.picture ? (
                    <img 
                      src={googleUser.picture} 
                      alt="Avatar" 
                      className="w-7 h-7 rounded-full object-cover border border-indigo-200 dark:border-indigo-600 shrink-0" 
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                      {googleUser.name?.charAt(0) || <User className="w-3.5 h-3.5" />}
                    </div>
                  )}
                  <div className="text-left hidden md:block max-w-[130px] truncate">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{googleUser.name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{googleUser.email}</div>
                  </div>
                </button>

                {showUserDropdown && (
                  <div 
                    className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-50 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-100"
                    onClick={() => setShowUserDropdown(false)}
                  >
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 mb-1">
                      <div className="font-bold text-slate-800 dark:text-slate-100 truncate">{googleUser.name}</div>
                      <div className="text-slate-500 dark:text-slate-400 text-[11px] truncate">{googleUser.email}</div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={onLogin}
                      className="w-full text-left px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 font-medium transition flex items-center space-x-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                      <span>Đổi tài khoản Google khác</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onLogout(true)}
                      className="w-full text-left px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium transition flex items-center space-x-2"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <span>Đăng xuất tài khoản</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
