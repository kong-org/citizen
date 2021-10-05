const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("CitizenENSTests", () => {
  let proxy;
  let registrar;

  before(async () => {
    // Deploy old CitizenERC721 contract.
    const CitizenERC721PreENS = await ethers.getContractFactory(
      "CitizenERC721PreENS"
    );
    proxy = await upgrades.deployProxy(CitizenERC721PreENS);

    // Deploy registrar.
    const Registrar = await ethers.getContractFactory("CitizenENSRegistrar");
    registrar = await Registrar.deploy(
      "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
      proxy.address,
      "citizen.eth",
      ethers.utils.namehash("citizen.eth")
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
    await proxy.setRegistrarAddress(registrar.address);

    expect(await proxy._ensRegistrar()).to.equal(registrar.address);
  });
});
