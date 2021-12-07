const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const keccak256 = require("keccak256");
const crypto = require('crypto');

const { signMessage } = require('./helpers/signer');

describe("CitizenENSTests", () => {
  let claimer;
  let secondary;
  let oracle;

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

    // Increase time to be past epoch of 1631714400 -- mirror 
    // await network.provider.send("evm_increaseTime", [360000])
    // await network.provider.send("evm_mine")

  });

  it("Mint 1 $CITIZEN to the claimer.", async () => {
    const address = await claimer.getAddress();
    await proxy.mint(address);

    expect(await proxy.ownerOf(1)).to.equal(address);
  });

  it("Add a first device.", async () => {
    await expect(proxy.setDevice(1, "0x4cae5775cdf6aa1ee4fc2edd8caf5737325ef98b1cb5b3c8b1e7a4b5f95f8c7e", "0x6972388f34d8c7576f936f103728f7d2820224ec29d136bd1ad881c950f8e72b"))
      .to.emit(proxy, 'DeviceSet')
      .withArgs(1, "0x4cae5775cdf6aa1ee4fc2edd8caf5737325ef98b1cb5b3c8b1e7a4b5f95f8c7e", "0x6972388f34d8c7576f936f103728f7d2820224ec29d136bd1ad881c950f8e72b");

    const newDeviceRoot = await proxy.deviceRoot(1);
    expect(newDeviceRoot).to.equal("0x6972388f34d8c7576f936f103728f7d2820224ec29d136bd1ad881c950f8e72b");
  })

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

  it("Mint a second $CITIZEN to the claimer.", async () => {
    const address = await claimer.getAddress();
    await proxy.connect(secondary).mint(address);

    expect(await proxy.ownerOf(2)).to.equal(address);
  });

  it("Add a second device.", async () => {
    await expect(proxy.setDevice(2, "0x5cae5775cdf6aa1ee4fc2edd8caf5737325ef98b1cb5b3c8b1e7a4b5f95f8c7e", "0x5972388f34d8c7576f936f103728f7d2820224ec29d136bd1ad881c950f8e72b"))
      .to.emit(proxy, 'DeviceSet')
      .withArgs(2, "0x5cae5775cdf6aa1ee4fc2edd8caf5737325ef98b1cb5b3c8b1e7a4b5f95f8c7e", "0x5972388f34d8c7576f936f103728f7d2820224ec29d136bd1ad881c950f8e72b");

    const newDeviceRoot = await proxy.deviceRoot(2);
    expect(newDeviceRoot).to.equal("0x5972388f34d8c7576f936f103728f7d2820224ec29d136bd1ad881c950f8e72b");
  })

  it("Mint third $CITIZEN to the tertiary.", async () => {
    const address = await tertiary.getAddress();
    await proxy.connect(secondary).mint(address);

    expect(await proxy.ownerOf(3)).to.equal(address);
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

  it("It should deploy reveal and add device role, oracle address.", async function () {
    // Deploy reveal contract.
    const Reveal = await ethers.getContractFactory("RevealCitizen");
    reveal = await Reveal.deploy(proxy.address);

    // Grant reveal contract the ability to set and remove devices.
    await proxy.grantRole(keccak256('DEVICE_ROLE'), reveal.address);

    // Setup the oracle address.
    await reveal.updateRevealAddr(oracle.address);
    
    // Verify the oracle address has been set.
    address = await reveal._revealOracleAddr.call();
    expect(address).to.equal(oracle.address);
  });

  it("It should fail to verify before a CID is set.", async function () {
    // Curve and key objects.
    curve = crypto.createECDH('prime256v1');
    curve.generateKeys();
    publicKey = [
      '0x' + curve.getPublicKey('hex').slice(2, 66),
      '0x' + curve.getPublicKey('hex').slice(-64)
    ];

    // Get block.
    let block = await ethers.provider.getBlock('latest');

    // Hash public key, hash signature, hash addr of burner
    let revealerAddressHash = ethers.utils.sha256(tertiary.address + block.hash.slice(2));

    // Generate a signature using the simulated public key; important only for non-oracle verify testing.
    let device = await signMessage(curve, revealerAddressHash)

    let publicKeyHash = ethers.utils.sha256(device.pubkeyX + device.pubkeyY.slice(2));
    let signatureHash = ethers.utils.sha256(device.rs[0] + device.rs[1].slice(2));

    // Generate a random string to represent merkleRoot.
    let merkleRoot = '0x' + crypto.randomBytes(32).toString('hex').toLowerCase();

    // Generate hash, sign using tertiary key.
    let oracleHash = ethers.utils.sha256(publicKeyHash + signatureHash.slice(2) + revealerAddressHash.slice(2));
    let oracleSignature = await oracle.signMessage(ethers.utils.arrayify(oracleHash));

    // Link the Passport device to the $CITIZEN token by verifying a signature from the device.
    await expect(reveal.connect(tertiary).revealOracle(3, device.rs, device.pubkeyX, device.pubkeyY, block.number, merkleRoot, oracleSignature))
      .to.be.revertedWith("Cannot mint yet, token attributes not set.");

  });

  it("It should verify on valid oracle.", async function () {
    // Setup the reveal attributes.
    await reveal.updateRevealCid('QmagtqYd6D2cNHudEJQnNNNS9DTnACwjLSBJoHXea9QXaq');

    // Curve and key objects.
    curve = crypto.createECDH('prime256v1');
    curve.generateKeys();
    publicKey = [
      '0x' + curve.getPublicKey('hex').slice(2, 66),
      '0x' + curve.getPublicKey('hex').slice(-64)
    ];

    // Get block.
    let block = await ethers.provider.getBlock('latest');

    // Hash public key, hash signature, hash addr of burner
    let revealerAddressHash = ethers.utils.sha256(tertiary.address + block.hash.slice(2));

    // Generate a signature using the simulated public key; important only for non-oracle verify testing.
    let device = await signMessage(curve, revealerAddressHash)

    let publicKeyHash = ethers.utils.sha256(device.pubkeyX + device.pubkeyY.slice(2));
    let signatureHash = ethers.utils.sha256(device.rs[0] + device.rs[1].slice(2));

    // Generate a random string to represent merkleRoot.
    let merkleRoot = '0x' + crypto.randomBytes(32).toString('hex').toLowerCase();

    // Generate hash, sign using tertiary key.
    let oracleHash = ethers.utils.sha256(publicKeyHash + signatureHash.slice(2) + revealerAddressHash.slice(2));
    let oracleSignature = await oracle.signMessage(ethers.utils.arrayify(oracleHash));

    // Link the Passport device to the $CITIZEN token by verifying a signature from the device.
    await expect(reveal.connect(tertiary).revealOracle(3, device.rs, device.pubkeyX, device.pubkeyY, block.number, merkleRoot, oracleSignature))
      .to.emit(reveal, 'Reveal')
      .withArgs(3, device.pubkeyX, device.pubkeyY, device.rs[0], device.rs[1], block.number);

    // Verify the device has been set.
    expect(await proxy.deviceId(3)).to.equal(publicKeyHash);
  });

});
