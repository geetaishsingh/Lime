import { useEffect } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import { serverUrl } from "../App";
import { setAuthVerificationError, setuser } from "../store/user.slice.js";

const useGetUser = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    let isMounted = true;
    const fetchUser = async () => {
      try {
        const { data } = await axios.get(`${serverUrl}/api/user/user`, {
          withCredentials: true,
        });
        if (isMounted) {
          dispatch(setuser(data));
        }
      } catch (error) {
        if (!isMounted) return;

        const status = error.response?.status;
        const userWasDeleted =
          status === 404 && error.response?.data?.message === "User not found";

        if (status === 401 || userWasDeleted) {
          dispatch(setuser(null));
        } else {
          dispatch(setAuthVerificationError(status || null));
        }
      }
    };
    fetchUser();
    return () => {
      isMounted = false;
    };
  }, [dispatch]);
};

export default useGetUser;

