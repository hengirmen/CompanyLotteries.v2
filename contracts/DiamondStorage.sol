// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

library DiamondStorage {
    struct Lottery {
        uint256 unixbeg;            // Start time of the lottery
        uint256 unixpurchase;       // End of ticket purchase phase
        uint256 unixreveal;         // End of reveal phase
        uint256 endTime;
        uint256 nooftickets;        // Total tickets in the lottery
        uint256 noofwinners;        // Number of winners
        uint256 minpercentage;      // Minimum participation to run the lottery
        uint256 ticketprice;        // Price per ticket
        bytes32 htmlhash;           // Hash of the HTML content for metadata
        string url;                 // URL for additional metadata
        address paymenttoken;       // Payment token (e.g., ERC20)
        uint256 numsold;            // Tickets sold
        uint256[] winningtickets;   // Array of winning ticket numbers
        mapping(address => uint256[]) userTickets;  // User tickets
        mapping(uint256 => address) ticketOwner;    // Owner of each ticket
        mapping(uint256 => bytes32) ticketHashes;   // Hashed random numbers
        mapping(uint256 => bool) refundWithdrawn;   // Tracks refunds
        bool isActive;             // Is the lottery active?
        bool proceedsWithdrawn;    // Proceeds withdrawn
        bool isFinalized;          // Is the lottery finalized?
        bool isCanceled;           // Is the lottery canceled?
    }

    struct PurchaseTx {
        uint sticketno;
        uint quantity;
    }

    struct Storage {
        uint256 currentLotteryId;
        mapping(uint256 => Lottery) lotteries;
        mapping(uint256 => PurchaseTx[]) purchaseTransactions; // Moved here
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