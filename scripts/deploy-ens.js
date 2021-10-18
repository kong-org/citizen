const { ethers, upgrades } = require("hardhat");

const main = async () => {
  // Upgrade NFT contract.
  const CitizenERC721 = await ethers.getContractFactory("CitizenERC721");
  const nft = await upgrades.upgradeProxy(
    "0x355929193308e157760824ba860390924d77fab9",
    CitizenERC721
  );

  // Deploy registrar.
  const CitizenENSRegistrar = await ethers.getContractFactory(
    "CitizenENSRegistrar"
  );
  const registrar = await CitizenENSRegistrar.deploy(
    "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
    "0x355929193308e157760824ba860390924d77fab9",
    "citizen.eth",
    ethers.utils.namehash("citizen.eth")
  );

  // Transfer `citizen.eth` to the registrar.
  const registry = await ethers.Contract(
    "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
    ["function setOwner(bytes32 node, address owner) external"],
    await ethers.getSigner()
  );
  await registry.setOwner(
    ethers.utils.namehash("citizen.eth"),
    registrar.address
  );

  // Set the registrar address in the NFT contract.
  await nft.setENSRegistrarAddress(registrar.address);
};

main();
