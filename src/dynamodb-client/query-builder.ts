import type { QueryOptions } from "./interfaces";

/**
 * Lightweight, type-safe query builder for DynamoDB queries.
 */
export class QueryBuilder<TItem extends Record<string, unknown>> {
  private keyConditionExpression = "";
  private filterExpression?: string;
  private expressionAttributeValues: Record<string, unknown> = {};
  private expressionAttributeNames: Record<string, string> = {};
  private indexName?: string;
  private consistentRead?: boolean;
  private limit?: number;
  private pageSize?: number;
  private scanIndexForward?: boolean;
  private projectionExpression?: string;
  private transform?: (item: TItem) => TItem;

  /**
   * Define the key condition expression required for a DynamoDB query.
   */
  public where(expression: string, values: Record<string, unknown>, names?: Record<string, string>): this {
    this.keyConditionExpression = expression;
    this.expressionAttributeValues = {
      ...this.expressionAttributeValues,
      ...values,
    };
    if (names) {
      this.expressionAttributeNames = {
        ...this.expressionAttributeNames,
        ...names,
      };
    }
    return this;
  }

  /** Apply an optional filter expression. */
  public filter(expression: string, values: Record<string, unknown> = {}, names?: Record<string, string>): this {
    this.filterExpression = expression;
    this.expressionAttributeValues = {
      ...this.expressionAttributeValues,
      ...values,
    };
    if (names) {
      this.expressionAttributeNames = {
        ...this.expressionAttributeNames,
        ...names,
      };
    }
    return this;
  }

  /** Target a specific global secondary index. */
  public usingIndex(indexName: string): this {
    this.indexName = indexName;
    return this;
  }

  /** Configure strongly consistent reads. */
  public stronglyConsistent(): this {
    this.consistentRead = true;
    return this;
  }

  /** Limit results. */
  public withLimit(limit: number): this {
    this.limit = limit;
    return this;
  }

  /** Configure page size for automatic pagination. */
  public withPageSize(pageSize: number): this {
    this.pageSize = pageSize;
    return this;
  }

  /** Sort ascending. */
  public ascending(): this {
    this.scanIndexForward = true;
    return this;
  }

  /** Sort descending. */
  public descending(): this {
    this.scanIndexForward = false;
    return this;
  }

  /**
   * Projection expression to limit returned attributes.
   */
  public select(projectionExpression: string): this {
    this.projectionExpression = projectionExpression;
    return this;
  }

  /**
   * Optionally transform items after retrieval (e.g., convert ISO strings to Date).
   */
  public postProcess(transform: (item: TItem) => TItem): this {
    this.transform = transform;
    return this;
  }

  /** Build the final query options structure. */
  public build(): QueryOptions<TItem> {
    if (!this.keyConditionExpression) {
      throw new Error("Key condition expression is required for a query");
    }
    return {
      keyConditionExpression: this.keyConditionExpression,
      expressionAttributeValues: this.expressionAttributeValues,
      expressionAttributeNames: Object.keys(this.expressionAttributeNames).length ? this.expressionAttributeNames : undefined,
      filterExpression: this.filterExpression,
      indexName: this.indexName,
      consistentRead: this.consistentRead,
      limit: this.limit,
      scanIndexForward: this.scanIndexForward,
      pageSize: this.pageSize,
      projectionExpression: this.projectionExpression,
      transform: this.transform,
    };
  }
}
