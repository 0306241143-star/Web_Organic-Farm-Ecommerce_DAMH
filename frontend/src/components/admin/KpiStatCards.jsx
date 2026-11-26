import {
  BadgePercent,
  CircleDollarSign,
  PackageX,
  ShoppingBag,
  UsersRound,
} from "lucide-react";

const numberFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 2,
});
const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
});

const METRICS = {
  revenue: {
    label: "Doanh thu đơn hoàn thành",
    icon: CircleDollarSign,
    color: "emerald",
    value: (data) => `${currencyFormatter.format(data.revenue?.total || 0)}đ`,
    detail: (data) => `${numberFormatter.format(data.revenue?.orders_count || 0)} đơn hoàn thành`,
    tabs: ["overview", "revenue"],
  },
  orders: {
    label: "Đơn hàng hoàn thành",
    icon: ShoppingBag,
    color: "blue",
    value: (data) => numberFormatter.format(data.revenue?.orders_count || 0),
    detail: (data) => `${numberFormatter.format(data.customers?.unique_customers || 0)} khách có đơn`,
    tabs: ["overview", "revenue"],
  },
  wastage: {
    label: "Tỷ lệ hao hụt",
    icon: PackageX,
    color: "orange",
    value: (data) =>
      data.wastage?.rate == null
        ? "Chưa đủ dữ liệu"
        : `${numberFormatter.format(data.wastage.rate)}%`,
    detail: (data) =>
      `${numberFormatter.format(data.wastage?.quantity || 0)} / ${numberFormatter.format(data.wastage?.harvested_quantity || 0)} đơn vị`,
    tabs: ["overview", "inventory"],
  },
  repeat: {
    label: "Khách hàng mua lại",
    icon: UsersRound,
    color: "violet",
    value: (data) =>
      data.customers?.repeat_rate == null
        ? "Chưa có dữ liệu"
        : `${numberFormatter.format(data.customers.repeat_rate)}%`,
    detail: (data) =>
      `${numberFormatter.format(data.customers?.repeat_customers || 0)} / ${numberFormatter.format(data.customers?.unique_customers || 0)} khách`,
    tabs: ["overview", "customers"],
  },
  wastageCount: {
    label: "Hàng hao hụt / xuất hủy",
    icon: BadgePercent,
    color: "orange",
    value: (data) => numberFormatter.format(data.wastage?.quantity || 0),
    detail: (data) =>
      `${numberFormatter.format(data.wastage?.by_type?.Hao_hut || 0)} hao hụt · ${numberFormatter.format(data.wastage?.by_type?.Xuat_huy || 0)} xuất hủy`,
    tabs: ["inventory"],
  },
};

const COLOR_STYLES = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  blue: "bg-blue-50 text-blue-700 ring-blue-100",
  orange: "bg-orange-50 text-orange-700 ring-orange-100",
  violet: "bg-violet-50 text-violet-700 ring-violet-100",
};

export default function KpiStatCards({
  data = {},
  activeTab = "overview",
  loading = false,
}) {
  const cards = Object.entries(METRICS).filter(([, metric]) =>
    metric.tabs.includes(activeTab)
  );

  return (
    <section
      aria-label="Chỉ số quản trị"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4"
    >
      {cards.map(([key, metric]) => {
        const Icon = metric.icon;
        return (
          <article
            key={key}
            className="min-w-0 rounded-2xl bg-white border border-slate-200/80 shadow-2xs p-4 sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500">
                  {metric.label}
                </p>
                {loading ? (
                  <div className="mt-2 h-7 w-32 rounded-lg bg-slate-100 animate-pulse" />
                ) : (
                  <p className="mt-2 text-xl sm:text-2xl font-black text-slate-900 tracking-tight break-words">
                    {metric.value(data)}
                  </p>
                )}
              </div>
              <span
                className={`w-10 h-10 rounded-xl ring-1 flex items-center justify-center shrink-0 ${COLOR_STYLES[metric.color]}`}
              >
                <Icon className="w-5 h-5" />
              </span>
            </div>
            <p className="mt-3 text-[11px] font-medium text-slate-500">
              {loading ? "Đang cập nhật..." : metric.detail(data)}
            </p>
          </article>
        );
      })}
    </section>
  );
}
