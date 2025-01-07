const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DiamondProxy - TicketFacet", function () {
  let ticketFacetInstance, lotteryFacetInstance, owner;

  before(async function () {
    [owner] = await ethers.getSigners();
    const deployedAddresses = require("../deployedAddresses.json");

    ticketFacetInstance = await ethers.getContractAt("TicketFacet", deployedAddresses.DiamondProxy);
    lotteryFacetInstance = await ethers.getContractAt("LotteryFacet", deployedAddresses.DiamondProxy);
  });

  it("should allow buying a ticket", async function () {
    const endTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const ticketPrice = ethers.parseEther("0.1");

    await lotteryFacetInstance.connect(owner).createLottery(endTime, ticketPrice);

    await ethers.provider.send("evm_increaseTime", [1800]); // Advance time by 30 minutes
    await ethers.provider.send("evm_mine", []);

    const hashRndNumber = ethers.keccak256(ethers.toUtf8Bytes("random_seed"));

    const tx = await ticketFacetInstance.buyTicketTx(1, 1, hashRndNumber);

    await expect(tx)
      .to.emit(ticketFacetInstance, "TicketPurchased")
      .withArgs(owner.address, 1, 1, 1); // Adjusted to match contract event arguments
  });

  it("should reveal a random number", async function () {
    const revealTime = Math.floor(Date.now() / 1000) + 3600; // Set valid reveal time
    await ethers.provider.send("evm_increaseTime", [1800]); // Move forward by 30 minutes
    await ethers.provider.send("evm_mine", []);

    const tx = await ticketFacetInstance.revealRndNumberTx(1, 1234, 5678, 91011);

    await expect(tx)
      .to.emit(ticketFacetInstance, "RandomNumberRevealed")
      .withArgs(1, 1234); // Adjusted for expected event parameters
  });
});
