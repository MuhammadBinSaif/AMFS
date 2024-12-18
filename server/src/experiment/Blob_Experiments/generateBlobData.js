const { connectToDatabase } = require("../models/db");
const fs = require("fs");

// Function to generate random rollup data
const generateRollupBlobData = async () => {
    const db = await connectToDatabase();
     const collection = db.collection("blobData");
     const unprocessedData = await collection
     .find({ processed: false })
     .toArray();
     const modifiedData = unprocessedData.map((entry) => {
        return {
          ...entry,
          priorityScore: 0, // Set priorityScore to zero
        };
      });
    return modifiedData;
};

// Main function
const main = async () => {
    try {
        const rollupBlobData = await generateRollupBlobData();

        // Save the rollup data to a JSON file
        const filePath = "blobsdata.json";
        fs.writeFileSync(filePath, JSON.stringify(rollupBlobData, null, 2));
        console.log(`Rollup data has been generated and saved to ${filePath}`);
    } catch (error) {
        console.error("Error during execution:", error);
    }
};

main();
