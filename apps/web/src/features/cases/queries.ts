import { ApiError } from "@ecus/api-client";
import type { CaseCreate } from "@ecus/api-client";
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export const caseKeys = {
  all: ["cases"] as const,
  list: (offset: number) => ["cases", "list", offset] as const,
};
export const pageSize = 20;

export function casesQuery(offset: number) {
  return queryOptions({
    queryKey: caseKeys.list(offset),
    queryFn: async ({ signal }) => {
      const { data, error } = await api.GET("/api/v1/cases", {
        params: { query: { limit: pageSize, offset } },
        signal,
      });
      if (error) throw new ApiError(error);
      return data;
    },
  });
}

export function caseQuery(id: string) {
  return queryOptions({
    queryKey: ["cases", "detail", id],
    queryFn: async ({ signal }) => {
      const { data, error } = await api.GET("/api/v1/cases/{case_id}", {
        params: { path: { case_id: id } },
        signal,
      });
      if (error) throw new ApiError(error);
      return data;
    },
  });
}

export const profilesQuery = queryOptions({
  queryKey: ["reference", "profiles"],
  queryFn: async ({ signal }) => {
    const { data, error } = await api.GET("/api/v1/reference/profiles", { signal });
    if (error) throw new ApiError(error);
    return data;
  },
});

export function useCreateCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CaseCreate) => {
      const { data, error } = await api.POST("/api/v1/cases", { body });
      if (error) throw new ApiError(error);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: caseKeys.all }),
  });
}
