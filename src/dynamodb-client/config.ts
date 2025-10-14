import type { AwsCredentialIdentity } from "@aws-sdk/types";
import type { Logger } from "./logger";

/**
 * Supported AWS SDK variants.
 */
export type AwsSdkVariant = "v2" | "v3" | "auto";

/**
 * Logging level configuration.
 */
export type LogLevel = "error" | "warn" | "info" | "debug";

/**
 * Configuration object accepted by the DynamoDB client factory.
 */
export interface DynamoClientConfig {
  /** Target table name. */
  tableName: string;
  /** Region for AWS services. */
  region?: string;
  /** Custom endpoint (useful for local DynamoDB). */
  endpoint?: string;
  /** Optional AWS credentials. */
  credentials?: AwsCredentialIdentity;
  /** Specify which SDK variant to use. Defaults to automatic detection. */
  sdk?: AwsSdkVariant;
  /** Optional logger implementation. */
  logger?: Logger;
  /**
   * Enable automatic marshalling/unmarshalling of complex types like Date and BigInt.
   * Enabled by default.
   */
  enableSerialization?: boolean;
  /** Maximum number of retry attempts for throttled requests. */
  maxRetries?: number;
}

/**
 * Normalized configuration after applying defaults.
 */
export interface NormalizedDynamoClientConfig extends Required<Omit<DynamoClientConfig, "credentials" | "logger" | "enableSerialization" | "maxRetries">> {
  credentials?: AwsCredentialIdentity;
  logger?: Logger;
  enableSerialization: boolean;
  maxRetries: number;
}

/**
 * Default configuration values used by the factory.
 */
export const defaultConfig: Required<Pick<NormalizedDynamoClientConfig, "sdk" | "enableSerialization" | "maxRetries" | "region" | "endpoint">> = {
  sdk: "auto",
  enableSerialization: true,
  maxRetries: 3,
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.DYNAMODB_ENDPOINT || "",
};

/**
 * Apply defaults to the provided client configuration.
 */
export const normalizeConfig = (
  config: DynamoClientConfig,
): NormalizedDynamoClientConfig => ({
  tableName: config.tableName,
  region: config.region ?? defaultConfig.region,
  endpoint: config.endpoint ?? defaultConfig.endpoint,
  credentials: config.credentials,
  sdk: config.sdk ?? defaultConfig.sdk,
  logger: config.logger,
  enableSerialization: config.enableSerialization ?? defaultConfig.enableSerialization,
  maxRetries: config.maxRetries ?? defaultConfig.maxRetries,
});
