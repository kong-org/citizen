const { expect } = require("chai");
const keccak256 = require('keccak256');

const {
  BN,           // Big Number support
  constants,    // Common constants, like the zero address and largest integers
  expectEvent,  // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

describe("CitizenBurnTests", function () {

  let CitizenERC20Token;
  let CitizenERC721Token;
  let BurnContract;

  let CitizenERC20;
  let CitizenERC721;
  let BurnMintCitizen;

  // Set up several $CITIZEN addresses.
  let owner;
  let burnerAddr;
  let fakeAddr;
  let cantMintAddr;

  // Set up several $CITIZEN conditions.
  var exp = ethers.BigNumber.from("10").pow(18);
  var partialExp = ethers.BigNumber.from("10").pow(17);

  // Set up several $CITIZEN conditions.
  const maxCitizen = ethers.BigNumber.from("500").mul(exp);
  const singleCitizen = ethers.BigNumber.from("1").mul(exp);
  const manyCitizen = ethers.BigNumber.from("5").mul(exp);
  const partialCitizen = ethers.BigNumber.from("1").mul(partialExp);

  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    CitizenERC20Token = await ethers.getContractFactory("CitizenERC20");
    CitizenERC721Token = await ethers.getContractFactory("CitizenERC721");
    BurnContract = await ethers.getContractFactory("BurnMintCitizen");
    [owner, burnerAddr, fakeAddr, cantMintAddr] = await ethers.getSigners();

    // Deploy the base contracts.
    CitizenERC20 = await CitizenERC20Token.deploy();
    CitizenERC721 = await CitizenERC721Token.deploy();
    BurnMintCitizen = await BurnContract.deploy(CitizenERC20.address, CitizenERC721.address);

    // Add a role granding minter capability to BurnMintCitizen.
    await CitizenERC721.grantRole(keccak256('MINTER_ROLE'), BurnMintCitizen.address);

  });

  describe('\n\tBurnMintCitizen', () => {
    it("It should burn token after approval.", async function () {
      // Transfer a single $CITIZEN to the address that will burn.
      const burnerTransferReceipt = await CitizenERC20.transfer(burnerAddr.address, singleCitizen);
      const burnerBalancePreBurn = await CitizenERC20.balanceOf(burnerAddr.address);
      expect(burnerBalancePreBurn).to.equal(singleCitizen);

      // Burner address approves $CITIZEN use by BurnMintCitizen.
      const approveBurnReceipt = await CitizenERC20.connect(burnerAddr).approve(BurnMintCitizen.address, singleCitizen);

      // Burner address calls burn function.
      const callToBurn = await BurnMintCitizen.connect(burnerAddr).burnTokenToMint();
      const burnerBalancePostBurn = await CitizenERC20.balanceOf(burnerAddr.address);
      expect(burnerBalancePostBurn).to.equal(0);

      // Verify the ERC20 supply after this.
      const citizenERC20SupplyPost = await CitizenERC20.totalSupply();
      expect(citizenERC20SupplyPost).to.equal(maxCitizen.sub(singleCitizen));

      // Verify ERC721 balance of burnerAddr.
      const citizenERC721Balance = await CitizenERC721.balanceOf(burnerAddr.address);
      expect(citizenERC721Balance).to.equal(1);
    });

    it("It should burn multiple tokens after approval.", async function () {
      // Transfer a single $CITIZEN to the address that will burn.
      const burnerTransferReceipt = await CitizenERC20.transfer(burnerAddr.address, manyCitizen);
      const burnerBalancePreBurn = await CitizenERC20.balanceOf(burnerAddr.address);
      expect(burnerBalancePreBurn).to.equal(manyCitizen);

      // Burner address approves $CITIZEN use by BurnMintCitizen.
      const approveBurnReceipt = await CitizenERC20.connect(burnerAddr).approve(BurnMintCitizen.address, manyCitizen);

      // Burner address calls burn function.
      const callToBurn = await BurnMintCitizen.connect(burnerAddr).burnTokenToMint();
      const burnerBalancePostBurn = await CitizenERC20.balanceOf(burnerAddr.address);
      expect(burnerBalancePostBurn).to.equal(manyCitizen.sub(singleCitizen));

      // Verify the ERC20 supply after this.
      const citizenERC20SupplyPost = await CitizenERC20.totalSupply();
      expect(citizenERC20SupplyPost).to.equal(maxCitizen.sub(singleCitizen));

      // Burner address calls burn function again.
      const callToBurnAgain = await BurnMintCitizen.connect(burnerAddr).burnTokenToMint();
      const burnerBalancePostBurnAgain = await CitizenERC20.balanceOf(burnerAddr.address);
      expect(burnerBalancePostBurnAgain).to.equal(manyCitizen.sub(singleCitizen).sub(singleCitizen));

      // Verify the ERC20 supply after this again.
      const citizenERC20SupplyPostAgain = await CitizenERC20.totalSupply();
      expect(citizenERC20SupplyPostAgain).to.equal(maxCitizen.sub(singleCitizen).sub(singleCitizen));

      // Verify ERC721 balance of burnerAddr.
      const citizenERC721Balance = await CitizenERC721.balanceOf(burnerAddr.address);
      expect(citizenERC721Balance).to.equal(2);
    });  

    it("It should refuse to burn token if balance is below 1 $CITIZEN.", async function () {
      // Transfer a single $CITIZEN to the address that will burn.
      const burnerTransferReceipt = await CitizenERC20.transfer(burnerAddr.address, partialCitizen);
      const burnerBalancePreBurn = await CitizenERC20.balanceOf(burnerAddr.address);
      expect(burnerBalancePreBurn).to.equal(partialCitizen);

      // Burner address approves $CITIZEN use by BurnMintCitizen.
      const approveBurnReceipt = await CitizenERC20.connect(burnerAddr).approve(BurnMintCitizen.address, singleCitizen);

      // Burner address calls burn function with insufficient $CITIZEN.
      await expect(BurnMintCitizen.connect(burnerAddr).burnTokenToMint()).to.be.revertedWith('Insufficient $CITIZEN balance to burn.');
      
      const burnerBalancePostBurn = await CitizenERC20.balanceOf(burnerAddr.address);
      expect(burnerBalancePostBurn).to.equal(partialCitizen);
    });
  });

  describe('\n\tCitizenERC721', () => {
    it("It should refuse to mint from another address that isn't MINTER_ROLE.", async function () {
      // Attempt to mint from a an account that is not a minter.
      await expect(CitizenERC721.connect(cantMintAddr).mint(fakeAddr.address)).to.be.reverted;
    }); 

    it("It should change the baseUri as admin.", async function () {
      // Change baseUri as admin.
      await expect(CitizenERC721.updateBaseURI("https://kong.party"))
        .to.emit(CitizenERC721, 'UpdateBaseURI')
        .withArgs("https://kong.party");
    }); 

    it("It should set the baseUri as admin repeatedly.", async function () {
      // Change baseUri as admin.
      await expect(CitizenERC721.updateBaseURI("https://kong.party"))
        .to.emit(CitizenERC721, 'UpdateBaseURI')
        .withArgs("https://kong.party");

      await expect(CitizenERC721.updateBaseURI("https://kong.land"))
        .to.emit(CitizenERC721, 'UpdateBaseURI')
        .withArgs("https://kong.land");      
    }); 


    it("It should refuse to change the baseUri from another address that isn't admin.", async function () {
      // Attempt to change baseUri as non-admin.
      await expect(CitizenERC721.connect(cantMintAddr).updateBaseURI("https://kong.fail")).to.be.reverted;
    });     
  });

});