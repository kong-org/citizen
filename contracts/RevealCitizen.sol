// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./CitizenERC721Interface.sol";

contract RevealCitizen {

    CitizenERC721Interface public _citizenERC721;

    // TODO: emit reveal event
    // TODO: read from registry (?) or registry oracle

    // TODO: add elliptic, registry

    constructor (CitizenERC721Interface citizenERC721) public {
        _citizenERC721 = citizenERC721;
    }

    // TODO: update registry, review which components are needed for verify.
    // TODO: oracleSignature
    function revealOracle(uint256 tokenId, uint256 r, uint256 s, uint256 blockNumber, uint256 signature, uint256 oracleSignature) external {
        address from = msg.sender;



        // TODO: lookup tokenId, require that the token isn't set yet.
        // TODO: setDevice in erc721.
        // TODO: verify public key in merkle proof, signature.
        // TODO: select device hash?
        // TODO: emit reveal event with signature; we then hash with blockhash XX blocks later to reveal
    }

    function reveal(uint256 tokenId, uint256 r, uint256 s, uint256 blockNumber, uint256 signature, bytes32[] memory proof, bytes32 root, bytes32 hardwareHash) external {

        // TODO: verify only if no oracle sig.
        // We need to (1) get the proof from IPFS, (2) the device root from contract, (3) the hardwareHash
        // bytes32[] memory proof, 
        // bytes32 root, 
        // bytes32 hardwareHash, 
        // uint256 kongAmount
        // verifyProof(proof, r.deviceRoot, hardwareHash, 0)

    }

    // TODO: mirror w/registry + elliptic curve verify
}