// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "../DiamondStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TicketFacet {
    event TicketPurchased(
        uint indexed lottery_no,
        address indexed buyer,
        uint sticketno,
        uint quantity
    );    event RandomNumberRevealed(address revealer, uint256 lotteryId, uint256 ticketNumber);
    
    event TicketRefundWithdrawn(
        uint indexed lottery_no,
        uint indexed ticket_no,
        address indexed buyer,
        uint refundAmount
    );

    event ProceedsWithdrawn(
        uint indexed lottery_no,
        uint amount,
        address indexed owner
    );

    event TicketsRevealed(
        uint256 lottery_no,
        address indexed buyer,
        uint256 sticketno,
        uint256 quantity,
        uint256 rnd_number
    );

    // Function to allow users to buy tickets for a specific lottery
    function buyTicketTx(
        uint256 lottery_no,          // The ID of the lottery
        uint256 quantity,            // The number of tickets the user wants to buy
        bytes32 hash_rnd_number      // The hash of the random number for the ticket
    ) public returns (uint256 sticketno) {
        // Access the shared storage
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();

        // Ensure that the random hash is not empty
        require(
            hash_rnd_number != bytes32(0),
            "Random hash must not be empty!"
        );

        // Retrieve the lottery data from the mapping using the lottery ID
        DiamondStorage.Lottery storage lottery = ds.lotteries[lottery_no];

        // Ensure that the lottery exists (its start time must be set)
        require(lottery.unixbeg != 0, "Lottery does not exist!");

        // Ensure that the purchase phase is still open (current time should be before the purchase end time)
        require(
            block.timestamp < lottery.unixpurchase,
            "Purchase phase has ended!"
        );

        // Ensure that the lottery is still active
        require(lottery.isActive, "Lottery is not active!");

        // Ensure that the quantity of tickets is within the allowable range (between 1 and 30)
        require(
            quantity > 0 && quantity <= 30,
            "Quantity must be greater than zero and less than or equal to 30!"
        );

        // Ensure that there are enough tickets remaining to complete the purchase
        require(
            lottery.numsold + quantity <= lottery.nooftickets,
            "Not enough tickets remaining!"
        );

        // Calculate the total cost of the tickets being purchased
        uint256 totalCost = quantity * lottery.ticketprice;

        // Transfer the total ticket price from the buyer to the lottery contract (ERC20 transfer)
        bool transferSuccess = IERC20(lottery.paymenttoken).transferFrom(
            msg.sender,             // The sender (buyer)
            address(this),          // The recipient (the lottery contract)
            totalCost               // The total amount to transfer
        );

        // Ensure that the transfer was successful
        require(
            transferSuccess,
            "ERC20: transfer amount exceeds balance"
        );

        // Assign tickets to the buyer
        sticketno = lottery.numsold + 1;  // The starting ticket number for the buyer
        for (uint256 i = 0; i < quantity; i++) {
            uint256 currentTicket = lottery.numsold + i + 1;  // The current ticket number
            lottery.ticketOwner[currentTicket] = msg.sender; // Assign the ticket to the buyer
            lottery.ticketHashes[currentTicket] = hash_rnd_number;  // Assign the random hash to the ticket
            lottery.userTickets[msg.sender].push(currentTicket);  // Add the ticket to the buyer's tickets array
        }

        // Update the total number of tickets sold
        lottery.numsold += quantity;

        // Add the purchase transaction to the transaction history for this lottery
        ds.purchaseTransactions[lottery_no].push(DiamondStorage.PurchaseTx(sticketno, quantity));

        // Emit the TicketPurchased event to notify about the ticket purchase
        emit TicketPurchased(lottery_no, msg.sender, sticketno, quantity);

        // Return the starting ticket number for the purchased tickets
        return sticketno;
    }


    // Function to reveal the random number for the buyer's tickets
    function revealRndNumberTx(
        uint256 lottery_no,       // The ID of the lottery
        uint256 sticketno,        // The starting ticket number
        uint256 quantity,         // The number of tickets the buyer wants to reveal
        uint256 rnd_number        // The actual random number that the buyer wants to reveal
    ) public {
        // Access the shared storage
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();

        // Retrieve the lottery data from the mapping using the lottery ID
        DiamondStorage.Lottery storage lottery = ds.lotteries[lottery_no];

        // Ensure that the lottery exists (its start time must be set)
        require(lottery.unixbeg != 0, "Lottery does not exist!");

        // Ensure that the reveal phase has started (current time must be after the purchase phase)
        require(
            block.timestamp > lottery.unixpurchase,
            "Reveal phase has not started yet!"
        );

        // Ensure that the reveal phase has not ended (current time must be before the reveal end time)
        require(
            block.timestamp < lottery.unixreveal,
            "Reveal phase has ended!"
        );

        // Ensure that the quantity of tickets to be revealed is within the allowable range (between 1 and 30)
        require(
            quantity > 0 && quantity <= 30,
            "Quantity must be greater than zero and less than or equal to 30!"
        );

        // Loop through the tickets to verify each ticket
        for (uint256 i = 0; i < quantity; i++) {
            uint256 currentTicket = sticketno + i;  // Get the current ticket number

            // Ensure that the ticket belongs to the buyer (only the buyer can reveal the number)
            require(
                lottery.ticketOwner[currentTicket] == msg.sender,
                "Only the buyer can reveal the random number!"
            );

            // Ensure that the provided random number matches the stored hash for the ticket
            require(
                lottery.ticketHashes[currentTicket] ==
                    keccak256(abi.encodePacked(rnd_number)), // Hash the revealed random number to match the stored hash
                "Random number does not match the hash!"
            );
        }

        // All checks passed; tickets are successfully revealed
        emit TicketsRevealed(lottery_no, msg.sender, sticketno, quantity, rnd_number);
    }


    function checkIfMyTicketWon(uint256 lotteryId, uint256 ticketNo) external view returns (bool) {
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();
        DiamondStorage.Lottery storage lottery = ds.lotteries[lotteryId];

        require(block.timestamp > lottery.unixreveal, "Reveal phase has not ended");
        
        // If lottery is still active but reveal phase ended, finalize it
        if (lottery.isActive && block.timestamp > lottery.unixreveal) {
            if (lottery.numsold >= (lottery.nooftickets * lottery.minpercentage) / 100) {
                return false;
            }
        }

        // Check if ticket is in winning tickets array
        for (uint256 i = 0; i < lottery.winningtickets.length; i++) {
            if (lottery.winningtickets[i] == ticketNo) {
                return true;
            }
        }

        return false;
    }

    // Function to check if the specified address owns a winning ticket in the specified lottery
    function checkIfAddressTicketWon(
        address addr,  // Address of the ticket holder
        uint256 lottery_no, // Lottery number
        uint256 ticket_no  // Ticket number to check
    ) public view returns (bool won) {
        // Access the shared storage
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();

        // Retrieve the lottery data using the provided lottery number
        DiamondStorage.Lottery storage lottery = ds.lotteries[lottery_no];

        // Ensure the specified lottery exists (check if the start time is valid)
        require(lottery.unixbeg != 0, "Lottery does not exist!");

        // Ensure the reveal phase has ended before querying the result
        require(
            block.timestamp > lottery.unixreveal,
            "Reveal phase has not ended yet!"
        );

        // Ensure the lottery has been finalized or canceled (i.e., no active lottery)
        require(!lottery.isActive, "Lottery is not finalized or canceled!");

        // Ensure the ticket exists and is owned by the specified address
        require(
            lottery.ticketOwner[ticket_no] != address(0),
            "Ticket does not exist or is unowned!"
        );
        require(
            lottery.ticketOwner[ticket_no] == addr,
            "Ticket does not belong to the address!"
        );

        // Check if the ticket is present in the list of winning tickets
        for (uint256 i = 0; i < lottery.winningtickets.length; i++) {
            if (lottery.winningtickets[i] == ticket_no) {
                return true; // Ticket is a winner
            }
        }

        // Return false if the ticket is not in the list of winners
        return false; // Ticket is not a winner
    }


    // Function to withdraw the ticket refund
    function withdrawTicketRefund(uint256 lottery_no, uint256 ticket_no) public {
        // Access the shared storage
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();

        // Retrieve the specific lottery from the mapping
        DiamondStorage.Lottery storage lottery = ds.lotteries[lottery_no];

        // Ensure the lottery exists (check if unixbeg is set)
        require(lottery.unixbeg != 0, "Lottery does not exist!");

        // Ensure the lottery is finalized or canceled (check if isActive is false)
        require(!lottery.isActive, "Lottery must be finalized or canceled!");

        // Ensure the lottery is canceled
        require(lottery.isCanceled, "Lottery must be canceled!");

        // Ensure the caller is the owner of the ticket
        require(
            lottery.ticketOwner[ticket_no] == msg.sender,
            "Caller is not the ticket owner!"
        );

        // Ensure the refund has not already been withdrawn for this ticket
        require(
            !lottery.refundWithdrawn[ticket_no],
            "Refund has already been withdrawn for this ticket!"
        );

        // Calculate the refund amount (ticket price)
        uint256 refundAmount = lottery.ticketprice;

        // Transfer the refund amount to the ticket owner
        bool transferSuccess = IERC20(lottery.paymenttoken).transfer(
            msg.sender,
            refundAmount
        );
        require(transferSuccess, "Refund transfer failed!");

        // Mark the ticket as refunded to prevent multiple refunds
        lottery.refundWithdrawn[ticket_no] = true;

        // Emit an event for transparency
        emit TicketRefundWithdrawn(
            lottery_no,
            ticket_no,
            msg.sender,
            refundAmount
        );
    }

    function isTicketOwner(
        uint256 lottery_no,
        uint256 ticket_no,
        address owner
    ) public view returns (bool) {
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();
        DiamondStorage.Lottery storage lottery = ds.lotteries[lottery_no];
        
        require(lottery.unixbeg != 0, "Lottery does not exist!");
        require(lottery.ticketOwner[ticket_no] != address(0), "Ticket does not exist!");
        
        return lottery.ticketOwner[ticket_no] == owner;
    }

    function getTicketOwner(
        uint256 lottery_no,
        uint256 ticket_no
    ) public view returns (address) {
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();
        DiamondStorage.Lottery storage lottery = ds.lotteries[lottery_no];
        
        require(lottery.unixbeg != 0, "Lottery does not exist!");
        require(lottery.ticketOwner[ticket_no] != address(0), "Ticket does not exist!");
        
        return lottery.ticketOwner[ticket_no];
    }


    function _isWinningTicket(uint256 lotteryId, uint256 ticketNo) internal view returns (bool) {
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();
        DiamondStorage.Lottery storage lottery = ds.lotteries[lotteryId];

        for (uint256 i = 0; i < lottery.winningtickets.length; i++) {
            if (lottery.winningtickets[i] == ticketNo) {
                return true; // Ticket is a winner
            }
        }

        return false; // Ticket is not a winner
    }
}
