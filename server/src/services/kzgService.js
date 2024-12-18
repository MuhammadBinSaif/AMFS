// services/kzg.js

const cKzg = require('c-kzg'); // Ensure c-kzg is installed via npm
const { setupKzg } = require('viem');
const { mainnetTrustedSetupPath } = require('viem/node');


// Initialize KZG with Viem's setupKzg
const kzg = setupKzg(cKzg, mainnetTrustedSetupPath)

module.exports = { kzg };
