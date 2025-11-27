import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, log } = hre.deployments;
  const { ethers, network } = hre;

  const cusdtDeployment = await deploy("ConfidentialUSDT", {
    from: deployer,
    log: true,
  });

  log(`ConfidentialUSDT deployed at ${cusdtDeployment.address}`);

  const swapDeployment = await deploy("ConfidentialSwap", {
    from: deployer,
    log: true,
    args: [cusdtDeployment.address, deployer],
  });

  log(`ConfidentialSwap deployed at ${swapDeployment.address}`);

  if (swapDeployment.newlyDeployed) {
    const swap = await ethers.getContractAt("ConfidentialSwap", swapDeployment.address);
    const initialBatches = network.name === "sepolia" ? 5n : 10n;

    const tx = await swap.seedLiquidity(initialBatches);
    await tx.wait();
    const mintedAmount = initialBatches * 100n * 1_000_000n;
    log(`Seeded swap with ${mintedAmount} cUSDT units via ${initialBatches.toString()} batches`);
  }
};
export default func;
func.id = "deploy_confidential_swap";
func.tags = ["ConfidentialSwap"];
