import type { PropertyType } from "../../../generated/prisma/enums";

export interface ICreatePropertyCategoryPayload {
  name: string;
  type: PropertyType;
  description?: string | null;
  icon?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface IUpdatePropertyCategoryPayload {
  name?: string;
  type?: PropertyType;
  description?: string | null;
  icon?: string | null;
  sortOrder?: number;
}

export interface IUpdatePropertyCategoryStatusPayload {
  isActive: boolean;
}
