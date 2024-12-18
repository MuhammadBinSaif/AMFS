// services/kzgService.js
const { blobSubmitterWalletClient,blobSubmitterPublicClient } = require('./clientService');
const { contractAddress,contractABI } = require('../config/contract');
const { toBlobs, parseGwei, fromBlobs } = require('viem');
const { kzg } = require('./kzgService');

const sendBlobTransaction = async (blobDataItems)=> {
  try {
    const blobs = toBlobs({ data: (blobDataItems) })
    const hash = await blobSubmitterWalletClient.sendTransaction({
      blobs,
      kzg,
      maxFeePerBlobGas: parseGwei('30'),
      to: '0x0000000000000000000000000000000000000000',
    })

   return hash;
  } catch (error) {
    console.error('Error in sendBlobTransaction:', error);
    throw error;
  }
};

const getBlobFromTx = async (txHash) => {
  try {

    const tx = await fromBlobs({ blobs: [txHash] })
    if (!tx) {
      console.error('Transaction not found');
      return;
    }
console.log(tx)

   return tx;
  } catch (error) {
    console.error('Error:', error.message);
  }
};

const checkBalance = async (address,bid) => {
  const balance = await blobSubmitterPublicClient.readContract({
      address: contractAddress,
      abi: contractABI,
      functionName: "checkBalance",
        args: [address],
  });
 if(balance < bid){
   return false
 }
  else{
    return true
  }
}


module.exports = {
  sendBlobTransaction,
  getBlobFromTx,
  checkBalance
};
  