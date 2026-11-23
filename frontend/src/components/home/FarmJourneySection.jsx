/* Quy trình khép kín 4 bước: lưới 2x2 cân đối trên Mobile và 4 cột ngang trên Desktop. */
import { Sprout } from "lucide-react";

const STEPS = [
  {
    num: "01",
    title: "Canh Tác Tự Nhiên",
    desc: "Gieo trồng trên đất sạch giàu vi sinh, sử dụng phân bón hữu cơ và ghi nhật ký từng mốc chăm sóc.",
    tag: "HỮU CƠ & KHÔNG HÓA CHẤT",
  },
  {
    num: "02",
    title: "Kiểm Định Độc Lập",
    desc: "Mẫu đất, nguồn nước và nông sản trước thu hoạch được kiểm nghiệm nghiêm ngặt theo tiêu chuẩn VietGAP.",
    tag: "CHỨNG NHẬN AN TOÀN",
  },
  {
    num: "03",
    title: "Đóng Gói & FEFO",
    desc: "Phân loại theo từng lô thu hoạch, gắn tem QR truy xuất nguồn gốc và ưu tiên xuất kho hàng cận hạn.",
    tag: "MINH BẠCH MÃ QR",
  },
  {
    num: "04",
    title: "Giao Nhanh 2 Giờ",
    desc: "Điều phối giao hỏa tốc trực tiếp từ nông trại đến bàn ăn, giữ trọn độ tươi ngon nguyên bản.",
    tag: "BẢO QUẢN MÁT TỰ NHIÊN",
  },
];

export default function FarmJourneySection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#006e1c]">
          <Sprout className="w-3.5 h-3.5" />
          <span>Quy trình khép kín 100%</span>
        </span>
        <h2 className="text-lg sm:text-2xl lg:text-3xl font-black text-slate-900 mt-1">
          Hành Trình Từ Vườn Tới Bàn Ăn Tinh Khiết
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
          Chúng tôi không chỉ bán rau, mà mang lại sự minh bạch trọn vẹn từ lúc gieo hạt cho đến
          khi nông sản tươi đặt lên bàn ăn gia đình bạn.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {STEPS.map((step) => (
          <div
            key={step.num}
            className="rounded-2xl bg-white p-4 sm:p-6 border border-slate-200/85 shadow-2xs flex flex-col justify-between gap-3"
          >
            <div>
              <span className="text-xl sm:text-2xl font-black text-emerald-700/35 tabular-nums block">
                {step.num}
              </span>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mt-1">
                {step.title}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-1.5 leading-relaxed">
                {step.desc}
              </p>
            </div>

            <span className="self-start px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200/70 text-[9.5px] sm:text-[10.5px] font-extrabold text-[#006e1c] tracking-wide">
              {step.tag}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}