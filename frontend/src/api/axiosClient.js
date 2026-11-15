import axios from 'axios';

export class ApiError extends Error {
  constructor({ status, message, errorCode, fieldErrors }) {
    super(message);
    this.name = 'ApiError';
    this.status = status || 0;
    this.errorCode = errorCode || 'UNKNOWN_ERROR';
    this.fieldErrors = fieldErrors || {};
  }
}

// Kênh phát thông báo lỗi toàn cục cho ToastContainer lắng nghe
export const notifyApiToast = (type, message) => {
  window.dispatchEvent(
    new CustomEvent('app:toast', { detail: { type, message } })
  );
};

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Tự động gắn Bearer Token
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Thống nhất dữ liệu nhận về & chuẩn hóa lỗi hiển thị
axiosClient.interceptors.response.use(
  (response) => {
    // Trả thẳng payload chuẩn { success, message, data, meta }
    return response.data;
  },
  (error) => {
    const status = error.response?.status || 0;
    const resData = error.response?.data || {};
    const errorCode = resData.error_code || (status === 0 ? 'NETWORK_ERROR' : 'SERVER_ERROR');

    // Chuẩn hóa lỗi từng trường (422) từ mảng Laravel sang chuỗi đầu tiên của mỗi field
    const fieldErrors = {};
    if (resData.errors && typeof resData.errors === 'object') {
      Object.entries(resData.errors).forEach(([field, messages]) => {
        fieldErrors[field] = Array.isArray(messages) ? messages[0] : String(messages);
      });
    }

    let message = resData.message || 'Không thể kết nối đến máy chủ Laravel.';

    if (status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('auth_user');
      window.dispatchEvent(new Event('auth:unauthorized'));
      notifyApiToast('error', message);
    } else if (status === 403) {
      notifyApiToast('error', message);
    } else if (status >= 500 || status === 0) {
      notifyApiToast('error', message);
    }
    // Riêng lỗi 422 (Validation) trả về form để hiển thị trực tiếp dưới ô input, không spam toast

    return Promise.reject(
      new ApiError({ status, message, errorCode, fieldErrors })
    );
  }
);

// Helper gửi FormData (ảnh/video minh chứng) dùng chung quy ước lỗi
export const postMultipart = (url, formData) =>
  axiosClient.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export default axiosClient;