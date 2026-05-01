import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth, type User } from "../../stores/auth";

export function useCurrentUser() {
  const setUser = useAuth((s) => s.setUser);

  const query = useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<User | null> => {
      try {
        const { data } = await api.get<User>("/auth/me");
        return data;
      } catch {
        return null;
      }
    },
    retry: false,
  });

  useEffect(() => {
    if (query.data !== undefined) setUser(query.data);
  }, [query.data, setUser]);

  return query;
}
