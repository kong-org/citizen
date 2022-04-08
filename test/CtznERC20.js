const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const keccak256 = require("keccak256");
const crypto = require('crypto');
const { BigNumber} = require("ethers");

describe("CtznERC20", function () {
  let claimer;
  let secondary;
  let oracle;

  let proxy;
  let registry;
  let resolver;
  let reverseResolver;
  let reverseRegistrar;
  let registrar;
  let erc20;

  before(async () => {
    const signers = await ethers.getSigners();
    claimer = signers[1];
    secondary = signers[2];
    tertiary = signers[3];
    oracle = signers[4];

    // Deploy old CitizenERC721 contract.
    const CitizenERC721PreENS = await ethers.getContractFactory(
      "CitizenERC721PreENS"
    );
    proxy = await upgrades.deployProxy(CitizenERC721PreENS);

    // Assign roles to mirror deployed CitizenERC721.
    await proxy.grantRole(keccak256('MINTER_ROLE'), secondary.address);

    // NOTE: this role is reserved for reveal contract, for regression testing here.
    await proxy.grantRole(keccak256('DEVICE_ROLE'), secondary.address);

    // Deploy registry.
    const Registry = await ethers.getContractFactory("ENSRegistry");
    registry = await Registry.deploy();

    ethers.provider.network.ensAddress = registry.address;

    // Deploy registrar.
    const Registrar = await ethers.getContractFactory("CitizenENSRegistrar");
    registrar = await Registrar.deploy(
      registry.address,
      proxy.address,
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
      await signers[0].getAddress()
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
      await signers[0].getAddress()
    );
    await registry.setSubnodeOwner(
      ethers.utils.namehash("reverse"),
      keccak256("addr"),
      reverseRegistrar.address
    );

    const CtznERC20 = await ethers.getContractFactory("CtznERC20");

    erc20 = await CtznERC20.deploy(proxy.address);

  });

  it("Mint $CITIZEN to the claimer.", async () => {

    // await proxy.connect(claimer)

    let claimerAddr = await claimer.getAddress()
    let secondaryAddr = await secondary.getAddress()

    for (let count = 0; count < 178; count++) {
      await proxy.mint(claimerAddr);
    }


    // await proxy.connect(secondary)
    for (let count = 0; count < 10; count++) {
      await proxy.mint(secondaryAddr);
    }


    expect(await proxy.ownerOf(1)).to.equal(claimerAddr);
  });

  it("Upgrade the ERC721 contract.", async () => {
    const CitizenERC721 = await ethers.getContractFactory("CitizenERC721");
    proxy = await upgrades.upgradeProxy(proxy.address, CitizenERC721);

    expect(await proxy._ensRegistrar()).to.equal(
      "0x0000000000000000000000000000000000000000"
    );
  });

  it("Set the ENS address.", async () => {
    await proxy.setENSRegistrarAddress(registrar.address);

    expect(await proxy._ensRegistrar()).to.equal(registrar.address);
  });

  it("Deployment should assign the total supply of tokens to the owner", async function () {
    const [owner] = await ethers.getSigners();

    const ownerBalance = await erc20.balanceOf(owner.address);
    expect( await erc20.totalSupply() ).to.equal( ownerBalance );
  });

  it("Claim should work under 178", async function () {

    await erc20.connect(claimer).claim(178);

    const claimerBalance = await erc20.balanceOf(claimer.address);
    expect( claimerBalance.toHexString() ).to.equal( '0x1bc16d674ec80000' );
  });  

  it("Only token holder can claim.", async function () {
    await expect(erc20.connect(secondary).claim(178)).to.be.revertedWith("Only token holder can claim.");
  }); 

  it("Claim should not work over 178", async function () {
    await expect(erc20.connect(secondary).claim(179)).to.be.revertedWith("Only token holder 178 or lower can claim.");
  });   

  it("Can only claim once", async function () {
    await expect(erc20.connect(claimer).claim(178)).to.be.revertedWith("Already claimed.");
  }); 
});
