const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LotteryFacet Tests", function () {
    let lotteryFacet, ticketFacet, owner, addr1, addr2;

    beforeEach(async function () {
        // Deploy LotteryFacet
        const LotteryFacet = await ethers.getContractFactory("LotteryFacet");
        lotteryFacet = await LotteryFacet.deploy();

        // Deploy TicketFacet
        const TicketFacet = await ethers.getContractFactory("TicketFacet");
        ticketFacet = await TicketFacet.deploy();

        [owner, addr1, addr2] = await ethers.getSigners();

        // Create a sample lottery in LotteryFacet
        const endTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
        const ticketPrice = ethers.parseEther("0.01"); // Ticket price: 0.01 ETH
        await lotteryFacet.createLottery(endTime, ticketPrice);
    });

    it("Should retrieve the number of purchase transactions", async function () {
        const numTxs = await lotteryFacet.getNumPurchaseTxs(1);
        expect(numTxs).to.equal(0); // Initially 0
    });

    it("Should retrieve the i-th purchased ticket", async function () {
        // Use TicketFacet to buy tickets
        await ticketFacet.buyTicketTx(1, 1, ethers.solidityPackedKeccak256(["string"], ["random-hash"]));

        const buyer = await lotteryFacet.getIthPurchasedTicket(1, 0);
        expect(buyer).to.equal(owner.address);
    });

    it("Should retrieve the i-th winning ticket", async function () {
        const winner = await lotteryFacet.getIthWinningTicket(1, 0);
        expect(winner).to.be.a("number"); // Adjust expectations based on your logic
    });

    it("Should retrieve lottery URL and HTML hash", async function () {
        const [htmlHash, url] = await lotteryFacet.getLotteryURL(1);
        expect(htmlHash).to.be.a("string");
        expect(url).to.be.a("string");
    });

    it("Should retrieve the number of tickets sold", async function () {
        const numSold = await lotteryFacet.getLotterySales(1);
        expect(numSold).to.equal(0); // Initially 0
    });

    it("Should retrieve the payment token address", async function () {
        const tokenAddress = await lotteryFacet.getPaymentToken(1);
        expect(ethers.isAddress(tokenAddress)).to.be.true; // Validate as a proper address
    });
});
