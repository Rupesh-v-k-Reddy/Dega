import {
  ConditionalCheckFailedError,
  NotFoundError,
  ServiceError,
  ValidationError,
} from "./errors";
import { createDocumentClient } from "./factory";
import type {
  BatchGetRequest,
  BatchWriteRequest,
  DynamoItem,
  PaginatedResult,
  PrimaryKey,
  QueryOptions,
  ScanOptions,
} from "./interfaces";
import type { DocumentClientLike } from "./interfaces";
import { serializeExpressionValues, serializeItem, deserializeItem } from "./serializer";
import { ConsoleLogger, type Logger } from "./logger";
import { normalizeConfig, type DynamoClientConfig, type NormalizedDynamoClientConfig } from "./config";

const BATCH_GET_LIMIT = 100;
const BATCH_WRITE_LIMIT = 25;

/**
 * Helper to convert LastEvaluatedKey attribute values into JSON.
 */
const deserializeKey = (key?: Record<string, unknown>): Record<string, unknown> | undefined =>
  key ? (deserializeItem<Record<string, unknown>>(key) ?? undefined) : undefined;

/** Chunk an array into equally sized pieces. */
const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

/**
 * Strongly typed DynamoDB client exposing ergonomic methods with built-in serialization.
 */
export class TypedDynamoClient<
  TItem extends Record<string, unknown>,
  TKey extends Record<string, unknown>,
