// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@ensdomains/ens-contracts/contracts/resolvers/profiles/AddrResolver.sol';
import '@ensdomains/ens-contracts/contracts/resolvers/profiles/NameResolver.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract CitizenENSResolver is Ownable, AddrResolver, NameResolver {

    function isAuthorised(bytes32 node) internal override view returns(bool) {

        return owner() == msg.sender;

    }

    function supportsInterface(bytes4 interfaceID) virtual override(AddrResolver, NameResolver) public pure returns(bool) {

        return super.supportsInterface(interfaceID);

    }

}
