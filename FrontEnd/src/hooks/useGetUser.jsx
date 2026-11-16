import { useEffect } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import { serverUrl } from "../config";
import {
  setAuthLoading,
  setuser,
  setAuthState,
  setAuthVerificationError,
} from "../store/user.slice.js";
import authStorage from "../utils/authStorage.js";

const useGetUser = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      authStorage.extractAndStoreOAuthTokens();
      const cachedUser = authStorage.getCachedUser();

      // If cached profile exists, pre-load it to avoid blank/loading flash
      if (cachedUser && isMounted) {
        dispatch(setAuthState({ user: cachedUser, loading: true }));
      } else if (isMounted) {
        dispatch(setAuthLoading(true));
      }

      const reqId = "req_" + Math.random().toString(36).slice(2, 9);
      try {
        const { data } = await axios.get(`${serverUrl}/api/user/user`, {
          timeout: 25000, // Generous timeout for mobile networks & cold starts
          headers: {
            "x-request-id": reqId,
          },
        });

        if (!isMounted) return;

        if (data && data._id) {
          authStorage.setCachedUser(data);
          dispatch(setuser(data));
          return;
        }

        if (data?.success === false) {
          throw new Error("Session verification was rejected.");
        }

        throw new Error("Session verification returned an invalid response.");
      } catch (error) {
        if (!isMounted) return;

        const status = error?.response?.status;
        const userWasDeleted =
          status === 404 &&
          error?.response?.data?.message?.toLowerCase() === "user not found";

        if (status === 401 || userWasDeleted) {
          authStorage.clearTokens();
          authStorage.clearCachedUser();
          dispatch(setuser(null));
          return;
        }

        if (cachedUser) {
          dispatch(setAuthState({ user: cachedUser, loading: false }));
        }
        dispatch(setAuthVerificationError(status || "network"));
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [dispatch]);
};

export default useGetUser;
