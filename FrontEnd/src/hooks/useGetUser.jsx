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

const isCurrentUserNotFound = (error) => {
  const message = error?.response?.data?.message;
  return (
    error?.response?.status === 404 &&
    (error?.response?.data?.code === "USER_NOT_FOUND" ||
      (typeof message === "string" &&
        message.trim().toLowerCase() === "user not found"))
  );
};

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
        const requestCurrentUser = () =>
          axios.get(`${serverUrl}/api/user`, {
            timeout: 25000, // Generous timeout for mobile networks & cold starts
            headers: {
              "x-request-id": reqId,
            },
          });

        let response;
        try {
          response = await requestCurrentUser();
        } catch (error) {
          const bearerUserMissing =
            isCurrentUserNotFound(error) && authStorage.getAccessToken();

          if (!bearerUserMissing) throw error;

          // A stale local bearer token can override a valid session cookie.
          authStorage.setAccessToken(null);
          response = await requestCurrentUser();
        }

        const { data } = response;

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
        const userWasDeleted = isCurrentUserNotFound(error);

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
