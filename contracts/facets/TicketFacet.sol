// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "../DiamondStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TicketFacet {
    event TicketPurchased(address buyer, uint256 lotteryId, uint256 quantity, uint256 startTicket);
    event RandomNumberRevealed(address revealer, uint256 lotteryId, uint256 ticketNumber);
    event TicketRefundWithdrawn(address user, uint256 lotteryId, uint256 amount);

    function buyTicketTx(
        uint256 lotteryId,
        uint256 quantity,
        bytes32 hashRndNumber
    ) external {
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();
        DiamondStorage.Lottery storage lottery = ds.lotteries[lotteryId];

        require(block.timestamp < lottery.endTime, "Lottery has ended");
        require(quantity > 0 && quantity <= 30, "Can purchase 1-30 tickets per transaction");
        require(
            lottery.ticketsOwned[msg.sender] + quantity <= lottery.numTickets,
            "Exceeds ticket limit"
        );

        uint256 totalCost = quantity * lottery.ticketPrice;
        IERC20(ds.paymentToken).transferFrom(msg.sender, address(this), totalCost);

        uint256 startTicket = lottery.ticketsOwned[msg.sender] + 1;
        lottery.ticketsOwned[msg.sender] += quantity;

        emit TicketPurchased(msg.sender, lotteryId, quantity, startTicket);
    }

    function revealRndNumberTx(
        uint256 lotteryId,
        uint256 sticketNo,
        uint256 quantity,
        uint256 rndNumber
    ) external {
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();
        DiamondStorage.Lottery storage lottery = ds.lotteries[lotteryId];

        require(block.timestamp >= lottery.endTime, "Reveal phase not started");
        require(block.timestamp < lottery.endTime + (lottery.endTime / 2), "Reveal phase ended");
        require(lottery.ticketsOwned[msg.sender] >= quantity, "Insufficient tickets owned");

        // Add logic to process revealed random numbers
        uint256 ticketEnd = sticketNo + quantity - 1;
        require(ticketEnd <= lottery.numTickets, "Invalid ticket range");

        emit RandomNumberRevealed(msg.sender, lotteryId, sticketNo);
    }

    function checkIfMyTicketWon(uint256 lotteryId, uint256 ticketNo) external view returns (bool) {
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();
        DiamondStorage.Lottery storage lottery = ds.lotteries[lotteryId];

        // Determine if ticketNo is a winning ticket
        return _isWinningTicket(lotteryId, ticketNo);
    }

    function checkIfAddrTicketWon(
        address addr,
        uint256 lotteryId,
        uint256 ticketNo
    ) external view returns (bool) {
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();
        DiamondStorage.Lottery storage lottery = ds.lotteries[lotteryId];

        // Determine if ticketNo belongs to addr and is a winning ticket
        require(lottery.ticketsOwned[addr] >= ticketNo, "Ticket not owned by address");
        return _isWinningTicket(lotteryId, ticketNo);
    }

    function withdrawTicketRefund(uint256 lotteryId) external {
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();
        DiamondStorage.Lottery storage lottery = ds.lotteries[lotteryId];

        require(block.timestamp > lottery.endTime, "Lottery not yet ended");
        uint256 ticketsOwned = lottery.ticketsOwned[msg.sender];
        require(ticketsOwned > 0, "No tickets to refund");

        uint256 refundAmount = ticketsOwned * lottery.ticketPrice;
        lottery.ticketsOwned[msg.sender] = 0;
        IERC20(ds.paymentToken).transfer(msg.sender, refundAmount);

        emit TicketRefundWithdrawn(msg.sender, lotteryId, refundAmount);
    }

    function _isWinningTicket(uint256 lotteryId, uint256 ticketNo) internal view returns (bool) {
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();
        DiamondStorage.Lottery storage lottery = ds.lotteries[lotteryId];

        // Implement the winning ticket logic based on your lottery randomness process
        // Example: Check against a pre-determined list of winning ticket numbers
        return ticketNo % lottery.numWinners == 0;
    }
}
