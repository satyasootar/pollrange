import { useQuery } from "@tanstack/react-query";
import { responsesApi } from "@/api/responses.api";

export function useResponseHistory() {
  return useQuery({
    queryKey: ["response-history"],
    queryFn: async () => {
      const res = await responsesApi.getUserHistory();
      return res.data.data;
    },
  });
}
