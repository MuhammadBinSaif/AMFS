const fs = require("fs");
const {addressVerifier} = require ("../services/verifierService")
const {checkBalance} = require ("../services/blockchainService")
const {calculateData,handleBlobData} = require ("../services/blobService")
const { performance } = require("perf_hooks");

const randomData = JSON.parse(fs.readFileSync("randomrollupdata.json", "utf8")); // Test dataset
const measureTime = async (operation) => {
    const start = performance.now();
    let success = true;
    try {
        await operation();
    } catch (error) {
        success = false;
    }
    const end = performance.now();
    return { timeTaken: end - start, success };
};


const signatureVerificationTest = async () => {
    const results = await Promise.all(
        randomData.map(async (entry) => {
            const { address, data, signature } = entry;
            const { timeTaken, success } = await measureTime(() => addressVerifier(address, data, signature));
            return { address, timeTaken, success };
        })
    );
    console.log("Signature verification results:", results);
};

const bidVerificationTest = async () => {
    const results = await Promise.all(
        randomData.map(async (entry) => {
            const { address, bid } = entry;
            const { timeTaken, success } = await measureTime(() => checkBalance(address,bid));
            return { address, timeTaken, success };
        })
    );
    console.log("Bid verification results:", results);
};

const dataSizeVerificationTest = async () => {
    const results = await Promise.all(
        randomData.map(async (entry) => {
            const { address, data, signature,bid } = entry;
            const blobData = await calculateData(address,signature,data,bid)
            await handleBlobData(blobData)
            return blobData
        })
    );
    console.log("Size verification results:", results);
};

const main = async () => {
    console.log("Starting experiments...");
    //signatureVerificationTest();
    //bidVerificationTest();
    dataSizeVerificationTest();
    console.log("Ending experiments...");
};

main().catch((err) => console.error(err));