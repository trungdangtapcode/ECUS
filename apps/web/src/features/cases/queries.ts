import { ApiError } from "@ecus/api-client";
import type { CaseCreate } from "@ecus/api-client";
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export const caseKeys = {
  all: ["cases"] as const,
  list: (offset: number, archived: boolean) => ["cases", "list", archived, offset] as const,
};
export const pageSize = 20;

export function casesQuery(offset: number, archived = false) {
  return queryOptions({
    queryKey: caseKeys.list(offset, archived),
    queryFn: async ({ signal }) => {
      const { data, error } = await api.GET("/api/v1/cases", {
        params: { query: { limit: pageSize, offset, archived } },
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

export function useSetCaseArchived(id: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async (archived: boolean) => {
      const { data, error } = await api.PUT("/api/v1/cases/{case_id}/archive", {
        params: { path: { case_id: id } },
        body: { archived },
      });
      if (error) throw new ApiError(error);
      return data;
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: caseKeys.all }),
  });
}

export function useDeleteCase(id: string) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async (reference: string) => {
      const { error, response } = await api.DELETE("/api/v1/cases/{case_id}", {
        params: { path: { case_id: id } },
        body: { reference },
      });
      if (error || !response.ok) throw new ApiError(error);
    },
    onSuccess: async () => {
      cache.removeQueries({ queryKey: ["review", id] });
      cache.removeQueries({ queryKey: ["cases", "detail", id] });
      await cache.invalidateQueries({ queryKey: caseKeys.all });
    },
  });
}
