// deleteBlobDataCollection.js
const { connectToDatabase } = require("./db");

const deleteBlobDataCollection = async () => {
  try {
    const db = await connectToDatabase();
    const collectionName = "blobData";

    // Define the JSON Schema for the blobData collection
    const blobDataSchema = {
      $jsonSchema: {
        bsonType: "object",
        required: [
          "rollupAddress",
          "signature",
          "data",
          "bid",
          "size",
          "waitTime",
          "processed",
          "createdAt",
          "priorityScore",
        ],
        properties: {
          rollupAddress: {
            bsonType: "string",
            description: "must be a string and is required",
            pattern: "^0x[a-fA-F0-9]{40}$",  // Optional: Validate Ethereum-like address
          },
          signature: {
            bsonType: "string",
            description: "must be a string and is required",
          },
          data: {
            bsonType: "string",
            description: "must be a string and is required",
          },
          bid: {
            bsonType: "double",
            description: "must be a double and is required",
          },
          size: {
            bsonType: "double",
            description: "must be a double and is required",
          },
          waitTime: {
            bsonType: "int",
            description: "must be an integer and is required",
          },
          processed: {
            bsonType: "bool",
            description: "must be a boolean and is required",
          },
          createdAt: {
            bsonType: "date",
            description: "must be a date and is required",
          },
          priorityScore: {
            bsonType: "double",
            description: "must be a double and is required",
          },
        },
      },
    };

    // Check if the collection already exists
    const collections = await db.listCollections({ name: collectionName }).toArray();
    if (collections.length > 0) {
      console.log(`Collection '${collectionName}' already exists. Skipping creation.`);
      return;
    }

    // Create the blobData collection with schema validation
    await db.createCollection(collectionName, {
      validator: blobDataSchema,
      validationLevel: "moderate",  // Options: "off", "strict", "moderate"
      validationAction: "error",  // Options: "error", "warn"
    });
  } catch (error) {
    console.error("Error deleting blobData collection:", error);
    throw error;
  }
};

// Execute the deletion
deleteBlobDataCollection()
  .then(() => {
    console.log("blobData collection deletion completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to delete blobData collection:", error);
    process.exit(1);
  });
