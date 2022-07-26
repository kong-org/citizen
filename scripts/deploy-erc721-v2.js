const { ethers, upgrades } = require("hardhat");
const keccak256 = require('keccak256');

const CITIZEN_ERC721_MAINNET = "0x355929193308e157760824ba860390924d77fab9";
const CITIZEN_ERC721_ROPSTEN = "0xc8b3EAD0d32E793D6549E6898b1F9e5078D9bAc2";
const CITIZEN_ERC721_RINKEBY = "0xe6814b456e95a698347Cb4e58C7f0C354C25fd2C";

// WARNING: to test on Ropsten, it is recommended to first get a fresh .test domain using the deployer account.
const CITIZEN_ENS_MAINNET = "citizen.eth"
const CITIZEN_ENS_ROPSTEN = "kong.test"
const CITIZEN_ENS_RINKEBY = "sup.test"

// Deploy BurnMintCtzn prior.
const BURNMINTCTZN_MAINNET = "0x9F3e2C4337eD89C3f7c287954E8100573ef0C05a"
const BURNMINTCTZN_ROPSTEN = ""
const BURNMINTCTZN_RINKEBY = "0x709437F43F15Fcec4606e382bfa6a950Cc31e890"

// Set the address of the reveal oracle.
const CITIZEN_REVEAL_ADDR = "0xf77b819ada48e01802361f763d01a579c998c6c6"

// Set the CID of the document on IPFS which contains the NFT attributes.
const CITIZEN_REVEAL_CID = "QmZ9vut8rvZJwUMigoaRcyjPGsN3iKjiJypr6FoDdvPUbk"

// Set your network here.
// var CitizenERC721Address = CITIZEN_ERC721_ROPSTEN;
// var CitizenENS = CITIZEN_ENS_ROPSTEN;

var CitizenERC721Address = CITIZEN_ERC721_MAINNET;
// var CitizenENS = CITIZEN_ENS_MAINNET;

const main = async () => {
  // Upgrade NFT contract.
  const CitizenERC721 = await ethers.getContractFactory("CitizenERC721");
  const nft = await upgrades.upgradeProxy(
    CitizenERC721Address,
    CitizenERC721,
    {unsafeSkipStorageCheck: true} // See https://forum.openzeppelin.com/t/problem-with-adding-state-variable-to-base-contract-in-upgradable-contract/23689 and https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/276
  );

  // // Deploy registrar.
  // const CitizenENSRegistrar = await ethers.getContractFactory(
  //   "CitizenENSRegistrar"
  // );
  // const registrar = await CitizenENSRegistrar.deploy(
  //   "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
  //   CitizenERC721Address,
  //   CitizenENS,
  //   ethers.utils.namehash(CitizenENS)
  // );

  // // Transfer `citizen.eth` to the registrar.
  // const registry = await new ethers.Contract(
  //   "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
  //   ["function setOwner(bytes32 node, address owner) external"],
  //   await ethers.getSigner()
  // );
  // await registry.setOwner(
  //   ethers.utils.namehash(CitizenENS),
  //   registrar.address
  // );

  // // Set the registrar address in the NFT contract.
  // await nft.setENSRegistrarAddress(registrar.address);

  // Deploy revealCitizen.sol.
  const RevealCitizen = await ethers.getContractFactory("RevealCitizen");
  const reveal = await RevealCitizen.deploy(CitizenERC721Address);

  // Add a role granding device capability to RevealCitizen.
  await nft.grantRole(keccak256('DEVICE_ROLE'), reveal.address);

  // Set up oracle and attribute CID
  await reveal.updateRevealAddr(CITIZEN_REVEAL_ADDR); 
  // await reveal.updateRevealCid(CITIZEN_REVEAL_CID);  

  // Add minting role
  await nft.grantRole(keccak256('MINTER_ROLE'), BURNMINTCTZN_MAINNET);

};

main();
