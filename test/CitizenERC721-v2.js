const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const keccak256 = require("keccak256");
const crypto = require('crypto');

const { signMessage } = require('./helpers/signer');

describe("CitizenENSTests", () => {
  let owner;
  let claimer;
  let secondary;
  let oracle;

  let proxy;
  let registry;
  let resolver;
  let reverseResolver;
  let reverseRegistrar;
  let registrar;

  let curve;
  let publicKey;

  before(async () => {
    const signers = await ethers.getSigners();
    owner = signers[0];
    claimer = signers[1];
    secondary = signers[2];
    tertiary = signers[3];
    oracle = signers[4];

    // Create a device
    curve = crypto.createECDH('prime256v1');
    curve.generateKeys();
    publicKey = [
      '0x' + curve.getPublicKey('hex').slice(2, 66),
      '0x' + curve.getPublicKey('hex').slice(-64)
    ];



    // Deploy old CitizenERC721 contract.
    const CitizenERC721PreENS = await ethers.getContractFactory(
      "CitizenERC721PreENS"
    );
    proxy = await upgrades.deployProxy(CitizenERC721PreENS);

    // Deploy $CTZN an burn contract
    CtznERC20Token = await ethers.getContractFactory("CtznERC20");
    CtznERC20 = await CtznERC20Token.deploy(proxy.address);

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

  it("Verify first device before upgrade.", async () => {
    const newDeviceRoot = await proxy.deviceRoot(1);
    expect(newDeviceRoot).to.equal("0x6972388f34d8c7576f936f103728f7d2820224ec29d136bd1ad881c950f8e72b");
  })

  it("Upgrade the ERC721 contract.", async () => {
    const CitizenERC721 = await ethers.getContractFactory("CitizenERC721");
    // See https://forum.openzeppelin.com/t/problem-with-adding-state-variable-to-base-contract-in-upgradable-contract/23689 and https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/276
    proxy = await upgrades.upgradeProxy(proxy.address, CitizenERC721, {unsafeSkipStorageCheck: true});

    expect(await proxy._ensRegistrar()).to.equal(
      "0x0000000000000000000000000000000000000000"
    );
  });

  // it("Set the ENS address.", async () => {
  //   await proxy.setENSRegistrarAddress(registrar.address);

  //   expect(await proxy._ensRegistrar()).to.equal(registrar.address);
  // });

  it("Verify $CITIZEN owner is claimer after upgrade.", async () => {
    const address = await claimer.getAddress();
    expect(await proxy.ownerOf(1)).to.equal(address);
  });

  it("Deploy BurnMintCTZN.", async () => {
    
    const BurnContract = await ethers.getContractFactory("BurnMintCtzn");
    BurnMintCtzn = await BurnContract.deploy(CtznERC20.address, proxy.address);

    // Grant minting rights
    await proxy.grantRole(keccak256('MINTER_ROLE'), BurnMintCtzn.address);

    address = await BurnMintCtzn._ctznERC20.call();
    expect(address).to.equal(CtznERC20.address);
  })

  it("Mint a second $CITIZEN to the claimer.", async () => {
    const address = await claimer.getAddress();
    await proxy.connect(secondary).mint(address);

    expect(await proxy.ownerOf(2)).to.equal(address);
  });


  it("Mint a $CITIZEN > 501 to the claimer.", async () => {
    const address = await claimer.getAddress();
    await proxy.connect(secondary).mintTitanCitizen(address);

    expect(await proxy.ownerOf(501)).to.equal(address);
  });


  it("Mint a $CITIZEN > 1001 to the claimer.", async () => {
    const address = await claimer.getAddress();
    await proxy.connect(secondary).mintCitizen(address);

    expect(await proxy.ownerOf(1001)).to.equal(address);
  });

  it("Transfer a $CITIZEN.", async () => {
    const claimerAddress = await claimer.getAddress();
    const secondaryAddress = await secondary.getAddress();
    await proxy.connect(claimer).transferFrom(claimerAddress, secondaryAddress, 1001);

    expect(await proxy.ownerOf(1001)).to.equal(secondaryAddress);
  });

  it("Mint a $CTZN to a $CITIZEN.", async () => {
    await CtznERC20.connect(claimer).claim(2);

    let ctznBalance = await CtznERC20.balanceOf(claimer.address)
    expect(ctznBalance == 2 * 10 ** 18);
  });

  it("Burn a $CTZN to mint $CITIZEN to the claimer.", async () => {
    const address = await claimer.getAddress();

    let ctznBurnAmount = BigInt(1 * 10 ** 18)

    // Aprrove to burn and burn.
    await CtznERC20.connect(claimer).approve(BurnMintCtzn.address, ctznBurnAmount);
    await BurnMintCtzn.connect(claimer).burnTokenToMint();

    // Verify $CTZN was minted.
    expect(await proxy.ownerOf(1002)).to.equal(address);
 
    // Verify balance decreased by 1.
    let ctznBalance = await CtznERC20.balanceOf(claimer.address)
    expect(ctznBalance == 1 * 10 ** 18);
  });

  it("Add a second device.", async () => {
    await expect(proxy.setDevice(2, "0x5cae5775cdf6aa1ee4fc2edd8caf5737325ef98b1cb5b3c8b1e7a4b5f95f8c7e", "0x5972388f34d8c7576f936f103728f7d2820224ec29d136bd1ad881c950f8e72b"))
      .to.emit(proxy, 'DeviceSet')
      .withArgs(2, "0x5cae5775cdf6aa1ee4fc2edd8caf5737325ef98b1cb5b3c8b1e7a4b5f95f8c7e", "0x5972388f34d8c7576f936f103728f7d2820224ec29d136bd1ad881c950f8e72b");

    const newDeviceRoot = await proxy.deviceRoot(2);
    expect(newDeviceRoot).to.equal("0x5972388f34d8c7576f936f103728f7d2820224ec29d136bd1ad881c950f8e72b");
  })

  it("Mint third and fourth $CITIZEN to the tertiary.", async () => {
    const address = await tertiary.getAddress();
    await proxy.connect(secondary).mint(address);

    await proxy.connect(secondary).mint(address);

    expect(await proxy.ownerOf(3)).to.equal(address);
    expect(await proxy.ownerOf(4)).to.equal(address);
  });

  // it("Claim a subdomain.", async () => {
  //   await registrar.connect(claimer).claim(1, "john");
  //   await reverseRegistrar.connect(claimer).setName("john.citizen.eth");

  //   const address = await ethers.provider.resolveName("john.citizen.eth");
  //   expect(address).to.equal(await claimer.getAddress());
  //   const name = await ethers.provider.lookupAddress(claimer.getAddress());
  //   expect(name).to.equal("john.citizen.eth");
  //   const citizenId = await resolver.getText("id.citizen");
  //   expect(citizenId).to.equal("1");
  // });

  // it("Update a subdomain.", async () => {
  //   await registrar.connect(claimer).update(1, "cameron");

  //   let address;

  //   address = await ethers.provider.resolveName("john.citizen.eth");
  //   expect(address).to.be.null;
  //   address = await ethers.provider.resolveName("cameron.citizen.eth");
  //   expect(address).to.equal(await claimer.getAddress());
  // });

  // it("Transfer a subdomain.", async () => {
  //   await proxy.connect(claimer).transfer(await secondary.getAddress(), 1);

  //   const address = await ethers.provider.resolveName("cameron.citizen.eth");
  //   expect(address).to.equal(await secondary.getAddress());
  // });

  // it("Transfer a $CITIZEN with subdomain.", async () => {
  //   const tertiaryAddress = await tertiary.getAddress();
  //   const secondaryAddress = await secondary.getAddress();

  //   // Claim a name for token 1001
  //   await registrar.connect(secondary).claim(1001, "bob");
  //   await reverseRegistrar.connect(secondary).setName("bob.citizen.eth");

  //   // Resolve the name.
  //   address = await ethers.provider.resolveName("bob.citizen.eth");
  //   expect(address).to.equal(await secondary.getAddress());
  //   citizenName = await ethers.provider.lookupAddress(secondaryAddress);
  //   expect(citizenName).to.equal("bob.citizen.eth");

  //   // Transfer the name.
  //   await proxy.connect(secondary).transferFrom(secondaryAddress, tertiaryAddress, 1001);

  //   // Note: the new address needs to explicitly set the reverse registrar.
  //   await reverseRegistrar.connect(tertiary).setName("bob.citizen.eth");

  //   // Verify transfer.
  //   expect(await proxy.ownerOf(1001)).to.equal(tertiaryAddress);

  //   // Resolve the name to address.
  //   address = await ethers.provider.resolveName("bob.citizen.eth");
  //   expect(address).to.equal(await tertiaryAddress);

  //   // Look up the name of the new address.
  //   citizenName = await ethers.provider.lookupAddress(tertiaryAddress);
  //   expect(citizenName).to.equal("bob.citizen.eth");
  // });

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

    // // Curve and key objects.
    // curve = crypto.createECDH('prime256v1');
    // curve.generateKeys();
    // publicKey = [
    //   '0x' + curve.getPublicKey('hex').slice(2, 66),
    //   '0x' + curve.getPublicKey('hex').slice(-64)
    // ];

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

  it("It should fail if already revealed.", async function () {

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
    await expect(reveal.connect(tertiary).revealOracle(4, device.rs, device.pubkeyX, device.pubkeyY, block.number, merkleRoot, oracleSignature))
      .to.be.revertedWith("Device already set for another token");

  });

  it("It should get token by deviceId.", async function () {

    let publicKeyHash = ethers.utils.sha256(publicKey[0] + publicKey[1].slice(2));

    expect(await proxy.tokenByDevice(publicKeyHash)).to.equal(3);

  });

});
