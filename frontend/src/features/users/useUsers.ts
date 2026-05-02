import { useQuery } from "@tanstack/react-query";
import { usersApi } from "../../api/users";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: usersApi.list,
    staleTime: 5 * 60_000, // user list rarely changes
  });
}
