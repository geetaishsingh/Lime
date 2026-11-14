import { useEffect } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import { serverUrl } from "../config";
import { setAuthLoading, setuser, setAuthState, setNetworkError } from "../store/user.slice.js";
import authStorage from "../utils/authStorage.js";

const useGetUser = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      // 1. Capture OAuth tokens from URL if arriving from Google/GitHub callback
      authStorage.extractAndStoreOAuthTokens();

      const hasToken = authStorage.hasAuth();
      const cachedUser = authStorage.getCachedUser();

      console.info(`[Lime Auth] App initialization - token available: ${hasToken}`);

      if (!hasToken) {
        // No tokens stored locally or in session
        if (isMounted) {
          dispatch(setuser(null));
        }
        return;
      }

      // If cached profile exists, pre-load it to avoid blank/loading flash
      if (cachedUser && isMounted) {
        dispatch(setAuthState({ user: cachedUser, loading: true }));
      } else if (isMounted) {
        dispatch(setAuthLoading(true));
      }

      const reqId = "req_" + Math.random().toString(36).slice(2, 9);
      console.info(`[Lime Auth] Authentication verification started [reqId=${reqId}]`);

      try {
        const { data } = await axios.get(`${serverUrl}/api/user/user`, {
          timeout: 25000, // Generous timeout for mobile networks & cold starts
          headers: {
            "x-request-id": reqId,
          },
        });

        if (!isMounted) return;

        if (data && data._id) {
          console.info(`[Lime Auth] Authentication verification completed [status=200] [reqId=${reqId}]`);
          authStorage.setCachedUser(data);
          dispatch(setuser(data));
          return;
        }

        if (data && data.success === false) {
          console.warn(`[Lime Auth] Verification returned failure payload [reqId=${reqId}]`);
          authStorage.clearTokens();
          authStorage.clearCachedUser();
          dispatch(setuser(null));
        }
      } catch (error) {
        if (!isMounted) return;

        const status = error?.response?.status;
        console.warn(
          `[Lime Auth] Authentication verification request failed [status=${status || "network_timeout"}] [reqId=${reqId}]`
        );

        // Genuine authentication rejection (refresh also failed)
        if (status === 401 || status === 403) {
          console.info("[Lime Auth] Redirect reason: session genuinely invalid / token expired");
          authStorage.clearTokens();
          authStorage.clearCachedUser();
          dispatch(setuser(null));
          return;
        }

        // Network error, timeout, 500, or 503 (Render cold start)
        // CRITICAL: DO NOT DESTROY USER SESSION ON NETWORK/SERVER BLIPS!
        console.info("[Lime Auth] Network/server issue encountered. Preserving session.");
        if (cachedUser) {
          // Restore cached user and exit loading state so app remains usable offline
          dispatch(setAuthState({ user: cachedUser, loading: false }));
        } else {
          // Flag network error so Protected route displays reconnect/retry rather than kicking to /login
          dispatch(setNetworkError(true));
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [dispatch]);
};

export default useGetUser;
