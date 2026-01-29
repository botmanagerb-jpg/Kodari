import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useBots() {
  return useQuery({
    queryKey: [api.bots.list.path],
    queryFn: async () => {
      const res = await fetch(api.bots.list.path);
      if (!res.ok) throw new Error("Failed to fetch bots");
      return api.bots.list.responses[200].parse(await res.json());
    },
  });
}
