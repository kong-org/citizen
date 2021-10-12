const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const keccak256 = require("keccak256");

describe("CitizenENSTests", () => {
  let claimer;
  let secondary;

  let proxy;
  let registry;
  let resolver;
  let reverseResolver;
  let reverseRegistrar;
  let registrar;

  before(async () => {
    const signers = await ethers.getSigners();
    claimer = signers[1];
    secondary = signers[2];

    // Deploy old CitizenERC721 contract.
    const CitizenERC721PreENS = await ethers.getContractFactory(
      "CitizenERC721PreENS"
    );
    proxy = await upgrades.deployProxy(CitizenERC721PreENS);

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

  it("Mint 1 $CITIZEN to the claimer.", async () => {
    const address = await claimer.getAddress();
    await proxy.mint(address);

    expect(await proxy.ownerOf(1)).to.equal(address);
  });

  it("Claim a subdomain.", async () => {
    await registrar.connect(claimer).claim(1, "john");
    await reverseRegistrar.connect(claimer).setName("john.citizen.eth");

    const address = await ethers.provider.resolveName("john.citizen.eth");
    expect(address).to.equal(await claimer.getAddress());
    const name = await ethers.provider.lookupAddress(claimer.getAddress());
    expect(name).to.equal("john.citizen.eth");
    const citizenId = await resolver.getText("id.citizen");
    expect(citizenId).to.equal("1");
  });

  it("Update a subdomain.", async () => {
    await registrar.connect(claimer).update(1, "cameron");

    let address;

    address = await ethers.provider.resolveName("john.citizen.eth");
    expect(address).to.be.null;
    address = await ethers.provider.resolveName("cameron.citizen.eth");
    expect(address).to.equal(await claimer.getAddress());
  });

  it("Transfer a subdomain.", async () => {
    await proxy.connect(claimer).transfer(await secondary.getAddress(), 1);

    const address = await ethers.provider.resolveName("cameron.citizen.eth");
    expect(address).to.equal(await secondary.getAddress());
  });
});
