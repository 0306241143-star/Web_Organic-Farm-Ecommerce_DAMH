/* Hero Banner tràn viền trái-phải: đồng bộ trục căn lề max-w-7xl và dải nền #f8faf8 với StorefrontHeader. */
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarCheck2, Leaf } from "lucide-react";
import heroGreenhouseImg from "../../assets/hero-greenhouse.jpg";

export default function HeroSection() {
  const [heroImageFailed, setHeroImageFailed] = useState(false);

  return (
    <section
      aria-label="Giới thiệu nông sản hữu cơ XanhFarm"
      className="relative w-full overflow-hidden bg-[#f8faf8] border-b border-[#c0c9bb]/50 lg:min-h-[470px] xl:min-h-[520px] lg:flex lg:items-center"
    >
      {/* Desktop (>=1024px): Ảnh nhà màng tràn sát mép phải, hòa mượt vào nền #f8faf8 bên trái */}
      {!heroImageFailed ? (
        <div
          aria-hidden="true"
          className="hidden lg:block absolute inset-y-0 right-0 w-[68%] xl:w-[64%] z-0 pointer-events-none"
        >
          <img
            src={heroGreenhouseImg}
            alt=""
            loading="eager"
            fetchPriority="high"
            onError={() => setHeroImageFailed(true)}
            className="w-full h-full object-cover object-center"
          />
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="hidden lg:block absolute inset-0 bg-gradient-to-r from-[#f8faf8] via-[#f2f4f2] to-[#e6ece6] z-0 pointer-events-none"
        />
      )}

      {/* Lớp chuyển sắc ban mai theo chiều ngang + làm dịu nhẹ mép trên nơi tiếp giáp Header */}
      <div
        aria-hidden="true"
        className="hidden lg:block absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, #f8faf8 0%, #f8faf8 34%, rgba(248, 250, 248, 0.95) 46%, rgba(248, 250, 248, 0.44) 60%, rgba(248, 250, 248, 0.05) 75%, rgba(248, 250, 248, 0) 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="hidden lg:block absolute inset-x-0 top-0 h-16 z-[1] pointer-events-none bg-gradient-to-b from-[#f8faf8]/70 to-transparent"
      />

      {/* Vùng nội dung chính khóa trục trái khớp với Logo ở StorefrontHeader */}
      <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-6 lg:py-14 xl:py-16">
        <div className="max-w-[600px] xl:max-w-[620px] space-y-5">
          <h1
            className="text-[30px] sm:text-[42px] lg:text-[44px] xl:text-[46px] font-extrabold tracking-[-0.025em] text-[#00450d] leading-[1.13] text-balance"
            style={{ fontFamily: "var(--font-headline)" }}
          >
            Rau quả hữu cơ hái sáng nay,{" "}
            <span className="text-[#006e1c]">minh bạch tới từng luống trồng</span>
          </h1>

          <p className="text-[15px] sm:text-[16.5px] text-[#41493e] leading-[1.68] max-w-[49ch]">
            Thu hoạch mỗi sáng từ nhà màng theo quy trình khép kín, không thuốc trừ sâu hóa học và kiểm định đất, nước định kỳ. Đặt mua lẻ giao hỏa tốc 2 giờ hoặc chọn gói rau củ tuần tiết kiệm 20%.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <Link
              to="/products"
              className="min-h-12 px-6 py-3 rounded-xl bg-[#00450d] hover:bg-[#006e1c] text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00450d]"
            >
              <span>Khám Phá Nông Sản Tươi</span>
              <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
            </Link>

            <Link
              to="/subscriptions"
              className="min-h-12 px-5 py-3 rounded-xl bg-white hover:bg-[#f2f4f2] text-[#00450d] border border-[#c0c9bb] hover:border-[#00450d]/50 font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00450d]"
            >
              <CalendarCheck2 className="w-4 h-4 text-[#006e1c] shrink-0" aria-hidden="true" />
              <span>Gói Rau Định Kỳ (-20%)</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile & Tablet (<1024px): Ảnh nhà màng tràn sát 2 mép màn hình */}
      <div className="lg:hidden w-full">
        <div className="aspect-[16/10] w-full bg-[#e6e9e7] overflow-hidden">
          {!heroImageFailed ? (
            <img
              src={heroGreenhouseImg}
              alt="Khu nhà màng XanhFarm canh tác xà lách Romaine, cải xoăn và cà chua bi hữu cơ đón nắng sớm"
              loading="eager"
              fetchPriority="high"
              onError={() => setHeroImageFailed(true)}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div className="w-full h-full bg-[#eceeec] flex flex-col items-center justify-center gap-2 p-6 text-center">
              <Leaf className="w-7 h-7 text-[#006e1c]" aria-hidden="true" />
              <p className="text-sm font-bold text-[#00450d]">
                Nhà màng canh tác hữu cơ XanhFarm
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
