// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "../DiamondStorage.sol";

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
    event LotteryCreated(
        uint lottery_no,
        uint unixbeg,
        uint nooftickets,
        uint noofwinners,
        uint minpercentage,
        uint ticketprice,
        bytes32 htmlhash,
        string url,
        address paymenttoken,
        address owner
    );

    // Function to create a new lottery
    function createLottery(
        uint256 unixbeg,             // The beginning time for the lottery (Unix timestamp)
        uint256 nooftickets,         // The total number of tickets for the lottery
        uint256 noofwinners,         // The number of winners for the lottery
        uint256 minpercentage,       // The minimum percentage of tickets that must be sold
        uint256 ticketprice,         // The price of one ticket
        bytes32 htmlhash,            // The hash of the HTML file (metadata URL or similar)
        string memory url            // The URL related to the lottery (e.g., lottery's landing page)
    ) public returns (uint256 lottery_no) {
        // Access the shared storage
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();

        // Ensure the caller is the owner
        require(msg.sender == ds.owner, "Caller is not the owner!");

        // Ensure the lottery's start time is in the future
        require(
            unixbeg > block.timestamp,
            "Lottery start time must be in the future!"
        );

        // Ensure the number of tickets is greater than zero
        require(nooftickets > 0, "Number of tickets must be greater than zero!");

        // Ensure the number of winners is valid
        require(
            noofwinners > 0 && noofwinners <= nooftickets,
            "Number of winners must be greater than zero and less than or equal to the number of tickets!"
        );

        // Ensure the minimum percentage is valid
        require(
            minpercentage > 0 && minpercentage <= 100,
            "Minimum percentage must be greater than zero and less than or equal to 100!"
        );

        // Ensure the ticket price is greater than zero
        require(ticketprice > 0, "Ticket price must be greater than zero!");

        // Increment the lottery number (ID) for the new lottery
        ds.currentLotteryId++;

        // Calculate the duration for the purchase and reveal phases
        uint256 unixtotalpurchaseandrevealtime = unixbeg - block.timestamp;
        uint256 unixhalfduration = unixtotalpurchaseandrevealtime / 2;

        // Set the purchase phase end time (half of the total time)
        uint256 unixpurchase = block.timestamp + unixhalfduration;

        // Set the reveal phase end time (half of the total time after purchase)
        uint256 unixreveal = unixpurchase + unixhalfduration;

        // Set the lottery details in the `lotteries` mapping for the current lottery
        DiamondStorage.Lottery storage lottery = ds.lotteries[ds.currentLotteryId];
        lottery.unixbeg = unixbeg;
        lottery.unixpurchase = unixpurchase;
        lottery.unixreveal = unixreveal;
        lottery.nooftickets = nooftickets;
        lottery.noofwinners = noofwinners;
        lottery.minpercentage = minpercentage;
        lottery.ticketprice = ticketprice;
        lottery.htmlhash = htmlhash;
        lottery.url = url;
        lottery.isActive = true;
        lottery.proceedsWithdrawn = false;

        // Emit the LotteryCreated event to notify about the new lottery
        emit LotteryCreated(
            ds.currentLotteryId,
            unixbeg,
            nooftickets,
            noofwinners,
            minpercentage,
            ticketprice,
            htmlhash,
            url,
            address(0), // Payment token (initially not set)
            ds.owner
        );

        // Return the ID of the newly created lottery
        return ds.currentLotteryId;
    }


    // Function to retrieve the current active lottery number
    function getCurrentLotteryNo() public view returns (uint256) {
        // Access the shared storage
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();

        // Return the current lottery number from the shared storage
        return ds.currentLotteryId;
    }


    // Function to get the information of a specific lottery
    function getLotteryInfo(
        uint256 lottery_no  // The ID of the lottery to retrieve information for
    )
        public
        view
        returns (
            uint256 unixbeg,        // The starting time of the lottery
            uint256 nooftickets,    // The number of tickets available for the lottery
            uint256 noofwinners,    // The number of winners for the lottery
            uint256 minpercentage,  // The minimum percentage of tickets that must be sold for the lottery to proceed
            uint256 ticketprice     // The price of a single ticket
        )
    {
        // Access the shared storage
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();

        // Retrieve the lottery data from the mapping using the lottery ID
        DiamondStorage.Lottery storage lottery = ds.lotteries[lottery_no];

        // Ensure that the lottery exists (check if unixbeg is set)
        require(lottery.unixbeg != 0, "Lottery does not exist!");

        // Return the details of the lottery
        return (
            lottery.unixbeg,       // The starting time of the lottery
            lottery.nooftickets,   // The total number of tickets available for purchase
            lottery.noofwinners,   // The number of winners
            lottery.minpercentage, // The minimum percentage of tickets required for the lottery to proceed
            lottery.ticketprice    // The price of a single ticket
        );
    }


    // Function to get the number of purchase transactions for a specific lottery
    function getNumPurchaseTxs(
        uint256 lottery_no // The lottery number for which we want to retrieve the number of purchase transactions
    ) public view returns (uint256 numpurchasetxs) {
        // Access the shared storage
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();

        // Retrieve the lottery data using the provided lottery number
        DiamondStorage.Lottery storage lottery = ds.lotteries[lottery_no];

        // Ensure that the specified lottery exists by checking the start time
        require(lottery.unixbeg != 0, "Lottery does not exist!");

        // Return the number of purchase transactions for the specified lottery
        return ds.purchaseTransactions[lottery_no].length;
    }


    // Function to get the ith purchased ticket and its quantity from a specific lottery
    function getIthPurchasedTicket(
        uint256 i,             // The index of the purchase transaction (1-based index)
        uint256 lottery_no     // The lottery number from which the ticket was purchased
    ) public view returns (uint256 sticketno, uint256 quantity) {
        // Access the shared storage
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();

        // Retrieve the lottery data using the provided lottery number
        DiamondStorage.Lottery storage lottery = ds.lotteries[lottery_no];

        // Ensure the specified lottery exists by checking the start time
        require(lottery.unixbeg != 0, "Lottery does not exist!");

        // Ensure the provided index is within the bounds of the purchase transactions array
        require(
            i > 0 && i <= ds.purchaseTransactions[lottery_no].length,
            "Index out of bounds!"
        );

        // Retrieve the purchase transaction at the specified index (1-based index, so we subtract 1)
        DiamondStorage.PurchaseTx storage purchaseTx = ds.purchaseTransactions[lottery_no][i - 1];

        // Return the ticket number and quantity from the purchase transaction
        return (purchaseTx.sticketno, purchaseTx.quantity);
    }


    // Function to retrieve the ith winning ticket number for a given lottery
    function getIthWinningTicket(
        uint256 lottery_no,
        uint256 i
    ) public view returns (uint256 ticketno) {
        // Access the shared storage
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();

        // Retrieve the lottery information based on the provided lottery number
        DiamondStorage.Lottery storage lottery = ds.lotteries[lottery_no];

        // Ensure the lottery exists (check if the start time is valid)
        require(lottery.unixbeg != 0, "Lottery does not exist!");

        // Ensure the reveal phase has ended before querying the winning ticket
        require(
            block.timestamp > lottery.unixreveal,
            "Reveal phase has not ended yet!"
        );

        // Ensure the lottery has been finalized or canceled (no active lottery)
        require(!lottery.isActive, "Lottery is not finalized or canceled!");

        // Ensure the index is within bounds for the list of winners
        require(i > 0 && i <= lottery.winningtickets.length, "Index out of bounds!");

        // Return the ith winning ticket number (index starts from 1)
        return lottery.winningtickets[i - 1];
    }


    // Function to get the HTML hash and URL of a specific lottery
    function getLotteryURL(
        uint256 lottery_no  // The ID of the lottery to retrieve the URL and HTML hash for
    )
        public
        view
        returns (bytes32 htmlhash, string memory url)  // The HTML hash and URL associated with the lottery
    {
        // Access the shared storage
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();

        // Retrieve the lottery data from the mapping using the provided lottery ID
        DiamondStorage.Lottery storage lottery = ds.lotteries[lottery_no];

        // Ensure that the lottery exists (check if unixbeg is set)
        require(lottery.unixbeg != 0, "Lottery does not exist!");

        // Return the HTML hash and URL for the lottery
        return (lottery.htmlhash, lottery.url);
    }

    // Function to get the number of tickets sold in a specific lottery
    function getLotterySales(
        uint256 lottery_no  // The ID of the lottery to retrieve the sales data for
    )
        public
        view
        returns (uint256 numsold)  // The number of tickets sold for the lottery
    {
        // Access the shared storage
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();

        // Retrieve the lottery data from the mapping using the provided lottery ID
        DiamondStorage.Lottery storage lottery = ds.lotteries[lottery_no];

        // Ensure that the lottery exists (check if unixbeg is set)
        require(lottery.unixbeg != 0, "Lottery does not exist!");

        // Return the number of tickets sold for the lottery
        return lottery.numsold;
    }



    // Function to retrieve the payment token address for a given lottery
    function getPaymentToken(
        uint256 lottery_no
    ) public view returns (address erctokenaddress) {
        // Access the shared storage
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();

        // Retrieve the lottery data for the given lottery number
        DiamondStorage.Lottery storage lottery = ds.lotteries[lottery_no];

        // Ensure that the lottery exists by checking if the 'unixbeg' timestamp is non-zero
        require(lottery.unixbeg != 0, "Lottery does not exist!");

        // Return the payment token address associated with the lottery
        return lottery.paymenttoken;
    }

    function finalizeLottery(uint256 lotteryId) external {
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();
        DiamondStorage.Lottery storage lottery = ds.lotteries[lotteryId];

        require(lottery.isActive, "Lottery is not active");
        require(block.timestamp > lottery.unixreveal, "Reveal phase has not ended");

        // Ensure the lottery has enough participants
        require(lottery.numsold >= (lottery.nooftickets * lottery.minpercentage) / 100, "Not enough tickets sold");

        // Select winning tickets
        for (uint256 i = 0; i < lottery.noofwinners; i++) {
            uint256 winningTicket = selectRandomWinningTicket(lotteryId);
            lottery.winningtickets.push(winningTicket);
        }

        lottery.isActive = false; // Mark the lottery as finalized
    }

    function selectRandomWinningTicket(uint256 lotteryId) internal view returns (uint256) {
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();
        DiamondStorage.Lottery storage lottery = ds.lotteries[lotteryId];

        uint256 randomIndex = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % lottery.numsold;
        return randomIndex + 1; // Assuming ticket numbers start from 1
    }

    function getLotteryPhaseTimes(uint256 lottery_no) public view returns (
        uint256 startTime,
        uint256 purchaseEndTime,
        uint256 revealEndTime
    ) {
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();
        DiamondStorage.Lottery storage lottery = ds.lotteries[lottery_no];
        
        require(lottery.unixbeg != 0, "Lottery does not exist!");
        
        return (
            block.timestamp,
            lottery.unixpurchase,
            lottery.unixreveal
        );
    }
}
