import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { presenceService, getPageLabel } from "@/services/presenceService";

/**
 * PresenceTracker - Invisible global component.
 * Tracks the current user's location and broadcasts it via Supabase Realtime Presence.
 * Must be placed inside AppLayout (so it has access to router context and auth).
 */
export function PresenceTracker() {
  const location = useLocation();
  const { user } = useAuth();
  const hasJoined = useRef(false);

  // Join on mount / user load
  useEffect(() => {
    if (!user) return;

    const currentPage = location.pathname;
    const currentPageLabel = getPageLabel(currentPage);

    presenceService.join({
      userId: user.id,
      name: user.name || user.email || "Usuário",
      role: user.role || "DESCONHECIDO",
      currentPage,
      currentPageLabel,
    });

    hasJoined.current = true;

    return () => {
      presenceService.leave();
    };
  }, [user?.id]); // Only re-join if user changes

  // Update page on route change
  useEffect(() => {
    if (!hasJoined.current) return;
    const label = getPageLabel(location.pathname);
    presenceService.updatePage(location.pathname, label);
  }, [location.pathname]);

  return null;
}
