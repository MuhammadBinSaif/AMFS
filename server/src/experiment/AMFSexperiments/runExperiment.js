// runExperiments.js

const fs = require('fs');
const path = require('path');

// Utility function to calculate the median of an array
const calculateMedian = (arr) => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Runs the experiment by processing data in rounds, updating weights,
 * and recording metrics for each round.
 */
const runSimulation = async () => {
  // Configuration Parameters
  const inputFilename = 'blob-variable-data.json'; // Your input JSON file
  const outputFilename = 'test-experiment-results-lambda-a0.1-b0.9-g0.1.csv'; // Output CSV file
  const processedOutputFilename = 'blobData-processed.json'; // Processed data with priority scores
  const totalRounds = 7; // Total number of rounds (80 records / 20 per round)
  const requestsPerRound = 30; // Number of records per round
  const maxUtilization = 128; // In KB
  const targetWait = 10; // In rounds

  // Smoothing factors (lambda)
  const lambdaBid = 0.1;
  const lambdaWait = 0.9;
  const lambdaUtilization = 0.1;

  // Initial weights
  let alpha_prev = 1 / 3;
  let beta_prev = 1 / 3;
  let gamma_prev = 1 / 3;

  // Read all data from JSON file
  const inputPath = path.join(__dirname, inputFilename);
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file ${inputFilename} not found.`);
    return;
  }

  const rawData = fs.readFileSync(inputPath, 'utf-8');
  const allData = JSON.parse(rawData);

  if (!Array.isArray(allData) || allData.length === 0) {
    console.error(`Input file ${inputFilename} is empty or not an array.`);
    return;
  }

  if (allData.length < totalRounds * requestsPerRound) {
    console.warn(
      `Data length (${allData.length}) is less than expected (${totalRounds * requestsPerRound}). Adjusting totalRounds to ${Math.ceil(allData.length / requestsPerRound)}.`
    );
  }

  // Adjust totalRounds based on actual data
  const adjustedTotalRounds = Math.ceil(allData.length / requestsPerRound);
  console.log(`Total Records: ${allData.length}`);
  console.log(`Requests per Round: ${requestsPerRound}`);
  console.log(`Total Rounds: ${adjustedTotalRounds}`);
  console.log(`Starting Simulation with λ = 0.5 for all weights...\n`);

  // Array to hold results for each round
  const results = [];

  // Array to hold processed data with priority scores
  const processedData = [];

  // CSV Header
  let csvContent = "Round,Alpha,Beta,Gamma,AvgBid,MedianWait,AvgSize\n";

  for (let r = 1; r <= adjustedTotalRounds; r++) {
    // Define the slice of data for this round
    const startIdx = (r - 1) * requestsPerRound;
    const endIdx = Math.min(r * requestsPerRound, allData.length);
    const roundData = allData.slice(startIdx, endIdx);

    // Extract bids, waitTimes, and sizes
    const bids = roundData.map(d => d.bid);
    const waitTimes = roundData.map(d => d.waitTime);
    const sizes = roundData.map(d => d.size);

    // Calculate metrics
    const B_max = Math.max(...bids);
    const B_min = Math.min(...bids);
    const W_max = Math.max(...waitTimes);
    const W_min = Math.min(...waitTimes);
    const U_max = maxUtilization;
    const U_min = 0;

    const avgBid = bids.reduce((sum, b) => sum + b, 0) / bids.length || 0;
    const medianWait = calculateMedian(waitTimes);
    const avgSize = sizes.reduce((sum, s) => sum + s, 0) / sizes.length || 0;

    // Compute current weights
    const alpha_current = B_max !== 0 ? avgBid / B_max : 0;
    const beta_current = targetWait !== 0 ? medianWait / targetWait : 0;
    const gamma_current = U_max !== 0 ? avgSize / U_max : 0;

    // Apply exponential smoothing
    const alpha_new = lambdaBid * alpha_current + (1 - lambdaBid) * alpha_prev;
    const beta_new = lambdaWait * beta_current + (1 - lambdaWait) * beta_prev;
    const gamma_new = lambdaUtilization * gamma_current + (1 - lambdaUtilization) * gamma_prev;
console.log("test",alpha_new, beta_new, gamma_new);
    // Normalize the weights so that alpha + beta + gamma = 1
    const totalWeight = alpha_new + beta_new + gamma_new;
    const alphaNormalized = totalWeight !== 0 ? alpha_new / totalWeight : 0;
    const betaNormalized = totalWeight !== 0 ? beta_new / totalWeight : 0;
    const gammaNormalized = totalWeight !== 0 ? gamma_new / totalWeight : 0;

    // Record the results
    const roundResult = {
      round: r,
      alpha: alphaNormalized,
      beta: betaNormalized,
      gamma: gammaNormalized,
      avgBid: avgBid,
      medianWait: medianWait,
      avgSize: avgSize,
    };
    results.push(roundResult);

    // Append to CSV content
    csvContent += `${r},${alphaNormalized.toFixed(4)},${betaNormalized.toFixed(4)},${gammaNormalized.toFixed(4)},${avgBid.toFixed(5)},${medianWait},${avgSize.toFixed(2)}\n`;

    // Log the round's results
    console.log(
      `Round ${r}: Alpha=${alphaNormalized.toFixed(4)}, Beta=${betaNormalized.toFixed(4)}, Gamma=${gammaNormalized.toFixed(4)} | AvgBid=${avgBid.toFixed(5)}, MedianWait=${medianWait}, AvgSize=${avgSize.toFixed(2)}`
    );

    // Update previous weights for next round
    alpha_prev = alphaNormalized;
    beta_prev = betaNormalized;
    gamma_prev = gammaNormalized;
console.log("test prev",alpha_prev, beta_prev, gamma_prev);
    // Update priority scores for this round
    const B_range = B_max - B_min || 1;
    const W_range = W_max - W_min || 1;
    const U_range = U_max - U_min || 1;

    const updatedRoundData = roundData.map(doc => {
      const bidScore = (doc.bid - B_min) / B_range;
      const waitScore = (doc.waitTime - W_min) / W_range;
      const sizeScore = (doc.size - U_min) / U_range;

      const priorityScore =
        alphaNormalized * bidScore +
        betaNormalized * waitScore +
        gammaNormalized * sizeScore;

      return {
        ...doc,
        priorityScore,
        processed: true
      };
    });

    // Append processed data
    processedData.push(...updatedRoundData);
  }

  // Save the CSV results
  const csvPath = path.join(__dirname, outputFilename);
  fs.writeFileSync(csvPath, csvContent, 'utf-8');
  console.log(`\nAll results saved to ${csvPath}`);

  // Optionally, save the processed data with priority scores
  const processedPath = path.join(__dirname, processedOutputFilename);
  fs.writeFileSync(processedPath, JSON.stringify(processedData, null, 2), 'utf-8');
  console.log(`Processed data with priority scores saved to ${processedPath}`);
};

// Execute the simulation
runSimulation();
