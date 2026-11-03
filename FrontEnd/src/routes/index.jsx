import { Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import App from "../App.jsx";
import Protected from "./Protected.jsx";
import lazyWithRetry from "../utils/lazyWithRetry";

// Dedicated Skeletons matching route layouts
import HomeSkeleton from "../pages/Home/HomeSkeleton";
import ProfileSkeleton from "../pages/Profile/ProfileSkeleton";
import MessagesSkeleton from "../pages/Messages/MessagesSkeleton";
import SearchSkeleton from "../pages/Search/SearchSkeleton";
import NotificationsSkeleton from "../pages/Notifications/NotificationsSkeleton";
import CreatePostSkeleton from "../pages/CreatePost/CreatePostSkeleton";

// Route-level Code Splitting using React.lazy() & dynamic import
const Home = lazyWithRetry(() => import("../pages/Home/Home"));
const Login = lazyWithRetry(() => import("../pages/Login/Login"));
const Register = lazyWithRetry(() => import("../pages/Register/Register"));
const ForgotPassword = lazyWithRetry(() => import("../pages/ForgotPassword/ForgotPassword"));
const VerifyOtp = lazyWithRetry(() => import("../pages/VerifyOtp/VerifyOtp"));
const Dashboard = lazyWithRetry(() => import("../pages/Dashboard/Dashboard"));
const Profile = lazyWithRetry(() => import("../pages/Profile/Profile"));
const CreatePost = lazyWithRetry(() => import("../pages/CreatePost/CreatePost"));
const EditProfile = lazyWithRetry(() => import("../pages/EditProfile/EditProfile"));
const MessagePage = lazyWithRetry(() => import("../pages/Messages/Messages"));
const Search = lazyWithRetry(() => import("../pages/Search/Search"));
const Notifications = lazyWithRetry(() => import("../pages/Notifications/Notifications"));
const CallPage = lazyWithRetry(() => import("../pages/Call/Call"));

const routes = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "register",
        element: (
          <Suspense fallback={<div className="lime-splash-screen" />}>
            <Register />
          </Suspense>
        ),
      },
      {
        path: "verify-otp",
        element: (
          <Suspense fallback={<div className="lime-splash-screen" />}>
            <VerifyOtp />
          </Suspense>
        ),
      },
      {
        path: "login",
        element: (
          <Suspense fallback={<div className="lime-splash-screen" />}>
            <Login />
          </Suspense>
        ),
      },
      {
        path: "forgot-password",
        element: (
          <Suspense fallback={<div className="lime-splash-screen" />}>
            <ForgotPassword />
          </Suspense>
        ),
      },
      {
        element: <Protected />,
        children: [
          {
            element: (
              <Suspense fallback={<HomeSkeleton />}>
                <Dashboard />
              </Suspense>
            ),
            children: [
              {
                path: "",
                element: (
                  <Suspense fallback={<HomeSkeleton />}>
                    <Home />
                  </Suspense>
                ),
              },
              {
                path: "messages",
                element: (
                  <Suspense fallback={<MessagesSkeleton />}>
                    <MessagePage />
                  </Suspense>
                ),
              },
              {
                path: "messages/:id",
                element: (
                  <Suspense fallback={<MessagesSkeleton />}>
                    <MessagePage />
                  </Suspense>
                ),
              },
              {
                path: "profile/:id",
                element: (
                  <Suspense fallback={<ProfileSkeleton />}>
                    <Profile />
                  </Suspense>
                ),
              },
              {
                path: "create-post",
                element: (
                  <Suspense fallback={<CreatePostSkeleton />}>
                    <CreatePost />
                  </Suspense>
                ),
              },
              {
                path: "edit-profile/:id",
                element: (
                  <Suspense fallback={<ProfileSkeleton />}>
                    <EditProfile />
                  </Suspense>
                ),
              },
              {
                path: "search",
                element: (
                  <Suspense fallback={<SearchSkeleton />}>
                    <Search />
                  </Suspense>
                ),
              },
              {
                path: "notifications",
                element: (
                  <Suspense fallback={<NotificationsSkeleton />}>
                    <Notifications />
                  </Suspense>
                ),
              },
            ],
          },
          {
            path: "/call",
            element: (
              <Suspense fallback={<div className="lime-splash-screen" />}>
                <CallPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
]);

export default routes;
