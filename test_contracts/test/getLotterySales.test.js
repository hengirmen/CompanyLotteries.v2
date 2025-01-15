const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CompanyLotteries - getLotterySales", function () {
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

  describe('Successful getLotterySales', function () {
    it('should return 0 if no tickets are sold', async function () {
      expect(await companyLotteries
        .getLotterySales(lotteryNo)
      ).to.equal(0);
    });

    it('should return 1 if 1 ticket is sold', async function () {
      const quantity = 1;
      const randomHash = ethers.randomBytes(32);

      await companyLotteries
        .connect(buyer)
        .buyTicketTx(lotteryNo, quantity, randomHash);

      expect(await companyLotteries
        .getLotterySales(lotteryNo)
      ).to.equal(1);
    });

    it('should return 2 if 2 tickets are sold', async function () {
      const quantity = 2;
      const randomHash = ethers.randomBytes(32);

      await companyLotteries
        .connect(buyer)
        .buyTicketTx(lotteryNo, quantity, randomHash);

      expect(await companyLotteries
        .getLotterySales(lotteryNo)
      ).to.equal(2);
    });
  });

  describe('Unsuccessful getLotterySales', function () {
    it('should revert if lottery does not exist', async function () {
      await expect(companyLotteries
        .getLotterySales(999)
      ).to.be.revertedWith("Lottery does not exist!");
    });
  });
});
