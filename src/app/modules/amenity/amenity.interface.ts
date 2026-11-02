export interface ICreateAmenityPayload {
  name: string;
  icon?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface IUpdateAmenityPayload {
  name?: string;
  icon?: string | null;
  description?: string | null;
}

export interface IUpdateAmenityStatusPayload {
  isActive: boolean;
}
