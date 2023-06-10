import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const CONTRACT_NAME="ReentranceAttackContract";
describe(CONTRACT_NAME, function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOneYearLockFixture() {
    // Contracts are deployed using the first signer/account by default
    const [vaultOwner, trustedUser, thief] = await ethers.getSigners();

  const ReentranceVulnerableVault = await ethers.getContractFactory("ReentranceVulnerableVault");
    const vulnerableVaultInstance = await ReentranceVulnerableVault.deploy();
  const ReentranceAttackContract = await ethers.getContractFactory(CONTRACT_NAME);
    const attacker= await ReentranceAttackContract.connect(thief).deploy(vulnerableVaultInstance);

    return { vulnerableVault: vulnerableVaultInstance, attacker, vaultOwner, trustedUser, thief };
  }

  describe("Deployment", function () {
    it("Should deploy contracts properly", async function () {
      const { vulnerableVault: vulnerableVaultInstance, attacker} = await loadFixture(deployOneYearLockFixture);

      const vulnerableDeployedAddress=await vulnerableVaultInstance.getAddress();
      expect(vulnerableDeployedAddress).to.not.equal(null);
      expect(vulnerableDeployedAddress).to.not.equal(undefined);

      const attackerDeployedAddress=await attacker.getAddress();
      expect(attackerDeployedAddress).to.not.equal(null);
      expect(attackerDeployedAddress).to.not.equal(undefined);
    });
    
    it("Should attack contract be own by thief",async ()=>{
      const { attacker, thief } = await loadFixture(deployOneYearLockFixture);
      const contractOwner=await attacker.owner();
      // at least has 100 eth
      expect(contractOwner).to.equal(thief.address);
    });

    it("Should trustedUser have funds",async ()=>{
      const { trustedUser } = await loadFixture(deployOneYearLockFixture);
      const actualBalance=parseInt(ethers.formatEther(await ethers.provider.getBalance(trustedUser.address)));
      // at least has 100 eth
      expect(actualBalance).to.be.gte(100);
    });

    it("Should thief have funds",async ()=>{
      const { thief } = await loadFixture(deployOneYearLockFixture);
      const actualBalance=parseInt(ethers.formatEther(await ethers.provider.getBalance(thief.address)));
      // at least has 100 eth
      expect(actualBalance).to.be.gte(100);
    });

  });

  describe("Normal Vault Use", function(){
    it("Deposit",async ()=>{
      const { vulnerableVault, trustedUser } = await loadFixture(deployOneYearLockFixture);
      const trustedUserEthBalance=await ethers.provider.getBalance(trustedUser.address);
      // 20% of trustedUser eth
      const expectedBalance=trustedUserEthBalance *20n / 100n; 
      const result= await vulnerableVault.connect(trustedUser).deposit({value: expectedBalance});
      const actualVaultEth=await ethers.provider.getBalance(vulnerableVault.getAddress());
      expect(actualVaultEth).to.equal(expectedBalance);
    })
  });

  let description=CONTRACT_NAME+":Attacking vulnerableVault"
  describe(description, function(){
    it(description+":Should succeed with an attack of 100 eht ",async ()=>{
      const { vulnerableVault, attacker, trustedUser, thief } = await loadFixture(deployOneYearLockFixture);
      const trustedUserEthBalance=await ethers.provider.getBalance(trustedUser.address);
      const thiefInitialEthBalance=await ethers.provider.getBalance(thief.address);
      // 40% of trustedUser eth
      const trustedUserVaultDeposit=trustedUserEthBalance *40n / 100n; 
      const result= await vulnerableVault.connect(trustedUser).deposit({value: trustedUserVaultDeposit});
      const initialVaultEth=await ethers.provider.getBalance(vulnerableVault.getAddress());
      expect(initialVaultEth).to.equal(trustedUserVaultDeposit);

      const reentranceAmount=ethers.parseEther("100");
      const attackerResult=await attacker.connect(thief).attack({value: reentranceAmount });
      const thiefFinalEthBalance=await ethers.provider.getBalance(thief.address);
      const acceptableAttackFee=ethers.parseUnits("1","ether"); // fees
      const thiefEarnings=thiefFinalEthBalance-thiefInitialEthBalance;
      console.log("thief earnings: "+ ethers.formatEther(thiefEarnings));
      console.log("fees: "+ ethers.formatEther((initialVaultEth-thiefEarnings)*-1n))
      const finalVaultEth=await ethers.provider.getBalance(vulnerableVault.getAddress());
      console.log("initial Vault Eth: "+ ethers.formatEther(initialVaultEth));
      console.log("final Vault Eth: "+ ethers.formatEther(finalVaultEth));

      const attackerFinalEthBalance=await ethers.provider.getBalance(attacker.getAddress());
      console.log("final Attacker Eth: "+ ethers.formatEther(attackerFinalEthBalance));
      expect(thiefEarnings).to.gte(0n); // attack is made to earn eth
      expect(thiefEarnings).to.lte(initialVaultEth); // can't get more ethers than the contract has
      expect(thiefEarnings).to.gte(initialVaultEth-acceptableAttackFee); // attack fees are not calculated
    })

    it(description+":Fails after revert because the eth used as initial deposit by the attacker is to small ",async ()=>{
      const { vulnerableVault, attacker, trustedUser, thief } = await loadFixture(deployOneYearLockFixture);
      const trustedUserEthBalance=await ethers.provider.getBalance(trustedUser.address);
      const thiefInitialEthBalance=await ethers.provider.getBalance(thief.address);
      // 40% of trustedUser eth
      const trustedUserVaultDeposit=trustedUserEthBalance *40n / 100n; 
      const result= await vulnerableVault.connect(trustedUser).deposit({value: trustedUserVaultDeposit});
      const initialVaultEth=await ethers.provider.getBalance(vulnerableVault.getAddress());
      expect(initialVaultEth).to.equal(trustedUserVaultDeposit);

      const reentranceAmount=ethers.parseEther("1");
      await expect(attacker.connect(thief).attack({value: reentranceAmount })).to.be.revertedWith("Address: unable to send value, recipient may have reverted");
      
      const thiefFinalEthBalance=await ethers.provider.getBalance(thief.address);
      const acceptableAttackFee=ethers.parseUnits("1","ether"); // fees
      const thiefEarnings=thiefFinalEthBalance-thiefInitialEthBalance;
      console.log("initial thief Eth: "+ ethers.formatEther(thiefInitialEthBalance));
      console.log("thief earnings: "+ ethers.formatEther(thiefEarnings));
      const finalVaultEth=await ethers.provider.getBalance(vulnerableVault.getAddress());
      if(finalVaultEth-initialVaultEth < 0n ){
        console.log("fees: "+ ethers.formatEther((initialVaultEth-thiefEarnings)*-1n))
      }
      console.log("initial Vault Eth: "+ ethers.formatEther(initialVaultEth));
      console.log("final Vault Eth: "+ ethers.formatEther(finalVaultEth));

      const attackerFinalEthBalance=await ethers.provider.getBalance(attacker.getAddress());
      console.log("final Attacker Eth: "+ ethers.formatEther(attackerFinalEthBalance));
      expect(thiefEarnings).to.lte(0n); // attacker looses eth because of fees
      expect(finalVaultEth).to.lte(initialVaultEth); // can't get more ethers than the contract has
    })

  });

});
