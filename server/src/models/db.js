// db.js
const { MongoClient, ServerApiVersion } = require("mongodb");
const uri =
  "mongodb+srv://saifisra0098:12345678DDAL@ddalcluster.ku4lu.mongodb.net/?retryWrites=true&w=majority&appName=DDALCluster";
let client;
let db;

async function connectToDatabase() {
  if (!db) {
    try {
      if (!client) {
        client = new MongoClient(uri, {
          serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
          },
        });
      }
      await client.connect();
      db = client.db("DDAL");
      console.log("Connected to MongoDB Atlas");
    } catch (error) {
      console.error("Error connecting to MongoDB Atlas:", error);
      throw error;
    }
  }
  return db;
}

module.exports = { connectToDatabase };
