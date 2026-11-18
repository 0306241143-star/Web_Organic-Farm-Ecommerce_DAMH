/* Nhãn hiển thị trạng thái, chứng nhận và danh mục dùng chung. */
const VARIANT_CLASSES = {
  primary: "bg-[#00450d] text-white border border-[#00450d]",
  success: "bg-[#91f78e]/35 text-[#00450d] border border-[#006e1c]/20",
  warning: "bg-amber-50 text-amber-800 border border-amber-200/80",
  danger: "bg-red-50 text-red-700 border border-red-200/80",
  flash: "bg-orange-500 text-white border border-orange-500",
  neutral: "bg-[#f2f4f2] text-[#41493e] border border-[#c0c9bb]/50",
  surface: "bg-white/95 text-[#00450d] border border-[#c0c9bb]/40 backdrop-blur-xs",
};

const SIZE_CLASSES = {
  xs: "px-2 py-0.5 text-[11px] gap-1",
  sm: "px-2.5 py-1 text-[12px] gap-1.5",
};

export default function Badge({
  children,
  variant = "neutral",
  size = "xs",
  icon: Icon = null,
  className = "",
}) {
  const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.neutral;
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.xs;

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full leading-none whitespace-nowrap ${variantClass} ${sizeClass} ${className}`}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
}
