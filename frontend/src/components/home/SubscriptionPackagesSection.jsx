import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck2,
  CheckCircle2,
  ArrowRight,
  ArrowUpRight,
  Package,
  Sparkles,
  Scale,
  PauseCircle,
} from "lucide-react";
import { storefrontApi } from "../../services/storefrontApi";
import { useAuth } from "../../context/useAuth";

export default function SubscriptionPackagesSection() {
  const { user, openLoginModal } = useAuth();
  const isInternalPreview = Boolean(
    user && ["admin", "farm_staff", "sales"].includes(user.role)
  );
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    storefrontApi
      .getSubscriptions()
      .then((data) => {
        if (isMounted) setPackages(data);
      })
      .catch(() => {
        if (isMounted) setPackages([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!loading && packages.length === 0) {
    return null;
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
            <CalendarCheck2 className="w-3.5 h-3.5" />
            TIẾT KIỆM THỜI GIAN ĐI CHỢ
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            Gói Rau Củ Định Kỳ Cho Gia Đình
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Thiết lập lịch nhận rau sạch cố định hằng tuần (Thứ 3, Thứ 6). Hệ thống tự động
            thu hoạch sáng sớm, trừ kho FEFO và giao tận bếp — hỗ trợ tạm hoãn linh hoạt trước 12 giờ.
          </p>
        </div>

        <Link
          to="/subscriptions"
          className="self-start md:self-auto px-4 py-2 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-xs font-bold text-[#064e2e] inline-flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <span>Tìm Hiểu Chính Sách Gói</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-3xl border border-slate-200 p-6 animate-pulse space-y-4"
            >
              <div className="h-5 bg-slate-200 rounded w-1/3" />
              <div className="h-7 bg-slate-200 rounded w-3/4" />
              <div className="h-24 bg-slate-100 rounded-2xl w-full" />
              <div className="h-11 bg-slate-200 rounded-xl w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 ${packages.length >= 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"
            } gap-6`}
        >
          {packages.map((pkg, idx) => {
            const isFeatured = idx === 0;

            return (
              <div
                key={pkg.id}
                className={`relative rounded-3xl p-6 sm:p-7 transition-all flex flex-col justify-between ${isFeatured
                  ? "bg-[#064e2e] text-white shadow-xl border-2 border-[#10b981]"
                  : "bg-white text-slate-900 shadow-xs border border-slate-200/90 hover:border-emerald-400"
                  }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide ${isFeatured
                        ? "bg-emerald-400/20 text-[#86efac] border border-[#86efac]/40"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                        }`}
                    >
                      <Scale className="w-3.5 h-3.5" />
                      {pkg.weight_per_delivery} kg / lần giao
                    </span>

                    {isFeatured && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[10.5px] font-black uppercase">
                        <Sparkles className="w-3 h-3" />
                        Phổ Biến Nhất
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3
                    className={`text-lg sm:text-xl font-black leading-snug ${isFeatured ? "text-white" : "text-slate-900"
                      }`}
                  >
                    {pkg.name}
                  </h3>
                  {pkg.description && (
                    <p
                      className={`text-xs mt-2 leading-relaxed ${isFeatured ? "text-emerald-100/85" : "text-slate-500"
                        }`}
                    >
                      {pkg.description}
                    </p>
                  )}

                  {/* Price Box */}
                  {/* Price Box */}
                  {(() => {
                    const salePrice = Number(pkg.price ?? 0);
                    const originalPrice = Number(pkg.original_price ?? 0);
                    const hasDiscount = originalPrice > salePrice && originalPrice > 0;
                    const discountPercent = hasDiscount
                      ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
                      : 0;

                    return (
                      <div
                        className={`mt-5 pb-5 border-b ${isFeatured ? "border-white/15" : "border-slate-100"
                          }`}
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span
                              className={`text-2xl sm:text-3xl font-black tabular-nums ${isFeatured ? "text-[#86efac]" : "text-[#064e2e]"
                                }`}
                            >
                              {salePrice.toLocaleString("vi-VN")}đ
                            </span>

                            {hasDiscount && (
                              <span
                                className={`text-xs sm:text-sm font-semibold line-through tabular-nums ${isFeatured ? "text-emerald-200/70" : "text-slate-400"
                                  }`}
                              >
                                {originalPrice.toLocaleString("vi-VN")}đ
                              </span>
                            )}
                          </div>

                          {hasDiscount && discountPercent > 0 && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums ${isFeatured
                                  ? "bg-[#86efac] text-[#043821]"
                                  : "bg-rose-100 text-rose-700"
                                }`}
                            >
                              -{discountPercent}%
                            </span>
                          )}
                        </div>

                        <span
                          className={`mt-1 block text-xs font-semibold ${isFeatured ? "text-emerald-200/80" : "text-slate-400"
                            }`}
                        >
                          / gói {pkg.duration_months} tháng
                        </span>
                      </div>
                    );
                  })()}

                  {/* Included Items from chi_tiet_goi */}
                  <div className="mt-5">
                    <div
                      className={`text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 mb-3 ${isFeatured ? "text-emerald-200" : "text-slate-500"
                        }`}
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>Thành phần tiêu chuẩn mỗi đợt giao:</span>
                    </div>

                    {Array.isArray(pkg.items) && pkg.items.length > 0 ? (
                      <ul className="space-y-2">
                        {pkg.items.map((item) => {
                          const hasProductLink = Number(item.product_id) > 0;
                          const itemBody = (
                            <>
                              <span className="inline-flex items-center gap-2 font-medium min-w-0">
                                <CheckCircle2
                                  className={`w-4 h-4 shrink-0 ${isFeatured ? "text-[#86efac]" : "text-emerald-600"
                                    }`}
                                />
                                <span className="truncate group-hover/homeprod:underline">
                                  {item.product_name}
                                </span>
                                {hasProductLink && (
                                  <ArrowUpRight
                                    className={`w-3.5 h-3.5 shrink-0 opacity-70 group-hover/homeprod:opacity-100 transition-opacity ${isFeatured ? "text-[#86efac]" : "text-emerald-700"
                                      }`}
                                  />
                                )}
                              </span>
                              <span
                                className={`font-bold px-2 py-0.5 rounded-md shrink-0 tabular-nums ${isFeatured
                                  ? "bg-white/10 text-white"
                                  : "bg-slate-100 text-slate-700"
                                  }`}
                              >
                                {Number(item.quantity)} {item.unit}
                              </span>
                            </>
                          );

                          return (
                            <li key={item.product_id}>
                              {hasProductLink ? (
                                <Link
                                  to={`/products/${item.product_id}`}
                                  title={`Xem chi tiết ${item.product_name}`}
                                  className={`group/homeprod flex items-center justify-between gap-2 text-xs rounded-lg px-2 py-1 -mx-2 transition-colors ${isFeatured
                                    ? "hover:bg-white/10"
                                    : "hover:bg-emerald-50/80"
                                    }`}
                                >
                                  {itemBody}
                                </Link>
                              ) : (
                                <div className="flex items-center justify-between gap-2 text-xs">
                                  {itemBody}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p
                        className={`text-xs italic ${isFeatured ? "text-emerald-200/70" : "text-slate-400"
                          }`}
                      >
                        Rau củ hữu cơ tuyển chọn theo mùa vụ thu hoạch trong ngày.
                      </p>
                    )}
                  </div>

                  {/* Flexible Pause Note */}
                  <div
                    className={`mt-5 px-3.5 py-2.5 rounded-xl text-[11px] flex items-center gap-2 ${isFeatured
                      ? "bg-white/10 text-emerald-100"
                      : "bg-emerald-50/70 text-emerald-900"
                      }`}
                  >
                    <PauseCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>
                      Chủ động tạm hoãn lịch giao bất kỳ tuần nào trước 12 tiếng.
                    </span>
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-6 pt-2">
                  {isInternalPreview ? (
                    <Link
                      to={`/subscriptions?package_id=${pkg.id}`}
                      className={`w-full py-3 px-5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all active:scale-95 ${isFeatured
                        ? "bg-[#10b981] hover:bg-[#059669] text-white shadow-lg shadow-emerald-950/30"
                        : "bg-[#064e2e] hover:bg-[#043821] text-white"
                        }`}
                    >
                      <span>
                        {user.role === "admin"
                          ? "Xem Trang Đăng Ký (Admin)"
                          : "Xem Trang Gói Định Kỳ"}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    user ? (
                      <Link
                        to={`/subscriptions?package_id=${pkg.id}`}
                        className={`w-full py-3 px-5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all active:scale-95 ${isFeatured
                          ? "bg-[#10b981] hover:bg-[#059669] text-white shadow-lg shadow-emerald-950/30"
                          : "bg-[#064e2e] hover:bg-[#043821] text-white"
                          }`}
                      >
                        <span>Đăng Ký Gói Định Kỳ Này</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          openLoginModal(`/subscriptions?package_id=${pkg.id}`)
                        }
                        className={`w-full py-3 px-5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${isFeatured
                          ? "bg-[#10b981] hover:bg-[#059669] text-white shadow-lg shadow-emerald-950/30"
                          : "bg-[#064e2e] hover:bg-[#043821] text-white"
                          }`}
                      >
                        <span>Đăng Ký Gói Định Kỳ Này</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}