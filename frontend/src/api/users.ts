import { api } from "../lib/api";

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
}

export const usersApi = {
  list: () => api.get<User[]>("/users").then((r) => r.data),
};
