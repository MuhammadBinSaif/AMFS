const { privateKeyToAccount,generatePrivateKey } = require('viem/accounts');
const fs = require("fs");

// Function to generate fake key pairs
const generateKeys = () => {
    const keys = [];
    for (let i = 0; i < 10; i++) {
        const privateKey = generatePrivateKey(); // Generate private key
        const account = privateKeyToAccount(privateKey); // Derive account

        keys.push({
            id: i + 1,
            privateKey: privateKey.toString(),
            publicKey: account.address.toString()
        });
    }
    return keys;
};

// Main function
const main = () => {
    const keyPairs = generateKeys();
    const filePath = "keys.json";

    // Save the generated keys to a JSON file
    fs.writeFileSync(filePath, JSON.stringify(keyPairs, null, 2));
    console.log(`10 key pairs have been generated and saved to ${filePath}`);
};

main();
