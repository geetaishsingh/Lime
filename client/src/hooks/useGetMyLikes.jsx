import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { serverUrl } from "../App";
import { setMyLikes } from "../redux/user.slice.js";

const useGetMyLikes = () => {
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!user?._id) return;

    let isMounted = true;
    const fetchLikedPosts = async () => {
      try {
        const { data } = await axios.get(`${serverUrl}/api/post/my-likes`, {
          withCredentials: true,
        });
        if (isMounted) {
          dispatch(setMyLikes(Array.isArray(data) ? data : []));
        }
      } catch (error) {
        console.error("Failed to fetch my likes:", error?.response?.data || error.message);
      }
    };
    fetchLikedPosts();

    return () => {
      isMounted = false;
    };
  }, [dispatch, user?._id]);
};

export default useGetMyLikes;
