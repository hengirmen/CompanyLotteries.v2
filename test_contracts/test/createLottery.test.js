const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CompanyLotteries - createLottery", function () {
  let companyLotteries;
  let owner;

  const TICKET_PRICE = ethers.parseEther("10");
  const NUM_TICKETS = 32;
  const NUM_WINNERS = 5;
  const MIN_PERCENTAGE = 20;

  const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

  beforeEach(async function () {
    // Get signers
    [owner] = await ethers.getSigners();

    // Deploy lottery contract
    const CompanyLotteriesFactory = await ethers.getContractFactory(
      "CompanyLotteries"
    );
    companyLotteries = await CompanyLotteriesFactory.deploy();
  });

  describe('Successful createLottery', function () {
    it('should create a new lottery with LotteryCreated event and return the lottery number (1 here)', async function () {
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
      const lotteryNo = lotteryCreatedLog?.args?.[0];

      expect(lotteryNo).to.equal(1);
    });
  });

  describe('Failed createLottery', function () {
    it('should revert if the ticket price is 0', async function () {
      await expect(
        companyLotteries
          .connect(owner)
          .createLottery(
            futureTimestamp,
            NUM_TICKETS,
            NUM_WINNERS,
            MIN_PERCENTAGE,
            0, // Ticket price is 0
            ethers.encodeBytes32String("htmlhash"),
            "https://example.com"
          )
      ).to.be.revertedWith("Ticket price must be greater than zero!");
    });

    it('should revert if the number of tickets is 0', async function () {
      await expect(
        companyLotteries
          .connect(owner)
          .createLottery(
            futureTimestamp,
            0, // Number of tickets is 0
            NUM_WINNERS,
            MIN_PERCENTAGE,
            TICKET_PRICE,
            ethers.encodeBytes32String("htmlhash"),
            "https://example.com"
          )
      ).to.be.revertedWith("Number of tickets must be greater than zero!");
    });

    it('should revert if the number of winners is 0', async function () {
      await expect(
        companyLotteries
          .connect(owner)
          .createLottery(
            futureTimestamp,
            NUM_TICKETS,
            0, // Number of winners is 0
            MIN_PERCENTAGE,
            TICKET_PRICE,
            ethers.encodeBytes32String("htmlhash"),
            "https://example.com"
          )
      ).to.be.revertedWith("Number of winners must be greater than zero and less than or equal to number of tickets!");
    });

    it('should revert if the number of winners is greater than the number of tickets', async function () {
      await expect(
        companyLotteries
          .connect(owner)
          .createLottery(
            futureTimestamp,
            NUM_TICKETS,
            NUM_TICKETS + 1, // Number of winners is greater than number of tickets
            MIN_PERCENTAGE,
            TICKET_PRICE,
            ethers.encodeBytes32String("htmlhash"),
            "https://example.com"
          )
      ).to.be.revertedWith("Number of winners must be greater than zero and less than or equal to number of tickets!");
    });

    it('should revert if the minimum percentage is 0', async function () {
      await expect(
        companyLotteries
          .connect(owner)
          .createLottery(
            futureTimestamp,
            NUM_TICKETS,
            NUM_WINNERS,
            0, // Minimum percentage is 0
            TICKET_PRICE,
            ethers.encodeBytes32String("htmlhash"),
            "https://example.com"
          )
      ).to.be.revertedWith("Minimum percentage must be greater than zero and less than or equal to 100!");
    });

    it('should revert if the minimum percentage is greater than 100', async function () {
      await expect(
        companyLotteries
          .connect(owner)
          .createLottery(
            futureTimestamp,
            NUM_TICKETS,
            NUM_WINNERS,
            101, // Minimum percentage is greater than 100
            TICKET_PRICE,
            ethers.encodeBytes32String("htmlhash"),
            "https://example.com"
          )
      ).to.be.revertedWith("Minimum percentage must be greater than zero and less than or equal to 100!");
    });

    it('should revert if the lottery end time is not in the future', async function () {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

      await expect(
        companyLotteries
          .connect(owner)
          .createLottery(
            pastTimestamp, // Lottery end time is in the past
            NUM_TICKETS,
            NUM_WINNERS,
            MIN_PERCENTAGE,
            TICKET_PRICE,
            ethers.encodeBytes32String("htmlhash"),
            "https://example.com"
          )
      ).to.be.revertedWith("Lottery end time must be in the future!");
    });
  });
});
