import createClient from "openapi-fetch";
import type { components, paths } from "./schema";

export type CaseCreate = components["schemas"]["CaseCreate"];
export type CaseRead = components["schemas"]["CaseRead"];
export type ProfileRead = components["schemas"]["ProfileRead"];

export function createApiClient(baseUrl = "") {
  return createClient<paths>({ baseUrl });
}

export class ApiError extends Error {
  readonly code: string;
  readonly requestId: string | undefined;

  constructor(error: unknown) {
    super("The API request failed.");
    this.name = "ApiError";
    const body = error && typeof error === "object" && "error" in error ? error.error : undefined;
    this.code =
      body && typeof body === "object" && "code" in body && typeof body.code === "string"
        ? body.code
        : "request_failed";
    this.requestId =
      body &&
      typeof body === "object" &&
      "request_id" in body &&
      typeof body.request_id === "string"
        ? body.request_id
        : undefined;
  }
}

export type ReviewWorkspace = components["schemas"]["WorkspaceRead"];
export type ReviewObservationInput = components["schemas"]["ObservationInput"];
export type ReviewTemplateInput = components["schemas"]["TemplateInput"];
export type ReviewMapping = components["schemas"]["Mapping"];
export type ReviewPolicy = components["schemas"]["PolicyInput"]["policy"];
export type ReviewCorrectionInput = components["schemas"]["CorrectionInput"];
