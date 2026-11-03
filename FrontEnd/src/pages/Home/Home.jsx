import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import Posts from "../../components/Posts";
import StoriesBar from "../../components/StoriesBar";
import RightSidebar from "../../components/RightSidebar";
import { socket } from "../../socket";
import { addNewPost, removePost } from "../../store/user.slice";
import { serverUrl } from "../../config";
import "./Home.scss";

export const Home = () => {
  const { posts } = useSelector((state) => state.user);
  const [activeFeedTab, setActiveFeedTab] = useState("for-you");
  const [followingPosts, setFollowingPosts] = useState([]);
  const [_loadingFeed, setLoadingFeed] = useState(false);
  const dispatch = useDispatch();

  // Socket event listeners with cleanup
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
          setFollowingPosts(data.posts || []);
        }
      } catch (err) {
        console.error("Failed to fetch following feed:", err);
      } finally {
        setLoadingFeed(false);
      }
    }
  };

  const feedPosts = activeFeedTab === "for-you" ? posts : followingPosts;

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
        <RightSidebar />
      </div>
    </div>
  );
};

export default Home;
