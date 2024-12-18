const fs = require("fs");
const { privateKeyToAccount } = require("viem/accounts");

// Load input data
const keys = JSON.parse(fs.readFileSync("keys.json", "utf8"));
const hexData = JSON.parse(fs.readFileSync("randomHexData.json", "utf8"));

// Function to pick a random key
const getRandomKey = () => {
    const randomIndex = Math.floor(Math.random() * keys.length);
    return keys[randomIndex];
};

// Function to sign data using a private key
const signData = async (privateKey, data) => {
    const account = privateKeyToAccount(privateKey);
    try {
        const signature = await account.signMessage({
            message: data,
        });
        return signature;
    } catch (error) {
        console.error("Error generating signature:", error);
        throw error;
    }
};

// Function to generate random rollup data
const generateRollupData = async () => {
    const rollupData = await Promise.all(
        hexData.map(async (entry) => {
            const randomKey = getRandomKey(); // Pick a random key
            const signature = await signData(randomKey.privateKey, entry.data);

            // Generate a random bid value between 1.440612352e-9 and 0.03619306873461146
            const bid =
                Math.random() * (0.01619306873461146 - 0.000000001440612352) +
                0.000000001440612352;

            return {
                address: randomKey.publicKey,
                signature,
                data: entry.data,
                bid: parseFloat(bid.toFixed(20)), // Limit to 17 decimal places
            };
        })
    );

    return rollupData;
};

// Main function
const main = async () => {
    try {
        const rollupData = await generateRollupData();

        // Save the rollup data to a JSON file
        const filePath = "randomrollupdata-1.json";
        fs.writeFileSync(filePath, JSON.stringify(rollupData, null, 2));
        console.log(`Rollup data has been generated and saved to ${filePath}`);
    } catch (error) {
        console.error("Error during execution:", error);
    }
};

main();
