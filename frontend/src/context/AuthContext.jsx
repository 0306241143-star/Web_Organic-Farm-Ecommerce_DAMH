/* Provides authentication session state and actions to the application (RBAC). */
import { useEffect, useMemo, useState, useCallback } from "react";
import AuthContext from "./authStateContext";
import { authApi } from "../services/authApi";

export function AuthProvider({ children }) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginRedirectTo, setLoginRedirectTo] = useState(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerRedirectTo, setRegisterRedirectTo] = useState(null);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);

  const openLoginModal = useCallback((redirectTo = null) => {
    setIsRegisterModalOpen(false);
    setRegisterRedirectTo(null);
    setIsForgotPasswordModalOpen(false);
    setLoginRedirectTo(redirectTo);
    setIsLoginModalOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => {
    setIsLoginModalOpen(false);
    setLoginRedirectTo(null);
  }, []);

  const openRegisterModal = useCallback((redirectTo = null) => {
    setIsLoginModalOpen(false);
    setLoginRedirectTo(null);
    setIsForgotPasswordModalOpen(false);
    setRegisterRedirectTo(redirectTo);
    setIsRegisterModalOpen(true);
  }, []);

  const closeRegisterModal = useCallback(() => {
    setIsRegisterModalOpen(false);
    setRegisterRedirectTo(null);
  }, []);

  const openForgotPasswordModal = useCallback(() => {
    setIsLoginModalOpen(false);
    setLoginRedirectTo(null);
    setIsRegisterModalOpen(false);
    setRegisterRedirectTo(null);
    setIsForgotPasswordModalOpen(true);
  }, []);

  const closeForgotPasswordModal = useCallback(() => {
    setIsForgotPasswordModalOpen(false);
  }, []);

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(() => {
    return Boolean(localStorage.getItem("access_token"));
  });

  // Xác thực token và đồng bộ thông tin phiên làm việc từ server khi khởi chạy ứng dụng
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      return;
    }

    authApi
      .me()
      .then((res) => {
        const userData = res?.data?.user;
        if (userData) {
          const permissions = res?.data?.permissions || [];
          const updatedUser = {
            ...userData,
            permissions,
          };
          setUser(updatedUser);
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
      })
      .catch((err) => {
        if (err.status === 401 || err.status === 403) {
          setUser(null);
          localStorage.removeItem("user");
          localStorage.removeItem("access_token");
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback((userData, token = null) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem("user", JSON.stringify(userData));
    }
    if (token) {
      localStorage.setItem("access_token", token);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn("Lỗi khi gọi API logout:", err);
    } finally {
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("access_token");
    }
  }, []);

  const hasRole = useCallback(
    (roleOrRoles) => {
      if (!user) return false;
      const userRole = user.role || (Array.isArray(user.roles) ? user.roles[0] : null);
      if (!userRole) return false;

      if (Array.isArray(roleOrRoles)) {
        return roleOrRoles.includes(userRole);
      }
      return userRole === roleOrRoles;
    },
    [user]
  );

  const hasPermission = useCallback(
    (permission) => {
      if (!user || !Array.isArray(user.permissions)) return false;
      return user.permissions.includes(permission);
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isLoginModalOpen,
      loginRedirectTo,
      openLoginModal,
      closeLoginModal,
      isRegisterModalOpen,
      registerRedirectTo,
      openRegisterModal,
      closeRegisterModal,
      isForgotPasswordModalOpen,
      openForgotPasswordModal,
      closeForgotPasswordModal,
      login,
      logout,
      setUser,
      hasRole,
      hasPermission,
      isCustomer: user?.role === "customer",
      isFarmStaff: user?.role === "farm_staff",
      isSales: user?.role === "sales",
      isAdmin: user?.role === "admin",
    }),
    [
      user,
      isLoading,
      isLoginModalOpen,
      loginRedirectTo,
      openLoginModal,
      closeLoginModal,
      isRegisterModalOpen,
      registerRedirectTo,
      openRegisterModal,
      closeRegisterModal,
      isForgotPasswordModalOpen,
      openForgotPasswordModal,
      closeForgotPasswordModal,
      login,
      logout,
      hasRole,
      hasPermission,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}