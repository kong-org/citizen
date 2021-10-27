// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./CitizenERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RevealCitizen is Ownable {

    using ECDSA for bytes32;

    CitizenERC721 public _citizenERC721;

    // TODO: emit reveal event
    // TODO: read from registry (?) or registry oracle

    // TODO: oracle capable of verifying P256 signatures.
    address revealOracleAddr;

    constructor (CitizenERC721 citizenERC721) public {
        _citizenERC721 = citizenERC721;
    }

    event RevealOracleAddress(
        address revealOracleAddr
    );

    // Reveal indicates that the Passport has been associated and can be used to verify oracle.
    event Reveal(
        uint256 tokenId,
        bytes32 publicKeyHash,
        uint256 r,
        uint256 s, 
        uint256 primaryPublicKeyX,
        uint256 primaryPublicKeyY
    );

    function updateRevealAddr(address newAddr) public onlyOwner {
        revealOracleAddr = newAddr;
        emit RevealOracleAddress(revealOracleAddr);
    }


    function _verify(bytes32 data, bytes memory signature, address account) internal pure returns (bool) {
        return data
            .toEthSignedMessageHash()
            .recover(signature) == account;
    }

    // TODO: update registry, review which components are needed for verify.
    // TODO: oracleSignature
    function revealOracle(uint256 tokenId, 
                          uint[2] memory rs, 
                          uint256 primaryPublicKeyX,
                          uint256 primaryPublicKeyY, 
                          uint256 blockNumber,
                          bytes32 merkleRoot, 
                          bytes memory oracleSignature) external {
        
        address from = msg.sender;

        // Only the holder of the token can execute this contract.
        require(_citizenERC721.ownerOf(tokenId) == from);

        // TODO: lookup tokenId, require that the token isn't set yet.
        require(_citizenERC721.deviceId(tokenId).length != 0, "Device already set.");

        // SHA256 hash of primary public key.
        bytes32 publicKeyHash = sha256(abi.encodePacked(primaryPublicKeyX, primaryPublicKeyY));

        // Hash of the signature from the Passport.
        bytes32 signatureHash = sha256(abi.encodePacked(rs));

        // Hash of the Passport holder address.
        bytes32 passportHolderAddrHash = sha256(abi.encodePacked(from));

        // Hash of the Passport address hash and the primaryPublicKeyHash; this is what the oracle signed.
        bytes32 oracleHash = sha256(abi.encodePacked(publicKeyHash, signatureHash, passportHolderAddrHash));

        // Signature from the revealOracle indicating that verification of the P256 signature completed successfully.
        require(_verify(oracleHash, oracleSignature, revealOracleAddr));

        // TODO: we write the registry contract address + root (do a get on registry contract to verify)
        // TODO: setDevice in erc721.
        _citizenERC721.setDevice(tokenId, publicKeyHash, merkleRoot);

        // TODO: emit reveal event with signature; we then hash with blockhash XX blocks later to reveal
        emit Reveal(tokenId, publicKeyHash, rs[0], rs[1], primaryPublicKeyX, primaryPublicKeyY);
        
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