import { useState } from "react";
import { FieldError } from "../components/ErrorDisplay";
import axiosClient, { postMultipart } from "../services/axiosClient";

export default function ApiTestPage() {
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [result, setResult] = useState(null);

  // Dùng chung luồng gọi API để chuẩn hóa trạng thái lỗi và validation của các thao tác kiểm thử.
  const runRequest = async (request) => {
    setFieldErrors({});
    setResult(null);

    try {
      setResult({ success: true, data: await request() });
    } catch (error) {
      setFieldErrors(error.fieldErrors || {});
      setResult({
        success: false,
        status: error.status,
        error_code: error.errorCode,
        message: error.message,
        errors: error.rawErrors,
      });
    }
  };

  const submitJson = (event) => {
    event.preventDefault();
    runRequest(() =>
      axiosClient.post("/test/json", {
        ten_san_pham: productName,
        so_luong: quantity,
      })
    );
  };

  const submitFormData = (event) => {
    event.preventDefault();
    runRequest(() =>
      postMultipart("/test/upload", {
        mo_ta: description,
        file,
      })
    );
  };

  return (
    <main style={{ maxWidth: 720, margin: "32px auto", padding: 20 }}>
      <h1>Kiểm thử kết nối React - Laravel API</h1>
      <p>Các API kiểm thử chỉ khả dụng trong môi trường phát triển và testing.</p>

      <section>
        <h2>Kết nối và lỗi HTTP</h2>
        <button type="button" onClick={() => runRequest(() => axiosClient.get("/ping"))}>
          Kiểm tra kết nối
        </button>{" "}
        <button type="button" onClick={() => runRequest(() => axiosClient.get("/test/error-401"))}>
          Thử lỗi 401
        </button>{" "}
        <button type="button" onClick={() => runRequest(() => axiosClient.get("/test/error-403"))}>
          Thử lỗi 403
        </button>{" "}
        <button type="button" onClick={() => runRequest(() => axiosClient.get("/not-found"))}>
          Thử lỗi 404
        </button>{" "}
        <button type="button" onClick={() => runRequest(() => axiosClient.get("/test/json"))}>
          Thử lỗi 405
        </button>{" "}
        <button type="button" onClick={() => runRequest(() => axiosClient.get("/test/error-500"))}>
          Thử lỗi 500
        </button>
      </section>

      <section>
        <h2>Gửi JSON và kiểm tra validation</h2>
        <form onSubmit={submitJson}>
          <label>
            Tên sản phẩm
            <input value={productName} onChange={(event) => setProductName(event.target.value)} />
          </label>
          <FieldError error={fieldErrors.ten_san_pham} />
          <label>
            Số lượng
            <input value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </label>
          <FieldError error={fieldErrors.so_luong} />
          <button type="submit">Gửi JSON</button>
        </form>
      </section>

      <section>
        <h2>Gửi FormData</h2>
        <form onSubmit={submitFormData}>
          <label>
            Mô tả
            <input value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <FieldError error={fieldErrors.mo_ta} />
          <label>
            Ảnh hoặc video
            <input
              type="file"
              accept="image/*,video/*,.pdf"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </label>
          <FieldError error={fieldErrors.file} />
          <button type="submit">Gửi FormData</button>
        </form>
      </section>

      {result && (
        <pre role="status" style={{ whiteSpace: "pre-wrap", marginTop: 20 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
