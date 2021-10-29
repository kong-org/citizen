// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @dev ERC721 token linked to a physical asset,
 */
abstract contract ERC721Physical is ERC721 {
    using Strings for uint256;

    struct Device { 
       bytes32 publicKeyHash;
       bytes32 merkleRoot;
    }

    // The device registry.
    address public _registryAddress;

    // Optional mapping for deivce IDs and and device roots.
    mapping(uint256 => Device) private _devices;

    event UpdateRegistry(address registryAddress);
    event DeviceSet(
        uint256 tokenId,
        bytes32 publicKeyHash,
        bytes32 merkleRoot
    );

    /**
     * @dev Get a deviceId for a given tokenId
     */
    function deviceId(uint256 tokenId) public view virtual returns(bytes32) {
        require(_exists(tokenId), "Device ID query for nonexistant token");

        bytes32 _deviceId = _devices[tokenId].publicKeyHash;
        return _deviceId;
    }

    /**
     * @dev Get a deviceRoot for a given tokenId
     */
    function deviceRoot(uint256 tokenId) public view virtual returns(bytes32) {
        require(_exists(tokenId), "Device root query for nonexistant token");

        bytes32 _deviceRoot = _devices[tokenId].merkleRoot;
        return _deviceRoot;
    }

    function _setRegistryAddress(address registryAddress) internal virtual {
         _registryAddress = registryAddress;
        emit UpdateRegistry(_registryAddress);
    }

    function _setDevice(uint256 tokenId, bytes32 publicKeyHash, bytes32 merkleRoot) internal virtual {
        require(_exists(tokenId), "Device set for nonexistant token");
        _devices[tokenId].publicKeyHash = publicKeyHash;
        _devices[tokenId].merkleRoot = merkleRoot;
        emit DeviceSet(tokenId, publicKeyHash, merkleRoot);
    }

    function _burn(uint256 tokenId) internal virtual override {
        super._burn(tokenId);

        if (_devices[tokenId].publicKeyHash.length != 0) {
            delete _devices[tokenId];
        }
    }
}