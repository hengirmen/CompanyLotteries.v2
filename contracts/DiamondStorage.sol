// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

library DiamondStorage {
    struct Lottery {
        uint256 endTime;
        uint256 ticketPrice;
        uint256 numTickets;
        uint256 numWinners;
        uint256 numSold; // Tracks the number of tickets sold
        mapping(address => uint256) ticketsOwned;
        mapping(uint256 => uint256) winningTickets; // Stores winning ticket numbers
    }

    struct Storage {
        uint256 currentLotteryId;
        mapping(uint256 => Lottery) lotteries;
        address paymentToken;
        address owner;
        mapping(bytes4 => address) selectorToFacet;
    }

    function getStorage() internal pure returns (Storage storage ds) {
        bytes32 position = keccak256("diamond.storage.companylotteries");
        assembly {
            ds.slot := position
        }
    }
}
