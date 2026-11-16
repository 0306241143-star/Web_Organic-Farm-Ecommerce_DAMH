import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { GlobalToast } from './components/ErrorDisplay';
import PlaceholderPage, { QuickTestNavbar } from './components/PlaceholderPage';
import ProtectedRoute from './routes/ProtectedRoute';
import LoginTestPage from './pages/LoginTestPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <GlobalToast />
        <QuickTestNavbar />

        <Routes>
          {/* 1. KHU VỰC CÔNG KHAI (Guest & Customer) */}
          <Route path="/" element={<PlaceholderPage title="Trang chủ" cvCode="CV04.1" />} />
          <Route path="/dang-ky" element={<PlaceholderPage title="Đăng ký tài khoản" cvCode="CV04.3" />} />
          <Route path="/dang-nhap" element={<LoginTestPage />} />
          <Route path="/quen-mat-khau" element={<PlaceholderPage title="Quên & Đặt lại mật khẩu" cvCode="CV04.5" />} />
          <Route path="/san-pham" element={<PlaceholderPage title="Danh sách & Lọc sản phẩm" cvCode="CV04.7 - CV04.8" />} />
          <Route path="/san-pham/:id" element={<PlaceholderPage title="Chi tiết sản phẩm" cvCode="CV04.9" />} />
          <Route path="/cau-chuyen-thuong-hieu" element={<PlaceholderPage title="Câu chuyện thương hiệu" cvCode="CV04.10" />} />
          <Route path="/truy-xuat-qr/:maLo" element={<PlaceholderPage title="Quét QR & Truy xuất nguồn gốc" cvCode="CV04.11" />} />

          {/* 2. KHU VỰC KHÁCH HÀNG (Customer) */}
          <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
            <Route path="/gio-hang" element={<PlaceholderPage title="Quản lý giỏ hàng" cvCode="CV04.12" />} />
            <Route path="/thanh-toan" element={<PlaceholderPage title="Đặt mua lẻ & Thanh toán MoMo" cvCode="CV04.13" />} />
            <Route path="/goi-dinh-ky" element={<PlaceholderPage title="Đăng ký gói giao hàng định kỳ" cvCode="CV04.14" />} />
            <Route path="/don-hang" element={<PlaceholderPage title="Theo dõi đơn hàng" cvCode="CV04.15" />} />
            <Route path="/khieu-nai/:maDon" element={<PlaceholderPage title="Gửi yêu cầu khiếu nại" cvCode="CV04.16" />} />
          </Route>

          {/* 3. KHU VỰC NHÂN VIÊN NÔNG TRẠI (Farm_Staff) */}
          <Route element={<ProtectedRoute allowedRoles={['farm_staff', 'admin']} />}>
            <Route path="/farm" element={<PlaceholderPage title="Quản lý mùa vụ & Nhật ký canh tác" cvCode="CV04.17" />} />
            <Route path="/farm/lo-hang" element={<PlaceholderPage title="Tạo lô hàng & In mã QR" cvCode="CV04.18 - CV04.20" />} />
            <Route path="/farm/chung-nhan" element={<PlaceholderPage title="Tải lên chứng nhận & Kiểm định" cvCode="CV04.19" />} />
            <Route path="/farm/xuat-huy" element={<PlaceholderPage title="Kiểm kho & Ghi nhận hao hụt" cvCode="CV04.21" />} />
          </Route>

          {/* 4. KHU VỰC NHÂN VIÊN BÁN HÀNG / CSKH (Sales) */}
          <Route element={<ProtectedRoute allowedRoles={['sales', 'admin']} />}>
            <Route path="/sales" element={<PlaceholderPage title="Xem & Xác nhận đơn hàng" cvCode="CV04.22" />} />
            <Route path="/sales/ton-kho-fefo" element={<PlaceholderPage title="Tồn kho FEFO & Flash Sale" cvCode="CV04.23" />} />
            <Route path="/sales/giao-nhan" element={<PlaceholderPage title="Điều phối giao nhận" cvCode="CV04.24" />} />
            <Route path="/sales/khieu-nai" element={<PlaceholderPage title="Giải quyết khiếu nại" cvCode="CV04.25" />} />
          </Route>

          {/* 5. KHU VỰC QUẢN TRỊ VIÊN (Admin) */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<PlaceholderPage title="Báo cáo & Thống kê quản trị" cvCode="CV04.28" />} />
            <Route path="/admin/nguoi-dung" element={<PlaceholderPage title="Quản lý tài khoản & Phân quyền" cvCode="CV04.26" />} />
            <Route path="/admin/cau-hinh" element={<PlaceholderPage title="Cấu hình tham số vận hành" cvCode="CV04.27" />} />
          </Route>

          {/* TRANG BÁO LỖI PHÂN QUYỀN / KHÔNG TÌM THẤY */}
          <Route path="/403" element={<PlaceholderPage title="403 - Không có quyền truy cập vai trò này" cvCode="CV04.6" />} />
          <Route path="*" element={<PlaceholderPage title="404 - Trang không tồn tại" cvCode="System" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}