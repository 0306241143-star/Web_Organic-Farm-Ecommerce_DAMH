import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  PackageX,
  RefreshCw,
  ShoppingBag,
  UsersRound,
} from "lucide-react";
import { adminApi } from "../../services/adminApi";
import { showGlobalToast } from "../../components/GlobalToast";
import KpiStatCards from "../../components/admin/KpiStatCards";
import RevenueAndWastageCharts from "../../components/admin/RevenueAndWastageCharts";

const TABS = [
  { id: "overview", label: "Tổng quan", shortLabel: "Tổng quan", icon: BarChart3 },
  { id: "revenue", label: "Doanh thu & Đơn hàng", shortLabel: "Doanh thu", icon: ShoppingBag },
  { id: "inventory", label: "Kho & Hao hụt", shortLabel: "Kho & Hao hụt", icon: PackageX },
  { id: "customers", label: "Khách hàng", shortLabel: "Khách hàng", icon: UsersRound },
];

const PERIODS = [
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
  { value: "90d", label: "90 ngày" },
];

const ORDER_STATUS_LABELS = {
  Cho_thanh_toan: "Chờ thanh toán",
  Cho_xac_nhan: "Chờ xác nhận",
  Da_xac_nhan: "Đã xác nhận",
  Dang_giao: "Đang giao",
  Hoan_thanh: "Hoàn thành",
  Da_huy: "Đã hủy",
};

const numberFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 2,
});

