const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CompanyLotteries - finalizeLottery", function () {
  let companyLotteries;
  let mockToken;
  let owner;
  let buyer;
  let otherUser;
  let lotteryNo;
  let snapshotId;

  const TICKET_PRICE = ethers.parseEther("10");
  const NUM_TICKETS = 32;
  const NUM_WINNERS = 5;
  const MIN_PERCENTAGE = 20;

  let randomNumber; // Variable to store the actual random number
  let randomHash;   // Variable to store the random hash generated during ticket purchase

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', []);

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

    // Simulate ticket purchase
    const quantity = 5;
    randomNumber = Math.floor(Math.random() * 1000); // Generate a random number for testing
    randomHash = ethers.solidityPackedKeccak256(['uint'], [randomNumber]); // Generate the hash of the random number

    // Buy tickets
    await companyLotteries
      .connect(buyer)
      .buyTicketTx(lotteryNo, quantity, randomHash);
  });

  afterEach(async function () {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  describe('Successful FinalizeLottery', function () {
    it('should finalize the lottery and emit LotteryFinalized event if the lottery has met the minimum ticket sales', async function () {
      // Let otherUser buy tickets
      const quantity2 = 1;
      const randomNumber2 = Math.floor(Math.random() * 1000); // Generate a random number for testing
      const randomHash2 = ethers.solidityPackedKeccak256(['uint'], [randomNumber2]); // Generate the hash of the random number

      await companyLotteries
        .connect(otherUser)
        .buyTicketTx(lotteryNo, quantity2, randomHash2);

      // Get into the reveal phase
      await ethers.provider.send("evm_increaseTime", [1801]); // 30 minutes later
      await ethers.provider.send("evm_mine", []); // Ensure time increment

      // Reveal the random number
      await companyLotteries.connect(buyer).revealRndNumberTx(
        lotteryNo,
        1,
        5,
        randomNumber
      );

      await companyLotteries.connect(otherUser).revealRndNumberTx(
        lotteryNo,
        6,
        1,
        randomNumber2
      );

      // Get into the finalize phase
      await ethers.provider.send("evm_increaseTime", [1801]); // 30 minutes later
      await ethers.provider.send("evm_mine", []); // Ensure time increment

      // Finalize the lottery
      const tx = await companyLotteries.connect(owner).finalizeLottery(lotteryNo);
      const receipt = await tx.wait();
      const logs = receipt?.logs;
      const lotteryFinalizedLog = logs?.find(
        (log) => log.fragment?.name === "LotteryFinalized"
      );

      expect(lotteryFinalizedLog).to.not.be.undefined;

      // Decode the log data
      const [lottery_no, winningTickets] = lotteryFinalizedLog.args;

      // Assertions
      expect(lottery_no.toString()).to.equal(lotteryNo.toString());
      expect(winningTickets.length).to.equal(NUM_WINNERS);
    });

    it('should cancel the lottery and emit LotteryCancelled event if the lottery has not met the minimum ticket sales', async function () {
      // Get into the reveal phase
      await ethers.provider.send("evm_increaseTime", [1801]); // 30 minutes later
      await ethers.provider.send("evm_mine", []); // Ensure time increment

      // Reveal the random number
      await companyLotteries.connect(buyer).revealRndNumberTx(
        lotteryNo,
        1,
        5,
        randomNumber
      );

      // Get into the finalize phase
      await ethers.provider.send("evm_increaseTime", [1801]); // 30 minutes later
      await ethers.provider.send("evm_mine", []); // Ensure time increment

      // Finalize the lottery
      const tx = await companyLotteries.connect(owner).finalizeLottery(lotteryNo);
      const receipt = await tx.wait();
      const logs = receipt?.logs;

      const lotteryCancelledLog = logs?.find(
        (log) => log.fragment?.name === "LotteryCanceled"
      );

      expect(lotteryCancelledLog).to.not.be.undefined;

      // Decode the log data
      const lottery_no = lotteryCancelledLog.args;

      // Assertions
      expect(lottery_no.toString()).to.equal(lotteryNo.toString());
    });
  });

  describe('Failed FinalizeLottery', function () {
    it('should revert if the lottery does not exist', async function () {
      await expect(
        companyLotteries.finalizeLottery(99) // Non-existent lottery ID
      )
        .to.be.revertedWith('Lottery does not exist!');
    });

    it('should revert if the reveal phase has not ended yet', async function () {
      await expect(
        companyLotteries.finalizeLottery(1) // lottery no
      )
        .to.be.revertedWith('Reveal phase has not ended yet!');
    });

    it('should revert if the lottery has already been canceled or finalized', async function () {
      await ethers.provider.send('evm_increaseTime', [3601]); // 1 hour later
      await ethers.provider.send('evm_mine'); // Ensure time increment

      await companyLotteries.finalizeLottery(1); // lottery no

      await expect(
        companyLotteries.finalizeLottery(1) // lottery no
      )
        .to.be.revertedWith('Lottery has already been finalized or canceled!');
    });
  });
});
