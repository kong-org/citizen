const { ethers, upgrades } = require("hardhat");
const keccak256 = require('keccak256');

const CITIZEN_ERC721_MAINNET = "0x355929193308e157760824ba860390924d77fab9";
const CITIZEN_ERC721_ROPSTEN = "0xCeDe9aD414d19E8fe8DdFFed0a35846542b1eb2E";

// NOTE: to test on Ropsten, you may need to register the .test domain via ENS Domains
const CITIZEN_ENS = "kongland.test"

var CitizenERC721Address = CITIZEN_ERC721_ROPSTEN;

const main = async () => {
  // Upgrade NFT contract.
  const CitizenERC721 = await ethers.getContractFactory("CitizenERC721");
  const nft = await upgrades.upgradeProxy(
    CitizenERC721Address,
    CitizenERC721
  );

  // // Deploy registrar.
  // const CitizenENSRegistrar = await ethers.getContractFactory(
  //   "CitizenENSRegistrar"
  // );
  // const registrar = await CitizenENSRegistrar.deploy(
  //   "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
  //   CitizenERC721Address,
  //   CITIZEN_ENS,
  //   ethers.utils.namehash("citizen.test")
  // );

  // // Transfer `citizen.eth` to the registrar.
  // const registry = await new ethers.Contract(
  //   "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
  //   ["function setOwner(bytes32 node, address owner) external"],
  //   await ethers.getSigner()
  // );
  // await registry.setOwner(
  //   ethers.utils.namehash(CITIZEN_ENS),
  //   registrar.address
  // );

  // // Set the registrar address in the NFT contract.
  // await nft.setENSRegistrarAddress(registrar.address); 
};

main();
