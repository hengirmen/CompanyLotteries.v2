const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('CompanyLotteries - getLotteryURL', function () {
  let companyLotteries;
  let mockToken;
  let owner;
  let buyer;
  let lotteryNo;
  let futureTimestamp;

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
    futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

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

  describe('Successful getLotteryURL', function () {
    it('should return the lottery URL', async function () {
      const lotteryURL = await companyLotteries.getLotteryURL(lotteryNo);
      expect(lotteryURL.htmlhash).to.equal(
        ethers.encodeBytes32String("htmlhash"),
      );
      expect(lotteryURL.url).to.equal(
        "https://example.com"
      );
    });
  });

  describe('Failed getLotteryURL', function () {
    it('should revert if the lottery does not exist', async function () {
      await expect(
        companyLotteries.getLotteryURL(999)
      ).to.be.revertedWith("Lottery does not exist!");
    });
  });
});
