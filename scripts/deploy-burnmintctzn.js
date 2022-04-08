const keccak256 = require('keccak256');

const CTZN_ERC20_MAINNET = "0x79BA39F90bB94fb850A989944CDfde12Ed480FF9";
const CTZN_ERC20_ROPSTEN = "0xee39BA995bED7fb84BcCa07199c4Ae80D29283aa";
const CTZN_ERC20_RINKEBY = "";

const CITIZEN_ERC721_MAINNET = "0x355929193308e157760824ba860390924d77fab9";
const CITIZEN_ERC721_ROPSTEN = "0xd431b82796865F396e28d0f56b6a3d6626268A6e";
const CITIZEN_ERC721_RINKEBY = "0xc16F6fD81c7e40Da889E9C66Abb3bB0a63Ac1C6a";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const BurnMintCtznContract = await ethers.getContractFactory("BurnMintCtzn");

  // Deploy the base contracts.
  BurnMintCtzn = await BurnMintCtznContract.deploy(CTZN_ERC20_ROPSTEN, CITIZEN_ERC721_ROPSTEN);

  console.log("BurnMintCtzn address:", BurnMintCtzn.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });