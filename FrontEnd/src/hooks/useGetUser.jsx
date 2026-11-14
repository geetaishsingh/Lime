import { useEffect } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import { serverUrl } from "../App";
import { setAuthLoading, setuser } from "../store/user.slice.js";

const useGetUser = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    let isMounted = true;
    let retryTimer = null;

    const fetchUser = async (attempt = 0) => {
      try {
        const { data } = await axios.get(`${serverUrl}/api/user/user`, {
          withCredentials: true,
          timeout: 15000,
        });

        if (!isMounted) return;

        if (data && data.success === false) {
          dispatch(setuser(null));
          return;
        }

        dispatch(setuser(data || null));
      } catch (error) {
        if (!isMounted) return;

        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          dispatch(setuser(null));
          return;
        }

        if (attempt < 2) {
          dispatch(setAuthLoading(true));
          retryTimer = setTimeout(() => {
            fetchUser(attempt + 1);
          }, 1000);
          return;
        }

        dispatch(setuser(null));
      }
    };

    fetchUser();

    return () => {
      isMounted = false;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [dispatch]);
};

export default useGetUser;

