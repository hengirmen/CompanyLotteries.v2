const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CompanyLotteries - revealRndNumberTx", function () {
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
    randomHash  =ethers.solidityPackedKeccak256(['uint'], [randomNumber]); // Generate the hash of the random number

    // Buy tickets
    await companyLotteries
      .connect(buyer)
      .buyTicketTx(lotteryNo, quantity, randomHash);
  });

  afterEach(async function () {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  describe('Successful revealRndNumberTx', function () {
    it('should not revert if the random number is revealed by the buyer', async function () {
      await ethers.provider.send("evm_increaseTime", [1801]); // 30 minutes later
      await ethers.provider.send("evm_mine", []); // Ensure time increment

      // Now, reveal the random number using the correct random number (not hash)
      await expect(
        companyLotteries
          .connect(buyer)
          .revealRndNumberTx(
            lotteryNo, // lottery no
            1, // sticket no
            5, // quantity
            randomNumber // The actual random number (not the hash)
          )
      ).to.not.be.reverted; // Expect no revert since the number matches
    });
  });

  describe('Failed revealRndNumberTx', function () {
    it('should revert if the random number is not revealed by the buyer', async function () {
      await ethers.provider.send("evm_increaseTime", [1801]); // 30 minutes later
      await ethers.provider.send("evm_mine", []); // Ensure time increment

      await expect(
        companyLotteries
          .connect(otherUser)
          .revealRndNumberTx(
            lotteryNo, // lottery no
            1, // sticket no
            5, // quantity
            randomNumber
          )
      ).to.be.revertedWith("Only the buyer can reveal the random number!")
    });

    it('should revert if the random number is incorrect', async function () {
      await ethers.provider.send("evm_increaseTime", [1801]); // 30 minutes later
      await ethers.provider.send("evm_mine", []); // Ensure time increment

      await expect(
        companyLotteries
          .connect(buyer)
          .revealRndNumberTx(
            lotteryNo, // lottery no
            1, // sticket no
            5, // quantity
            randomNumber + 1 // Incorrect random number
          )
      ).to.be.revertedWith("Random number does not match the hash!")
    });

    it('should revert if the lottery does not exist', async function () {
      await ethers.provider.send("evm_increaseTime", [1801]); // 30 minutes later
      await ethers.provider.send("evm_mine", []); // Ensure time increment

      await expect(
        companyLotteries
          .connect(buyer)
          .revealRndNumberTx(
            999, // lottery no
            1, // sticket no
            5, // quantity
            randomNumber
          )
      ).to.be.revertedWith("Lottery does not exist!")
    });

    it('should revert if the reveal phase has not started', async function () {
      await ethers.provider.send("evm_increaseTime", [900]); // 15 minutes later
      await ethers.provider.send("evm_mine", []); // Ensure time increment

      await expect(
        companyLotteries
          .connect(buyer)
          .revealRndNumberTx(
            lotteryNo, // lottery no
            1, // sticket no
            5, // quantity
            randomNumber
          )
      ).to.be.revertedWith("Reveal phase has not started yet!")
    });

    it('should revert if the reveal phase has ended', async function () {
      await ethers.provider.send("evm_increaseTime", [3601]); // 1 hour later
      await ethers.provider.send("evm_mine", []); // Ensure time increment

      await expect(
        companyLotteries
          .connect(buyer)
          .revealRndNumberTx(
            lotteryNo, // lottery no
            1, // sticket no
            5, // quantity
            randomNumber
          )
      ).to.be.revertedWith("Reveal phase has ended!")
    });

    it('should not reveal the random number if the quantity is zero', async function () {
      await ethers.provider.send("evm_increaseTime", [1801]); // 30 minutes later
      await ethers.provider.send("evm_mine", []); // Ensure time increment

      await expect(
        companyLotteries
          .connect(buyer)
          .revealRndNumberTx(
            lotteryNo, // lottery no
            1, // sticket no
            0, // quantity
            randomNumber
          )
      ).to.be.revertedWith("Quantity must be greater than zero and less than or equal to 30!")
    });

    it('should not reveal the random number if the quantity is greater than 30', async function () {
      await ethers.provider.send("evm_increaseTime", [1801]); // 30 minutes later
      await ethers.provider.send("evm_mine", []); // Ensure time increment

      await expect(
        companyLotteries
          .connect(buyer)
          .revealRndNumberTx(
            lotteryNo, // lottery no
            1, // sticket no
            31, // quantity
            randomNumber
          )
      ).to.be.revertedWith("Quantity must be greater than zero and less than or equal to 30!")
    });
  });
});
