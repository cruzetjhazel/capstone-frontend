import { useQuery } from "@tanstack/react-query";
import { clientService } from "@/services/clientService";

export function useClients() {
  return useQuery({
    queryKey: ["studioClients"],
    queryFn: () => clientService.list(),
    staleTime: 60_000,
  });
}