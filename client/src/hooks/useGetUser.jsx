import { useEffect } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import { serverUrl } from "../App";
import { setuser } from "../redux/user.slice.js";

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
        if (isMounted) {
          dispatch(setuser(null));
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
