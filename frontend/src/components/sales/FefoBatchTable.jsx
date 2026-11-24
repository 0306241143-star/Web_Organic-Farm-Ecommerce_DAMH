import Badge from "../common/Badge";

const STATUS_LABELS = {
  Con_hang: "Còn hàng",
  Sap_het_han: "Sắp hết hạn",
  Het_hang: "Hết hàng",
  Da_huy: "Đã hủy",
};

const STATUS_VARIANTS = {
  Con_hang: "success",
  Sap_het_han: "warning",
  Het_hang: "neutral",
  Da_huy: "danger",
};

export default function FefoBatchTable({ batches = [] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#c0c9bb]/40 bg-white">
      <table aria-label="Tồn kho theo lô FEFO" className="w-full min-w-[780px] text-left text-sm">
        <thead className="bg-[#f2f4f2] text-xs uppercase tracking-wide text-[#5a6357]">
          <tr>
            <th className="px-4 py-3">Lô / nông sản</th>
            <th className="px-4 py-3">Ngày thu hoạch</th>
            <th className="px-4 py-3">Hạn sử dụng</th>
            <th className="px-4 py-3 text-right">Tồn hiện tại</th>
            <th className="px-4 py-3">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#c0c9bb]/25">
          {batches.map((batch) => {
            const expired = batch.days_until_expiry < 0 && batch.remaining_quantity > 0;
            return (
              <tr key={batch.batch_id} className="align-top">
                <td className="px-4 py-3">
                  <p className="font-bold text-[#00450d]">#{batch.batch_id} · {batch.product_name}</p>
                  {batch.plot_name && <p className="mt-1 text-xs text-[#5a6357]">{batch.plot_name}</p>}
                </td>
                <td className="px-4 py-3 text-[#41493e]">{batch.harvest_date || "—"}</td>
                <td className="px-4 py-3">
                  <p className={expired || batch.is_expiring_soon ? "font-bold text-amber-800" : "text-[#41493e]"}>
                    {batch.expiry_date || "—"}
                  </p>
                  {expired ? (
                    <p className="mt-1 text-xs font-semibold text-red-700">Đã quá hạn</p>
                  ) : batch.is_expiring_soon ? (
                    <p className="mt-1 text-xs font-semibold text-amber-800">
                      Còn {batch.days_until_expiry} ngày
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {batch.remaining_quantity} {batch.unit || ""}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={expired ? "danger" : STATUS_VARIANTS[batch.status] || "neutral"}>
                    {expired ? "Quá hạn" : STATUS_LABELS[batch.status] || batch.status}
                  </Badge>
                </td>
              </tr>
            );
          })}
          {batches.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center text-[#5a6357]">
                Không có lô hàng phù hợp.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
