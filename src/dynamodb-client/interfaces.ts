import type {
  AttributeMap,
  BatchGetItemInput,
  BatchGetItemOutput,
  BatchWriteItemInput,
  BatchWriteItemOutput,
  DeleteItemInput,
  DeleteItemOutput,
  GetItemInput,
  GetItemOutput,
  PutItemInput,
  PutItemOutput,
  QueryInput,
  QueryOutput,
  ScanInput,
  ScanOutput,
  UpdateItemInput,
  UpdateItemOutput,
} from "@aws-sdk/client-dynamodb";

/**
 * Generic representation of a DynamoDB primary key.
 */
export type PrimaryKey<TKey extends Record<string, unknown>> = TKey;

/**
 * Generic representation of a DynamoDB item.
 */
export type DynamoItem<TItem extends Record<string, unknown>> = TItem;

/**
 * Query options supported by the high-level client.
 */
export interface QueryOptions<TItem extends Record<string, unknown>> {
  keyConditionExpression: string;
  expressionAttributeValues: Record<string, unknown>;
  expressionAttributeNames?: Record<string, string>;
  filterExpression?: string;
  indexName?: string;
  consistentRead?: boolean;
  limit?: number;
  scanIndexForward?: boolean;
  pageSize?: number;
  projectionExpression?: string;
  transform?: (item: TItem) => TItem;
}

/**
 * Scan options supported by the high-level client.
 */
export interface ScanOptions<TItem extends Record<string, unknown>> {
  filterExpression?: string;
  expressionAttributeValues?: Record<string, unknown>;
  expressionAttributeNames?: Record<string, string>;
  limit?: number;
  pageSize?: number;
  projectionExpression?: string;
  transform?: (item: TItem) => TItem;
}

/**
 * Result object returned by paginated operations.
 */
export interface PaginatedResult<TItem extends Record<string, unknown>> {
  items: TItem[];
  lastEvaluatedKey?: Record<string, unknown>;
  count: number;
  scannedCount: number;
}

/**
 * Type-safe batch get request definition.
 */
export interface BatchGetRequest<TKey extends Record<string, unknown>> {
  keys: PrimaryKey<TKey>[];
  consistentRead?: boolean;
  projectionExpression?: string;
}

/**
 * Type-safe batch write request definition.
 */
export interface BatchWriteRequest<TItem extends Record<string, unknown>, TKey extends Record<string, unknown>> {
  putItems?: DynamoItem<TItem>[];
  deleteKeys?: PrimaryKey<TKey>[];
}

/**
 * Interface describing the subset of the AWS SDK clients used by this library.
 */
export interface DocumentClientLike {
  get(params: GetItemInput): Promise<GetItemOutput>;
  put(params: PutItemInput): Promise<PutItemOutput>;
  update(params: UpdateItemInput): Promise<UpdateItemOutput>;
  delete(params: DeleteItemInput): Promise<DeleteItemOutput>;
  query(params: QueryInput): Promise<QueryOutput>;
  scan(params: ScanInput): Promise<ScanOutput>;
  batchGet(params: BatchGetItemInput): Promise<BatchGetItemOutput>;
  batchWrite(params: BatchWriteItemInput): Promise<BatchWriteItemOutput>;
}

/**
 * DynamoDB attribute map alias.
 */
export type AttributeValues = AttributeMap;
