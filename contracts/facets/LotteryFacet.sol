// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

library LotteryStorage {
    struct Lottery {
        uint256 endTime;
        uint256 ticketPrice;
        uint256 numTickets;
        uint256 numWinners;
        bytes32 htmlHash;
        string url;
        uint256 numSold;
        address paymentToken;
        mapping(uint256 => address) ticketOwners;
        mapping(uint256 => uint256) winningTickets;
        mapping(address => uint256) ticketsOwned;
    }

    struct Storage {
        uint256 currentLotteryId;
        mapping(uint256 => Lottery) lotteries;
    }

    function getStorage() internal pure returns (Storage storage ls) {
        bytes32 position = keccak256("lottery.storage");
        assembly {
            ls.slot := position
        }
    }
}

contract LotteryFacet {
    event LotteryCreated(uint256 indexed lotteryId, uint256 endTime, uint256 ticketPrice);

    function createLottery(uint256 endTime, uint256 ticketPrice) external {
        require(endTime > block.timestamp, "End time must be in the future");
        require(ticketPrice > 0, "Ticket price must be greater than 0");

        LotteryStorage.Storage storage ls = LotteryStorage.getStorage();
        ls.currentLotteryId++;
        uint256 lotteryId = ls.currentLotteryId;

        LotteryStorage.Lottery storage lottery = ls.lotteries[lotteryId];
        lottery.endTime = endTime;
        lottery.ticketPrice = ticketPrice;

        emit LotteryCreated(lotteryId, endTime, ticketPrice);
    }

    function getCurrentLotteryId() external view returns (uint256) {
        LotteryStorage.Storage storage ls = LotteryStorage.getStorage();
        return ls.currentLotteryId;
    }

    function getLotteryInfo(uint256 lotteryId) 
        external 
        view 
        returns (uint256 endTime, uint256 ticketPrice, uint256 numTickets, uint256 numWinners)
    {
        LotteryStorage.Storage storage ls = LotteryStorage.getStorage();
        LotteryStorage.Lottery storage lottery = ls.lotteries[lotteryId];

        return (
            lottery.endTime,
            lottery.ticketPrice,
            lottery.numTickets,
            lottery.numWinners
        );
    }

    function getNumPurchaseTxs(uint256 lotteryId) external view returns (uint256) {
        LotteryStorage.Storage storage ls = LotteryStorage.getStorage();
        LotteryStorage.Lottery storage lottery = ls.lotteries[lotteryId];

        return lottery.numSold;
    }

    function getIthPurchasedTicket(uint256 lotteryId, uint256 index) external view returns (address) {
        LotteryStorage.Storage storage ls = LotteryStorage.getStorage();
        LotteryStorage.Lottery storage lottery = ls.lotteries[lotteryId];

        require(index < lottery.numSold, "Index out of bounds");
        return lottery.ticketOwners[index];
    }

    function getIthWinningTicket(uint256 lotteryId, uint256 index) external view returns (uint256) {
        LotteryStorage.Storage storage ls = LotteryStorage.getStorage();
        LotteryStorage.Lottery storage lottery = ls.lotteries[lotteryId];

        require(index < lottery.numWinners, "Index out of bounds");
        return lottery.winningTickets[index];
    }

    function getLotteryURL(uint256 lotteryId) external view returns (bytes32 htmlHash, string memory url) {
        LotteryStorage.Storage storage ls = LotteryStorage.getStorage();
        LotteryStorage.Lottery storage lottery = ls.lotteries[lotteryId];

        return (lottery.htmlHash, lottery.url);
    }

    function getLotterySales(uint256 lotteryId) external view returns (uint256) {
        LotteryStorage.Storage storage ls = LotteryStorage.getStorage();
        LotteryStorage.Lottery storage lottery = ls.lotteries[lotteryId];

        return lottery.numSold;
    }

    function getPaymentToken(uint256 lotteryId) external view returns (address) {
        LotteryStorage.Storage storage ls = LotteryStorage.getStorage();
        LotteryStorage.Lottery storage lottery = ls.lotteries[lotteryId];

        return lottery.paymentToken;
    }
}
