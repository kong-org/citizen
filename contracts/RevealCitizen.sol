// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./CitizenERC721Interface.sol";
import "@openzeppelin/contracts/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/AccessControlUpgradeable.sol";

contract RevealCitizen {

    CitizenERC721Interface public _citizenERC721;

    // TODO: emit reveal event
    // TODO: read from registry (?) or registry oracle

    // TODO: oracle capable of verifying P256 signatures.
    address revealOracle;

    constructor (CitizenERC721Interface citizenERC721) public {
        _citizenERC721 = citizenERC721;
    }

    event Reveal(
        uint256 tokenId,
        string publicKeyHash,
        uint[2] memory rs, 
        uint256 primaryPublicKeyX,
        uint256 primaryPublicKeyY
    );

    function updateRevealAddr(address revealOracle) public onlyOwner {
        revealOracle = revealOracle;
        // TODO: emit event?
    }

    // TODO: update registry, review which components are needed for verify.
    // TODO: oracleSignature
    function revealOracle(uint256 tokenId, 
                          uint[2] memory rs, 
                          uint256 primaryPublicKeyX,
                          uint256 primaryPublicKeyY, 
                          uint256 blockNumber,
                          bytes32 merkleRoot, 
                          uint256 oracleSignature) external {
        
        address from = msg.sender;

        // SHA256 hash of primary public key.
        bytes32 publicKeyHash = sha256(abi.encodePacked(primaryPublicKeyX, primaryPublicKeyY));

        // Hash of the Passport holder address.
        bytes32 passportHolderAddrHash = sha256(abi.encodePacked(address));

        // Hash of the Passport address hash and the primaryPublicKeyHash.
        bytes32 oracleHash = sha256(abi.encodePacked(publicKeyHash, passportHolderAddrHash));

        // Signature from the revealOracle indicating that verification of the P256 signature completed successfully.
        require(recover(bytes32 oracleHash, bytes memory oracleSignature) public pure returns(address) == revealOracle)

        // TODO: lookup tokenId, require that the token isn't set yet.
        require(_citizenERC721.deviceId(tokenId).length != 0, "Device already set.");

        // TODO: we write the registry contract address + root (do a get on registry contract to verify)
        // TODO: setDevice in erc721.
        require(_citizenERC721.setDevice(tokenId, publicKeyHash, merkleRoot));

        // TODO: emit reveal event with signature; we then hash with blockhash XX blocks later to reveal
        emit Reveal(tokenId, publicKeyHash, rs, primaryPublicKeyX, primaryPublicKeyY);
        
    }

    // TODO: mirror w/registry + elliptic curve verify
    // function reveal(uint256 tokenId, 
    //                 uint[2] memory rs, 
    //                 uint[2] memory Q, 
    //                 uint256 blockNumber, 
    //                 bytes32[] memory proof, 
    //                 bytes32 merkleRoot, 
    //                 bytes32 hardwareHash) external {

    //     // TODO: verify only if no oracle sig.
    //     // We need to (1) get the proof from IPFS, (2) the device root from contract, (3) the hardwareHash
    //     // bytes32[] memory proof, 
    //     // bytes32 root, 
    //     // bytes32 hardwareHash, 
    //     // uint256 kongAmount
    //     // verifyProof(proof, r.deviceRoot, hardwareHash, 0)

    // }
}