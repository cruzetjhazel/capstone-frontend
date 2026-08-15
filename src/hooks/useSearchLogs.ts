import { useQuery, useMutation } from "@tanstack/react-query";
import { searchLogApi } from "@/api/searchLogs";

export function usePopularSearches() {
  return useQuery({
    queryKey: ["search-logs", "popular"],
    queryFn: async () => {
      const { data } = await searchLogApi.popular();
      return ((data as any)?.data ?? data ?? []) as string[];
    },
  });
}

export function useLogSearch() {
  return useMutation({
    mutationFn: (term: string) => searchLogApi.log(term),
  });
}