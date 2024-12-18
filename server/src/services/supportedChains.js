// services/supportedChains.js

const { mainnet, sepolia, goerli } = require('viem/chains'); // Import chains as needed

function getBlobSubmissionChainFromId(chainId) {
  switch (chainId) {
    case 1:
      return mainnet;
    case 11155111:
      return sepolia;
    // Add other chains as needed
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}

function getDepositContractChainFromId(chainId) {
  switch (chainId) {
    case 1:
      return mainnet;
    case 11155111:
      return sepolia;
    // Add other chains as needed
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}

module.exports = {
  getBlobSubmissionChainFromId,
  getDepositContractChainFromId,
};
