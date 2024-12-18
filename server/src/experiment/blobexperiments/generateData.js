const fs = require("fs");
const { faker } = require("@faker-js/faker");

// Function to generate random hexadecimal data of given size (in KB)
const generateRandomHexData = (sizeInKB) => {
    const sizeInBytes = sizeInKB * 1024; // Convert KB to bytes
    let result = '';
    while (result.length < sizeInBytes * 2) { // Each hex character represents half a byte
        result += faker.string.hexadecimal(sizeInBytes * 2 - result.length).replace(/^0x/, '');
    }
    return result;
};

// Main function to generate entries
const main = () => {
    const totalEntries = 40; // Number of entries
    const minSize = 5; // Minimum size per entry in KB
    const maxSize = 120; // Maximum size per entry in KB

    const dataEntries = [];

    for (let i = 0; i < totalEntries; i++) {
        // Generate a random size for the entry
        const entrySize = Math.floor(Math.random() * (maxSize - minSize + 1) + minSize);

        // Generate random hex data of the calculated size
        const data = generateRandomHexData(entrySize);

        dataEntries.push({ id: i + 1, size: entrySize, data });
    }

    // Save the data entries to a JSON file
    const filePath = "randomHexData.json";
    fs.writeFileSync(filePath, JSON.stringify(dataEntries, null, 2));
    console.log(`Generated ${dataEntries.length} entries. Saved to ${filePath}.`);
};

main();
