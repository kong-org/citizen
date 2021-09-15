const keccak256 = require('keccak256');

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const CitizenERC20Token = await ethers.getContractFactory("CitizenERC20");

  // Deploy the base contracts.
  CitizenERC20 = await CitizenERC20Token.deploy();

  console.log("CitizenERC20Token address:", CitizenERC20.address);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });