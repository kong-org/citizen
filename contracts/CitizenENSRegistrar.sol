// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@ensdomains/ens-contracts/contracts/registry/ENS.sol';

contract CitizenENSRegistrar {
    
    ENS public immutable _registry;

    string public _rootName;  // citizen.eth
    bytes32 public _rootNode; // namehash(citizen.eth)

    constructor(ENS registry, string memory rootName, bytes32 rootNode) {

        _registry = registry;

        _rootName = rootName;
        _rootNode = rootNode;

    }

    function claim(string calldata label) public {

        bytes32 labelNode = keccak256(abi.encodePacked(label));
        bytes32 node = keccak256(abi.encodePacked(_rootNode, labelNode));

        // Make sure label hasn't been claimed.
        require(_registry.owner(node) == address(0));

        _registry.setSubnodeOwner(_rootNode, labelNode, msg.sender);

        // TODO: Resolver?

    }

}
