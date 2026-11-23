/* Hero Banner trang chủ: tối ưu chiều cao vừa khung nhìn trên Mobile và chia lưới 12 cột cân đối trên Desktop. */
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  Sprout,
} from "lucide-react";

export default function HeroSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
      <div className="relative overflow-hidden rounded-3xl sm:rounded-[32px] bg-gradient-to-br from-[#01290b] via-[#00450d] to-[#0a6b1e] text-white shadow-lg border border-[#127a27]/40">
        {/* Hiệu ứng ánh sáng nền nhẹ */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-[#91f78e]/12 blur-3xl"
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center p-5 sm:p-8 lg:p-12">
          {/* CỘT TRÁI (7 cột Desktop): Thông điệp chính & Nút CTA */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/12 border border-white/20 text-[10.5px] sm:text-xs font-extrabold uppercase tracking-wider text-[#91f78e]">
              <Sprout className="w-3.5 h-3.5 shrink-0" />
              <span>Canh tác hữu cơ 100% · Chuẩn VietGAP & USDA</span>
            </div>

            <h1
              className="text-2xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-white leading-[1.18]"
              style={{ fontFamily: "var(--font-headline)" }}
            >
              Nông Trại Sinh Thái{" "}
              <span className="text-[#91f78e] block sm:inline">
                Từ Vườn Tới Bàn Ăn
              </span>
            </h1>

            <p className="text-xs sm:text-sm lg:text-[15px] text-emerald-100/90 leading-relaxed max-w-xl">
              Quy trình chăm sóc khép kín không phân bón hóa học, đất và nguồn nước được kiểm
              định định kỳ, minh bạch 100% qua tem mã QR truy xuất từng luống rau.
            </p>

            {/* Nhóm nút hành động: xếp full-width trên Mobile nhỏ, hàng ngang trên Desktop */}
            <div className="flex flex-col xs:flex-row sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3.5 pt-1">
              <Link
                to="/products"
                className="min-h-11 sm:min-h-12 px-5 sm:px-6 py-3 rounded-2xl bg-[#91f78e] hover:bg-[#7ce879] text-[#00390a] font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-md shadow-black/20 transition-all active:scale-98"
              >
                <span>Khám Phá Sản Phẩm Tươi</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>

              <Link
                to="/trace"
                className="min-h-11 sm:min-h-12 px-5 py-3 rounded-2xl bg-white/12 hover:bg-white/20 text-white border border-white/25 font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-colors"
              >
                <QrCode className="w-4 h-4 text-[#91f78e] shrink-0" />
                <span>Quét QR Nguồn Gốc</span>
              </Link>
            </div>

            {/* 3 chỉ số cam kết thu gọn đều nhau trên cả Mobile & Desktop */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-3 sm:pt-4 border-t border-white/15">
              <div>
                <p className="text-base sm:text-2xl font-black text-white tabular-nums">100%</p>
                <p className="text-[11px] sm:text-xs text-emerald-200/85">Hữu cơ tự nhiên</p>
              </div>
              <div>
                <p className="text-base sm:text-2xl font-black text-[#91f78e] tabular-nums">
                  0.00 ppm
                </p>
                <p className="text-[11px] sm:text-xs text-emerald-200/85">Dư lượng thuốc BVTV</p>
              </div>
              <div>
                <p className="text-base sm:text-2xl font-black text-white">QR Code</p>
                <p className="text-[11px] sm:text-xs text-emerald-200/85">Nhật ký từng lô</p>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (5 cột Desktop): Thẻ chứng nhận kiểm định */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl sm:rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-4 sm:p-6 space-y-4 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#91f78e]/20 border border-[#91f78e]/40 flex items-center justify-center text-[#91f78e] shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#91f78e] block">
                      Chứng nhận kiểm định
                    </span>
                    <h2 className="text-sm sm:text-base font-extrabold text-white">
                      Phiếu Thử Nghiệm Chất Lượng
                    </h2>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-black/25 text-[10.5px] font-bold text-emerald-200 shrink-0">
                  XanhFarm
                </span>
              </div>

              <p className="text-xs text-emerald-100/85 leading-relaxed">
                Mẫu nước tưới và đất canh tác tại cơ sở Củ Chi được kiểm nghiệm định kỳ trước mỗi
                vụ gieo trồng.
              </p>

              <div className="rounded-xl bg-[#003309]/80 border border-[#91f78e]/30 px-3.5 py-2.5 flex items-center gap-2 text-xs font-bold text-[#91f78e]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Đạt chuẩn 100% không tồn dư hóa chất</span>
              </div>

              <Link
                to="/brand"
                className="w-full min-h-10 rounded-xl bg-white hover:bg-emerald-50 text-[#00450d] font-extrabold text-xs inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <BadgeCheck className="w-4 h-4 text-[#006e1c]" />
                <span>Tra cứu hồ sơ chứng nhận</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}