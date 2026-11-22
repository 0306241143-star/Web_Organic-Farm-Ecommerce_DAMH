/* Thẻ hiển thị thông tin khiếu nại và hình ảnh minh chứng của khách hàng. */
import {
  CLAIM_RESOLUTION,
  CLAIM_STATUS,
  OrderStatusBadge,
  formatOrderDateTime,
  formatOrderMoney,
} from "./orderHistoryUtils";

export default function ClaimHistoryCard({ claim }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-extrabold text-slate-900">
            Khiếu nại #{claim.claim_id} · Đơn #{claim.order_id}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Gửi lúc {formatOrderDateTime(claim.submitted_at)} · {claim.reason}
          </p>
        </div>
        <OrderStatusBadge status={claim.status} labels={CLAIM_STATUS} />
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
        {claim.description}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <p className="text-sm text-slate-600">
          Kết quả xử lý:{" "}
          <span className="font-semibold">
            {CLAIM_RESOLUTION[claim.resolution] || claim.resolution}
          </span>
          {claim.refund &&
            ` · ${formatOrderMoney(claim.refund.amount)} (${claim.refund.status})`}
        </p>
        <span className="text-xs text-slate-500">
          {claim.resolved_at
            ? `Cập nhật ${formatOrderDateTime(claim.resolved_at)}`
            : "Đang chờ nhân viên xử lý"}
        </span>
      </div>

      {claim.evidence?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {claim.evidence.map((file) => (
            <a key={file.id} href={file.url} target="_blank" rel="noreferrer">
              <img
                src={file.url}
                alt="Ảnh minh chứng khiếu nại"
                className="h-16 w-16 rounded-lg border object-cover"
              />
            </a>
          ))}
        </div>
      )}
    </article>
  );
}