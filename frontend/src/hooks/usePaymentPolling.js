import { useCallback, useEffect, useRef, useState } from "react";

export default function usePaymentPolling() {
  const [isPolling, setIsPolling] = useState(false);
  const activePolls = useRef(0);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const poll = useCallback(async (checkStatus) => {
    if (typeof checkStatus !== "function") {
      throw new TypeError("Payment polling requires a status-check function.");
    }

    activePolls.current += 1;
    if (isMounted.current) setIsPolling(true);

    try {
      return await checkStatus();
    } finally {
      activePolls.current -= 1;
      if (isMounted.current) setIsPolling(activePolls.current > 0);
    }
  }, []);

  return { isPolling, poll };
}
