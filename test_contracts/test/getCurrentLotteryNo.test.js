const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('CompanyLotteries - getCurrentLotteryNo', function () {
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
  });

  describe('Successful getCurrentLotteryNo', function () {
    it('should return 0 if no lottery is created', async function () {
      const lotteryNo = await companyLotteries.getCurrentLotteryNo();
      expect(lotteryNo).to.equal(0);
    });

    it('should return 1 if a lottery is created', async function () {
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

      const currentLotteryNo = await companyLotteries.getCurrentLotteryNo();
      expect(currentLotteryNo).to.equal(1);
    });

    it('should return 2 if two lotteries are created', async function () {
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

      const tx2 = await companyLotteries
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

      const receipt2 = await tx2.wait();
      const logs2 = receipt2?.logs;
      const lotteryCreatedLog2 = logs2?.find(
        (log) => log.fragment?.name === "LotteryCreated"
      );
      lotteryNo = lotteryCreatedLog2?.args?.[0];

      const currentLotteryNo = await companyLotteries.getCurrentLotteryNo();
      expect(currentLotteryNo).to.equal(2);
    });
  });
});
