const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CompanyLotteries - getPaymentToken", function () {
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
  });

  describe('Successful getPaymentToken', function () {
    it('should return ZeroAddress if no payment token is set', async function () {
      const paymentToken = await companyLotteries.getPaymentToken(
        1
      );

      expect(paymentToken).to.equal(ethers.ZeroAddress);
    });

    it('should return the payment token address if set', async function () {
      await companyLotteries.connect(owner).setPaymentToken(mockToken.target);

      const paymentToken = await companyLotteries.getPaymentToken(
        1
      );

      expect(paymentToken).to.equal(mockToken.target);
    });
  });

  describe('Failed getPaymentToken', function () {
    it('should revert if the lottery does not exist', async function () {
      await expect(
        companyLotteries.getPaymentToken(
          2
        )
      ).to.be.revertedWith("Lottery does not exist!");
    });
  });
});
