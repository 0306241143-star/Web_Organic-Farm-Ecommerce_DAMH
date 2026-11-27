import { useEffect, useState } from "react";

export default function useDebounce(value, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  // Chỉ cập nhật giá trị sau khoảng trễ và hủy bộ đếm trước mỗi thay đổi mới.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
