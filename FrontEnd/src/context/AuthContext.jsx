import { createContext, useContext } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setuser, resetUserState } from "../store/user.slice";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { user, loading } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  const updateUser = (userData) => {
    dispatch(setuser(userData));
  };

  const logout = () => {
    dispatch(resetUserState());
  };

  return (
    <AuthContext.Provider value={{ user, loading, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
