// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "../DiamondStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AdminFacet {
    event PaymentTokenUpdated(address indexed oldToken, address indexed newToken);
    event ProceedsWithdrawn(address indexed recipient, uint256 amount);
    event LotteryFinalized(uint256 indexed lotteryId, uint256[] winningTickets);

    modifier onlyOwner() {
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();
        require(msg.sender == ds.owner, "Only owner can perform this action");
        _;
    }

    function setPaymentToken(address tokenAddress) external onlyOwner {
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();
        address oldToken = ds.paymentToken;
        ds.paymentToken = tokenAddress;

        emit PaymentTokenUpdated(oldToken, tokenAddress);
    }

    function withdrawProceeds(uint256 lotteryId) external onlyOwner {
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();
        DiamondStorage.Lottery storage lottery = ds.lotteries[lotteryId];

        require(block.timestamp > lottery.endTime, "Lottery not yet ended");

        uint256 totalProceeds = lottery.ticketPrice * lottery.numSold;
        IERC20(ds.paymentToken).transfer(msg.sender, totalProceeds);

        emit ProceedsWithdrawn(msg.sender, totalProceeds);
    }

    function setOwner(address newOwner) external onlyOwner {
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();
        ds.owner = newOwner;
    }

    // Getter for paymentToken
    function getPaymentToken() external view returns (address) {
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();
        return ds.paymentToken;
    }

    // Getter for owner
    function getOwner() external view returns (address) {
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();
        return ds.owner;
    }

    // Finalize a lottery by selecting winners
    function finalizeLottery(uint256 lotteryId) external onlyOwner {
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();
        DiamondStorage.Lottery storage lottery = ds.lotteries[lotteryId];

        require(block.timestamp > lottery.endTime, "Lottery has not ended yet");
        require(lottery.numWinners > 0, "No winners to select");
        require(lottery.numSold >= lottery.numWinners, "Not enough tickets sold");

        uint256[] memory winners = new uint256[](lottery.numWinners);
        for (uint256 i = 0; i < lottery.numWinners; i++) {
            // Simple pseudo-random selection (for demonstration purposes only)
            uint256 winningTicket = (uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, i))) % lottery.numSold) + 1;
            lottery.winningTickets[i] = winningTicket;
            winners[i] = winningTicket;
        }

        emit LotteryFinalized(lotteryId, winners);
    }
}
