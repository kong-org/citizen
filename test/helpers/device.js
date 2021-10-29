const crypto                     = require('crypto');
const { MerkleTree }             = require('../helpers/merkleTree.js');
const ethereumJSUtil             = require('ethereumjs-util');
const fs                         = require('fs');
const path                       = require('path');

// Construct the hardwareHash which consists of the primary public key, secondary public key, tertiary public key and hardware serial.
function createHardwareHash(primaryPublicKeyHash, secondaryPublicKeyHash, tertiaryPublicKeyHash, hardwareSerial) {
  var hardwareBuf = Buffer.alloc(128);
  primaryPublicKeyHash.copy(hardwareBuf, 0);
  secondaryPublicKeyHash.copy(hardwareBuf, 32);
  tertiaryPublicKeyHash.copy(hardwareBuf, 64);
  hardwareSerial.copy(hardwareBuf, 96);
  var hardwareHash = crypto.createHash('sha256').update(hardwareBuf, 'hex').digest('hex');

  return hardwareHash;
}

// Generate an individual device.
async function createRandomDevice(kongAmount) {
  // Curve and key objects.
  curve = crypto.createECDH('prime256v1');
  curve.generateKeys();
  publicKey = [
    '0x' + curve.getPublicKey('hex').slice(2, 66),
    '0x' + curve.getPublicKey('hex').slice(-64)
  ];

  var tertiaryPublicKeyHash = ethereumJSUtil.bufferToHex(ethereumJSUtil.sha256(publicKey[0] + publicKey[1].slice(2)));

  var primaryPublicKeyHash = crypto.randomBytes(32);
  var secondaryPublicKeyHash = crypto.randomBytes(32);
  var hardwareSerial = crypto.randomBytes(32);

  tertiaryPublicKeyHash = Buffer.from(tertiaryPublicKeyHash.slice(2,66), 'hex');

  var hardwareHash = createHardwareHash(primaryPublicKeyHash, secondaryPublicKeyHash, tertiaryPublicKeyHash, hardwareSerial);

  return [
    '0x' + hardwareHash.toString('hex').toLowerCase(),            // bytes32: hardwareHash    
    '0x' + primaryPublicKeyHash.toString('hex').toLowerCase(),    // bytes32: primaryPublicKeyHash
    '0x' + secondaryPublicKeyHash.toString('hex').toLowerCase(),  // bytes32: secondaryPublicKeyHash
    tertiaryPublicKeyHash,                                        // bytes32: tertiaryPublicKeyHash
    '0x' + crypto.randomBytes(32).toString('hex').toLowerCase(),  // bytes32: hardwareManufacturer
    '0x' + crypto.randomBytes(32).toString('hex').toLowerCase(),  // bytes32: hardwareModel
    '0x' + hardwareSerial.toString('hex').toLowerCase(),          // bytes32: hardwareSerial
    '0x' + crypto.randomBytes(32).toString('hex').toLowerCase(),  // bytes32: hardwareConfig      
    '0x' + kongAmount.toString(16),                               // uint256: kongAmount
    '0x' + '0'.repeat(64),                                        // uint256: mintableTime
    true,                                                         // bool:    mintable
    curve                                                         // EC pair for tertiaryKey used for minting
  ];

}

// Generate random merkle tree, array of proofs and array of devices.
async function createRandomMerkleTree(count, kongAmount) {
  var totalMintableKong = 0;
  var totalDevices = 0;
  var devices = [];
  var deviceHardwareHashes = [];
  var deviceKongAmount = kongAmount;
  var proofs = [];

  for (var i = count - 1; i >= 0; i--) {
    device = await createRandomDevice(kongAmount);
    totalMintableKong += kongAmount;
    totalDevices += 1;
    devices.push(device);
    deviceHardwareHashes.push(device[0]);
  }

  const merkleTree = new MerkleTree(deviceHardwareHashes);
  const deviceRoot = merkleTree.getHexRoot();

  // Grab the proofs.
  for (var i = 0, len = deviceHardwareHashes.length; i < len; i++) {
    proof = merkleTree.getHexProof(deviceHardwareHashes[i]);
    proofs.push(proof);
  }

  // NOTE: we are using the buffer here rather than getting the hex root as that adds 0x
  var deviceRootHash = crypto.createHash('sha256').update(merkleTree.getRoot(), 'hex').digest('hex');

  return {
    devices: devices, 
    proofs: proofs, 
    root: [
      '0x' + deviceRootHash,                                        // bytes32 deviceRootHash;
      deviceRoot,                                                   // bytes32 deviceRoot;
      '0x' + deviceKongAmount.toString(16),                         // uint256 deviceKongAmount;
      '0x' + totalDevices.toString(16),                             // uint256 totalDevices;
      '0x' + totalMintableKong.toString(16),                        // uint256 totalMintableKong; 
      '0x' + '0'.repeat(64),                                        // uint256 mintableTime;
      'Qmep63fwu7oqrxN29KhZurxgd7hiksfqexu7esppmSRj23',             // string ipfsUri;
      'Fs2TGaWzK87Jh8PyE0QGWG--YcTRWaCWm83u4bPP9sw'                 // string arwUri;
    ]
  };
}

module.exports = {
    createRandomDevice, createRandomMerkleTree
}  