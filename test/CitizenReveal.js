const { expect } = require("chai");
const keccak256 = require('keccak256');

const {
  BN,           // Big Number support
  constants,    // Common constants, like the zero address and largest integers
  expectEvent,  // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

const { ethers, upgrades } = require("hardhat");


describe("CitizenBurnTests", function () {

  let CitizenERC20Token;
  let CitizenERC721Token;
  let BurnContract;

  let CitizenERC20;
  let CitizenERC721;
  let BurnMintCitizen;

  // Set up several $CITIZEN addresses.
  let revealContract;
  let revealCitizen;

  // Set up several $CITIZEN conditions.
  var exp = ethers.BigNumber.from("10").pow(18);
  var partialExp = ethers.BigNumber.from("10").pow(17);

  // Set up several $CITIZEN conditions.
  const maxCitizen = ethers.BigNumber.from("500").mul(exp);
  const singleCitizen = ethers.BigNumber.from("1").mul(exp);
  const manyCitizen = ethers.BigNumber.from("5").mul(exp);
  const partialCitizen = ethers.BigNumber.from("1").mul(partialExp);

  before(async function () {

    const signers = await ethers.getSigners();
    revealContract = signers[1];
    revealCitizen = signers[2];

    const CitizenERC721PreENS = await ethers.getContractFactory(
      "CitizenERC721PreENS"
    );
    proxy = await upgrades.deployProxy(CitizenERC721PreENS);

    // Add a role granding minter capability to BurnMintCitizen.
    await proxy.grantRole(keccak256('DEVICE_ROLE'), revealContract.address);

    // Increase time to be past epoch of 1631714400
    await network.provider.send("evm_increaseTime", [360000])
    await network.provider.send("evm_mine")

    // Mint.
    await proxy.mint(revealCitizen.address);
  });

    // function revealOracle(uint[2] memory rs, 
    //                       uint256 primaryPublicKeyX,
    //                       uint256 primaryPublicKeyY, 
    //                       uint256 blockNumber,
    //                       bytes32 merkleRoot, 
    //                       uint256 oracleSignature)

  describe('\n\RevealCitizen', () => {
    it("Upgrade the ERC721 contract.", async () => {
      const CitizenERC721 = await ethers.getContractFactory("CitizenERC721");
      proxy = await upgrades.upgradeProxy(proxy.address, CitizenERC721);

      // ENS registrar is a new function added post-original contract. Rough approximation.
      expect(await proxy._ensRegistrar()).to.equal(
        "0x0000000000000000000000000000000000000000"
      );
    });

    // TODO: reveal. don't reveal on bad sig. emit events.
    it("It should verify on valid oracle.", async function () {
      // Link the Passport device to the $CITIZEN token by verifying a signature from the device.
      const revealCitizen = await proxy.revealOracle();

      // const burnerBalancePreBurn = await CitizenERC20.balanceOf(burnerAddr.address);
      // expect(burnerBalancePreBurn).to.equal(singleCitizen);

      // // Burner address approves $CITIZEN use by BurnMintCitizen.
      // const approveBurnReceipt = await CitizenERC20.connect(burnerAddr).approve(BurnMintCitizen.address, singleCitizen);

      // // Burner address calls burn function.
      // const callToBurn = await BurnMintCitizen.connect(burnerAddr).burnTokenToMint();
      // const burnerBalancePostBurn = await CitizenERC20.balanceOf(burnerAddr.address);
      // expect(burnerBalancePostBurn).to.equal(0);

      // // Verify the ERC20 supply after this.
      // const citizenERC20SupplyPost = await CitizenERC20.totalSupply();
      // expect(citizenERC20SupplyPost).to.equal(maxCitizen.sub(singleCitizen));

      // // Verify ERC721 balance of burnerAddr.
      // const citizenERC721Balance = await CitizenERC721Proxy.balanceOf(burnerAddr.address);
      // expect(citizenERC721Balance).to.equal(1);
    });

  });

});
