const { http, createPublicClient } = require('viem');
const { sepolia } = require('viem/chains');
const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  });
const addressVerifier = async (address, data, signature) => {
  try {
    const isValid = await publicClient.verifyMessage({
        address: address,
        message: data,
        signature,
      })
      return isValid;
  } catch (error) {
    console.error("Error in verification:", error);
    throw error;
  }
};

module.exports = { addressVerifier };
