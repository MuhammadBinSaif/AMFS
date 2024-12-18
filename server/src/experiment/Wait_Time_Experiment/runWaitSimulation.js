// runSimulation.js

const fs = require('fs').promises;
const path = require('path');

const BLOB_DATA_PATH = path.join(__dirname, 'scenario3_processed.json');
const CONFIG_PATH = path.join(__dirname, 'config.json');

const readJSON = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    if (!data) {
      return null;
    }
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File does not exist
      return null;
    }
    console.error(`Error reading ${filePath}:`, error);
    throw error;
  }
};

const writeJSON = async (filePath, data) => {
  try {
    const jsonString = JSON.stringify(data, null, 2); // Pretty print with 2 spaces
    await fs.writeFile(filePath, jsonString, 'utf-8');
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
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

const calculatePriorityScore = async () => {
  try {
    let blobData = await readJSON(BLOB_DATA_PATH) || [];
    let configData = await readJSON(CONFIG_PATH) || {};

    const unprocessedData = blobData.filter((doc) => !doc.processed);

    if (unprocessedData.length === 0) {
      return { success: true };
    }

    // Default configuration values
    let maxUtilization = 128; // In kilobytes
    let lambdaBid = 0.5;
    let lambdaWait = 0.9;
    let lambdaUtilization = 0.7;
    let targetWait = 10; // In rounds
    let alpha_prev = 1 / 3;
    let beta_prev = 1 / 3;
    let gamma_prev = 1 / 3;

    if (configData) {
      maxUtilization = configData.maxUtilization ?? maxUtilization;
      lambdaBid = configData.lambda ?? lambdaBid;
      lambdaWait = configData.lambdaWait ?? lambdaWait;
      lambdaUtilization = configData.lambdaUtilization ?? lambdaUtilization;
      alpha_prev = configData.alpha ?? alpha_prev;
      beta_prev = configData.beta ?? beta_prev;
      gamma_prev = configData.gamma ?? gamma_prev;
    }

    const bids = unprocessedData.map((doc) => doc.bid);
    const waitTimes = unprocessedData.map((doc) => doc.waitTime);
    const sizes = unprocessedData.map((doc) => doc.size);

    const B_max = Math.max(...bids, 1); 
    const B_min = Math.min(...bids, 0);
    const W_max = Math.max(...waitTimes, 1);
    const W_min = Math.min(...waitTimes, 0);
    const U_max = maxUtilization;
    const U_min = 0; 

    const avgBid = bids.reduce((sum, value) => sum + value, 0) / bids.length || 0;

    const alpha_current = B_max !== B_min ? avgBid / B_max : 0;

    const medianWaitTime = calculateMedian(waitTimes);

    const beta_current = targetWait !== 0 ? medianWaitTime / targetWait : 0;

    const totalSize = sizes.reduce((sum, value) => sum + value, 0) || 0;
    const avgSize = sizes.length > 0 ? totalSize / sizes.length : 0;

    const gamma_current = maxUtilization !== 0 ? avgSize / maxUtilization : 0;

    const alpha_new = lambdaBid * alpha_current + (1 - lambdaBid) * alpha_prev;
    const beta_new = lambdaWait * beta_current + (1 - lambdaWait) * beta_prev;
    const gamma_new =
      lambdaUtilization * gamma_current + (1 - lambdaUtilization) * gamma_prev;

    const totalWeight = alpha_new + beta_new + gamma_new || 1;
    const alphaNormalized = alpha_new / totalWeight;
    const betaNormalized = beta_new / totalWeight;
    const gammaNormalized = gamma_new / totalWeight;

    const B_range = B_max - B_min || 1;
    const W_range = W_max - W_min || 1;
    const U_range = U_max - U_min || 1;

    const updatedBlobData = blobData.map((blobDataEntry) => {
      if (blobDataEntry.processed) {
        return blobDataEntry; 
      }
      const bidScore = (blobDataEntry.bid - B_min) / B_range;
      const waitScore = (blobDataEntry.waitTime - W_min) / W_range;
      const sizeScore = (blobDataEntry.size - U_min) / U_range;

      const priorityScore =
        alphaNormalized * bidScore +
        betaNormalized * waitScore +
        gammaNormalized * sizeScore;
      return {
        ...blobDataEntry,
        priorityScore,
        processed: false, 
      };
    });

    await writeJSON(BLOB_DATA_PATH, updatedBlobData);
    const newConfigData = {
      alpha: alphaNormalized,
      beta: betaNormalized,
      gamma: gammaNormalized,
      lambdaBid,
      lambdaWait,
      lambdaUtilization,
      maxUtilization,
      currentSize: totalSize,
      lastUpdated: new Date().toISOString(),
    };

    await writeJSON(CONFIG_PATH, newConfigData);

    return { success: true };
  } catch (error) {
    console.error('Error in calculatePriorityScore:', error);
    throw error;
  }
};

const manageRecord = async (record) => {
  const filePath = path.join(__dirname, 'scenario3_processed.json');
  try {
    let existingData = await readJSON(filePath);
    if (existingData === null) {
      existingData = [record];
    } else if (Array.isArray(existingData)) {
      existingData.push(record);
    } else {
      console.warn(`Unexpected data format in ${filePath}. Overwriting with a new array.`);
      existingData = [record];
    }
    await writeJSON(filePath, existingData);
    console.log(`Record successfully added to ${filePath}.`);
  } catch (error) {
    console.error('Error in manageRecord:', error);
    throw error;
  }
};

const processData = async () => {
  try {
    let blobData = await readJSON(BLOB_DATA_PATH) || [];

    // Filter out unprocessed records and sort them by priorityScore descending
    const sortedRecords = blobData
      .filter((record) => !record.processed)
      .sort((a, b) => b.priorityScore - a.priorityScore);

    let accumulatedSize = 0;
    const recordsToProcess = [];
    const recordsToRemain = [];

    // Accumulate size up to 120KB
    for (const record of sortedRecords) {
      if (accumulatedSize + record.size <= 120) {
        accumulatedSize += record.size;
        recordsToProcess.push(record);
      } else {
        recordsToRemain.push(record);
      }
    }

    // Update records: mark selected as processed and increment waitTime for others
    const updatedBlobData = blobData.map((record) => {
      if (recordsToProcess.includes(record)) {
        return { ...record, processed: true };
      } else if (recordsToRemain.includes(record)) {
        return { ...record, waitTime: record.waitTime + 1 };
      }
      return record; // Unchanged records
    });

    await writeJSON(BLOB_DATA_PATH, updatedBlobData);
    console.log('Handled exceeding size: Processed and updated records accordingly.');
  } catch (error) {
    console.error('Error in processData:', error);
    throw error;
  }
};

const runSimulation = async (scenarioFilename, outputFilename) => {
  try {
    let records = await readJSON(scenarioFilename);

    if (!records || !Array.isArray(records)) {
      console.error('Invalid or empty scenario file.');
      return;
    }

    console.log(`\nStarting simulation for ${scenarioFilename}...`);

    while (records.length > 0) {
      let totalSize = 0;
      const recordsToAdd = [];

      // Define the batch size (e.g., up to 4 records)
      const batchSize = 4;

      // Process up to the first 'batchSize' records or until size exceeds 120KB
      for (let index = 0; index < Math.min(batchSize, records.length); index++) {
        const record = records.shift(); // Remove from source
        recordsToAdd.push(record);
        totalSize += record.size;
      }

      // Add records to processed data
      for (const record of recordsToAdd) {
        await manageRecord(record);
      }

      // Calculate priority scores for all unprocessed records
      await calculatePriorityScore();

      // Check if accumulated size exceeds 120KB
      if (totalSize > 120) {
        console.log('Total size exceeded 120KB, handling accordingly.');
        await processData(); // Handle exceeding size
      }

      // Optional: Add a short delay or log for clarity
      console.log(`Processed a batch of ${recordsToAdd.length} records, Total Size: ${totalSize}KB\n`);
    }

    // After all records are added, there might still be unprocessed records
    // Handle them by calling processData until no unprocessed records remain
    while (true) {
      let blobData = await readJSON(BLOB_DATA_PATH) || [];
      const unprocessedRecords = blobData.filter(record => !record.processed);

      if (unprocessedRecords.length === 0) {
        console.log('All records have been processed.');
        break;
      }

      console.log(`Handling remaining unprocessed records...`);
      await processData();
    }

    console.log('All simulations completed.');
  } catch (error) {
    console.error('Error in runSimulation:', error);
  }
};

const runAllSimulations = () => {

  //runSimulation('scenario1.json', 'scenario1_processed.json');
  //runSimulation('scenario2.json', 'scenario2_processed.json');
  runSimulation('scenario3.json', 'scenario3_processed.json');

  console.log('All simulations completed.');
};
runAllSimulations();
