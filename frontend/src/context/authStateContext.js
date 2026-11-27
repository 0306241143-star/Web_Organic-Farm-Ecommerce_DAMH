/* React context nội bộ dùng chung cho AuthProvider và useAuth. */
import { createContext } from "react";

const AuthContext = createContext(null);

export default AuthContext;
