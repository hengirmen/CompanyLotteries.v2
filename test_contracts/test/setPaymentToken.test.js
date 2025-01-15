const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CompanyLotteries - setPaymentToken", function () {
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

  describe('Successful setPaymentToken', function () {
    it('should set the payment token for the lottery and emit NewPaymentTokenSet event', async function () {
      const tx = await companyLotteries.connect(owner).setPaymentToken(mockToken.target);

      const receipt = await tx.wait();

      const setPaymentTokenLog = receipt?.logs?.find(
        (log) => log.fragment?.name === "NewPaymentTokenSet"
      );
      expect(setPaymentTokenLog).to.exist;
      expect(setPaymentTokenLog?.args?.[0]).to.equal(lotteryNo);
      expect(setPaymentTokenLog?.args?.[1]).to.equal(mockToken.target);
    });
  });

  describe('Failed setPaymentToken', function () {
    it('should revert if the caller is not the owner', async function () {
      await expect(
        companyLotteries.connect(buyer).setPaymentToken(mockToken.target)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it('should revert if the token address is ZeroAddress', async function () {
      await expect(
        companyLotteries.connect(owner).setPaymentToken(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid token address!");
    });

    it('should revert if the token address is not a contract', async function () {
      await expect(
        companyLotteries.connect(owner).setPaymentToken(buyer.address)
      ).to.be.revertedWith("Address is not a contract!");
    });

    it('should revert if the new token is the same as the current token', async function () {
      await companyLotteries.connect(owner).setPaymentToken(mockToken.target);

      await expect(
        companyLotteries.connect(owner).setPaymentToken(mockToken.target)
      ).to.be.revertedWith("Token is already set!");
    });
  });
});
