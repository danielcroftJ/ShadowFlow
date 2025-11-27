// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ConfidentialUSDT} from "./ConfidentialUSDT.sol";
import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ConfidentialSwap
/// @notice Swaps ETH for cUSDT at a fixed 1 ETH = 4000 cUSDT rate while preserving encrypted balances
contract ConfidentialSwap is Ownable, ReentrancyGuard, ZamaEthereumConfig {
    ConfidentialUSDT public immutable cusdt;

    uint256 private constant TOKEN_DECIMALS = 1_000_000;
    uint256 public constant SWAP_RATE = 4000;
    uint256 private constant MINT_UNIT = 100 * TOKEN_DECIMALS;
    uint256 public constant MAX_MINT_BATCH = 5;

    uint256 private _mintedLiquidity;
    uint256 private _distributedLiquidity;

    event LiquiditySeeded(uint256 mintedAmount, uint256 totalAvailable);
    event SwapExecuted(address indexed account, uint256 ethInput, uint256 tokenOutput);
    event EthWithdrawn(address indexed recipient, uint256 amount);

    constructor(address cusdtAddress, address initialOwner) Ownable(initialOwner) {
        require(cusdtAddress != address(0), "Invalid token");
        cusdt = ConfidentialUSDT(cusdtAddress);
    }

    /// @notice Swap ETH for cUSDT using the fixed rate
    /// @return transferred encrypted amount handle returned by the cUSDT contract
    function swap() external payable nonReentrant returns (euint64 transferred) {
        require(msg.value > 0, "Zero ETH");
        uint256 tokenAmount = quote(msg.value);
        require(tokenAmount > 0, "Amount too small");
        require(tokenAmount <= type(uint64).max, "Amount too big");
        require(_availableLiquidity() >= tokenAmount, "Insufficient liquidity");

        _distributedLiquidity += tokenAmount;
        euint64 encryptedAmount = FHE.asEuint64(uint64(tokenAmount));
        FHE.allow(encryptedAmount, address(cusdt));
        transferred = cusdt.confidentialTransfer(msg.sender, encryptedAmount);

        emit SwapExecuted(msg.sender, msg.value, tokenAmount);
    }

    /// @notice Seed liquidity by minting cUSDT directly into the swap contract
    /// @param batches Number of mint operations to execute (each equals 100 cUSDT)
    function seedLiquidity(uint256 batches) external onlyOwner returns (uint256 mintedAmount) {
        require(batches > 0, "Zero amount");
        require(batches <= MAX_MINT_BATCH, "Batch too large");
        mintedAmount = batches * MINT_UNIT;

        for (uint256 i = 0; i < batches; i++) {
            cusdt.mint(address(this));
        }

        _mintedLiquidity += mintedAmount;
        emit LiquiditySeeded(mintedAmount, _availableLiquidity());
    }

    /// @notice Withdraw collected ETH fees
    function withdrawEth(address payable recipient, uint256 amount) external onlyOwner nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        uint256 value = amount == 0 ? address(this).balance : amount;
        require(value <= address(this).balance, "Insufficient balance");

        (bool success, ) = recipient.call{value: value}("");
        require(success, "Transfer failed");

        emit EthWithdrawn(recipient, value);
    }

    /// @notice Amount of cUSDT obtainable for a given ETH input
    function quote(uint256 ethAmount) public pure returns (uint256) {
        return (ethAmount * SWAP_RATE * TOKEN_DECIMALS) / 1 ether;
    }

    /// @return Amount of liquidity currently available for swaps
    function availableLiquidity() external view returns (uint256) {
        return _availableLiquidity();
    }

    /// @return Total minted liquidity (6 decimal format)
    function mintedLiquidity() external view returns (uint256) {
        return _mintedLiquidity;
    }

    /// @return Total amount of tokens delivered to users (6 decimal format)
    function distributedLiquidity() external view returns (uint256) {
        return _distributedLiquidity;
    }

    /// @return Minimum mint increment enforced by the cUSDT contract
    function mintUnit() external pure returns (uint256) {
        return MINT_UNIT;
    }

    /// @return Token decimals helper (cUSDT uses 6 decimals)
    function tokenDecimals() external pure returns (uint256) {
        return TOKEN_DECIMALS;
    }

    function _availableLiquidity() internal view returns (uint256) {
        if (_mintedLiquidity <= _distributedLiquidity) {
            return 0;
        }
        return _mintedLiquidity - _distributedLiquidity;
    }

    receive() external payable {
        revert("Use swap");
    }
}
