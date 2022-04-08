const keccak256 = require('keccak256');

const CITIZEN_ERC721_MAINNET = "0x355929193308e157760824ba860390924d77fab9";
const CITIZEN_ERC721_ROPSTEN = "0xd431b82796865F396e28d0f56b6a3d6626268A6e";
const CITIZEN_ERC721_RINKEBY = "0xc16F6fD81c7e40Da889E9C66Abb3bB0a63Ac1C6a";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const CtznERC20Token = await ethers.getContractFactory("CtznERC20");

  // Deploy the base contracts.
  CtznERC20 = await CtznERC20Token.deploy(CITIZEN_ERC721_MAINNET);

  console.log("CtznERC20Token address:", CtznERC20.address);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });