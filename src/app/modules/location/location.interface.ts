import { LocationType } from "../../../generated/prisma/enums";

export interface CreateLocationPayload {
  name: string;
  type: LocationType;
  parentId?: string | null;
  isActive?: boolean;
}

export interface UpdateLocationPayload {
  name: string;
}

export interface UpdateLocationStatusPayload {
  isActive: boolean;
}

export interface LocationQuery {
  parentId?: string;
  type?: LocationType;
  searchTerm?: string;
}
