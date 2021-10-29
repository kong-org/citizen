// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./CitizenERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol";

contract RevealCitizen is Ownable {

    using ECDSA for bytes32;

    CitizenERC721 public _citizenERC721;
    address public _revealOracleAddr;

    constructor (CitizenERC721 citizenERC721) public {
        _citizenERC721 = citizenERC721;
    }

    event RevealOracleAddress(
        address _revealOracleAddr
    );

    // Reveal indicates that the Passport has been associated and can be used to verify oracle.
    event Reveal(
        uint256 tokenId,
        uint256 primaryPublicKeyX,
        uint256 primaryPublicKeyY,
        uint256 r,
        uint256 s, 
        bytes32 blockhash
    );

    function updateRevealAddr(address newAddr) public onlyOwner {
        _revealOracleAddr = newAddr;
        emit RevealOracleAddress(_revealOracleAddr);
    }

    // Verify the oracleSignature.
    function _verify(bytes32 data, bytes memory signature, address account) internal pure returns (bool) {
        return data
            .toEthSignedMessageHash()
            .recover(signature) == account;
    }

    // Set the device and reveal NFT after an oracle has verfied the P256 signature from the device.
    function revealOracle(uint256 tokenId, 
                          uint[2] memory rs, 
                          uint256 primaryPublicKeyX,
                          uint256 primaryPublicKeyY, 
                          bytes32 blockhash,
                          bytes32 merkleRoot, 
                          bytes memory oracleSignature) external {
        
        address from = msg.sender;

        // Only the holder of the token can execute this contract.
        require(_citizenERC721.ownerOf(tokenId) == from, "Only token holder can reveal.");

        // Lookup tokenId, require that the token isn't set yet.
        require(_citizenERC721.deviceId(tokenId) == 0, "Device already set.");

        // SHA256 hash of the device's primary public key.
        bytes32 publicKeyHash = sha256(abi.encodePacked(primaryPublicKeyX, primaryPublicKeyY));
        // console.logBytes32(publicKeyHash);

        // Hash of the signature from the Passport.
        bytes32 signatureHash = sha256(abi.encodePacked(rs));
        // console.logBytes32(signatureHash);

        // Hash of the Passport holder address and blockhash.
        bytes32 passportHolderAddrHash = sha256(abi.encodePacked(from, blockhash));
        // console.logBytes32(passportHolderAddrHash);

        // Hash of the Passport address hash and the primaryPublicKeyHash; this is what the oracle signed.
        bytes32 oracleHash = sha256(abi.encodePacked(publicKeyHash, signatureHash, passportHolderAddrHash));
        // console.logBytes32(oracleHash);

        // Signature from the revealOracle indicating that verification of the P256 signature completed successfully.
        require(_verify(oracleHash, oracleSignature, _revealOracleAddr), "Verify failed.");

        // setDevice in erc721.
        _citizenERC721.setDevice(tokenId, publicKeyHash, merkleRoot);

        // Note: the registry address is implicit against what is in CitizenERC721. Reveal information should
        // allow for honesty check of oracle. rs will be hashed with subsequent block to reveal.
        emit Reveal(tokenId, primaryPublicKeyX, primaryPublicKeyY, rs[0], rs[1], blockhash);
        
    }

    // TODO: reveal function w/registry + elliptic curve to verify onchain. Estimated at 1-2 million gas.

}