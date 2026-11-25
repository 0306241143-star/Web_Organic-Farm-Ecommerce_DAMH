import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ExternalLink, Image as ImageIcon, LoaderCircle, Video, X } from "lucide-react";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const dateTime = (value) => value
  ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "—";

const RESOLUTION_LABELS = {
  Chua_xac_dinh: "Chưa xác định",
  Hoan_tien: "Hoàn tiền",
  Giao_bu: "Giao bù",
  Tu_choi: "Từ chối",
};

const STATUS_LABELS = {
  Cho_xu_ly: "Chờ tiếp nhận",
  Dang_xu_ly: "Đang xử lý",
  Da_giai_quyet: "Đã giải quyết",
  Tu_choi: "Từ chối",
};

const QUICK_REPLIES = [
  "XanhFarm chân thành xin lỗi vì trải nghiệm chưa tốt. Chúng tôi đã ghi nhận và đang hỗ trợ theo phương án dưới đây.",
  "Cảm ơn Quý khách đã cung cấp thông tin và bằng chứng. XanhFarm đã tiếp nhận, xử lý yêu cầu theo nội dung đã thống nhất.",
  "Sau khi kiểm tra thông tin và bằng chứng, rất tiếc XanhFarm chưa thể chấp nhận yêu cầu này. Mong Quý khách thông cảm.",
];

