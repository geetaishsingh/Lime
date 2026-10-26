import { createSlice } from "@reduxjs/toolkit";

const savedTheme =
  typeof window !== "undefined"
    ? localStorage.getItem("lime_theme") || "dark"
    : "dark";

const initialState = {
  user: null,
  loading: true,
  theme: savedTheme,
  posts: [],
  userPosts: [],
  myLikes: [],
  myBookmarks: [],
  mySuggestions: [],
  notifications: [],
  unreadNotificationsCount: 0,
  unreadMessagesCount: 0,
  activeStories: [],
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setuser: (state, action) => {
      state.user = action.payload || null;
      state.loading = false;
      if (action.payload && action.payload.bookmarks) {
        state.myBookmarks = action.payload.bookmarks;
      } else if (!action.payload) {
        state.myBookmarks = [];
        state.myLikes = [];
        state.notifications = [];
        state.unreadNotificationsCount = 0;
      }
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
      if (typeof window !== "undefined") {
        localStorage.setItem("lime_theme", action.payload);
        document.documentElement.setAttribute("data-theme", action.payload);
      }
    },
    toggleTheme: (state) => {
      const nextTheme = state.theme === "dark" ? "light" : "dark";
      state.theme = nextTheme;
      if (typeof window !== "undefined") {
        localStorage.setItem("lime_theme", nextTheme);
        document.documentElement.setAttribute("data-theme", nextTheme);
      }
    },
    setPosts: (state, action) => {
      state.posts = action.payload || [];
    },
    addNewPost: (state, action) => {
      if (action.payload && action.payload._id) {
        const exists = state.posts.some((p) => p._id === action.payload._id);
        if (!exists) {
          state.posts.unshift(action.payload);
        }
      }
    },
    removePost: (state, action) => {
      const postId = action.payload;
      state.posts = state.posts.filter((post) => post._id !== postId);
      state.userPosts = state.userPosts.filter((post) => post._id !== postId);
    },
    updatePostInFeed: (state, action) => {
      const updated = action.payload;
      state.posts = state.posts.map((p) => (p._id === updated._id ? updated : p));
    },
    updatePostLikesInFeed: (state, action) => {
      const { postId, userId } = action.payload;
      state.posts = state.posts.map((p) => {
        if (p._id !== postId) return p;
        const currentLikes = p.likes || [];
        const hasLiked = currentLikes.some(
          (id) => (id?._id || id)?.toString() === userId.toString()
        );
        const newLikes = hasLiked
          ? currentLikes.filter((id) => (id?._id || id)?.toString() !== userId.toString())
          : [...currentLikes, userId];
        return { ...p, likes: newLikes };
      });
    },
    toggleBlockUserInState: (state, action) => {
      const targetUserId = action.payload;
      if (!state.user) return;
      if (!state.user.blockedUsers) state.user.blockedUsers = [];
      const isBlocked = state.user.blockedUsers.some(
        (id) => id.toString() === targetUserId.toString()
      );
      if (isBlocked) {
        state.user.blockedUsers = state.user.blockedUsers.filter(
          (id) => id.toString() !== targetUserId.toString()
        );
      } else {
        state.user.blockedUsers.push(targetUserId);
        // Filter out posts of blocked user from feed
        state.posts = state.posts.filter(
          (p) => (p.author?._id || p.author)?.toString() !== targetUserId.toString()
        );
      }
    },
    updateCoverImageInState: (state, action) => {
      if (state.user) {
        state.user.coverImage = action.payload;
      }
    },
    setUserPosts: (state, action) => {
      state.userPosts = action.payload || [];
    },
    setMySuggestion: (state, action) => {
      state.mySuggestions = action.payload || [];
    },
    setMyLikes: (state, action) => {
      state.myLikes = action.payload || [];
    },
    addLiked: (state, action) => {
      const post = action.payload;
      if (!post) return;
      const exists = state.myLikes.some(
        (item) => item?._id?.toString() === post?._id?.toString()
      );
      if (!exists) {
        state.myLikes.unshift(post);
      }
    },
    removeLiked: (state, action) => {
      const postId =
        typeof action.payload === "object" ? action.payload._id : action.payload;
      state.myLikes = state.myLikes.filter(
        (post) => String(post._id) !== String(postId)
      );
    },
    addBookmark: (state, action) => {
      const postId = action.payload;
      if (!postId) return;
      const exists = state.myBookmarks.some(
        (id) => String(id) === String(postId)
      );
      if (!exists) {
        state.myBookmarks.unshift(postId);
      }
    },
    removeBookmark: (state, action) => {
      const postId =
        typeof action.payload === "object" ? action.payload._id : action.payload;
      state.myBookmarks = state.myBookmarks.filter(
        (id) => String(id) !== String(postId)
      );
    },
    // Stories
    setActiveStories: (state, action) => {
      state.activeStories = action.payload || [];
    },
    addNewStory: (state, action) => {
      const newStory = action.payload;
      if (!newStory) return;
      // Update local activeStories group
      const authorId = newStory.author?._id || newStory.author;
      const groupIndex = state.activeStories.findIndex(
        (g) => g.user?._id?.toString() === authorId?.toString()
      );
      if (groupIndex > -1) {
        state.activeStories[groupIndex].stories.push(newStory);
      }
    },
    // Notifications
    setNotifications: (state, action) => {
      state.notifications = action.payload || [];
    },
    addNotification: (state, action) => {
      const notif = action.payload;
      if (notif) {
        state.notifications.unshift(notif);
        state.unreadNotificationsCount += 1;
      }
    },
    setUnreadNotificationsCount: (state, action) => {
      state.unreadNotificationsCount = action.payload || 0;
    },
    markNotificationReadInStore: (state, action) => {
      const id = action.payload;
      state.notifications = state.notifications.map((n) =>
        n._id === id ? { ...n, isRead: true } : n
      );
      state.unreadNotificationsCount = Math.max(
        0,
        state.unreadNotificationsCount - 1
      );
    },
    markAllNotificationsReadInStore: (state) => {
      state.notifications = state.notifications.map((n) => ({
        ...n,
        isRead: true,
      }));
      state.unreadNotificationsCount = 0;
    },
    // Unread messages count (how many distinct people sent messages)
    setUnreadMessagesCount: (state, action) => {
      state.unreadMessagesCount = typeof action.payload === "number" ? action.payload : 0;
    },
    decrementUnreadMessagesCount: (state) => {
      state.unreadMessagesCount = Math.max(0, state.unreadMessagesCount - 1);
    },
    // Reset on logout
    resetUserState: (state) => {
      state.user = null;
      state.loading = false;
      state.posts = [];
      state.userPosts = [];
      state.myLikes = [];
      state.myBookmarks = [];
      state.mySuggestions = [];
      state.notifications = [];
      state.unreadNotificationsCount = 0;
      state.unreadMessagesCount = 0;
      state.activeStories = [];
    },
  },
});

export const {
  setuser,
  setTheme,
  toggleTheme,
  setPosts,
  addNewPost,
  removePost,
  updatePostInFeed,
  updatePostLikesInFeed,
  toggleBlockUserInState,
  updateCoverImageInState,
  setUserPosts,
  setMySuggestion,
  setMyLikes,
  addLiked,
  removeLiked,
  addBookmark,
  removeBookmark,
  setActiveStories,
  addNewStory,
  setNotifications,
  addNotification,
  setUnreadNotificationsCount,
  markNotificationReadInStore,
  markAllNotificationsReadInStore,
  setUnreadMessagesCount,
  decrementUnreadMessagesCount,
  resetUserState,
} = userSlice.actions;

export default userSlice.reducer;
