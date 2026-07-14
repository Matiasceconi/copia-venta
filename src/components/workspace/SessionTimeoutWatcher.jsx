import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";

const TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes of inactivity
const WARN_BEFORE_MS = 5 * 60 * 1000; // warn 5 min before

const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

/**
 * Silent watcher — no UI. Logs out after TIMEOUT_MS of inactivity.
 * Warns via native alert 5 minutes before.
 */
export default function SessionTimeoutWatcher() {
  const { isAuthenticated, logout } = useAuth();
  const timerRef = useRef(null);
  const warnRef = useRef(null);
  const warnedRef = useRef(false);

  function reset() {
    warnedRef.current = false;
    clearTimeout(timerRef.current);
    clearTimeout(warnRef.current);

    warnRef.current = setTimeout(() => {
      if (!warnedRef.current) {
        warnedRef.current = true;
        // Use non-blocking notification to avoid freezing the timer
        const event = new CustomEvent("session-expiring-soon");
        window.dispatchEvent(event);
      }
    }, TIMEOUT_MS - WARN_BEFORE_MS);

    timerRef.current = setTimeout(() => {
      logout(true);
    }, TIMEOUT_MS);
  }

  useEffect(() => {
    if (!isAuthenticated) return;

    reset();
    EVENTS.forEach(ev => window.addEventListener(ev, reset, { passive: true }));

    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(warnRef.current);
      EVENTS.forEach(ev => window.removeEventListener(ev, reset));
    };
  }, [isAuthenticated]);

  return null;
}