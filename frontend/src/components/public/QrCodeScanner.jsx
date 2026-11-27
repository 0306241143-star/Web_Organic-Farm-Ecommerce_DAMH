import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Search } from "lucide-react";

// Chuẩn hóa cả mã QR thô lẫn đường dẫn truy xuất thành mã ngắn để tra cứu.
function extractTraceCode(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";

  try {
    const url = new URL(rawValue, window.location.origin);
    const match = url.pathname.match(/\/trace\/([^/]+)\/?$/i);
    if (match) return decodeURIComponent(match[1]);
  } catch {
    return rawValue;
  }

  return rawValue;
}

function cameraErrorMessage(error) {
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
    return "Vui lòng cấp quyền camera để quét mã QR.";
  }
  if (error?.name === "NotFoundError" || error?.name === "OverconstrainedError") {
    return "Không tìm thấy camera phù hợp trên thiết bị.";
  }
  if (error?.name === "NotReadableError") {
    return "Camera đang được ứng dụng khác sử dụng.";
  }
  return "Không thể khởi động camera. Vui lòng nhập mã QR để tra cứu.";
}

export default function QrCodeScanner({ onCodeScanned }) {
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const scanningRef = useRef(false);

  // Dừng vòng quét và giải phóng camera để tránh rò rỉ stream khi chuyển trạng thái.
  const stopCamera = () => {
    scanningRef.current = false;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsScanning(false);
  };

  // Dọn dẹp requestAnimationFrame và luồng camera khi component bị gỡ khỏi giao diện.
  useEffect(() => () => {
    scanningRef.current = false;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  // Chặn submit rỗng và chuyển mã hợp lệ sang trang kết quả truy xuất.
  const submitCode = (event) => {
    event.preventDefault();
    const code = extractTraceCode(manualCode);
    if (!code) {
      setErrorMessage("Vui lòng nhập mã QR hoặc đường dẫn truy xuất.");
      return;
    }

    stopCamera();
    setErrorMessage("");
    onCodeScanned(code);
  };

  // Khởi động camera từng frame và dừng ngay khi phát hiện mã QR hợp lệ.
  const startCamera = async () => {
    if (scanningRef.current) return;
    setErrorMessage("");

    if (!window.BarcodeDetector) {
      setErrorMessage("Trình duyệt chưa hỗ trợ quét QR bằng camera. Vui lòng nhập mã để tra cứu.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("Thiết bị không hỗ trợ camera. Vui lòng nhập mã QR để tra cứu.");
      return;
    }

    try {
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });

      const video = videoRef.current;
      video.srcObject = streamRef.current;
      await video.play();
      scanningRef.current = true;
      setIsScanning(true);

      const scanFrame = async () => {
        if (!scanningRef.current || !videoRef.current) return;

        try {
          const results = await detector.detect(videoRef.current);
          const code = results
            .map((result) => extractTraceCode(result.rawValue))
            .find(Boolean);

          if (code) {
            stopCamera();
            onCodeScanned(code);
            return;
          }
        } catch {
          stopCamera();
          setErrorMessage("Không đọc được mã QR. Vui lòng thử lại hoặc nhập mã thủ công.");
          return;
        }

        if (scanningRef.current) {
          frameRef.current = requestAnimationFrame(scanFrame);
        }
      };

      frameRef.current = requestAnimationFrame(scanFrame);
    } catch (error) {
      stopCamera();
      setErrorMessage(cameraErrorMessage(error));
    }
  };

  return (
    <section
      aria-label="Quét mã QR truy xuất nguồn gốc"
      className="rounded-3xl border border-[#c0c9bb]/35 bg-white p-5 shadow-2xs sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-[#00450d]">
            Quét mã QR truy xuất nguồn gốc
          </h2>
          <p className="mt-1 text-sm text-[#5a6357]">
            Quét mã trên bao bì hoặc nhập mã/đường dẫn QR.
          </p>
        </div>
        {isScanning ? (
          <button
            type="button"
            onClick={stopCamera}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#c0c9bb]/50 px-4 py-2 text-sm font-bold text-[#41493e] hover:bg-[#f8faf8]"
          >
            <CameraOff className="h-4 w-4" />
            Tắt camera
          </button>
        ) : (
          <button
            type="button"
            onClick={startCamera}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#00450d] px-4 py-2 text-sm font-bold text-white hover:bg-[#006e1c]"
          >
            <Camera className="h-4 w-4" />
            Bật camera
          </button>
        )}
      </div>

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        aria-label="Hình ảnh camera quét mã QR"
        className={`${isScanning ? "mt-4 block" : "hidden"} aspect-video max-h-80 w-full rounded-2xl bg-black object-cover`}
      />

      <form onSubmit={submitCode} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="trace-qr-code" className="sr-only">
          Mã QR hoặc đường dẫn truy xuất
        </label>
        <input
          id="trace-qr-code"
          value={manualCode}
          onChange={(event) => setManualCode(event.target.value)}
          placeholder="Ví dụ: QR-LH20261110-A01"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#c0c9bb]/60 px-3 text-sm outline-none focus:border-[#006e1c] focus:ring-2 focus:ring-emerald-100"
        />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#006e1c] px-4 py-2 text-sm font-bold text-[#006e1c] hover:bg-emerald-50"
        >
          <Search className="h-4 w-4" />
          Tra cứu
        </button>
      </form>

      {errorMessage && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-700">
          {errorMessage}
        </p>
      )}
    </section>
  );
}
