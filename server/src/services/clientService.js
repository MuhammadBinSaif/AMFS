// services/client.js

const { createWalletClient, http, createPublicClient } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
require('dotenv').config();

const { getBlobSubmissionChainFromId, getDepositContractChainFromId } = require('./supportedChains');

// Set up Blob Submitter Wallet Client
const blobSubmitterRpcUrl = process.env.BLOB_SUBMITTER_RPC_URL;
const account =  privateKeyToAccount(process.env.BLOB_SUBMITTER_PRIVATE_KEY);
const blobSubmitterWalletClient = createWalletClient({
  account: account,
  chain: getBlobSubmissionChainFromId(11155111),
  transport: http(blobSubmitterRpcUrl || undefined),
});

// Set up Blob Submitter Public Client
const blobSubmitterPublicClient = createPublicClient({
  chain: getBlobSubmissionChainFromId(11155111),
  transport: http(blobSubmitterRpcUrl || undefined),
});
module.exports = {
  blobSubmitterWalletClient,
  blobSubmitterPublicClient,
};
