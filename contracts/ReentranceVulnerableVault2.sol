// SPDX-License-Identifier: MIT
pragma solidity >=0.8.10 <0.9.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "hardhat/console.sol";

contract ReentranceVulnerableVault2 {
    using Address for address payable;

    // keeps track of all savings account balances
    mapping(address => uint) public balances;

    // deposit funds into the sender's account
    function deposit() external payable {
        console.log("New Deposit");
        balances[msg.sender] += msg.value;
        console.log("Attacker vault token balance: ", balances[msg.sender]);
        console.log("Attacker eth balance: ", address(msg.sender).balance);
    }

    // withdraw all funds from the user's account
    function withdraw() external {
        require(balances[msg.sender] > 0, "Withdrawl amount exceeds available balance.");
        
        console.log("");
        console.log("ReentranceVulnerableContract eth balance: ", address(this).balance);
        console.log("Attacker vault token balance: ", balances[msg.sender]);
        console.log("Attacker eth balance: ", address(msg.sender).balance);
        console.log("");

        // balances[msg.sender] = 0; // this line avoides reentrance
        payable(msg.sender).transfer(balances[msg.sender]); 
        // payable(msg.sender).sendValue(balances[msg.sender]);
        balances[msg.sender] = 0; // this line allowes the reentrance
    }

    // check the total balance of the EtherBank contract
    function getBalance() external view returns (uint) {
        return address(this).balance;
    }
    
}
