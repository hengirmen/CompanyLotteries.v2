const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CompanyLotteries - buyTicketTx", function () {
  let companyLotteries;
  let mockToken;
  let owner;
  let buyer;
  let otherUser;
  let lotteryNo;

  const TICKET_PRICE = ethers.parseEther("10");
  const NUM_TICKETS = 32;
  const NUM_WINNERS = 5;
  const MIN_PERCENTAGE = 20;

  beforeEach(async function () {
    // Get signers
    [owner, buyer, otherUser] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockTokenFactory = await ethers.getContractFactory("MockERC20");
    mockToken = await MockTokenFactory.deploy();

    // Deploy lottery contract
    const CompanyLotteriesFactory = await ethers.getContractFactory(
      "CompanyLotteries"
    );
    companyLotteries = await CompanyLotteriesFactory.deploy();

    // Create a lottery
    const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    const tx = await companyLotteries
      .connect(owner)
      .createLottery(
        futureTimestamp,
        NUM_TICKETS,
        NUM_WINNERS,
        MIN_PERCENTAGE,
        TICKET_PRICE,
        ethers.encodeBytes32String("htmlhash"),
        "https://example.com"
      );

    const receipt = await tx.wait();
    const logs = receipt?.logs;
    const lotteryCreatedLog = logs?.find(
      (log) => log.fragment?.name === "LotteryCreated"
    );
    lotteryNo = lotteryCreatedLog?.args?.[0];

    // Set payment token for the lottery
    await companyLotteries.connect(owner).setPaymentToken(mockToken.target);

    // Prepare token for buyer
    await mockToken.mint(buyer.address, ethers.parseEther("1000"));
    await mockToken
      .connect(buyer)
      .approve(companyLotteries.target, ethers.parseEther("1000"));
  });

  describe("Successful buyTicketTx", function () {
    it('should buy 1 ticket for the lottery for the given id and emit TicketPurchased event', async function () {
      const quantity = 1;
      const randomHash = ethers.randomBytes(32);

      const tx = await companyLotteries
        .connect(buyer)
        .buyTicketTx(lotteryNo, quantity, randomHash);
      const receipt = await tx.wait();

      // Check TicketPurchased event
      const purchaseEvent = receipt?.logs.find(
        (log) => log.fragment?.name === "TicketPurchased"
      );
      expect(purchaseEvent).to.exist;
      expect(purchaseEvent?.args?.[0]).to.equal(lotteryNo);
      expect(purchaseEvent?.args?.[1]).to.equal(buyer.address);
      expect(purchaseEvent?.args?.[3]).to.equal(quantity);

      // Verify token transfer
      const totalCost = TICKET_PRICE * BigInt(quantity);
      expect(await mockToken.balanceOf(companyLotteries.target)).to.equal(
        totalCost
      );
    });

    it('should allow buying tickets within valid limit (1 - 30) and emit TicketPurchased event', async function () {
      const quantity = 30;
      const randomHash = ethers.randomBytes(32);

      const tx = await companyLotteries
        .connect(buyer)
        .buyTicketTx(lotteryNo, quantity, randomHash);
      const receipt = await tx.wait();

      // Check TicketPurchased event
      const purchaseEvent = receipt?.logs.find(
        (log) => log.fragment?.name === "TicketPurchased"
      );
      expect(purchaseEvent).to.exist;
      expect(purchaseEvent?.args?.[0]).to.equal(lotteryNo);
      expect(purchaseEvent?.args?.[1]).to.equal(buyer.address);
      expect(purchaseEvent?.args?.[3]).to.equal(quantity);

      // Verify token transfer
      const totalCost = TICKET_PRICE * BigInt(quantity);
      expect(await mockToken.balanceOf(companyLotteries.target)).to.equal(
        totalCost
      );
    });
  });

  describe("Failed buyTicketTx", function () {
    beforeEach(async function () {
      // Take a snapshot of the blockchain state
      snapshotId = await ethers.provider.send('evm_snapshot', []);
    });

    afterEach(async function () {
      // Revert to the snapshot
      await ethers.provider.send('evm_revert', [snapshotId]);
    });

    it('should revert if quantity is 0', async function () {
      const quantity = 0;
      const randomHash = ethers.randomBytes(32);

      await expect(
        companyLotteries
          .connect(buyer)
          .buyTicketTx(lotteryNo, quantity, randomHash)
      ).to.be.revertedWith("Quantity must be greater than zero and less than or equal to 30!");
    });

    it('should revert if quantity is greater than 30', async function () {
      const quantity = 31;
      const randomHash = ethers.randomBytes(32);

      await expect(
        companyLotteries
          .connect(buyer)
          .buyTicketTx(lotteryNo, quantity, randomHash)
      ).to.be.revertedWith("Quantity must be greater than zero and less than or equal to 30!");
    });

    it('should revert if random hash is empty', async function () {
      const quantity = 1;
      const randomHash = ethers.ZeroHash;

      await expect(
        companyLotteries
          .connect(buyer)
          .buyTicketTx(lotteryNo, quantity, randomHash)
      ).to.be.revertedWith("Random hash must not be empty!");
    });

    it('should revert if the lottery does not exist', async function () {
      const quantity = 1;
      const randomHash = ethers.randomBytes(32);

      await expect(
        companyLotteries
          .connect(buyer)
          .buyTicketTx(999, quantity, randomHash)
      ).to.be.revertedWith("Lottery does not exist!");
    });

    it('should revert if the lottery is not in the purchase phase', async function () {
      // Fast forward past purchase phase
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);

      const quantity = 1;
      const randomHash = ethers.randomBytes(32);

      await expect(
        companyLotteries
          .connect(buyer)
          .buyTicketTx(lotteryNo, quantity, randomHash)
      ).to.be.revertedWith("Purchase phase has ended!");
    });

    it('should revert if the buyer does not have enough balance', async function () {
      const quantity = 1;
      const randomHash = ethers.randomBytes(32);

      await mockToken
        .connect(buyer)
        .transfer(otherUser.address, ethers.parseEther("1000"));

      await expect(
        companyLotteries
          .connect(buyer)
          .buyTicketTx(lotteryNo, quantity, randomHash)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it('should revert if the requested quantity exceeds the remaining tickets', async function () {
      const quantity1 = 3;
      const quantity2 = 30;

      const randomHash = ethers.randomBytes(32);

      await companyLotteries.connect(buyer).buyTicketTx(lotteryNo, quantity1, randomHash);

      await expect(
        companyLotteries
          .connect(buyer)
          .buyTicketTx(lotteryNo, quantity2, randomHash)
      ).to.be.revertedWith("Not enough tickets remaining!");
    });
  });
});
