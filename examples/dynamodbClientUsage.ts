import { QueryBuilder, TypedDynamoClient } from "../src/dynamodb-client";

interface User {
  userId: string;
  email: string;
  createdAt: string;
  lastLoginAt?: string;
  status: "ACTIVE" | "SUSPENDED";
}

interface UserKey {
  userId: string;
}

const client = new TypedDynamoClient<User, UserKey>({
  tableName: "users",
  region: process.env.AWS_REGION,
  endpoint: process.env.DYNAMODB_ENDPOINT,
});

const run = async () => {
  await client.put({
    userId: "123",
    email: "user@example.com",
    createdAt: new Date().toISOString(),
    status: "ACTIVE",
  });

  const user = await client.get({ userId: "123" });
  console.log("Fetched user", user);

  await client.update(
    { userId: "123" },
    "set #status = :status",
    { status: "SUSPENDED" },
    { expressionAttributeNames: { "#status": "status" } },
  );

  const query = new QueryBuilder<User>()
    .where("#pk = :pk", { pk: "123" }, { "#pk": "userId" })
    .withLimit(10)
    .postProcess((item) => ({ ...item, lastLoginAt: item.lastLoginAt ?? "never" }))
    .build();

  const result = await client.query(query);
  console.log("Query result", result.items);
};

run().catch((error) => {
  console.error("Failed to run example", error);
});
