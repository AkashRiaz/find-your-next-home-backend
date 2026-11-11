import { z } from "zod";
import {
  ATTRIBUTE_KEY_MAX_LENGTH,
  ATTRIBUTE_KEY_PATTERN,
  ATTRIBUTE_LIST_VALUE_MAX_ITEMS,
  ATTRIBUTE_TEXT_VALUE_MAX_LENGTH,
  MAX_ATTRIBUTES_PER_PROPERTY,
} from "./propertyAttribute.constant";

const propertyIdSchema = z.uuid({
  message: "Property id must be a valid UUID",
});

const attributeKeySchema = z
  .string({ message: "Attribute key is required" })
  .trim()
  .min(1, { message: "Attribute key cannot be empty" })
  .max(ATTRIBUTE_KEY_MAX_LENGTH, {
    message: `Attribute key must be at most ${ATTRIBUTE_KEY_MAX_LENGTH} characters`,
  })
  .regex(ATTRIBUTE_KEY_PATTERN, {
    message:
      'Attribute key must be snake_case, e.g. "gas_type" or "water_source"',
  });

const textValueSchema = z
  .string()
  .trim()
  .min(1, { message: "Attribute value cannot be empty" })
  .max(ATTRIBUTE_TEXT_VALUE_MAX_LENGTH, {
    message: `Attribute value must be at most ${ATTRIBUTE_TEXT_VALUE_MAX_LENGTH} characters`,
  });

/** e.g. "line", 2, true, or ["north", "south"] */
const attributeValueSchema = z.union(
  [
    textValueSchema,
    z.number(),
    z.boolean(),
    z
      .array(z.union([textValueSchema, z.number()]))
      .min(1, { message: "Attribute list cannot be empty" })
      .max(ATTRIBUTE_LIST_VALUE_MAX_ITEMS, {
        message: `Attribute list can have at most ${ATTRIBUTE_LIST_VALUE_MAX_ITEMS} items`,
      }),
  ],
  {
    message:
      "Attribute value must be text, a number, true/false, or a list of text/numbers",
  },
);

export const propertyIdParamsSchema = z.object({
  propertyId: propertyIdSchema,
});

export const propertyAttributeParamsSchema = z.object({
  propertyId: propertyIdSchema,
  key: attributeKeySchema,
});

export const upsertPropertyAttributeBodySchema = z
  .object({
    value: attributeValueSchema,
  })
  .strict();

export const replacePropertyAttributesBodySchema = z
  .object({
    attributes: z
      .array(
        z
          .object({
            key: attributeKeySchema,
            value: attributeValueSchema,
          })
          .strict(),
        { message: "attributes must be a list of { key, value }" },
      )
      .max(MAX_ATTRIBUTES_PER_PROPERTY, {
        message: `A property can have at most ${MAX_ATTRIBUTES_PER_PROPERTY} attributes`,
      })
      .refine(
        (attributes) =>
          new Set(attributes.map((attribute) => attribute.key)).size ===
          attributes.length,
        { message: "Each attribute key can only appear once" },
      ),
  })
  .strict();
