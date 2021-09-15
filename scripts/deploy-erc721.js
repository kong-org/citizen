const keccak256 = require('keccak256');

const CITIZEN_ERC20_MAINNET = "0x77f0cc420dea0ae726db6bef1460a4b69176a8ea"
const CITIZEN_ERC20_ROPSTEN = "0x4e4c7051ecce3985403be5c551c55b716ddbf2ab"

var CitizenERC20Address = CITIZEN_ERC20_MAINNET;

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  // UNCOMMENT BELOW TO DEPLOY FRESH ERC20.
  // const CitizenERC20Token = await ethers.getContractFactory("CitizenERC20");  
  // CitizenERC20 = await CitizenERC20Token.deploy();
  // CitizenERC20Address = CitizenERC20.address;

  // Deploy the base contracts.
  const CitizenERC721Token = await ethers.getContractFactory("CitizenERC721");
  const BurnContract = await ethers.getContractFactory("BurnMintCitizen");

  CitizenERC721Proxy = await upgrades.deployProxy(CitizenERC721Token);
  BurnMintCitizen = await BurnContract.deploy(CitizenERC20Address, CitizenERC721Proxy.address);

  // Add a role granding minter capability to BurnMintCitizen.
  await CitizenERC721Proxy.grantRole(keccak256('MINTER_ROLE'), BurnMintCitizen.address);  

  console.log("CitizenERC20Token address:", CitizenERC20Address);
  console.log("CitizenERC721Token address:", CitizenERC721Proxy.address);
  console.log("BurnContract address:", BurnMintCitizen.address);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });