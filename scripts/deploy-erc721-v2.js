const { ethers, upgrades } = require("hardhat");
const keccak256 = require('keccak256');

const CITIZEN_ERC721_MAINNET = "0x355929193308e157760824ba860390924d77fab9";
const CITIZEN_ERC721_ROPSTEN = "0xd431b82796865F396e28d0f56b6a3d6626268A6e";

// WARNING: to test on Ropsten, it is recommended to first get a fresh .test domain using the deployer account.
const CITIZEN_ENS_MAINNET = "citizen.eth"
const CITIZEN_ENS_ROPSTEN = "kong.test"

// Set your network here.
var CitizenERC721Address = CITIZEN_ERC721_ROPSTEN;
var CitizenENS = CITIZEN_ENS_ROPSTEN;

const main = async () => {
  // Upgrade NFT contract.
  const CitizenERC721 = await ethers.getContractFactory("CitizenERC721");
  const nft = await upgrades.upgradeProxy(
    CitizenERC721Address,
    CitizenERC721
  );

  // Deploy registrar.
  const CitizenENSRegistrar = await ethers.getContractFactory(
    "CitizenENSRegistrar"
  );
  const registrar = await CitizenENSRegistrar.deploy(
    "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
    CitizenERC721Address,
    CitizenENS,
    ethers.utils.namehash("citizen.test")
  );

  // Transfer `citizen.eth` to the registrar.
  const registry = await new ethers.Contract(
    "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
    ["function setOwner(bytes32 node, address owner) external"],
    await ethers.getSigner()
  );
  await registry.setOwner(
    ethers.utils.namehash(CitizenENS),
    registrar.address
  );

  // Set the registrar address in the NFT contract.
  await nft.setENSRegistrarAddress(registrar.address);

  // Deploy revealCitizen.sol.
  const RevealCitizen = await ethers.getContractFactory("RevealCitizen");
  const reveal = await RevealCitizen.deploy(CitizenERC721Address);

  // Add a role granding device capability to RevealCitizen.
  await nft.grantRole(keccak256('DEVICE_ROLE'), RevealCitizen.address);  

  // TODO: set oracle address.

};

main();
