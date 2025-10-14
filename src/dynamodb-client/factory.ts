import type { NormalizedDynamoClientConfig } from "./config";
import type { DocumentClientLike } from "./interfaces";
import { ServiceError } from "./errors";
import {
  BatchGetItemCommand,
  BatchWriteItemCommand,
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  UpdateItemCommand,
  type BatchGetItemInput,
  type BatchWriteItemInput,
  type DeleteItemInput,
  type GetItemInput,
  type PutItemInput,
  type QueryInput,
  type ScanInput,
  type UpdateItemInput,
} from "@aws-sdk/client-dynamodb";

/**
 * Adapter wrapping AWS SDK v3 DynamoDBClient.
 */
class V3DocumentClient implements DocumentClientLike {
  constructor(private readonly client: DynamoDBClient) {}

  public get(params: GetItemInput) {
    return this.client.send(new GetItemCommand(params));
  }

  public put(params: PutItemInput) {
    return this.client.send(new PutItemCommand(params));
  }

  public update(params: UpdateItemInput) {
    return this.client.send(new UpdateItemCommand(params));
  }

  public delete(params: DeleteItemInput) {
    return this.client.send(new DeleteItemCommand(params));
  }

  public query(params: QueryInput) {
    return this.client.send(new QueryCommand(params));
  }

  public scan(params: ScanInput) {
    return this.client.send(new ScanCommand(params));
  }

  public batchGet(params: BatchGetItemInput) {
    return this.client.send(new BatchGetItemCommand(params));
  }

  public batchWrite(params: BatchWriteItemInput) {
    return this.client.send(new BatchWriteItemCommand(params));
  }
}

/**
 * Adapter wrapping AWS SDK v2 DynamoDB service client.
 */
class V2DocumentClient implements DocumentClientLike {
  constructor(private readonly client: import("aws-sdk").DynamoDB) {}

  public async get(params: GetItemInput) {
    return this.client.getItem(params as import("aws-sdk").DynamoDB.GetItemInput).promise();
  }

  public async put(params: PutItemInput) {
    return this.client.putItem(params as import("aws-sdk").DynamoDB.PutItemInput).promise();
  }

  public async update(params: UpdateItemInput) {
    return this.client.updateItem(params as import("aws-sdk").DynamoDB.UpdateItemInput).promise();
  }

  public async delete(params: DeleteItemInput) {
    return this.client.deleteItem(params as import("aws-sdk").DynamoDB.DeleteItemInput).promise();
  }

  public async query(params: QueryInput) {
    return this.client.query(params as import("aws-sdk").DynamoDB.QueryInput).promise();
  }

  public async scan(params: ScanInput) {
    return this.client.scan(params as import("aws-sdk").DynamoDB.ScanInput).promise();
  }

  public async batchGet(params: BatchGetItemInput) {
    return this.client.batchGetItem(params as import("aws-sdk").DynamoDB.BatchGetItemInput).promise();
  }

  public async batchWrite(params: BatchWriteItemInput) {
    return this.client.batchWriteItem(params as import("aws-sdk").DynamoDB.BatchWriteItemInput).promise();
  }
}

const loadSdkV3 = () => {
  try {
    return {
      DynamoDBClient,
    };
  } catch (error) {
    throw new ServiceError("AWS SDK v3 is not available", error);
  }
};

const loadSdkV2 = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AWS = require("aws-sdk") as typeof import("aws-sdk");
    return AWS;
  } catch (error) {
    throw new ServiceError("AWS SDK v2 is not available", error);
  }
};

/**
 * Create a DocumentClient-like adapter using the requested SDK variant.
 */
export const createDocumentClient = (config: NormalizedDynamoClientConfig): DocumentClientLike => {
  if (config.sdk === "v3" || config.sdk === "auto") {
    try {
      const { DynamoDBClient: V3Client } = loadSdkV3();
      const client = new V3Client({
        region: config.region,
        endpoint: config.endpoint || undefined,
        credentials: config.credentials,
        maxAttempts: config.maxRetries,
      });
      return new V3DocumentClient(client);
    } catch (error) {
      if (config.sdk === "v3") {
        throw error;
      }
    }
  }

  if (config.sdk === "v2" || config.sdk === "auto") {
    try {
      const AWS = loadSdkV2();
      const client = new AWS.DynamoDB({
        region: config.region,
        endpoint: config.endpoint || undefined,
        credentials: config.credentials,
        maxRetries: config.maxRetries,
      });
      return new V2DocumentClient(client);
    } catch (error) {
      if (config.sdk === "v2") {
        throw error;
      }
    }
  }

  throw new ServiceError("Failed to instantiate DynamoDB client. Ensure aws-sdk or @aws-sdk/client-dynamodb is installed.");
};