> {
  private readonly config: NormalizedDynamoClientConfig;
  private readonly client: DocumentClientLike;
  private readonly logger: Logger;

  constructor(config: DynamoClientConfig, documentClient?: DocumentClientLike) {
    if (!config?.tableName) {
      throw new ValidationError("tableName is required to instantiate TypedDynamoClient");
    }
    this.config = normalizeConfig(config);
    this.logger = this.config.logger ?? new ConsoleLogger((process.env.DYNAMO_LOG_LEVEL as any) ?? "error");
    this.client = documentClient ?? createDocumentClient(this.config);
  }

  /**
   * Retrieve a single item by its primary key.
   *
   * @param key - Primary key identifying the item.
   * @throws {ValidationError} When the key is invalid.
   * @throws {NotFoundError} When the item does not exist.
   * @throws {ServiceError} When DynamoDB returns an unexpected error.
   */
  public async get(key: PrimaryKey<TKey>): Promise<TItem> {
    this.validateKey(key);
    try {
      const response = await this.client.get({
        TableName: this.config.tableName,
        Key: serializeItem(key),
        ConsistentRead: true,
      });
      const item = deserializeItem<TItem>(response.Item);
      if (!item) {
        throw new NotFoundError(`Item not found for key: ${JSON.stringify(key)}`);
      }
      return item;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new ServiceError("Failed to get item from DynamoDB", error);
    }
  }

  /**
   * Create or replace an item in the target table.
   *
   * @param item - Item payload to store.
   * @throws {ValidationError} When the item payload is invalid.
   * @throws {ServiceError} When DynamoDB returns an unexpected error.
   */
  public async put(item: DynamoItem<TItem>): Promise<void> {
    if (!item || typeof item !== "object") {
      throw new ValidationError("put requires a non-empty object item");
    }
    try {
      await this.client.put({
        TableName: this.config.tableName,
        Item: serializeItem(item),
      });
      this.logger.debug("Put item", { table: this.config.tableName });
    } catch (error) {
      throw new ServiceError("Failed to put item", error);
    }
  }

  /**
   * Update an item with a conditional update expression.
   *
   * @param key - Item key to update.
   * @param updateExpression - DynamoDB update expression string.
   * @param values - Expression attribute values referenced in the update expression.
   * @param options - Additional update options such as condition expression.
   * @returns The updated attributes when ReturnValues is not set to `NONE`.
   * @throws {ValidationError} When inputs are invalid.
   * @throws {ConditionalCheckFailedError} When the conditional expression fails.
   * @throws {ServiceError} When DynamoDB returns an unexpected error.
   */
  public async update(
    key: PrimaryKey<TKey>,
    updateExpression: string,
    values: Record<string, unknown>,
    options: {
      conditionExpression?: string;
      returnValues?: "NONE" | "ALL_NEW" | "ALL_OLD" | "UPDATED_NEW" | "UPDATED_OLD";
      expressionAttributeNames?: Record<string, string>;
    } = {},
  ): Promise<Record<string, unknown> | undefined> {
    this.validateKey(key);
    if (!updateExpression) {
      throw new ValidationError("updateExpression is required");
    }

    try {
      const response = await this.client.update({
        TableName: this.config.tableName,
        Key: serializeItem(key),
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: serializeExpressionValues(values),
        ExpressionAttributeNames: options.expressionAttributeNames,
        ConditionExpression: options.conditionExpression,
        ReturnValues: options.returnValues ?? "ALL_NEW",
      });
      return deserializeItem<Record<string, unknown>>(response.Attributes);
    } catch (error: any) {
      if (error?.name === "ConditionalCheckFailedException") {
        throw new ConditionalCheckFailedError("Conditional update failed", error);
      }
      throw new ServiceError("Failed to update item", error);
    }
  }

  /**
   * Delete an item by primary key.
   *
   * @param key - Item key to delete.
   * @throws {ValidationError} When the key is invalid.
   * @throws {ServiceError} When DynamoDB returns an unexpected error.
   */
  public async delete(key: PrimaryKey<TKey>): Promise<void> {
    this.validateKey(key);
    try {
      await this.client.delete({
        TableName: this.config.tableName,
        Key: serializeItem(key),
      });
    } catch (error) {
      throw new ServiceError("Failed to delete item", error);
    }
  }

  /**
   * Query items using the provided query options with automatic pagination handling.
   *
   * @param options - Query configuration generated manually or via the {@link QueryBuilder}.
   * @returns Aggregated query results with pagination metadata.
   * @throws {ValidationError} When required query options are missing.
   * @throws {ServiceError} When DynamoDB returns an unexpected error.
   */
  public async query(options: QueryOptions<TItem>): Promise<PaginatedResult<TItem>> {
    if (!options?.keyConditionExpression) {
      throw new ValidationError("keyConditionExpression is required for queries");
    }
    const items: TItem[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined;
    let totalScanned = 0;
    let exclusiveStartKey: Record<string, unknown> | undefined;

    do {
      const response = await this.client.query({
        TableName: this.config.tableName,
        KeyConditionExpression: options.keyConditionExpression,
        ExpressionAttributeValues: serializeExpressionValues(options.expressionAttributeValues),
        ExpressionAttributeNames: options.expressionAttributeNames,
        FilterExpression: options.filterExpression,
        IndexName: options.indexName,
        ConsistentRead: options.consistentRead,
        Limit: options.pageSize ?? options.limit,
        ExclusiveStartKey: exclusiveStartKey ? serializeItem(exclusiveStartKey) : undefined,
        ScanIndexForward: options.scanIndexForward,
        ProjectionExpression: options.projectionExpression,
      });

      const pageItems = (response.Items ?? []).map((i) => deserializeItem<TItem>(i)!).map((item) =>
        options.transform ? options.transform(item) : item,
      );
      items.push(...pageItems);
      totalScanned += response.ScannedCount ?? pageItems.length;
      lastEvaluatedKey = deserializeKey(response.LastEvaluatedKey);
      exclusiveStartKey = lastEvaluatedKey;
    } while (
      exclusiveStartKey &&
      (!options.limit || items.length < options.limit)
    );

    const limitedItems = options.limit ? items.slice(0, options.limit) : items;

    return {
      items: limitedItems,
      lastEvaluatedKey,
      count: limitedItems.length,
      scannedCount: totalScanned,
    };
  }

  /**
   * Perform a table scan with optional filter expressions and automatic pagination.
   *
   * @param options - Optional scan configuration.
   * @returns Aggregated scan results with pagination metadata.
   * @throws {ServiceError} When DynamoDB returns an unexpected error.
   */
  public async scan(options: ScanOptions<TItem> = {}): Promise<PaginatedResult<TItem>> {
    const items: TItem[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined;
    let totalScanned = 0;
    let exclusiveStartKey: Record<string, unknown> | undefined;

    do {
      const response = await this.client.scan({
        TableName: this.config.tableName,
        FilterExpression: options.filterExpression,
        ExpressionAttributeValues: options.expressionAttributeValues
          ? serializeExpressionValues(options.expressionAttributeValues)
          : undefined,
        ExpressionAttributeNames: options.expressionAttributeNames,
        Limit: options.pageSize ?? options.limit,
        ExclusiveStartKey: exclusiveStartKey ? serializeItem(exclusiveStartKey) : undefined,
        ProjectionExpression: options.projectionExpression,
      });
      const pageItems = (response.Items ?? []).map((i) => deserializeItem<TItem>(i)!).map((item) =>
        options.transform ? options.transform(item) : item,
      );
      items.push(...pageItems);
      totalScanned += response.ScannedCount ?? pageItems.length;
      lastEvaluatedKey = deserializeKey(response.LastEvaluatedKey);
      exclusiveStartKey = lastEvaluatedKey;
    } while (
      exclusiveStartKey &&
      (!options.limit || items.length < options.limit)
    );

    const limitedItems = options.limit ? items.slice(0, options.limit) : items;

    return {
      items: limitedItems,
      lastEvaluatedKey,
      count: limitedItems.length,
      scannedCount: totalScanned,
    };
  }

  /**
   * Batch get multiple items by their keys with automatic retry of unprocessed keys.
   *
   * @param request - Batch get configuration including keys and consistency settings.
   * @returns Array of retrieved items.
   * @throws {ValidationError} When no keys are provided.
   * @throws {ServiceError} When DynamoDB returns an unexpected error.
   */
  public async batchGet(request: BatchGetRequest<TKey>): Promise<TItem[]> {
    if (!request.keys?.length) {
      throw new ValidationError("batchGet requires at least one key");
    }
    const chunksOfKeys = chunk(request.keys, BATCH_GET_LIMIT);
    const results: TItem[] = [];

    for (const keys of chunksOfKeys) {
      let unprocessedKeys = keys;
      let attempts = 0;

      while (unprocessedKeys.length > 0 && attempts < this.config.maxRetries) {
        const response = await this.client.batchGet({
          RequestItems: {
            [this.config.tableName]: {
              Keys: unprocessedKeys.map((key) => serializeItem(key)),
              ConsistentRead: request.consistentRead,
              ProjectionExpression: request.projectionExpression,
            },
          },
        });
        const retrievedItems = response.Responses?.[this.config.tableName] ?? [];
        results.push(
          ...retrievedItems
            .map((item) => deserializeItem<TItem>(item))
            .filter((item): item is TItem => Boolean(item)),
        );

        const unprocessed = response.UnprocessedKeys?.[this.config.tableName]?.Keys ?? [];
        unprocessedKeys = unprocessed.map((key) => deserializeItem<TKey>(key)!).filter(Boolean);
        attempts += 1;
      }

      if (unprocessedKeys.length > 0) {
        this.logger.warn("Unprocessed keys remain after retries", { count: unprocessedKeys.length });
      }
    }

    return results;
  }

  /**
   * Batch write helper supporting both put and delete requests with retry logic.
   *
   * @param request - Batch write configuration specifying items to put or keys to delete.
   * @throws {ValidationError} When no operations are provided.
   * @throws {ServiceError} When DynamoDB cannot process all requests after retries.
   */
  public async batchWrite(request: BatchWriteRequest<TItem, TKey>): Promise<void> {
    const putItems = request.putItems ?? [];
    const deleteKeys = request.deleteKeys ?? [];
    if (putItems.length === 0 && deleteKeys.length === 0) {
      throw new ValidationError("batchWrite requires at least one putItem or deleteKey");
    }

    const operations = [
      ...putItems.map((item) => ({ PutRequest: { Item: serializeItem(item) } })),
      ...deleteKeys.map((key) => ({ DeleteRequest: { Key: serializeItem(key) } })),
    ];

    for (const batch of chunk(operations, BATCH_WRITE_LIMIT)) {
      let unprocessed = batch;
      let attempts = 0;

      while (unprocessed.length > 0 && attempts < this.config.maxRetries) {
        const response = await this.client.batchWrite({
          RequestItems: {
            [this.config.tableName]: unprocessed,
          },
        });
        const unprocessedItems = response.UnprocessedItems?.[this.config.tableName] ?? [];
        unprocessed = unprocessedItems as typeof batch;
        attempts += 1;
      }

      if (unprocessed.length > 0) {
        this.logger.error("Unprocessed items remain after retries", { count: unprocessed.length });
        throw new ServiceError("Failed to write all batch items");
      }
    }
  }

  /**
   * Provide access to the underlying DynamoDB client adapter for advanced scenarios.
   */
  public get raw(): DocumentClientLike {
    return this.client;
  }

  private validateKey(key: PrimaryKey<TKey>): void {
    if (!key || typeof key !== "object" || Object.keys(key).length === 0) {
      throw new ValidationError("A non-empty key object is required");
    }
  }
}
