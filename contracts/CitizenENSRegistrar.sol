// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@ensdomains/ens-contracts/contracts/registry/ENS.sol';
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';

contract CitizenENSRegistrar {

    ENS public immutable _registry;
    ERC721 public immutable _citizen;

    string public _rootName;  // citizen.eth
    bytes32 public _rootNode; // namehash(citizen.eth)

    // Mapping from token ID to subdomain label
    mapping(uint256 => bytes32) public _labels;

    constructor(ENS registry, ERC721 citizen, string memory rootName, bytes32 rootNode) {

        _registry = registry;
        _citizen = citizen;

        _rootName = rootName;
        _rootNode = rootNode;

    }

    function claim(uint256 tokenId, string calldata label) public {

        // Check that the caller owns the supplied tokenId.
        require(_citizen.ownerOf(tokenId) == msg.sender, "Caller must own the supplied tokenId.");

        // Check that a subdomain hasn't already been claimed for this tokenId.
        require(_labels[tokenId] == bytes32(0), "Caller has already claimed a subdomain.");

        // Encode the supplied label.
        bytes32 labelNode = keccak256(abi.encodePacked(label));
        bytes32 node = keccak256(abi.encodePacked(_rootNode, labelNode));

        // Make sure the label hasn't been claimed.
        require(_registry.owner(node) == address(0), "The supplied label has already been claimed.");

        // Create the subdomain.
        _registry.setSubnodeOwner(_rootNode, labelNode, msg.sender);
        _labels[tokenId] = labelNode;

        // TODO: Resolver?

    }

    // TODO: Maybe combine this logic into the claim function?
    function update(uint256 tokenId, string calldata label) public {

        // Check that the caller owns the supplied tokenId.
        require(_citizen.ownerOf(tokenId) == msg.sender, "Caller must own the supplied tokenId.");

        // Check that a subdomain has already been claimed for this tokenId.
        require(_labels[tokenId] != bytes32(0), "Caller hasn't claimed a subdomain.");

        // Encode the supplied label.
        bytes32 labelNode = keccak256(abi.encodePacked(label));
        bytes32 node = keccak256(abi.encodePacked(_rootNode, labelNode));

        // Make sure the label hasn't been claimed.
        require(_registry.owner(node) == address(0), "The supplied label has already been claimed.");

        // Delete the previous subdomain, creating a new one.
        _registry.setSubnodeOwner(_rootNode, _labels[tokenId], address(0));
        _registry.setSubnodeOwner(_rootNode, labelNode, msg.sender);
        _labels[tokenId] = labelNode;

    }

    function transfer(uint256 tokenId, address to) public onlyCitizenNFT {

        bytes32 label = _labels[tokenId];

        // Check if a label has been claimed for this tokenId.
        if (label != bytes32(0)) {

            // If a label has been claimed ...
            // Transfer ownership of the subdomain.
            _registry.setSubnodeOwner(_rootNode, label, to);

        }

    }

    modifier onlyCitizenNFT() {

        require(
            msg.sender == address(_citizen),
            "Caller is not the CITIZEN NFT."
        );
        _;

    }

}