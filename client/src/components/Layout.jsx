import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import Posts from "./Posts";
import StoriesBar from "./StoriesBar";
import RightSideBar from "./RightSideBar";
import { socket } from "../socket";
import { addNewPost, removePost, setPosts } from "../redux/user.slice";
import { serverUrl } from "../App";

const Layout = () => {
  const { posts } = useSelector((state) => state.user);
  const [activeFeedTab, setActiveFeedTab] = useState("for-you");
  const [feedPosts, setFeedPosts] = useState(posts);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const dispatch = useDispatch();

  // Socket event listeners with cleanup (NO memory leak)
  useEffect(() => {
    const handlePostCreated = (post) => {
      dispatch(addNewPost(post));
    };

    const handlePostDeleted = (postId) => {
      dispatch(removePost(postId));
    };

    socket.on("post-created", handlePostCreated);
    socket.on("delete-post", handlePostDeleted);

    return () => {
      socket.off("post-created", handlePostCreated);
      socket.off("delete-post", handlePostDeleted);
    };
  }, [dispatch]);

  // Keep feedPosts in sync with redux posts when on for-you tab
  useEffect(() => {
    if (activeFeedTab === "for-you") {
      setFeedPosts(posts);
    }
  }, [posts, activeFeedTab]);

  const handleTabChange = async (tab) => {
    setActiveFeedTab(tab);
    if (tab === "following") {
      try {
        setLoadingFeed(true);
        const { data } = await axios.get(
          `${serverUrl}/api/post/posts?filter=following`,
          { withCredentials: true }
        );
        if (data?.success) {
          setFeedPosts(data.posts || []);
        }
      } catch (err) {
        console.error("Failed to fetch following feed:", err);
      } finally {
        setLoadingFeed(false);
      }
    } else {
      setFeedPosts(posts);
    }
  };

  return (
    <div className="feed-container">
      <div className="feed-inner-container">
        <main className="central-feed-column">
          {/* 24-Hour Stories Bar */}
          <StoriesBar />

          {/* Posts Feed */}
          <Posts
            posts={feedPosts}
            activeFeedTab={activeFeedTab}
            onTabChange={handleTabChange}
          />
        </main>

        {/* Right Sidebar Suggestions */}
        <RightSideBar />
      </div>
    </div>
  );
};

export default Layout;
