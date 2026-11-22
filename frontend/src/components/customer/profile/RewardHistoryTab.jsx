import { Link } from "react-router-dom";
import { Coins, RefreshCw } from "lucide-react";
import EmptyState from "../../common/EmptyState";

export default function RewardHistoryTab({
  walletLoading,
  walletData,
  historyFilter,
  setHistoryFilter,
  filteredHistory,
  walletHistoryMeta,
  loadMoreWalletHistory,
  walletHistoryLoadingMore,
}) {
  return (
    <div>
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h1 className="text-lg font-bold text-[#191c1b]">Ví Điểm Thưởng XanhFarm</h1>
        <p className="text-xs text-[#5a6357] mt-1">
          Điểm tích lũy dùng để trừ trực tiếp vào tiền thanh toán đơn hàng
        </p>
      </div>

      {walletLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <RefreshCw className="w-6 h-6 text-[#00450d] animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl bg-gradient-to-r from-[#00450d] to-[#0a661c] text-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-amber-300 shrink-0">
                <Coins className="w-8 h-8" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-200 uppercase">
                  Số dư điểm hiện tại
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold tracking-tight">
                    {Number(walletData?.total_points || 0).toLocaleString("vi-VN")}
                  </span>
                  <span className="text-xs font-bold text-emerald-200">điểm</span>
                </div>
                <p className="text-xs text-white/90 mt-1 font-medium">
                  Tương đương:{" "}
                  <span className="font-bold text-amber-200">
                    {(Number(walletData?.total_points || 0) * Number(walletData?.conversion_rules?.point_to_vnd || 0)).toLocaleString("vi-VN")} VNĐ
                  </span>
                </p>
              </div>
            </div>

            <Link
              to="/products"
              className="px-4 py-2 rounded-xl bg-white text-[#00450d] text-xs font-bold hover:bg-emerald-50 transition-colors shadow-2xs w-fit"
            >
              Mua sắm dùng điểm
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-[#f9fafb] border border-slate-200 text-xs">
              <p className="font-bold text-[#00450d]">
                1 điểm = {Number(walletData?.conversion_rules?.point_to_vnd || 0).toLocaleString("vi-VN")}đ
              </p>
              <p className="text-[#5a6357] mt-0.5">Khấu trừ trực tiếp vào đơn hàng</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#f9fafb] border border-slate-200 text-xs">
              <p className="font-bold text-[#00450d]">Tích lũy tự động</p>
              <p className="text-[#5a6357] mt-0.5">Khi đơn hàng giao thành công</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#f9fafb] border border-slate-200 text-xs">
              <p className="font-bold text-[#00450d]">Hoàn điểm an tâm</p>
              <p className="text-[#5a6357] mt-0.5">Hoàn lại điểm khi đơn hàng bị hủy</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h2 className="text-sm font-bold text-[#191c1b]">Lịch Sử Điểm</h2>

              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setHistoryFilter("all")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${historyFilter === "all"
                    ? "bg-[#00450d] text-white"
                    : "text-[#5a6357] hover:bg-slate-100"
                    }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter("earned")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${historyFilter === "earned"
                    ? "bg-[#00450d] text-white"
                    : "text-[#5a6357] hover:bg-slate-100"
                    }`}
                >
                  Đã nhận
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter("spent")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${historyFilter === "spent"
                    ? "bg-[#00450d] text-white"
                    : "text-[#5a6357] hover:bg-slate-100"
                    }`}
                >
                  Đã dùng
                </button>
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="py-8">
                <EmptyState
                  title="Chưa có lịch sử giao dịch"
                  message="Các hoạt động cộng, trừ điểm sẽ được lưu chi tiết tại đây."
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredHistory.map((item) => {
                  const isPositive = Number(item.points) > 0;
                  return (
                    <div
                      key={item.id}
                      className="py-3.5 flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-0.5">
                        <p className="font-semibold text-[#191c1b]">
                          {item.description}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-[#5a6357]">
                          <span>{item.created_at || "—"}</span>
                          {item.order_id && (
                            <span>• Mã đơn: #{item.order_id}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`font-bold text-sm ${isPositive ? "text-[#00450d]" : "text-amber-800"
                            }`}
                        >
                          {isPositive ? `+${item.points}` : item.points}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {item.type_label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {walletHistoryMeta && walletHistoryMeta.current_page < walletHistoryMeta.last_page && (
              <button
                type="button"
                onClick={loadMoreWalletHistory}
                disabled={walletHistoryLoadingMore}
                className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-[#00450d] hover:bg-slate-50 disabled:opacity-60"
              >
                {walletHistoryLoadingMore ? "Đang tải..." : "Tải thêm lịch sử"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
