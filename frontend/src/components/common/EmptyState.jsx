/* Khối hiển thị trạng thái trống dùng chung khi danh sách hoặc kết quả lọc không có dữ liệu. */
import { Sprout } from "lucide-react";
import Button from "./Button";

export default function EmptyState({
  icon: Icon = Sprout,
  title = "Không tìm thấy kết quả phù hợp",
  message = "Chưa có dữ liệu.",
  actionLabel = "",
  onAction = null,
  className = "",
}) {
  return (
    <div
      className={`w-full rounded-3xl border border-[#c0c9bb]/40 bg-white px-6 py-12 text-center flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-[#f2f4f2] border border-[#c0c9bb]/40 text-[#006e1c] flex items-center justify-center mb-4">
        <Icon className="w-7 h-7" aria-hidden="true" />
      </div>
      <h3 className="text-[17px] font-bold text-[#191c1b] tracking-tight">
        {title}
      </h3>
      <p className="mt-1.5 text-[13.5px] text-[#5a6357] max-w-md leading-relaxed">
        {message}
      </p>
      {actionLabel && typeof onAction === "function" && (
        <div className="mt-5">
          <Button variant="outline" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
