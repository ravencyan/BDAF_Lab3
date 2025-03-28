const { ethers } = require("hardhat");
const { expect } = require("chai");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Zircuit deployer is ${deployer.address}`);
  //let nonce = await ethers.provider.getTransactionCount(owner.address, "latest");
  let tx;

  //Step1: Deploy factory contract
  const Factory = await ethers.getContractFactory("Factory");
  const factory = await Factory.deploy(); //Different from deploy function in the contract
  await factory.waitForDeployment();
  console.log(`Factory deployed at: ${factory.target}`); 

  //Precompute address for later deployment
  const salt = ethers.encodeBytes32String("my_salt");
  //const bytecode = (await ethers.getContractFactory("WithdrawContract")).bytecode;
  const precomputedAddress = await factory.computeAddress(salt, deployer.address);
  console.log(`Precomputed address: ${precomputedAddress}`);

  //Deploy an ERC20 token
  const ERC20Token = await ethers.getContractFactory("ERC20Token");
  const token = await ERC20Token.deploy(ethers.parseUnits("1000000", 18));
  await token.waitForDeployment();
  console.log(`ERC20 Token deployed at: ${token.target}`);

  //Step2: Send ERC20 tokens to the precomputed address
  const amount = ethers.parseUnits("100", 18);
  await sendTokens(token.target, precomputedAddress, amount);
  console.log(`${ethers.formatUnits(amount, 18)} tokens were sent to ${precomputedAddress}`);

  //Step3: Deploy the WithdrawContract 
  await expect(factory.deploy(salt, deployer.address))
    .to.emit(factory, "ContractDeployed")
    .withArgs(precomputedAddress);
  

  const balanceBefore = await token.balanceOf(precomputedAddress);
  console.log(`Balance before withdrawal: ${ethers.formatUnits(balanceBefore, 18)}`);
  const deployerBalanceBefore = await token.balanceOf(deployer.address);
  console.log(`Deployer balance before: ${ethers.formatUnits(deployerBalanceBefore, 18)}`);
  //Step4: Withdraw the tokens 
  await withdrawTokens(deployer, precomputedAddress, token.target, amount);
  console.log(`${ethers.formatUnits(amount, 18)} tokens were withdrawn to ${deployer.address}`);
  const balanceAfter = await token.balanceOf(precomputedAddress);
  console.log(`Balance after withdrawal: ${ethers.formatUnits(balanceAfter, 18)}`);
  const deployerBalanceAfter = await token.balanceOf(deployer.address);
  console.log(`Deployer balance after: ${ethers.formatUnits(deployerBalanceAfter, 18)}`);
} 
  
async function sendTokens(tokenAddress, toAddress, amount) {
  const token = await ethers.getContractAt("IERC20", tokenAddress);
  tx = await token.transfer(toAddress, amount);
  const receipt = await tx.wait();
}

async function withdrawTokens(owner, withdrawContractAddress, tokenAddress, amount) {
  const withdrawContract = await ethers.getContractAt("WithdrawContract", withdrawContractAddress, owner); 
  const code = await ethers.provider.getCode(withdrawContractAddress);
  if (code === "0x") {
    console.error("Contract not deployed at this address!");
  } else {
    console.log("Contract deployed at the specified address.");
  }
  tx = await withdrawContract.withdraw(tokenAddress, amount);
  const receipt = await tx.wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
  