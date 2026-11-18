/* Nút bấm dùng chung cho các thao tác trên giao diện. */
import { Loader2 } from "lucide-react";

const VARIANT_CLASSES = {
  primary:
    "bg-[#00450d] hover:bg-[#006e1c] text-white border border-transparent shadow-xs disabled:bg-[#00450d]/50",
  secondary:
    "bg-[#91f78e]/45 hover:bg-[#91f78e]/70 text-[#00450d] border border-[#006e1c]/15",
  outline:
    "bg-white hover:bg-[#f2f4f2] text-[#00450d] border border-[#c0c9bb] hover:border-[#00450d]/50",
  ghost:
    "bg-transparent hover:bg-[#f2f4f2] text-[#41493e] hover:text-[#00450d] border border-transparent",
  danger:
    "bg-red-600 hover:bg-red-700 text-white border border-transparent shadow-xs",
};

const SIZE_CLASSES = {
  sm: "min-h-[36px] px-3.5 py-1.5 text-[12.5px] rounded-xl gap-1.5",
  md: "min-h-[42px] px-5 py-2.5 text-[13.5px] rounded-xl gap-2",
  lg: "min-h-[48px] px-6 py-3 text-[14.5px] rounded-xl gap-2",
};

export default function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  ...props
}) {
  const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary;
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-bold transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00450d] ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />}
      {children}
    </button>
  );
}
