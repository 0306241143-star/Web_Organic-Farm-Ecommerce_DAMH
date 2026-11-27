import { ChartNoAxesCombined, PackageX } from "lucide-react";

const CHART_WIDTH = 720;
const CHART_HEIGHT = 210;
const CHART_PADDING = { top: 14, right: 12, bottom: 30, left: 12 };

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const quantityFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 2,
});

function formatShortDate(date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${date}T00:00:00`));
}

function TrendChart({ series, lines, label }) {
  // Quy đổi dữ liệu chuỗi thời gian thành toạ độ SVG trong khung biểu đồ.
  const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const maxValue = Math.max(
    ...lines.flatMap((line) =>
      series.map((item) => Number(item[line.valueKey]) || 0)
    ),
    1
  );
  const linePoints = lines.map((line) => ({
    ...line,
    points: series.map((item, index) => {
      const value = Number(item[line.valueKey]) || 0;
      return {
        x:
          CHART_PADDING.left +
          (series.length <= 1 ? plotWidth / 2 : (index / (series.length - 1)) * plotWidth),
        y:
          CHART_PADDING.top +
          plotHeight -
          (value / maxValue) * plotHeight,
        value,
      };
    }),
  }));
  const labelIndexes = new Set(
    Array.from({ length: Math.min(5, series.length) }, (_, index) =>
      Math.round((index * (series.length - 1)) / Math.max(1, Math.min(5, series.length) - 1))
    )
  );

  return (
    <div className="w-full">
      {series.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-xs text-slate-400">
          Chưa có dữ liệu trong khoảng thời gian này.
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-label={label}
          className="w-full h-auto overflow-visible"
        >
          {[0, 1, 2, 3].map((line) => {
            const y = CHART_PADDING.top + (plotHeight / 3) * line;
            return (
              <line
                key={line}
                x1={CHART_PADDING.left}
                x2={CHART_WIDTH - CHART_PADDING.right}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 5"
              />
            );
          })}
          {linePoints.map((line) => {
            const path = line.points
              .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
              .join(" ");
            const areaPath = line.points.length
              ? `${path} L ${line.points[line.points.length - 1].x} ${CHART_HEIGHT - CHART_PADDING.bottom} L ${line.points[0].x} ${CHART_HEIGHT - CHART_PADDING.bottom} Z`
              : "";
            return (
              <g key={line.valueKey}>
                <path d={areaPath} fill={line.color} fillOpacity="0.06" />
                <path
                  d={path}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {line.points.map((point, index) => (
                  <circle
                    key={`${series[index].date}-${line.valueKey}`}
                    cx={point.x}
                    cy={point.y}
                    r={series.length <= 31 ? 3 : 1.8}
                    fill={line.color}
                  >
                    <title>
                      {formatShortDate(series[index].date)}: {line.formatValue(point.value)}
                    </title>
                  </circle>
                ))}
              </g>
            );
          })}
          {Array.from(labelIndexes).map((index) => {
            const point = linePoints[0].points[index];
            return (
              <text
                key={series[index].date}
                x={point.x}
                y={CHART_HEIGHT - 7}
                textAnchor={
                  index === 0
                    ? "start"
                    : index === series.length - 1
                      ? "end"
                      : "middle"
                }
                className="fill-slate-400 text-[11px]"
              >
                {formatShortDate(series[index].date)}
              </text>
            );
          })}
        </svg>
      )}
    </div>
  );
}

function ChartPanel({ title, description, icon: Icon, children }) {
  return (
    <section className="min-w-0 rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
      <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-slate-800">{title}</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="p-3 sm:p-5">{children}</div>
    </section>
  );
}

export default function RevenueAndWastageCharts({
  series = [],
  activeTab = "overview",
  loading = false,
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
        {[0, 1].map((item) => (
          <div
            key={item}
            className="h-72 rounded-2xl bg-white border border-slate-200/80 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const showRevenue = activeTab === "overview" || activeTab === "revenue";
  const showWastage = activeTab === "overview" || activeTab === "inventory";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
      {showRevenue && (
        <ChartPanel
          title="Doanh thu theo thời gian"
          description="Doanh thu các đơn đã hoàn thành, tính theo ngày giao thành công."
          icon={ChartNoAxesCombined}
        >
          <TrendChart
            series={series}
            lines={[
              {
                valueKey: "revenue",
                color: "#059669",
                formatValue: (value) => `${currencyFormatter.format(value)}đ`,
              },
            ]}
            label="Biểu đồ doanh thu theo ngày"
          />
        </ChartPanel>
      )}

      {showWastage && (
        <ChartPanel
          title="Thu hoạch và hao hụt"
          description="Đối chiếu lượng thu hoạch với phiếu hao hụt và xuất hủy theo ngày."
          icon={PackageX}
        >
          <TrendChart
            series={series}
            lines={[
              {
                valueKey: "harvest_quantity",
                color: "#059669",
                formatValue: (value) => `${quantityFormatter.format(value)} đơn vị thu hoạch`,
              },
              {
                valueKey: "wastage_quantity",
                color: "#f97316",
                formatValue: (value) => `${quantityFormatter.format(value)} đơn vị hao hụt`,
              },
            ]}
            label="Biểu đồ lượng thu hoạch và hao hụt theo ngày"
          />
          <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              Hao hụt / xuất hủy
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              Thu hoạch
            </span>
          </div>
        </ChartPanel>
      )}
    </div>
  );
}
