/* Dải 4 cam kết dịch vụ: lưới 2x2 gọn gàng trên Mobile và 4 cột ngang trên Desktop. */
import { Clock, Leaf, RefreshCw, ShieldCheck } from "lucide-react";

const BADGES = [
  {
    icon: ShieldCheck,
    title: "100% Chuẩn Hữu Cơ",
    desc: "Đạt chứng nhận VietGAP & USDA, không biến đổi gen, không thuốc trừ sâu hóa học.",
  },
  {
    icon: Leaf,
    title: "Thu Hoạch Mỗi Sáng",
    desc: "Nông sản được cắt hái lúc sáng sớm, giữ trọn độ tươi giòn và hàm lượng dinh dưỡng.",
  },
  {
    icon: Clock,
    title: "Giao Hỏa Tốc 2H",
    desc: "Vận chuyển trực tiếp từ nông trại đến tận bếp nhà bạn trong vòng 2 giờ nội thành.",
  },
  {
    icon: RefreshCw,
    title: "Đổi Trả Miễn Phí",
    desc: "Hoàn tiền 100% hoặc giao bù ngay lập tức trong 24h nếu nông sản dập nát.",
  },
];

export default function TrustBadgesSection() {
  return (
    <section
      aria-label="Cam kết chất lượng XanhFarm"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        {BADGES.map((badge) => {
          const Icon = badge.icon;
          return (
            <div
              key={badge.title}
              className="rounded-2xl bg-white p-3.5 sm:p-5 border border-slate-200/80 shadow-2xs hover:border-emerald-300 transition-colors flex flex-col sm:flex-row items-start gap-3"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 border border-emerald-200/70 text-[#006e1c] flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                  {badge.title}
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-relaxed line-clamp-3">
                  {badge.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}