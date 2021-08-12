const { expect } = require("chai");

describe("CitizenERC20", function () {
  it("Deployment should assign the total supply of tokens to the owner", async function () {
    const [owner] = await ethers.getSigners();

    const CitizenERC20 = await ethers.getContractFactory("CitizenERC20");

    const hardhatToken = await CitizenERC20.deploy();

    const ownerBalance = await hardhatToken.balanceOf(owner.address);
    expect(await hardhatToken.totalSupply()).to.equal(ownerBalance);
  });
});
