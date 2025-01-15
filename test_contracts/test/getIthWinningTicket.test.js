const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CompanyLotteries - getIthWinningTicket", function () {
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

    // Simulate ticket purchase
    const quantity = 5;
    randomNumber = Math.floor(Math.random() * 1000); // Generate a random number for testing
    randomHash = ethers.solidityPackedKeccak256(['uint'], [randomNumber]); // Generate the hash of the random number

    // Buy tickets
    await companyLotteries
      .connect(buyer)
      .buyTicketTx(lotteryNo, quantity, randomHash);

    // Prepare token for otherUser
    await mockToken.mint(otherUser.address, ethers.parseEther("1000"));
    await mockToken
      .connect(otherUser)
      .approve(companyLotteries.target, ethers.parseEther("1000"));

    // Simulate ticket purchase
    const quantity2 = 5;
    const randomNumber2 = Math.floor(Math.random() * 1000); // Generate a random number for testing
    const randomHash2 = ethers.solidityPackedKeccak256(['uint'], [randomNumber2]); // Generate the hash of the random number

    // Buy tickets
    await companyLotteries
      .connect(otherUser)
      .buyTicketTx(lotteryNo, quantity2, randomHash2);

    // Get into the reveal phase
    await ethers.provider.send("evm_increaseTime", [1801]); // 30 minutes later
    await ethers.provider.send("evm_mine", []); // Ensure time increment

    // Now, reveal the random number using the correct random number (not hash) for buyer
    await companyLotteries
      .connect(buyer)
      .revealRndNumberTx(
        lotteryNo, // lottery no
        1, // sticket no
        5, // quantity
        randomNumber // random number
      );

    // Now, reveal the random number using the correct random number (not hash) for otherUser
    await companyLotteries
      .connect(otherUser)
      .revealRndNumberTx(
        lotteryNo, // lottery no
        6, // sticket no
        5, // quantity
        randomNumber2 // random number
      );
  });

  afterEach(async function () {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  describe('Successful getIthWinningTicket', function () {
    it('should return the winning ticket no at the ith position', async function () {
      await ethers.provider.send("evm_increaseTime", [1801]); // 30 minutes later
      await ethers.provider.send("evm_mine", []); // Ensure time increment

      // Finalize the lottery
      await companyLotteries.connect(owner).finalizeLottery(lotteryNo);

      const winningTicket = await companyLotteries.getIthWinningTicket(
        lotteryNo, // lottery no
        1 // 1st winning ticket
      );

      expect(winningTicket).to.be.a('bigint'); // 1n, 2n, 3n, ...
    });
  });

  describe('Failed getIthWinningTicket', function () {
    it('should revert if the lottery does not exist', async function () {
      await expect(
        companyLotteries.getIthWinningTicket(
          999, // Non-existent lottery
          1 // 1st winning ticket
        )
      ).to.be.revertedWith("Lottery does not exist!");
    });

    it('should revert if the reveal phase has not ended', async function () {
      await expect(
        companyLotteries.getIthWinningTicket(
          lotteryNo, // lottery no
          1 // 1st winning ticket
        )
      ).to.be.revertedWith("Reveal phase has not ended yet!");
    });

    it('should revert if the lottery has not been finalized', async function () {
      await ethers.provider.send("evm_increaseTime", [1801]); // 30 minutes later
      await ethers.provider.send("evm_mine", []); // Ensure time increment

      await expect(
        companyLotteries.getIthWinningTicket(
          lotteryNo, // lottery no
          1 // 1st winning ticket
        )
      ).to.be.revertedWith("Lottery is not finalized or canceled!");
    });

    it('should revert if the ith ticket is greater than the total number of winners', async function () {
      await ethers.provider.send("evm_increaseTime", [1801]); // 30 minutes later
      await ethers.provider.send("evm_mine", []); // Ensure time increment

      // Finalize the lottery
      await companyLotteries.connect(owner).finalizeLottery(lotteryNo);

      await expect(
        companyLotteries.getIthWinningTicket(
          lotteryNo, // lottery no
          10 // 10th winning ticket
        )
      ).to.be.revertedWith("Index out of bounds!");
    });
  });
});
