const keccak256 = require('keccak256');

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const CitizenERC20Token = await ethers.getContractFactory("CitizenERC20");
  const CitizenERC721Token = await ethers.getContractFactory("CitizenERC721");
  const BurnContract = await ethers.getContractFactory("BurnMintCitizen");

  // Deploy the base contracts.
  CitizenERC20 = await CitizenERC20Token.deploy();
  CitizenERC721 = await CitizenERC721Token.deploy();
  BurnMintCitizen = await BurnContract.deploy(CitizenERC20.address, CitizenERC721.address);

  // Add a role granding minter capability to BurnMintCitizen.
  await CitizenERC721.grantRole(keccak256('MINTER_ROLE'), BurnMintCitizen.address);  

  console.log("CitizenERC20Token address:", CitizenERC20.address);
  console.log("CitizenERC721Token address:", CitizenERC721.address);
  console.log("BurnContract address:", BurnMintCitizen.address);


}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });