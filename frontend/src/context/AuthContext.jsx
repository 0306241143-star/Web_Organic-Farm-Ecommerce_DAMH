/* Provides authentication session state and actions to the application. */
import { useMemo, useState } from "react";
import AuthContext from "./authStateContext";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading] = useState(false);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login: setUser,
      logout: () => setUser(null),
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
