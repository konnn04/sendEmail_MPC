import React from "react";
import { Mail, ShieldCheck, AlertCircle } from "lucide-react";

export default function Header({ googleUser, hasSendScope }) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <img
            src="https://res.cloudinary.com/ds11ggie4/image/upload/v1791346257/events/speakers/61158a28d2cb4d05887f65175a7026bf.png"
            alt="Logo"
            className="w-12 h-12 object-contain"
          />
          <div>
            <h1 className="font-bold text-base sm:text-lg text-slate-900 leading-tight flex items-center space-x-2">
              Gửi Email Hàng Loạt qua Google API
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {googleUser ? (
            hasSendScope ? (
              <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                <span>Đăng nhập thành công</span>
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                <span>Thiếu quyền gửi thư</span>
              </span>
            )
          ) : (
            <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-slate-400 mr-2"></span>
              <span>Chưa đăng nhập</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
