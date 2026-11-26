import axios from 'axios';

export class ApiError extends Error {
  constructor({ status, message, errorCode, fieldErrors, rawErrors, toastNotified }) {
    super(message);
    this.name = 'ApiError';
    this.status = status || 0;
    this.errorCode = errorCode || 'UNKNOWN_ERROR';
    this.fieldErrors = fieldErrors || {};
    this.rawErrors = rawErrors || null;
    this.toastNotified = Boolean(toastNotified);
  }
}

export const notifyApiToast = (type, message) => {
  window.dispatchEvent(
    new CustomEvent('app:toast', { detail: { type, message } })
  );
};

export const isApiValidationError = (error) =>
  error?.status === 422 && Object.keys(error?.fieldErrors || {}).length > 0;

export const getApiValidationMessage = (error) => {
  const firstError = Object.values(error?.fieldErrors || {})[0];
  const message = Array.isArray(firstError) ? firstError[0] : firstError;
  return message ? String(message) : "";
};

export const notifyApiErrorToast = (error, fallbackMessage) => {
  if (error?.toastNotified) return;
  notifyApiToast(
    'error',
    error?.message || fallbackMessage || 'Đã xảy ra lỗi. Vui lòng thử lại.'
  );
};

// Chuyển đổi Object chứa File/FileList sang FormData chuẩn cho ảnh/video/PDF
export const buildFormData = (payload = {}) => {
  if (payload instanceof FormData) return payload;

  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (value instanceof FileList) {
      Array.from(value).forEach((file) => formData.append(`${key}[]`, file));
    } else if (Array.isArray(value)) {
      value.forEach((item) => {
        formData.append(
          `${key}[]`,
          item instanceof File || item instanceof Blob ? item : String(item)
        );
      });
    } else if (value instanceof File || value instanceof Blob) {
      formData.append(key, value);
    } else if (typeof value === 'boolean') {
      formData.append(key, value ? '1' : '0');
    } else {
      formData.append(key, String(value));
    }
  });
  return formData;
};

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  timeout: 20000,
  headers: {
    Accept: 'application/json',
    // Tuyệt đối không đặt cứng 'Content-Type' ở đây để không ghi đè boundary của FormData
  },
});

// Request Interceptor: Phân tách chuẩn Content-Type giữa JSON và FormData
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const isFormData =
      typeof FormData !== 'undefined' && config.data instanceof FormData;

    if (isFormData) {
      // Xóa sạch mọi Content-Type để trình duyệt tự sinh multipart/form-data; boundary=...
      if (typeof config.headers?.delete === 'function') {
        config.headers.delete('Content-Type');
        config.headers.delete('content-type');
      }
      if (config.headers) {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
      // Tăng timeout lên 60s cho upload ảnh/video dung lượng lớn
      if (!config.timeout || config.timeout === 20000) {
        config.timeout = 60000;
      }
    } else if (config.data !== undefined && config.data !== null) {
      if (typeof config.headers?.set === 'function') {
        config.headers.set('Content-Type', 'application/json');
      } else if (config.headers) {
        config.headers['Content-Type'] = 'application/json';
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: normalize API errors and notify globally except field-level 422 validation.
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status || 0;
    const resData = error.response?.data || {};
    const errorCode =
      resData.error_code || (status === 0 ? 'NETWORK_ERROR' : 'SERVER_ERROR');

    const fieldErrors = {};
    if (resData.errors && typeof resData.errors === 'object') {
      Object.entries(resData.errors).forEach(([field, messages]) => {
        fieldErrors[field] = Array.isArray(messages) ? messages[0] : String(messages);
      });
    }

    const message =
      resData.message || 'Không thể kết nối đến máy chủ Laravel API.';

    const toastNotified =
      !error.config?.skipGlobalToast &&
      !(status === 422 && Object.keys(fieldErrors).length > 0);
    if (toastNotified) {
      notifyApiToast  ('error', message);
    }

    return Promise.reject(
      new ApiError({
        status,
        message,
        errorCode,
        fieldErrors,
        rawErrors: resData.errors || null,
        toastNotified,
      })
    );
  }
);

// Helper gửi FormData an toàn (tuyệt đối không truyền header Content-Type thủ công)
export const postMultipart = (url, payload, config = {}) => {
  const { headers = {}, ...restConfig } = config;
  const cleanHeaders = { ...headers };
  delete cleanHeaders['Content-Type'];
  delete cleanHeaders['content-type'];

  return axiosClient.post(url, buildFormData(payload), {
    ...restConfig,
    headers: cleanHeaders,
  });
};


export default axiosClient;