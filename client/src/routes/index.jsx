import { createBrowserRouter } from "react-router-dom";
import App from "../App.jsx";
import Register from "../pages/Register.jsx";
import Login from "../pages/Login.jsx";
import ForgotPassword from "../pages/ForgotPassword.jsx";
import VerifyOtp from "../pages/VerifyOtp.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import Protected from "./Protected.jsx";
import Layout from "../components/Layout.jsx";
import Profile from "../components/Profile.jsx";
import CreatePost from "../components/CreatePost.jsx";
import EditProfile from "../components/EditProfile.jsx";
import MessagePage from "../components/MessagePage.jsx";
import Search from "../components/Search.jsx";
import Notifications from "../components/Notifications.jsx";
import CallPage from "../pages/CallPage.jsx";

const routes = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "register",
        element: <Register />,
      },
      {
        path: "verify-otp",
        element: <VerifyOtp />,
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "forgot-password",
        element: <ForgotPassword />,
      },
      {
        element: <Protected />,
        children: [
          {
            element: <Dashboard />,
            children: [
              {
                path: "",
                element: <Layout />,
              },
              {
                path: "messages",
                element: <MessagePage />,
              },
              {
                path: "messages/:id",
                element: <MessagePage />,
              },
              {
                path: "profile/:id",
                element: <Profile />,
              },
              {
                path: "create-post",
                element: <CreatePost />,
              },
              {
                path: "edit-profile/:id",
                element: <EditProfile />,
              },
              {
                path: "search",
                element: <Search />,
              },
              {
                path: "notifications",
                element: <Notifications />,
              },
            ],
          },
          {
            path: "/call",
            element: <CallPage />,
          },
        ],
      },
    ],
  },
]);

export default routes;
