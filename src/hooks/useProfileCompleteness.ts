import { useQuery } from "@tanstack/react-query";
import { photographerProfileService } from "@/services/photographerProfileService";

export const PROFILE_COMPLETENESS_QUERY_KEY = ["photographer-completeness"] as const;

/** Shared checklist for the photographer setup modal, header chip and dashboard banner. */
export function useProfileCompleteness(enabled: boolean) {
  return useQuery({
    queryKey: PROFILE_COMPLETENESS_QUERY_KEY,
    queryFn: () => photographerProfileService.getCompleteness(),
    enabled,
    staleTime: 0, // refetch on every page so the list reflects packages/portfolio changes
    retry: false,
  });
}

/** Any component can open the modal by dispatching this event (the layout listens for it). */
export const OPEN_COMPLETENESS_EVENT = "open-profile-completeness";
export const openProfileCompleteness = () => window.dispatchEvent(new Event(OPEN_COMPLETENESS_EVENT));