import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const CONTRACT_NAME="ReentranceVulnerableVault";
let description=CONTRACT_NAME;
describe(description, function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOneYearLockFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, trustedUser] = await ethers.getSigners();

  const ReentranceVulnerableVault = await ethers.getContractFactory(CONTRACT_NAME);
    const vulnerableVaultInstance = await ReentranceVulnerableVault.deploy();

    return { vulnerableVault: vulnerableVaultInstance, owner, trustedUser };
  }

  description=CONTRACT_NAME+":Deployment";
  describe(description, function () {
    it(description+":Should deploy contract properly ", async function () {
      const { vulnerableVault: vulnerableVaultInstance} = await loadFixture(deployOneYearLockFixture);

      const deployedAddress=await vulnerableVaultInstance.getAddress();
      expect(deployedAddress).to.not.equal(null);
      expect(deployedAddress).to.not.equal(undefined);
    });
  });

  description=CONTRACT_NAME+":usage";
  describe(description, function () {
    it(description+":Should withdraw by a user without attack.", async function () {
      const { vulnerableVault , trustedUser} = await loadFixture(deployOneYearLockFixture);
      const depositAmount = ethers.parseEther("10");
      const depositTx=await vulnerableVault.connect(trustedUser).deposit({value: depositAmount});
      const depositReceipt=await depositTx.wait();
      expect(depositReceipt?.status).to.equal(1);
      expect(await ethers.provider.getBalance(await vulnerableVault.getAddress())).to.equal(depositAmount);

      const withdrawTx=await vulnerableVault.connect(trustedUser).withdraw();
      const withdrawReceipt=await withdrawTx.wait();
      expect(withdrawReceipt?.status).to.equal(1);
      expect(await ethers.provider.getBalance(await vulnerableVault.getAddress())).to.equal(0n);
    });
  });
});