export default function ResolveClaimModal({
  claim,
  loading,
  busy,
  onClose,
  onReceive,
  onResolve,
}) {
  const [decision, setDecision] = useState("chap_nhan");
  const [resolution, setResolution] = useState("hoan_tien");
  const [refundAmount, setRefundAmount] = useState("");
  const [feedback, setFeedback] = useState("");
  const [selectedDetails, setSelectedDetails] = useState({});
  const [imagePreview, setImagePreview] = useState("");
  const [localError, setLocalError] = useState("");

  if (!claim) return null;

  const order = claim.order;
  const orderItems = order?.items || [];
  const isResolved = ["Da_giai_quyet", "Tu_choi"].includes(claim.status);

  const toggleProduct = (detailId, checked) => {
    setSelectedDetails((current) => ({
      ...current,
      [detailId]: checked
        ? { selected: true, quantity: 1 }
        : { ...current[detailId], selected: false },
    }));
  };

  const updateQuantity = (detailId, quantity) => {
    setSelectedDetails((current) => ({
      ...current,
      [detailId]: { ...current[detailId], selected: true, quantity },
    }));
  };

  const handleResolve = async (event) => {
    event.preventDefault();
    if (!feedback.trim() || feedback.trim().length < 5) {
      setLocalError("Vui lòng nhập phản hồi khách hàng (ít nhất 5 ký tự).");
      return;
    }

    let payload = {
      ket_qua: decision,
      phan_hoi_cskh: feedback.trim(),
    };

    if (decision === "chap_nhan" && resolution === "hoan_tien") {
      const amount = Number(refundAmount);
      if (!Number.isFinite(amount) || amount <= 0 || amount > Number(order?.total || 0)) {
        setLocalError("Số tiền hoàn phải lớn hơn 0 và không vượt tổng tiền đơn hàng.");
        return;
      }
      payload = { ...payload, phuong_an_xu_ly: "hoan_tien", so_tien_hoan: amount };
    } else if (decision === "chap_nhan") {
      const items = Object.entries(selectedDetails)
        .filter(([, item]) => item.selected)
        .map(([detailId, item]) => ({
          chi_tiet_don_hang_id: Number(detailId),
          so_luong_bu: Number(item.quantity),
        }));
      if (items.length === 0 || items.some((item) => !Number.isFinite(item.so_luong_bu) || item.so_luong_bu < 1)) {
        setLocalError("Vui lòng chọn sản phẩm và nhập số lượng giao bù hợp lệ.");
        return;
      }
      payload = { ...payload, phuong_an_xu_ly: "giao_bu", items };
    }

    setLocalError("");
    await onResolve(claim.claim_id, payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 sm:p-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="resolve-claim-title"
        className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-[#f7f9f7] shadow-2xl"
      >
        <header className="flex items-start justify-between border-b border-[#c0c9bb]/35 bg-white p-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Hồ sơ chăm sóc khách hàng</p>
            <h2 id="resolve-claim-title" className="mt-1 text-xl font-black text-[#00450d]">
              Khiếu nại #{claim.claim_id}
              {claim.order_id && <span className="ml-2 text-sm font-semibold text-slate-500">· Đơn gốc #{claim.order_id}</span>}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Đóng hồ sơ"
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {loading || !order ? (
          <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-slate-600">
            <LoaderCircle className="h-5 w-5 animate-spin" /> Đang tải chi tiết hồ sơ...
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="space-y-4 p-4 sm:p-6">
              <section className="rounded-2xl border border-[#c0c9bb]/35 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Khách hàng</span>
                    <h3 className="mt-1 font-bold text-slate-900">{claim.customer?.name || "Khách hàng"}</h3>
                    <p className="text-sm text-slate-600">{claim.customer?.phone || claim.customer?.email || "Chưa có thông tin liên hệ"}</p>
                  </div>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800">
                    {STATUS_LABELS[claim.status] || claim.status}
                  </span>
                </div>
                <p className="mt-4 text-sm font-bold text-slate-900">{claim.reason}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{claim.description}</p>
                <p className="mt-3 text-xs text-slate-500">Gửi lúc {dateTime(claim.submitted_at)}</p>
              </section>

              <section className="rounded-2xl border border-[#c0c9bb]/35 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-[#00450d]">Ảnh & video bằng chứng</h3>
                  <span className="text-xs text-slate-500">{claim.evidence?.length || 0} tệp</span>
                </div>
                {claim.evidence?.length ? (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {claim.evidence.map((media) => media.type === "video" ? (
                      <div key={media.id} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
                        <video src={media.url} controls preload="metadata" className="aspect-video w-full object-contain" aria-label={`Video bằng chứng khiếu nại ${claim.claim_id}`} />
                        <p className="flex items-center gap-1.5 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700">
                          <Video className="h-3.5 w-3.5" /> Video bằng chứng
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        key={media.id}
                        onClick={() => setImagePreview(media.url)}
                        className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                        aria-label="Phóng to ảnh bằng chứng"
                      >
                        <img src={media.url} alt={`Ảnh bằng chứng khiếu nại ${claim.claim_id}`} loading="lazy" className="aspect-video w-full object-cover transition-transform group-hover:scale-105" />
                        <span className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-slate-950/65 px-2 py-1.5 text-left text-xs font-semibold text-white">
                          <ImageIcon className="h-3.5 w-3.5" /> Xem ảnh lớn
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Khách hàng chưa đính kèm bằng chứng.</p>
                )}
              </section>

              <section className="rounded-2xl border border-[#c0c9bb]/35 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-[#00450d]">Đơn hàng gốc #{order.order_id}</h3>
                    <p className="mt-1 text-xs text-slate-500">Trạng thái: {order.status} · Đặt {dateTime(order.ordered_at)}</p>
                  </div>
                  <strong className="shrink-0 text-sm text-slate-900">{currency.format(order.total || 0)}</strong>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  Người nhận: {order.address?.recipient_name || "—"} · {order.address?.phone || "—"}
                  <span className="block">{order.address?.detail || "Chưa có địa chỉ giao hàng"}</span>
                </p>
                <ul className="mt-3 divide-y divide-slate-100">
                  {(order.items || []).map((item) => (
                    <li key={item.detail_id} className="flex justify-between gap-3 py-2 text-sm">
                      <span>{item.name} × {item.quantity} {item.unit}</span>
                      <span className="shrink-0 font-semibold">{currency.format(item.line_total)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-slate-600">
                  Thanh toán: {order.payments?.map((payment) => `${payment.method} (${payment.status})`).join(", ") || "Chưa có giao dịch"}
                </p>
                {order.delivery && (
                  <p className="mt-1 text-xs text-slate-600">
                    Giao nhận: {order.delivery.carrier || "—"} · {order.delivery.tracking_number || "—"} · {order.delivery.status}
                  </p>
                )}
              </section>
            </div>

            <div className="space-y-4 border-t border-[#c0c9bb]/35 p-4 sm:p-6 lg:border-l lg:border-t-0">
              {isResolved ? (
                <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="h-5 w-5" />
                    <h3 className="font-bold">Kết quả xử lý</h3>
                  </div>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Trạng thái</dt><dd className="font-semibold">{STATUS_LABELS[claim.status]}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Phương án</dt><dd className="font-semibold">{RESOLUTION_LABELS[claim.resolution] || claim.resolution}</dd></div>
                    {claim.refund_amount !== null && claim.refund_amount !== undefined && (
                      <div className="flex justify-between gap-3"><dt className="text-slate-500">Số tiền hoàn</dt><dd className="font-bold">{currency.format(claim.refund_amount)} · {claim.refund_status === "Cho_xu_ly" ? "Chờ thực hiện thanh toán" : claim.refund_status}</dd></div>
                    )}
                    {claim.replacement_order_id && (
                      <div className="flex justify-between gap-3"><dt className="text-slate-500">Đơn giao bù</dt><dd><Link className="inline-flex items-center gap-1 font-bold text-emerald-800 hover:underline" to={`/sales/orders?order_id=${claim.replacement_order_id}`} onClick={onClose}>Mở đơn #{claim.replacement_order_id}<ExternalLink className="h-3.5 w-3.5" /></Link></dd></div>
                    )}
                    <div><dt className="text-slate-500">Phản hồi CSKH</dt><dd className="mt-1 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-slate-800">{claim.feedback || "—"}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Nhân viên xử lý</dt><dd className="font-semibold">{claim.handler || "—"}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Thời gian</dt><dd className="font-semibold">{dateTime(claim.resolved_at)}</dd></div>
                  </dl>
                </section>
              ) : (
                <>
                  {claim.status === "Cho_xu_ly" && (
                    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm text-amber-900">Hồ sơ này đang chờ nhân viên tiếp nhận.</p>
                      <button
                        type="button"
                        onClick={() => onReceive(claim.claim_id)}
                        disabled={busy}
                        className="mt-3 min-h-10 rounded-xl bg-amber-700 px-4 py-2 text-sm font-bold text-white hover:bg-amber-800 disabled:opacity-50"
                      >
                        {busy ? "Đang tiếp nhận..." : "Tiếp nhận xử lý"}
                      </button>
                    </section>
                  )}

                  <form onSubmit={handleResolve} className="space-y-4 rounded-2xl border border-[#c0c9bb]/35 bg-white p-4 shadow-sm">
                    <h3 className="font-bold text-[#00450d]">Giải quyết khiếu nại</h3>
                    <fieldset className="space-y-2">
                      <legend className="text-sm font-semibold text-slate-700">Kết quả xử lý</legend>
                      <label className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm ${decision === "chap_nhan" ? "border-emerald-600 bg-emerald-50" : "border-slate-200"}`}>
                        <input type="radio" name="claim-decision" value="chap_nhan" checked={decision === "chap_nhan"} onChange={() => setDecision("chap_nhan")} className="mt-1 accent-emerald-700" />
                        <span><strong className="block">Chấp nhận khiếu nại</strong><span className="text-xs text-slate-600">Chọn hoàn tiền hoặc tạo đơn giao bù.</span></span>
                      </label>
                      <label className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm ${decision === "tu_choi" ? "border-red-500 bg-red-50" : "border-slate-200"}`}>
                        <input type="radio" name="claim-decision" value="tu_choi" checked={decision === "tu_choi"} onChange={() => setDecision("tu_choi")} className="mt-1 accent-red-700" />
                        <span><strong className="block">Từ chối khiếu nại</strong><span className="text-xs text-slate-600">Cần nêu rõ lý do trong phản hồi CSKH.</span></span>
                      </label>
                    </fieldset>

                    {decision === "chap_nhan" && (
                      <fieldset className="space-y-2">
                        <legend className="text-sm font-semibold text-slate-700">Phương án hỗ trợ</legend>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => setResolution("hoan_tien")} className={`rounded-xl border px-3 py-2 text-sm font-bold ${resolution === "hoan_tien" ? "border-emerald-700 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-600"}`}>Hoàn tiền</button>
                          <button type="button" onClick={() => setResolution("giao_bu")} className={`rounded-xl border px-3 py-2 text-sm font-bold ${resolution === "giao_bu" ? "border-emerald-700 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-600"}`}>Tạo đơn giao bù</button>
                        </div>
                      </fieldset>
                    )}

                    {decision === "chap_nhan" && resolution === "hoan_tien" && (
                      <label className="block text-sm font-semibold text-slate-700">
                        Số tiền hoàn (VNĐ) <span className="text-red-600">*</span>
                        <input
                          type="number"
                          min="1"
                          max={order.total}
                          step="1"
                          value={refundAmount}
                          onChange={(event) => setRefundAmount(event.target.value)}
                          className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                          placeholder="Nhập số tiền cần hoàn"
                        />
                        <button type="button" onClick={() => setRefundAmount(String(Math.floor(order.total || 0)))} className="mt-2 text-xs font-bold text-emerald-800 hover:underline">
                          Hoàn 100% giá trị đơn ({currency.format(order.total || 0)})
                        </button>
                        <span className="mt-1 block text-xs font-normal text-slate-500">Khoản hoàn được ghi nhận chờ bộ phận thanh toán thực hiện; hệ thống chưa tự chuyển tiền.</span>
                      </label>
                    )}

                    {decision === "chap_nhan" && resolution === "giao_bu" && (
                      <fieldset>
                        <legend className="text-sm font-semibold text-slate-700">Sản phẩm cần giao bù</legend>
                        <div className="mt-2 max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-2">
                          {orderItems.map((item) => {
                            const selected = Boolean(selectedDetails[item.detail_id]?.selected);
                            return (
                              <label key={item.detail_id} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5 text-sm">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  disabled={Number(item.quantity) < 1}
                                  onChange={(event) => toggleProduct(item.detail_id, event.target.checked)}
                                  className="h-4 w-4 accent-emerald-700"
                                />
                                <span className="min-w-0 flex-1">
                                  <strong className="block truncate">{item.name}</strong>
                                  <span className="text-xs text-slate-500">Đã mua {item.quantity} {item.unit}</span>
                                </span>
                                {selected && (
                                  <input
                                    aria-label={`Số lượng giao bù ${item.name}`}
                                    type="number"
                                    min="1"
                                    max={item.quantity}
                                    step="1"
                                    value={selectedDetails[item.detail_id]?.quantity ?? ""}
                                    onChange={(event) => updateQuantity(item.detail_id, event.target.value)}
                                    className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm"
                                  />
                                )}
                              </label>
                            );
                          })}
                          {orderItems.length === 0 && <p className="p-3 text-sm text-slate-500">Đơn hàng không có chi tiết sản phẩm.</p>}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Số lượng giao bù tối đa bằng số lượng đã mua; đơn mới có giá trị 0đ và sẽ giữ tồn kho theo FEFO.</p>
                      </fieldset>
                    )}

                    <label className="block text-sm font-semibold text-slate-700">
                      Mẫu phản hồi CSKH
                      <select
                        defaultValue=""
                        onChange={(event) => {
                          if (event.target.value) setFeedback(event.target.value);
                        }}
                        className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal"
                      >
                        <option value="">Chọn mẫu để điền nhanh (không bắt buộc)</option>
                        {QUICK_REPLIES.map((reply, index) => <option value={reply} key={reply}>Mẫu {index + 1}</option>)}
                      </select>
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">
                      Phản hồi khách hàng <span className="text-red-600">*</span>
                      <textarea
                        value={feedback}
                        onChange={(event) => setFeedback(event.target.value)}
                        rows={4}
                        maxLength={3000}
                        className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                        placeholder="Nhập phản hồi lịch sự, nêu rõ phương án và bước tiếp theo"
                      />
                    </label>

                    {localError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{localError}</p>}
                    <button
                      type="submit"
                      disabled={busy}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#08712b] px-4 py-2 text-sm font-bold text-white hover:bg-[#075b25] disabled:cursor-wait disabled:opacity-60"
                    >
                      {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
                      {busy ? "Đang lưu kết quả..." : "Xác nhận hoàn tất xử lý"}
                    </button>
                  </form>
                </>
              )}

              {claim.replacement_order_id && claim.replacement_order && (
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <h3 className="font-bold text-emerald-900">Đơn giao bù #{claim.replacement_order_id}</h3>
                  <p className="mt-1 text-sm text-emerald-800">Trạng thái: {claim.replacement_order.status} · Tổng tiền {currency.format(claim.replacement_order.total || 0)}</p>
                  <Link to={`/sales/orders?order_id=${claim.replacement_order_id}`} onClick={onClose} className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-emerald-900 hover:underline">
                    Xem đơn giao bù <ExternalLink className="h-4 w-4" />
                  </Link>
                </section>
              )}
            </div>
          </div>
        )}
      </section>

      {imagePreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setImagePreview("")}>
          <button type="button" aria-label="Đóng ảnh phóng to" onClick={() => setImagePreview("")} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
            <X className="h-6 w-6" />
          </button>
          <img src={imagePreview} alt="Ảnh bằng chứng phóng to" className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain" onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
