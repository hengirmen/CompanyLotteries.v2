// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "../DiamondStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AdminFacet {
    event PaymentTokenUpdated(address indexed oldToken, address indexed newToken);
    event ProceedsWithdrawn(uint256 lottery_no, uint256 totalProceeds, address owner);
    event LotteryCanceled(uint indexed lottery_no);
    event LotteryFinalized(uint indexed lottery_no, uint[] winners);
    
    modifier onlyOwner() {
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();
        require(msg.sender == ds.owner, "Only owner can perform this action");
        _;
    }

    // Helper function to check if the address is a contract
    function isContract(address addr) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(addr)
        }
        return size > 0;
    }


    // Function to set a new ERC20 token as the payment token for the current lottery
    function setPaymentToken(address erctokenaddress) public {
        // Access the shared storage
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();

        // Ensure the caller is the owner
        require(msg.sender == ds.owner, "Caller is not the owner!");

        // Ensure the provided address is not zero (invalid address)
        require(erctokenaddress != address(0), "Invalid token address!");

        // Ensure the provided address is a contract (ERC20 token contract)
        require(isContract(erctokenaddress), "Address is not a contract!");

        // Retrieve the current lottery based on the current lottery ID
        DiamondStorage.Lottery storage lottery = ds.lotteries[ds.currentLotteryId];

        // Ensure the payment token is not already set to the provided address
        require(
            lottery.paymenttoken != erctokenaddress,
            "Token is already set!"
        );

        // Set the payment token for the lottery
        lottery.paymenttoken = erctokenaddress;

        // Emit an event to log the new payment token set for the lottery
        emit NewPaymentTokenSet(ds.currentLotteryId, erctokenaddress);
    }

    event NewPaymentTokenSet(
        uint indexed lottery_no,
        address indexed paymenttoken
    );

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

    // Function to finalize a lottery, selecting winners if the lottery has met the minimum ticket sales
    function finalizeLottery(uint256 lottery_no) public {
        // Access the shared storage
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();

        // Ensure the caller is the owner
        require(msg.sender == ds.owner, "Caller is not the owner!");

        // Retrieve the lottery details from the `lotteries` mapping
        DiamondStorage.Lottery storage lottery = ds.lotteries[lottery_no];

        // Ensure the lottery exists (check if `unixbeg` is set)
        require(lottery.unixbeg != 0, "Lottery does not exist!");

        // Ensure the reveal phase has ended (check if current time is past the reveal phase)
        require(block.timestamp > lottery.unixreveal, "Reveal phase has not ended yet!");

        // Ensure the lottery is active and not already finalized or canceled
        require(lottery.isActive, "Lottery has already been finalized or canceled!");

        // Calculate the minimum number of tickets required to proceed with the lottery
        uint256 minTicketsRequired = (lottery.nooftickets * lottery.minpercentage) / 100;

        // If the number of tickets sold is less than the minimum required, cancel the lottery
        if (lottery.numsold < minTicketsRequired) {
            // Mark the lottery as inactive
            lottery.isActive = false;

            // Mark the lottery as canceled
            lottery.isCanceled = true;

            // Emit a 'LotteryCanceled' event to notify listeners
            emit LotteryCanceled(lottery_no);
            return;
        }

        uint256 totalRevealedTickets = 0;
        uint256[] memory revealedTickets = new uint256[](lottery.numsold);

        // Collect tickets that have revealed random numbers
        for (uint256 i = 1; i <= lottery.numsold; i++) {
            if (lottery.ticketHashes[i] != bytes32(0)) {
                revealedTickets[totalRevealedTickets] = i;
                totalRevealedTickets++;
            }
        }

        // Ensure there are enough revealed tickets to select winners
        require(
            totalRevealedTickets >= lottery.noofwinners,
            "Not enough revealed tickets to select winners!"
        );

        uint256[] memory winners = new uint256[](lottery.noofwinners);

        // Generate a random seed using the block hash and the current timestamp
        uint256 seed = uint256(
            keccak256(
                abi.encodePacked(blockhash(block.number - 1), block.timestamp)
            )
        );

        // Select unique winners using the random seed
        for (uint256 i = 0; i < lottery.noofwinners; i++) {
            uint256 randomIndex = uint256(keccak256(abi.encode(seed, i))) %
                totalRevealedTickets;
            winners[i] = revealedTickets[randomIndex];

            // Remove the selected winner from the list to avoid duplicates
            revealedTickets[randomIndex] = revealedTickets[
                totalRevealedTickets - 1
            ];
            totalRevealedTickets--;
        }

        // Mark the lottery as finalized and store the winning tickets
        lottery.isActive = false;
        lottery.isFinalized = true;
        lottery.winningtickets = winners;

        // Emit the 'LotteryFinalized' event to notify listeners
        emit LotteryFinalized(lottery_no, winners);
    }

    // Function to withdraw the proceeds from the lottery after it has been finalized
    function withdrawTicketProceeds(uint256 lottery_no) public {
        // Access the shared storage
        DiamondStorage.Storage storage ds = DiamondStorage.getStorage();

        // Ensure the caller is the owner
        require(msg.sender == ds.owner, "Caller is not the owner!");

        // Retrieve the specific lottery from the mapping
        DiamondStorage.Lottery storage lottery = ds.lotteries[lottery_no];

        // Ensure the lottery exists (check if unixbeg is set)
        require(lottery.unixbeg != 0, "Lottery does not exist!");

        // Ensure the lottery is finalized or canceled (check if isActive is false)
        require(!lottery.isActive, "Lottery must be finalized or canceled!");

        // Ensure the proceeds have not already been withdrawn
        require(!lottery.proceedsWithdrawn, "Proceeds have already been withdrawn!");

        // Calculate the total proceeds (number of tickets sold * ticket price)
        uint256 totalProceeds = lottery.numsold * lottery.ticketprice;

        // Transfer the proceeds to the owner (payment token transfer)
        bool transferSuccess = IERC20(lottery.paymenttoken).transfer(
            ds.owner,
            totalProceeds
        );
        require(transferSuccess, "Proceeds transfer failed!");

        // Mark the proceeds as withdrawn to prevent multiple withdrawals
        lottery.proceedsWithdrawn = true;

        // Emit an event for transparency (ProceedsWithdrawn event)
        emit ProceedsWithdrawn(lottery_no, totalProceeds, ds.owner);
    }


}