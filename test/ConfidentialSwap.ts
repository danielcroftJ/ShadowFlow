import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ConfidentialUSDT, ConfidentialUSDT__factory, ConfidentialSwap, ConfidentialSwap__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";

const RATE = 4000n;
const TOKEN_DECIMALS = 1_000_000n;
const BATCH_SIZE = 5n;
const TOKENS_PER_MINT = 100n * TOKEN_DECIMALS;

async function deployContracts() {
  const cusdtFactory = (await ethers.getContractFactory("ConfidentialUSDT")) as ConfidentialUSDT__factory;
  const cusdt = (await cusdtFactory.deploy()) as ConfidentialUSDT;
  const cusdtAddress = await cusdt.getAddress();

  const swapFactory = (await ethers.getContractFactory("ConfidentialSwap")) as ConfidentialSwap__factory;
  const swap = (await swapFactory.deploy(cusdtAddress, (await ethers.getSigners())[0].address)) as ConfidentialSwap;
  const swapAddress = await swap.getAddress();

  return { cusdt, cusdtAddress, swap, swapAddress };
}

describe("ConfidentialSwap", function () {
  let deployer: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let cusdt: ConfidentialUSDT;
  let cusdtAddress: string;
  let swap: ConfidentialSwap;

  before(async function () {
    [deployer, alice] = await ethers.getSigners();
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      this.skip();
    }

    ({ cusdt, cusdtAddress, swap } = await deployContracts());
  });

  async function seedMultiple(batches: bigint, times: number) {
    for (let i = 0; i < times; i++) {
      const tx = await swap.connect(deployer).seedLiquidity(batches);
      await tx.wait();
    }
  }

  it("swaps ETH for cUSDT using the fixed rate", async function () {
    const repetitions = 10;
    await seedMultiple(BATCH_SIZE, repetitions);
    const liquidityTarget = BigInt(repetitions) * BATCH_SIZE * TOKENS_PER_MINT;

    const ethIn = ethers.parseEther("1");
    const expectedTokens = (ethIn * RATE * TOKEN_DECIMALS) / ethers.WeiPerEther;

    await swap.connect(alice).swap({ value: ethIn });

    const encryptedBalance = await cusdt.confidentialBalanceOf(alice.address);
    const clearBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      cusdtAddress,
      alice,
    );

    expect(clearBalance).to.equal(expectedTokens);
    const available = await swap.availableLiquidity();
    expect(available).to.equal(liquidityTarget - expectedTokens);
  });

  it("reverts when liquidity is exhausted", async function () {
    await seedMultiple(1n, 1);
    await expect(swap.connect(alice).swap({ value: ethers.parseEther("1") })).to.be.revertedWith("Insufficient liquidity");
  });

  it("exposes helper views", async function () {
    const result = await swap.quote(ethers.parseEther("2"));
    expect(result).to.equal(2n * RATE * TOKEN_DECIMALS);

    await seedMultiple(2n, 1);
    expect(await swap.mintUnit()).to.equal(TOKENS_PER_MINT);
    expect(await swap.tokenDecimals()).to.equal(TOKEN_DECIMALS);
    expect(await swap.mintedLiquidity()).to.equal(2n * TOKENS_PER_MINT);
  });
});
