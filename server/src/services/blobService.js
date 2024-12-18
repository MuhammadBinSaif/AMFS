const { connectToDatabase } = require("../models/db");
const {sendBlobTransaction,getBlobFromTx} = require ("../services/blockchainService")
const { mergeBlobs, unmergeBlobs } = require('../services/blobsharingService');
const {addressVerifier} = require ("../services/verifierService")
const {  Double } = require("mongodb");

const storeData = async (address, signature, data,bid) => {
  try {
    const sizeInBytes =
      Buffer.byteLength(address, "utf8") + Buffer.byteLength(signature.startsWith('0x') ? signature.slice(2) : signature, "utf8")+Buffer.byteLength(data, "utf8");
    const size = parseFloat((sizeInBytes / 1024).toFixed(3))/2;
    const blobData = {
      rollupAddress: address,
      signature: signature,
      data: data,
      bid:bid,
      size: size,
      waitTime: 0,
      processed: false,
      createdAt: new Date(),
      priorityScore:  0,
    };
    const collection = db.collection("blobData");
    await collection.insertOne(blobData);
  } catch (error) {
    console.error("Error in handleBlobData:", error);
    throw error;
  }
};

const handleBlobData = async (address, signature, data,bid) => {
  try {
    const isvalidAddress = addressVerifier(address, data, signature);
    const isvalidBid = await checkBalance(address,bid);
    if (!isvalidAddress && !isvalidBid) {
      throw new Error("Invalid signature or bid");
    }
    else{
      await storeData(address, signature, data,bid)
      const db = await connectToDatabase();
      await calculatePriorityScore(db);
      const configCollection = db.collection("config");
      const configData = await configCollection.findOne({});
      const currentSize = configData.currentSize+size;
      if (currentSize > 120) {
       const txHash = await prepareTransaction(db);
       return {
        success: true,
        message: "Blob data processed successfully.",
        transactionHash: txHash,
      };
      }
      return {
        success: true,
        message: "Blob data received and stored successfully.",
        rollupAddress: address,
      };
    }
  } catch (error) {
    console.error("Error in handle Blob Data:", error);
    throw error;
  }
};

const calculatePriorityScore = async (db) => {
  try {
    const collection = db.collection("blobData");

    // Fetch all unprocessed data
    const unprocessedData = await collection
      .find({ processed: false })
      .toArray();

    if (unprocessedData.length === 0) {
      return { success: true };
    }

    const configCollection = db.collection("config");

    // Fetch configuration data
    const configData = await configCollection.findOne({});

    // Default values if not present in config
    let maxUtilization = 128; // In kilobytes
    let lambdaBid = 0.5;
    let lambdaWait = 0.9;
    let lambdaUtilization = 0.7;
    let targetWait = 10; // In rounds
    let alpha_prev = 1 / 3;
    let beta_prev = 1 / 3;
    let gamma_prev = 1 / 3;

    if (configData) {
      alpha_prev = configData.alpha ?? alpha_prev;
      beta_prev = configData.beta ?? beta_prev;
      gamma_prev = configData.gamma ?? gamma_prev;
    }
    // Extract B, W, and U values from unprocessed data
    const bids = unprocessedData.map((doc) => doc.bid);
    const waitTimes = unprocessedData.map((doc) => doc.waitTime);
    const sizes = unprocessedData.map((doc) => doc.size);
    // Find maximum and minimum values for normalization
    const B_max = Math.max(...bids);
    const B_min = Math.min(...bids);
    const W_max = Math.max(...waitTimes);
    const W_min = Math.min(...waitTimes);
    const U_max = maxUtilization; // From config
    const U_min = 0; // Assuming minimum size is 0
    // Calculate bid averages
    const avgBid =
      bids.reduce((sum, value) => sum + value, 0) / bids.length || 0;
    
      // Calculate current alpha weights
    const alpha_current = avgBid / B_max;
    
    //calculate median wait time 
    const medianWaitTime = calculateMedian(waitTimes);
      // Calculate current beta weights
    const beta_current = medianWaitTime / targetWait;
    
    //calculate average utilization
    const totalSize = sizes.reduce((sum, value) => sum + value, 0) || 0;
    const avgSize =
      totalSize / sizes.length || 0;
    // Calculate current gamma weights
    const gamma_current = avgSize / maxUtilization;

    // Calculate new weights
    const alpha_new = lambdaBid * alpha_current + (1 - lambdaBid) * alpha_prev;
    const beta_new = lambdaWait * beta_current + (1 - lambdaWait) * beta_prev;
    const gamma_new = lambdaUtilization * gamma_current + (1 - lambdaUtilization) * gamma_prev;

    // Normalize the weights
    const totalWeight = alpha_new + beta_new + gamma_new;
    const alphaNormalized = alpha_new / totalWeight;
    const betaNormalized = beta_new / totalWeight;
    const gammaNormalized = gamma_new / totalWeight;

    const B_range = B_max - B_min || 1;
    const W_range = W_max - W_min || 1;
    const U_range = U_max - U_min || 1;
     // **Update priority scores for each unprocessed data entry**
     const bulkOps = unprocessedData.map((blobData) => {
      // **Normalize individual values**
      const bidScore = (blobData.bid - B_min) / B_range;
      const waitScore = (blobData.waitTime - W_min) / W_range;
      const sizeScore = (blobData.size - U_min) / U_range;

      // **Calculate priority score**
      const priorityScore =
        alphaNormalized * bidScore +
        betaNormalized * waitScore +
        gammaNormalized * sizeScore;

      return {
        updateOne: {
          filter: { _id: blobData._id },
          update: {
            $set: {
              priorityScore,
            },
          },
        },
      };
    });

    if (bulkOps.length > 0) {
      await collection.bulkWrite(bulkOps);
      // Update configuration data
    await configCollection.updateOne(
      {},
      {
        $set: {
          alpha: new Double(alphaNormalized),
          beta: new Double(betaNormalized),
          gamma: new Double(gammaNormalized),
          lambda: new Double(lambdaBid),
          maxUtilization: new Double(maxUtilization),
          currentSize: new Double(totalSize),
          lastUpdated: new Date(),
        },
      },
      { upsert: true }
    );

    }
    return { success: true };
  } catch (error) {
    console.error("Error in calculate Priority Score:", error);
    throw error;
  }
};

const calculateMedian = (numbers) => {
  if (!numbers.length) return 0;

  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

const prepareTransaction = async (db) => {

  const collection = db.collection("blobData");
  const unprocessedData = await collection
    .find({ processed: false })
    .sort({ priorityScore: -1 })
    .toArray();

  const mergedBlob = await mergeBlobs(unprocessedData)
  const txHash = await sendBlobTransaction(mergedBlob);
  //console.log(txHash)
  //const blobdata = await getBlobFromTx(txHash)
  //console.log(blobdata)
  return txHash;
};

module.exports = {handleBlobData };
