const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CompanyLotteries - getIthPurchasedTicket", function () {
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

    // Prepare token for otherUser
    await mockToken.mint(otherUser.address, ethers.parseEther("1000"));
    await mockToken
      .connect(otherUser)
      .approve(companyLotteries.target, ethers.parseEther("1000"));
  });

  describe('Successful getIthPurchasedTicket', function () {
    it('should return 1 for starting ticket no and 2 for quantity if the buyer has bought 2 tickets at once', async function () {
      const quantity = 2;
      const randomHash = ethers.randomBytes(32);

      await companyLotteries
        .connect(buyer)
        .buyTicketTx(lotteryNo, quantity, randomHash);

      const purchaseTx = await companyLotteries.getIthPurchasedTicket(
        1,
        lotteryNo
      );

      expect(purchaseTx.sticketno).to.equal(1);
      expect(purchaseTx.quantity).to.equal(2);
    });

    it('should return 5 for starting ticket no and 3 for quantity if the otherUser has bought 3 tickets at once', async function () {
      const quantity1 = 4;
      const randomHash1 = ethers.randomBytes(32);

      await companyLotteries
        .connect(buyer)
        .buyTicketTx(lotteryNo, quantity1, randomHash1);

      const quantity2 = 3;
      const randomHash2 = ethers.randomBytes(32);

      await companyLotteries
        .connect(otherUser)
        .buyTicketTx(lotteryNo, quantity2, randomHash2);

      const purchaseTx = await companyLotteries.getIthPurchasedTicket(
        2,
        lotteryNo
      );

      expect(purchaseTx.sticketno).to.equal(5);
      expect(purchaseTx.quantity).to.equal(3);
    });
  });

  describe('Failed getIthPurchasedTicket', function () {
    it('should revert if the lottery does not exist', async function () {
      await expect(
        companyLotteries.getIthPurchasedTicket(1, 999)
      ).to.be.revertedWith("Lottery does not exist!");
    });

    it('should revert if the ith ticket is greater than the total number of tickets bought', async function () {
      await expect(
        companyLotteries.getIthPurchasedTicket(1, lotteryNo)
      ).to.be.revertedWith("Index out of bounds!");
    });
  });
});
