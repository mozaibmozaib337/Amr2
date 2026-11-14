import React from 'react';
import { usePlatform } from '../context/PlatformContext';
import {
  Bell,
  X,
  CheckCheck,
  Megaphone,
  ShieldCheck,
  Calendar,
  Sparkles,
  Inbox,
  AlertCircle,
  Volume2,
  Mic,
} from 'lucide-react';

export const NotificationModal: React.FC = () => {
  const {
    isNotificationModalOpen,
    setIsNotificationModalOpen,
    broadcastNotifications,
    markBroadcastsAsRead,
    unreadBroadcastCount,
  } = usePlatform();

  if (!isNotificationModalOpen) return null;

  const handleClose = () => {
    markBroadcastsAsRead();
    setIsNotificationModalOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="bg-[#0b1428] border border-cyan-800/50 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col text-slate-100 max-h-[85dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-[#080d1b] border-b border-cyan-900/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-xl shadow-md">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <span>تنبيهات ورسائل المنصة للطلاب</span>
                {unreadBroadcastCount > 0 && (
                  <span className="text-[10px] font-mono bg-red-600 text-white px-2 py-0.5 rounded-full font-bold">
                    {unreadBroadcastCount} رسائل جديدة
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-cyan-400">
                رسائل وتوجيهات مباشرة من مستر عمرو السيد والسكرتارية
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {broadcastNotifications.length === 0 ? (
            <div className="text-center p-8 bg-[#060a14] border border-slate-800/80 rounded-xl space-y-2.5">
              <Inbox className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">لا توجد رسائل أو إشعارات جديدة حالياً</p>
              <p className="text-xs text-slate-500">
                عندما يرسل مستر عمرو السيد أو السكرتارية أي إشعار أو موعد سيظهر لك هنا فوراً مصحوباً برقم أحمر على الجرس.
              </p>
            </div>
          ) : (
            broadcastNotifications.map((notif) => {
              const formattedDate = new Date(notif.createdAt).toLocaleDateString('ar-EG', {
                weekday: 'long',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              const isUrgent = notif.priority === 'urgent';

              return (
                <div
                  key={notif.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isUrgent
                      ? 'bg-red-950/20 border-red-500/40 hover:border-red-400 shadow-md'
                      : 'bg-[#080f22] border-cyan-900/40 hover:border-cyan-600/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                        {notif.audioUrl ? <Mic className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
                      </span>
                      <h4 className="font-bold text-sm text-white">{notif.title}</h4>
                    </div>

                    {isUrgent && (
                      <span className="text-[10px] bg-red-600/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0">
                        <AlertCircle className="w-3 h-3" />
                        <span>هام وعاجل</span>
                      </span>
                    )}
                  </div>

                  {notif.message && (
                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap bg-black/20 p-3 rounded-lg border border-slate-800/60">
                      {notif.message}
                    </p>
                  )}

                  {notif.audioUrl && (
                    <div className="mt-2.5 p-3 rounded-xl bg-[#050a18] border border-cyan-700/40 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-cyan-300">
                        <span className="flex items-center gap-1.5">
                          <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>رسالة صوتية من المعلم</span>
                        </span>
                        {notif.audioDurationSeconds ? (
                          <span className="font-mono text-[10px] text-cyan-200 bg-cyan-950 px-2 py-0.5 rounded">
                            {`${String(Math.floor(notif.audioDurationSeconds / 60)).padStart(2, '0')}:${String(
                              Math.floor(notif.audioDurationSeconds % 60)
                            ).padStart(2, '0')}`}
                          </span>
                        ) : null}
                      </div>
                      <audio controls preload="metadata" src={notif.audioUrl} className="w-full h-10" />
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                    <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{notif.senderName}</span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-400 font-mono text-[10px]">
                      <Calendar className="w-3 h-3" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#080d1b] border-t border-cyan-900/40 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-400 text-[11px]">
            يتم تحديث الإشعارات تلقائياً لكافة الطلاب
          </span>
          <button
            onClick={handleClose}
            className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer text-xs"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>فهمت، تحديد الكل كمقروء</span>
          </button>
        </div>
      </div>
    </div>
  );
};
