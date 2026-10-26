import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { serverUrl } from "../App";
import { setPosts } from "../redux/user.slice.js";

const useGetPosts = () => {
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  useEffect(() => {
    // Only fetch if authenticated
    if (!user?._id) return;

    let isMounted = true;
    const fetchPosts = async () => {
      try {
        const { data } = await axios.get(`${serverUrl}/api/post/posts`, {
          withCredentials: true,
        });
        if (data?.success && isMounted) {
          dispatch(setPosts(data?.posts));
        }
      } catch (error) {
        console.error("Failed to fetch posts:", error?.response?.data || error.message);
      }
    };
    fetchPosts();

    return () => {
      isMounted = false;
    };
  }, [dispatch, user?._id]);
};

export default useGetPosts;
