import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const CONTRACT_NAME="ReentranceAttackContract2";
describe(CONTRACT_NAME, function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOneYearLockFixture() {
    // Contracts are deployed using the first signer/account by default
    const [vaultOwner, trustedUser, thief] = await ethers.getSigners();

  const ReentranceVulnerableVault = await ethers.getContractFactory("ReentranceFixedVault2");
    const vulnerableVaultInstance = await ReentranceVulnerableVault.deploy();
  const ReentranceAttackContract = await ethers.getContractFactory(CONTRACT_NAME);
    const attacker= await ReentranceAttackContract.connect(thief).deploy(vulnerableVaultInstance);

    return { vulnerableVault: vulnerableVaultInstance, attacker, vaultOwner, trustedUser, thief };
  }

  let DeploymentDesc=CONTRACT_NAME+":Deployment"
  describe(DeploymentDesc, function () {
    it("Should deploy contracts properly", async function () {
      const { vulnerableVault: vulnerableVaultInstance, attacker} = await loadFixture(deployOneYearLockFixture);

      const vulnerableDeployedAddress=await vulnerableVaultInstance.getAddress();
      expect(vulnerableDeployedAddress).to.not.equal(null);
      expect(vulnerableDeployedAddress).to.not.equal(undefined);

      const attackerDeployedAddress=await attacker.getAddress();
      expect(attackerDeployedAddress).to.not.equal(null);
      expect(attackerDeployedAddress).to.not.equal(undefined);
    });
    
    it(DeploymentDesc+":Should attack contract be own by thief",async ()=>{
      const { attacker, thief } = await loadFixture(deployOneYearLockFixture);
      const contractOwner=await attacker.owner();
      // at least has 100 eth
      expect(contractOwner).to.equal(thief.address);
    });

    it(DeploymentDesc+":Should trustedUser have funds",async ()=>{
      const { trustedUser } = await loadFixture(deployOneYearLockFixture);
      const actualBalance=parseInt(ethers.formatEther(await ethers.provider.getBalance(trustedUser.address)));
      // at least has 100 eth
      expect(actualBalance).to.be.gte(100);
    });

    it(DeploymentDesc+":Should thief have funds",async ()=>{
      const { thief } = await loadFixture(deployOneYearLockFixture);
      const actualBalance=parseInt(ethers.formatEther(await ethers.provider.getBalance(thief.address)));
      // at least has 100 eth
      expect(actualBalance).to.be.gte(100);
    });

  });

  DeploymentDesc=CONTRACT_NAME+ ":Normal Vault usage";
  describe(DeploymentDesc, function(){
    it(DeploymentDesc+":Deposit",async ()=>{
      const { vulnerableVault, trustedUser } = await loadFixture(deployOneYearLockFixture);
      const trustedUserEthBalance=await ethers.provider.getBalance(trustedUser.address);
      // 20% of trustedUser eth
      const expectedBalance=trustedUserEthBalance *20n / 100n; 
      const result= await vulnerableVault.connect(trustedUser).deposit({value: expectedBalance});
      const actualVaultEth=await ethers.provider.getBalance(vulnerableVault.getAddress());
      expect(actualVaultEth).to.equal(expectedBalance);
    })
  });

  DeploymentDesc=CONTRACT_NAME+ ":Attacking vulnerableVault2 using transfer";
  describe(DeploymentDesc, function(){
    it(DeploymentDesc+":Should fail because run out of gas reversion",async ()=>{
      const { vulnerableVault, attacker, trustedUser, thief } = await loadFixture(deployOneYearLockFixture);
      const trustedUserEthBalance=await ethers.provider.getBalance(trustedUser.address);
      const thiefInitialEthBalance=await ethers.provider.getBalance(thief.address);
      // 40% of trustedUser eth
      const trustedUserVaultDeposit=trustedUserEthBalance *40n / 100n; 
      const result= await vulnerableVault.connect(trustedUser).deposit({value: trustedUserVaultDeposit});
      const initialVaultEth=await ethers.provider.getBalance(vulnerableVault.getAddress());
      expect(initialVaultEth).to.equal(trustedUserVaultDeposit);

      const reentranceAmount=ethers.parseEther("100");
      const attackerResult=attacker.connect(thief).attack({value: reentranceAmount });
      /* contract call run out of gas and made the transaction revert;
      *  this is because transfer limits to 2100 gas and withdraw takes ~30k gas
      */
      await expect(attackerResult).to.revertedWithoutReason(); 
      const thiefFinalEthBalance=await ethers.provider.getBalance(thief.address);
      const acceptableAttackFee=ethers.parseUnits("1","ether"); // fees
      const thiefEarnings=thiefFinalEthBalance-thiefInitialEthBalance;
      console.log("thief earnings: "+ ethers.formatEther(thiefEarnings));
      const finalVaultEth=await ethers.provider.getBalance(vulnerableVault.getAddress());
      console.log("initial Vault Eth: "+ ethers.formatEther(initialVaultEth));
      console.log("final Vault Eth: "+ ethers.formatEther(finalVaultEth));

      const attackerFinalEthBalance=await ethers.provider.getBalance(attacker.getAddress());
      console.log("final Attacker Eth: "+ ethers.formatEther(attackerFinalEthBalance));
      expect(thiefEarnings).to.lte(0n); // attack is made to earn eth
    })

  });

});
