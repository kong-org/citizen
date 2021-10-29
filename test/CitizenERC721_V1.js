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
  let owner;
  let burnerAddr;
  let fakeAddr;
  let cantMintAddr;
  let canDeviceEdit;

  let claimer;
  let secondary;
  let CitizenERC721Proxy;

  let proxy;
  let registry;
  let resolver;
  let reverseResolver;
  let reverseRegistrar;
  let registrar;

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
    CitizenERC721Token = await ethers.getContractFactory("CitizenERC721PreENS");
    BurnContract = await ethers.getContractFactory("BurnMintCitizen");
    [owner, burnerAddr, fakeAddr, canMint, cantMintAddr, mintedTo, canDeviceEdit] = await ethers.getSigners();

    // Deploy the base contracts.
    CitizenERC20 = await CitizenERC20Token.deploy();
    CitizenERC721Proxy = await upgrades.deployProxy(CitizenERC721Token);
    BurnMintCitizen = await BurnContract.deploy(CitizenERC20.address, CitizenERC721Proxy.address);

    // console.log(CitizenERC20.address);
    // console.log(CitizenERC721Proxy.address);
    // console.log(BurnMintCitizen.address);        

    // Add a role granding minter capability to BurnMintCitizen.
    await CitizenERC721Proxy.grantRole(keccak256('MINTER_ROLE'), BurnMintCitizen.address);
    await CitizenERC721Proxy.grantRole(keccak256('MINTER_ROLE'), canMint.address);
    await CitizenERC721Proxy.grantRole(keccak256('DEVICE_ROLE'), canDeviceEdit.address);

    // Increase time to be past epoch of 1631714400
    await network.provider.send("evm_increaseTime", [360000])
    await network.provider.send("evm_mine")
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
      const citizenERC721Balance = await CitizenERC721Proxy.balanceOf(burnerAddr.address);
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
      const citizenERC721Balance = await CitizenERC721Proxy.balanceOf(burnerAddr.address);
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
      await expect(CitizenERC721Proxy.connect(cantMintAddr).mint(fakeAddr.address)).to.be.reverted;
    }); 

    it("It should change the baseUri as admin.", async function () {
      // Change baseUri as admin.
      await expect(CitizenERC721Proxy.updateBaseURI("https://kong.party"))
        .to.emit(CitizenERC721Proxy, 'UpdateBaseURI')
        .withArgs("https://kong.party");
    }); 

    it("It should set the baseUri as admin repeatedly.", async function () {
      // Change baseUri as admin.
      await expect(CitizenERC721Proxy.updateBaseURI("https://kong.party"))
        .to.emit(CitizenERC721Proxy, 'UpdateBaseURI')
        .withArgs("https://kong.party");

      await expect(CitizenERC721Proxy.updateBaseURI("https://kong.land"))
        .to.emit(CitizenERC721Proxy, 'UpdateBaseURI')
        .withArgs("https://kong.land");      
    }); 

    it("It should change the baseUri as admin and return tokenURI with tokenId.", async function () {
      // Change baseUri as admin.
      await expect(CitizenERC721Proxy.updateBaseURI("https://kong.party/"))
        .to.emit(CitizenERC721Proxy, 'UpdateBaseURI')
        .withArgs("https://kong.party/");

      await CitizenERC721Proxy.connect(canMint).mint(mintedTo.address);
      const tokenURI1 = await CitizenERC721Proxy.tokenURI(1);
      expect(tokenURI1).to.equal("https://kong.party/1");

    }); 

    it("It should set registry address as device editor.", async function () {
      // Change baseUri as admin.
      await expect(CitizenERC721Proxy.setRegistryAddress(fakeAddr.address))
        .to.emit(CitizenERC721Proxy, 'UpdateRegistry')
        .withArgs(fakeAddr.address);

      const newRegistryAddress = await CitizenERC721Proxy._registryAddress.call();
      expect(newRegistryAddress).to.equal(fakeAddr.address);

      await expect(CitizenERC721Proxy.connect(canDeviceEdit).setRegistryAddress(cantMintAddr.address))
        .to.emit(CitizenERC721Proxy, 'UpdateRegistry')
        .withArgs(cantMintAddr.address);      
    }); 

    it("It should set device as device editor.", async function () {
      await CitizenERC721Proxy.connect(canMint).mint(mintedTo.address);
      // Change baseUri as admin.
      await expect(CitizenERC721Proxy.connect(canDeviceEdit).setDevice(1, "0xthisIsADevicePublicKeyHash", "0xthisIsAMerkleRoot"))
        .to.emit(CitizenERC721Proxy, 'DeviceSet')
        .withArgs(1, "0xthisIsADevicePublicKeyHash", "0xthisIsAMerkleRoot");

      const newDeviceRoot = await CitizenERC721Proxy.deviceRoot(1);
      expect(newDeviceRoot).to.equal("0xthisIsAMerkleRoot");
    }); 

    it("It should refuse to change the baseUri from another address that isn't admin.", async function () {
      // Attempt to change baseUri as non-admin.
      await expect(CitizenERC721Proxy.connect(cantMintAddr).updateBaseURI("https://kong.fail")).to.be.reverted;
    });     

    it("It upgrades CitizenERC721Proxy to CitizenERC721Mock.", async function () {
      const CitizenERC721Mock = await ethers.getContractFactory("CitizenERC721Mock");

      const upgraded = await upgrades.upgradeProxy(CitizenERC721Proxy.address, CitizenERC721Mock);

      const mockCheck = await upgraded.MOCK_UP.call();
      expect(mockCheck).to.equal("mock_updated");
    });

    // NOTE: below is a V1 to V2 upgrade test, retained here for regression testing. See CitizenERC721_V2 for comprehensive V2 tests.
    it("It should set device after upgrade.", async function () {

      await CitizenERC721Proxy.connect(canMint).mint(mintedTo.address);

      // Deploy registry.
      const Registry = await ethers.getContractFactory("ENSRegistry");
      registry = await Registry.deploy();

      ethers.provider.network.ensAddress = registry.address;

      // Deploy registrar.
      const Registrar = await ethers.getContractFactory("CitizenENSRegistrar");
      registrar = await Registrar.deploy(
        registry.address,
        CitizenERC721Proxy.address,
        "citizen.eth",
        ethers.utils.namehash("citizen.eth")
      );

      // Configure the resolver.
      resolver = new ethers.providers.Resolver(
        ethers.provider,
        await registrar._resolver(),
        "john.citizen.eth"
      );

      // Deploy default reverse resolver.
      const DefaultReverseResolver = await ethers.getContractFactory(
        "DefaultReverseResolver"
      );
      reverseResolver = await DefaultReverseResolver.deploy(registry.address);

      // Deploy reverse registrar.
      const ReverseRegistrar = await ethers.getContractFactory(
        "ReverseRegistrar"
      );
      reverseRegistrar = await ReverseRegistrar.deploy(
        registry.address,
        reverseResolver.address
      );

      // Setup `citizen.eth`.
      await registry.setSubnodeOwner(
        ethers.constants.HashZero,
        keccak256("eth"),
        await owner.getAddress()
      );
      await registry.setSubnodeOwner(
        ethers.utils.namehash("eth"),
        keccak256("citizen"),
        registrar.address
      );

      // Setup `addr.reverse`.
      await registry.setSubnodeOwner(
        ethers.constants.HashZero,
        keccak256("reverse"),
        await owner.getAddress()
      );
      await registry.setSubnodeOwner(
        ethers.utils.namehash("reverse"),
        keccak256("addr"),
        reverseRegistrar.address
      );

      const CitizenERC721ENS = await ethers.getContractFactory("CitizenERC721");

      CitizenERC721Proxy = await upgrades.upgradeProxy(CitizenERC721Proxy.address, CitizenERC721ENS);

      expect(await CitizenERC721Proxy._ensRegistrar()).to.equal(
        "0x0000000000000000000000000000000000000000"
      );

      await CitizenERC721Proxy.setENSRegistrarAddress(registry.address);
      expect(await CitizenERC721Proxy._ensRegistrar()).to.equal(registry.address);

      // Mint a device.
      await CitizenERC721Proxy.mint(mintedTo.address);

      // Set a device.
      await expect(CitizenERC721Proxy.connect(canDeviceEdit).setDevice(1, "0x4cae5775cdf6aa1ee4fc2edd8caf5737325ef98b1cb5b3c8b1e7a4b5f95f8c7e", "0x6972388f34d8c7576f936f103728f7d2820224ec29d136bd1ad881c950f8e72b"))
        .to.emit(CitizenERC721Proxy, 'DeviceSet')
        .withArgs(1, "0x4cae5775cdf6aa1ee4fc2edd8caf5737325ef98b1cb5b3c8b1e7a4b5f95f8c7e", "0x6972388f34d8c7576f936f103728f7d2820224ec29d136bd1ad881c950f8e72b");

      expect(await proxy.deviceRoot(1)).to.equal("0x6972388f34d8c7576f936f103728f7d2820224ec29d136bd1ad881c950f8e72b");
    });     
  });

});
