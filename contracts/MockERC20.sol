// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockERC20 is ERC20, Ownable {
    uint256 public faucetAmount; // Amount each user can request per faucet call
    mapping(address => uint256) public lastFaucetCall; // Tracks when each user last called the faucet
    uint256 public cooldown; // Cooldown period in seconds

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply); // Mint initial supply to the contract deployer
        faucetAmount = 100 * (10**decimals()); // Default faucet amount
        cooldown = 1 hours; // Default cooldown period
    }

    // Faucet function for users to request tokens
    function faucet(uint256 amount) public {
        require(
            block.timestamp >= lastFaucetCall[msg.sender] + cooldown,
            "Faucet cooldown active. Try later."
        );
        require(amount > 0, "Amount must be greater than zero.");
        require(faucetAmount > 0, "Faucet amount not set.");

        _mint(msg.sender, amount); // Mint tokens to the user
        lastFaucetCall[msg.sender] = block.timestamp; // Update the last call timestamp
    }

    // Owner-only function to set faucet amount
    function setFaucetAmount(uint256 amount) public onlyOwner {
        faucetAmount = amount;
    }

    // Owner-only function to set cooldown period
    function setCooldown(uint256 period) public onlyOwner {
        cooldown = period;
    }
}