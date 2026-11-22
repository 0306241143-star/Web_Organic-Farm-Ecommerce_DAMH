import { Plus, RefreshCw } from "lucide-react";
import EmptyState from "../../common/EmptyState";

export default function AddressBookTab({
  addresses,
  addressLoading,
  handleOpenAddModal,
  handleOpenEditModal,
  handleDeleteAddress,
  handleSetDefault,
}) {
  return (
    <div>
      <div className="border-b border-slate-100 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#191c1b]">Địa Chỉ Của Tôi</h1>
          <p className="text-xs text-[#5a6357] mt-1">
            Quản lý địa chỉ nhận hàng mua lẻ và giao gói định kỳ
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00450d] text-white font-bold text-xs hover:bg-[#006e1c] transition-colors shadow-2xs cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm địa chỉ mới</span>
        </button>
      </div>

      {addressLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <RefreshCw className="w-6 h-6 text-[#00450d] animate-spin" />
        </div>
      ) : addresses.length === 0 ? (
        <div className="py-12">
          <EmptyState
            title="Chưa có địa chỉ nhận hàng"
            message="Hãy thêm địa chỉ giao hàng để hệ thống tự động tính cước và giao nông sản tận nơi."
          />
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="py-5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm text-[#191c1b]">
                    {addr.recipient_name}
                  </span>
                  <span className="text-xs text-slate-300">|</span>
                  <span className="text-xs text-[#5a6357] font-semibold">
                    {addr.phone}
                  </span>
                </div>

                <p className="text-xs text-[#41493e] leading-relaxed">
                  {addr.detail_address}
                </p>
                <p className="text-xs text-[#5a6357]">
                  {[addr.ward, addr.province].filter(Boolean).join(", ")}
                </p>

                {addr.is_default && (
                  <div className="pt-1">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[10.5px] font-bold text-[#00450d] border border-[#00450d] bg-[#00450d]/5">
                      Mặc định
                    </span>
                  </div>
                )}
              </div>

              <div className="flex sm:flex-col items-end gap-2.5 shrink-0 text-right">
                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(addr)}
                    className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    Cập nhật
                  </button>
                  {!addr.is_default && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="font-medium text-rose-600 hover:text-rose-800 cursor-pointer"
                    >
                      Xóa
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleSetDefault(addr.id)}
                  disabled={addr.is_default}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${addr.is_default
                    ? "border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed"
                    : "border-slate-300 text-slate-700 hover:border-[#00450d] hover:text-[#00450d] bg-white"
                    }`}
                >
                  Thiết lập mặc định
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
