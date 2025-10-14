import { TypedDynamoClient, ValidationError, NotFoundError } from "../src/dynamodb-client";
import type { DocumentClientLike } from "../src/dynamodb-client";

describe("TypedDynamoClient", () => {
  const tableName = "users";
  const baseConfig = { tableName };
  const mockDocumentClient = (): jest.Mocked<DocumentClientLike> => ({
    get: jest.fn(),
    put: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    query: jest.fn(),
    scan: jest.fn(),
    batchGet: jest.fn(),
    batchWrite: jest.fn(),
  });

  it("throws when missing table name", () => {
    expect(() => new TypedDynamoClient({ tableName: "" as any })).toThrow(ValidationError);
  });

  it("retrieves an item", async () => {
    const clientMock = mockDocumentClient();
    clientMock.get.mockResolvedValue({
      Item: {
        userId: { S: "123" },
        email: { S: "user@example.com" },
      },
    });

    const client = new TypedDynamoClient<{ userId: string; email: string }, { userId: string }>(baseConfig, clientMock);
    const item = await client.get({ userId: "123" });
    expect(item).toEqual({ userId: "123", email: "user@example.com" });
  });

  it("throws NotFoundError when item missing", async () => {
    const clientMock = mockDocumentClient();
    clientMock.get.mockResolvedValue({});

    const client = new TypedDynamoClient<{ userId: string; email: string }, { userId: string }>(baseConfig, clientMock);
    await expect(client.get({ userId: "missing" })).rejects.toThrow(NotFoundError);
  });

  it("validates put input", async () => {
    const client = new TypedDynamoClient<{ userId: string }, { userId: string }>(baseConfig, mockDocumentClient());
    // @ts-expect-error Invalid input type
    await expect(client.put(undefined)).rejects.toThrow(ValidationError);
  });

  it("supports batch write", async () => {
    const clientMock = mockDocumentClient();
    clientMock.batchWrite.mockResolvedValue({});
    const client = new TypedDynamoClient<{ userId: string }, { userId: string }>(baseConfig, clientMock);

    await client.batchWrite({ putItems: [{ userId: "1" }] });
    expect(clientMock.batchWrite).toHaveBeenCalled();
  });
});