function OrderStatusSummary({ ordersByStatus = {} }) {
  const statuses = Object.entries(ordersByStatus);
  const total = statuses.reduce((sum, [, count]) => sum + Number(count || 0), 0);

  return (
    <section className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
      <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100">
        <h2 className="text-sm font-extrabold text-slate-800">
          Tình trạng đơn hàng
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Đơn được tạo trong khoảng thời gian đã chọn
        </p>
      </div>
      {statuses.length === 0 ? (
        <p className="px-4 sm:px-5 py-6 text-xs text-slate-500">
          Chưa có đơn hàng trong khoảng thời gian này.
        </p>
      ) : (
        <div className="p-3 sm:p-5 space-y-3">
          {statuses.map(([status, count]) => {
            const percentage = total > 0 ? (Number(count) / total) * 100 : 0;
            return (
              <div key={status}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-slate-700">
                    {ORDER_STATUS_LABELS[status] || status}
                  </span>
                  <span className="font-bold text-slate-800 tabular-nums">
                    {numberFormatter.format(count)}
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      status === "Hoan_thanh" ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function InventoryBreakdown({ wastage = {} }) {
  const items = [
    { key: "Hao_hut", label: "Hao hụt / dập nát", color: "bg-orange-500" },
    { key: "Xuat_huy", label: "Xuất hủy", color: "bg-rose-500" },
  ];

  return (
    <section className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
      <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100">
        <h2 className="text-sm font-extrabold text-slate-800">
          Cơ cấu hàng hao hụt
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Số lượng được ghi nhận theo loại biến động kho
        </p>
      </div>
      <div className="p-3 sm:p-5 space-y-3">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-3"
          >
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
              {item.label}
            </span>
            <span className="text-sm font-extrabold text-slate-900 tabular-nums">
              {numberFormatter.format(wastage.by_type?.[item.key] || 0)}
            </span>
          </div>
        ))}
        <p className="text-[11px] leading-relaxed text-slate-500">
          Tỷ lệ hao hụt = tổng lượng hao hụt và xuất hủy ÷ tổng lượng thu hoạch
          trong cùng kỳ. Không có lượng thu hoạch thì tỷ lệ được hiển thị là
          chưa đủ dữ liệu.
        </p>
      </div>
    </section>
  );
}

function CustomerRepeatSummary({ customers = {} }) {
  const oneTimeCustomers = Math.max(
    0,
    Number(customers.unique_customers || 0) -
      Number(customers.repeat_customers || 0)
  );

  return (
    <section className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
      <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100">
        <h2 className="text-sm font-extrabold text-slate-800">
          Tần suất quay lại
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Dựa trên số đơn đã hoàn thành trong kỳ
        </p>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">Mua từ 2 đơn trở lên</p>
            <p className="mt-1 text-2xl font-black text-violet-800 tabular-nums">
              {numberFormatter.format(customers.repeat_customers || 0)}
            </p>
          </div>
          <UsersRound className="w-8 h-8 text-violet-300" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-violet-50 px-3 py-2.5">
            <p className="text-[10px] text-violet-700">Khách mua lại</p>
            <p className="mt-1 text-sm font-extrabold text-violet-900 tabular-nums">
              {numberFormatter.format(customers.repeat_customers || 0)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] text-slate-500">Mới mua 1 đơn</p>
            <p className="mt-1 text-sm font-extrabold text-slate-800 tabular-nums">
              {numberFormatter.format(oneTimeCustomers)}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          Tỷ lệ khách mua lại = khách có ít nhất 2 đơn hoàn thành ÷ tổng khách
          có đơn hoàn thành trong kỳ.
        </p>
      </div>
    </section>
  );
}

export default function AdminDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab = TABS.some((tab) => tab.id === requestedTab)
    ? requestedTab
    : "overview";
  const [period, setPeriod] = useState("30d");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Khoảng thời gian là khóa tải dữ liệu để báo cáo luôn đồng bộ với bộ lọc hiện tại.
  const loadReport = useCallback(
    () => adminApi.getReportDashboard({ period }),
    [period]
  );

  useEffect(() => {
    let active = true;
    loadReport()
      .then((response) => {
        if (!active) return;
        setReport(response.data || null);
        setLoadError("");
      })
      .catch((error) => {
        if (!active) return;
        const message =
          error?.message || "Không thể tải báo cáo thống kê.";
        setLoadError(message);
        showGlobalToast(message, "error");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadReport]);

  const refreshReport = async () => {
    setRefreshing(true);
    setLoadError("");
    try {
      const response = await loadReport();
      setReport(response.data || null);
    } catch (error) {
      const message =
        error?.message || "Không thể tải báo cáo thống kê.";
      setLoadError(message);
      showGlobalToast(message, "error");
    } finally {
      setRefreshing(false);
    }
  };

  const handlePeriodChange = (event) => {
    setReport(null);
    setLoadError("");
    setLoading(true);
    setPeriod(event.target.value);
  };

  const switchTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "overview") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  const data = report || {};
  const tabs = TABS;

  return (
    <div className="-mt-3.5 sm:-mt-6 lg:-mt-8 -mx-3.5 sm:-mx-6 lg:-mx-8 h-[calc(100dvh-3.25rem)] sm:h-[calc(100vh-3.25rem)] lg:h-screen flex flex-col overflow-hidden bg-[#f8faf8]">
      <div className="relative shrink-0 z-30 bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-2.5 sm:pt-3 pb-2.5 space-y-2 sm:space-y-2.5">
          <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider truncate">
                <span className="shrink-0">Quản Trị Hệ Thống</span>
                <span className="text-slate-300 shrink-0">•</span>
                <span className="normal-case font-semibold text-emerald-800 truncate">
                  Hiệu quả kinh doanh & vận hành
                </span>
              </div>
              <h1 className="mt-0.5 text-[15px] sm:text-lg font-black text-slate-900 tracking-tight leading-tight flex items-center gap-1.5 truncate">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700 shrink-0" />
                <span className="truncate">Báo Cáo & Thống Kê</span>
              </h1>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <label className="sr-only" htmlFor="report-period">
                Khoảng thời gian báo cáo
              </label>
              <span className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <CalendarDays className="w-3.5 h-3.5" />
                Kỳ báo cáo
              </span>
              <select
                id="report-period"
                value={period}
                onChange={handlePeriodChange}
                className="h-9 px-2.5 sm:px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {PERIODS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={refreshReport}
                disabled={refreshing}
                aria-label="Làm mới báo cáo"
                title="Làm mới báo cáo"
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    refreshing ? "animate-spin text-emerald-600" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          <nav
            aria-label="Các báo cáo quản trị"
            className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto -mx-3.5 px-3.5 sm:mx-0 sm:px-0 pb-0.5"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => switchTab(tab.id)}
                  aria-current={selected ? "page" : undefined}
                  className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    selected
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4">
          {loadError && !report ? (
            <section className="rounded-2xl border border-red-200 bg-white p-5 sm:p-8 text-center">
              <p className="text-sm font-bold text-slate-800">
                Không thể tải báo cáo
              </p>
              <p className="mt-1 text-xs text-slate-500">{loadError}</p>
              <button
                type="button"
                onClick={refreshReport}
                className="mt-4 px-4 py-2 rounded-xl bg-[#064e2e] text-white text-xs font-bold cursor-pointer"
              >
                Thử lại
              </button>
            </section>
          ) : (
            <>
              {report?.period && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span>{report.period.label}</span>
                  <span className="tabular-nums">
                    {report.period.start_date} – {report.period.end_date}
                  </span>
                </div>
              )}

              <KpiStatCards
                data={data}
                activeTab={activeTab}
                loading={!report && (loading || refreshing)}
              />

              {activeTab === "customers" ? (
                <CustomerRepeatSummary customers={data.customers} />
              ) : (
                <RevenueAndWastageCharts
                  series={data.series || []}
                  activeTab={activeTab}
                  loading={!report && (loading || refreshing)}
                />
              )}

              {activeTab === "revenue" && (
                <OrderStatusSummary
                  ordersByStatus={data.revenue?.orders_by_status}
                />
              )}

              {activeTab === "inventory" && (
                <InventoryBreakdown wastage={data.wastage} />
              )}

              {activeTab === "overview" && (
                <section className="rounded-2xl bg-emerald-950 text-white p-4 sm:p-5">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-300" />
                    <h2 className="text-sm font-extrabold">Tổng quan vận hành</h2>
                  </div>
                  <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      ["Mùa vụ đang diễn ra", data.farm?.active_seasons],
                      ["Lô canh tác đang hoạt động", data.farm?.active_plots],
                      ["Tổng lô canh tác", data.farm?.total_plots],
                      ["Tài khoản người dùng", data.users?.total],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-xl bg-white/10 border border-white/10 px-3 py-2.5"
                      >
                        <p className="text-[10px] text-emerald-100/80">{label}</p>
                        <p className="mt-1 text-lg font-black tabular-nums">
                          {loading && !report
                            ? "—"
                            : numberFormatter.format(Number(value) || 0)}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
