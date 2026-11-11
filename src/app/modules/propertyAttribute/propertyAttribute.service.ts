import httpStatus from "http-status";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { findOwnedPropertyOrThrow } from "../property/property.utils";
import {
  MAX_ATTRIBUTES_PER_PROPERTY,
  propertyAttributeSelectFields,
} from "./propertyAttribute.constant";
import type {
  IReplacePropertyAttributesPayload,
  IUpsertPropertyAttributePayload,
} from "./propertyAttribute.interface";
import { findEditablePropertyOrThrow } from "./propertyAttribute.utils";

/**
 * Owner view of a property's attributes, sorted by key.
 * The public sees attributes on the property detail page.
 */
const getPropertyAttributes = async (propertyId: string, ownerId: string) => {
  await findOwnedPropertyOrThrow(propertyId, ownerId);

  return prisma.propertyAttribute.findMany({
    where: { propertyId },
    orderBy: { key: "asc" },
    select: propertyAttributeSelectFields,
  });
};

/** Adds the attribute, or changes its value if the key already exists. */
const upsertPropertyAttribute = async (
  propertyId: string,
  ownerId: string,
  key: string,
  payload: IUpsertPropertyAttributePayload,
) => {
  await findEditablePropertyOrThrow(propertyId, ownerId);

  const existingAttribute = await prisma.propertyAttribute.findUnique({
    where: { propertyId_key: { propertyId, key } },
    select: { id: true },
  });

  if (!existingAttribute) {
    const attributeCount = await prisma.propertyAttribute.count({
      where: { propertyId },
    });

    if (attributeCount >= MAX_ATTRIBUTES_PER_PROPERTY) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `A property can have at most ${MAX_ATTRIBUTES_PER_PROPERTY} attributes`,
      );
    }
  }

  return prisma.propertyAttribute.upsert({
    where: { propertyId_key: { propertyId, key } },
    create: { propertyId, key, value: payload.value },
    update: { value: payload.value },
    select: propertyAttributeSelectFields,
  });
};

/**
 * Replaces every attribute of the property with the list sent.
 * Sending an empty list removes all attributes.
 */
const replacePropertyAttributes = async (
  propertyId: string,
  ownerId: string,
  payload: IReplacePropertyAttributesPayload,
) => {
  await findEditablePropertyOrThrow(propertyId, ownerId);

  // Both steps succeed together or not at all.
  await prisma.$transaction([
    prisma.propertyAttribute.deleteMany({ where: { propertyId } }),
    prisma.propertyAttribute.createMany({
      data: payload.attributes.map((attribute) => ({
        propertyId,
        key: attribute.key,
        value: attribute.value,
      })),
    }),
  ]);

  return prisma.propertyAttribute.findMany({
    where: { propertyId },
    orderBy: { key: "asc" },
    select: propertyAttributeSelectFields,
  });
};

const deletePropertyAttribute = async (
  propertyId: string,
  ownerId: string,
  key: string,
) => {
  await findEditablePropertyOrThrow(propertyId, ownerId);

  const attribute = await prisma.propertyAttribute.findUnique({
    where: { propertyId_key: { propertyId, key } },
    select: { id: true },
  });

  if (!attribute) {
    throw new AppError(httpStatus.NOT_FOUND, "Attribute not found");
  }

  return prisma.propertyAttribute.delete({
    where: { id: attribute.id },
    select: propertyAttributeSelectFields,
  });
};

export const PropertyAttributeService = {
  getPropertyAttributes,
  upsertPropertyAttribute,
  replacePropertyAttributes,
  deletePropertyAttribute,
};
