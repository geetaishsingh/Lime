import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { serverUrl } from "../App";
import { setUserPosts } from "../redux/user.slice.js";

const useGetUserPosts = () => {
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!user?._id) return;

    let isMounted = true;
    const fetchPosts = async () => {
      try {
        const { data } = await axios.get(`${serverUrl}/api/post/user/posts`, {
          withCredentials: true,
        });
        if (data?.success && isMounted) {
          dispatch(setUserPosts(data?.posts));
        }
      } catch (error) {
        console.error("Failed to fetch user posts:", error?.response?.data || error.message);
      }
    };
    fetchPosts();

    return () => {
      isMounted = false;
    };
  }, [dispatch, user?._id]);
};

export default useGetUserPosts;
