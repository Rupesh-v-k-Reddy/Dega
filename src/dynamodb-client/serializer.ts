import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { SerializationError } from "./errors";

/**
 * Serialize a JavaScript object into a DynamoDB attribute map.
 */
export const serializeItem = (item: Record<string, unknown>): Record<string, unknown> => {
  try {
    return marshall(item, {
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    });
  } catch (error) {
    throw new SerializationError("Failed to serialize item", error);
  }
};

/**
 * Deserialize a DynamoDB attribute map into a JavaScript object.
 */
export const deserializeItem = <T extends Record<string, unknown>>(item?: Record<string, unknown>): T | undefined => {
  if (!item) {
    return undefined;
  }
  try {
    return unmarshall(item) as T;
  } catch (error) {
    throw new SerializationError("Failed to deserialize item", error);
  }
};

/**
 * Serialize expression attribute values while preserving DynamoDB placeholders.
 */
export const serializeExpressionValues = (
  values: Record<string, unknown>,
): Record<string, unknown> => {
  try {
    const normalizedEntries = Object.entries(values).map(([key, value]) => [key.replace(/^:/, ""), value] as const);
    const marshalled = marshall(
      normalizedEntries.reduce<Record<string, unknown>>((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {}),
      { removeUndefinedValues: true },
    );
    return Object.entries(marshalled).reduce<Record<string, unknown>>((acc, [key, value]) => {
      acc[`:${key}`] = value;
      return acc;
    }, {});
  } catch (error) {
    throw new SerializationError("Failed to serialize expression attribute values", error);
  }
};
