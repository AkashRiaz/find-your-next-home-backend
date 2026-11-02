import type { LocationType } from "../../../generated/prisma/enums";

export interface ICreateLocationPayload {
  name: string;
  type: LocationType;
  parentId?: string | null;
  isActive?: boolean;
}

export interface IUpdateLocationPayload {
  name: string;
}

export interface IUpdateLocationStatusPayload {
  isActive: boolean;
}

export interface ILocationQuery {
  parentId?: string;
  type?: LocationType;
  searchTerm?: string;
}

/** Minimal shape needed to walk up the location tree. */
export interface ILocationTreeNode {
  id: string;
  parentId: string | null;
}
