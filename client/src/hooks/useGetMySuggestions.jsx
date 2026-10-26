import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { serverUrl } from "../App";
import { setMySuggestion } from "../redux/user.slice.js";

const useGetMySuggestions = () => {
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!user?._id) return;

    let isMounted = true;
    const fetchSuggestions = async () => {
      try {
        const { data } = await axios.get(
          `${serverUrl}/api/user/my-suggestions`,
          { withCredentials: true }
        );
        if (data?.success && isMounted) {
          dispatch(setMySuggestion(data.users || []));
        }
      } catch (error) {
        console.error("Failed to fetch suggestions:", error?.response?.data || error.message);
      }
    };
    fetchSuggestions();

    return () => {
      isMounted = false;
    };
  }, [dispatch, user?._id]);
};

export default useGetMySuggestions;
