// blobSharingService.js

const { concat, Hex, isHex,} = require("viem");

// Constants defining byte lengths
const SIGNATURE_LENGTH_IN_BYTES = 65; // ECDSA signature length in bytes
const SIGNATURE_LENGTH_IN_HEX = SIGNATURE_LENGTH_IN_BYTES * 2; // hex characters

const ROLLUP_ID_LENGTH_IN_BYTES = 2; // Int32 rollupId, fixed at 4 bytes
const ROLLUP_ID_LENGTH_IN_HEX =ROLLUP_ID_LENGTH_IN_BYTES* 2;
const DATA_LENGTH_IN_BYTES = 2; // Data length field, 2 bytes
const DATA_LENGTH_IN_HEX = DATA_LENGTH_IN_BYTES * 2; // 4 hex characters


const numberToHexPadded = (number, byteLength) => {
  const buffer = Buffer.alloc(byteLength);
  switch (byteLength) {
    case 1:
      buffer.writeUInt8(number, 0);
      break;
    case 2:
      buffer.writeUInt16BE(number, 0);
      break;
    case 4:
      buffer.writeUInt32BE(number, 0);
      break;
    default:
      throw new Error(`Unsupported byteLength: ${byteLength}`);
  }
  return buffer.toString('hex');
};

const encodeDataToHex = (data) => {
  return Buffer.from(data, 'utf8').toString('hex');
};

const decodeHexToUtf8 = (hex) => {
  return Buffer.from(hex, 'hex').toString('utf8');
};

const mergeBlobs = (partialBlobs) => {
  const hexParts = partialBlobs.flatMap(blob => {
    const { rollupId, signature, data } = blob;
    // Validate Rollup ID
    if (typeof rollupId !== 'number' || !Number.isInteger(rollupId) || rollupId < 0) {
      throw new Error(`Invalid rollupId: ${rollupId}. Must be a non-negative integer.`);
    }
    // Validate Signature
    let signatureHex = signature.startsWith('0x') ? signature.slice(2) : signature;

    if (signatureHex.length !== SIGNATURE_LENGTH_IN_HEX) {
      throw new Error(`Signature must be exactly ${SIGNATURE_LENGTH_IN_HEX} hex characters long.`);
    }
    // Encode Rollup ID Length (fixed at 4 bytes for Int32)
    const rollupIdLengthHex = numberToHexPadded(ROLLUP_ID_LENGTH_IN_BYTES, 2); // 
    // Encode Rollup ID
    const rollupIdHex = numberToHexPadded(rollupId, ROLLUP_ID_LENGTH_IN_BYTES); // 8 hex chars
    // Encode Data
    const dataHex = encodeDataToHex(data);
    // Calculate and encode Data Length
    const dataLength = Buffer.byteLength(data, 'utf8');
    if (dataLength > 65535) { // 2 bytes can represent up to 65535
      throw new Error(`Data length exceeds maximum allowed 65535 bytes: ${dataLength}`);
    }
    const dataLengthHex = numberToHexPadded(dataLength, 2)
    // Return array of hex parts without '0x'
    return [rollupIdLengthHex, rollupIdHex, signatureHex, dataLengthHex, dataHex];
  });
  const fusedHex = concat(hexParts);
  return fusedHex;
};


const unmergeBlobs = (fusedBlob) => {
  if (!isHex(fusedBlob)) {
    throw new Error("Invalid hex: Must start with '0x'.");
  }

  let offset = 2; // Skip '0x' prefix
  const partialBlobs = [];

  while (offset < fusedBlob.length) {
    // Extract Rollup ID Length (2 bytes = 4 hex characters)
    const rollupIdLengthHex = fusedBlob.slice(offset, offset + rollupIdHex); // 4 hex chars
    const rollupIdLength = parseInt(rollupIdLengthHex, 16);
    offset += rollupIdLengthHex;

    // Extract Rollup ID (rollupIdLength bytes = rollupIdLength * 2 hex characters)
    const rollupIdHex = fusedBlob.slice(offset, offset + (rollupIdLength * 2)); // variable
    let rollupId;
    if (rollupIdLength === ROLLUP_ID_LENGTH_IN_BYTES) { // Int32
      rollupId = parseInt(rollupIdHex, 16);
    } else {
      // Handle other lengths if needed
      throw new Error(`Unsupported rollupId length: ${rollupIdLength} bytes.`);
    }
    offset += (rollupIdLength * 2);

    const signatureHex = fusedBlob.slice(offset, offset + SIGNATURE_LENGTH_IN_HEX); // 68 hex chars
    const signature = `0x${signatureHex}`;
    offset += SIGNATURE_LENGTH_IN_HEX;

    // Extract Data Length (2 bytes = 4 hex characters)
    const dataLengthHex = fusedBlob.slice(offset, offset + DATA_LENGTH_IN_HEX); // 4 hex chars
    const dataLength = parseInt(dataLengthHex, 16);
    offset += DATA_LENGTH_IN_HEX;

    // Extract Data (dataLength bytes = dataLength * 2 hex characters)
    const dataHex = fusedBlob.slice(offset, offset + (dataLength * 2)); // variable
    const data = decodeHexToUtf8(dataHex);
    offset += (dataLength * 2);
    partialBlobs.push({
      rollupId,
      signature,
      data
    });
  }

  return partialBlobs;
};

// Exporting the fuse and unfuse functions
module.exports = {
  mergeBlobs,
  unmergeBlobs
};

