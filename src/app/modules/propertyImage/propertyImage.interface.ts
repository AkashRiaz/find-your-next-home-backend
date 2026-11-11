export interface IUpdatePropertyImagePayload {
  altText: string | null;
}

/** Every image id of the listing, in the new display order. */
export interface IReorderPropertyImagesPayload {
  imageIds: string[];
}
