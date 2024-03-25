// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@api3/contracts/access/interfaces/IOwnable.sol";
import "@api3/contracts/utils/interfaces/IExtendedSelfMulticall.sol";

interface IDapiSponsorWalletFunder is IOwnable, IExtendedSelfMulticall {
    event Withdrew(address indexed recipient, uint256 amount, address sender);
    event FundedSponsorWallet(
        bytes32 indexed dapiName,
        address indexed sponsorWallet,
        uint256 amount,
        address sender
    );

    function fund(
        bytes32 dapiName,
        bytes32 dataFeedId,
        address payable sponsorWallet,
        bytes32 dapiManagementMerkleRoot,
        bytes32[] memory dapiManagementMerkleProof
    ) external returns (uint256 amount);

    function withdraw(address payable recipient, uint256 amount) external;

    function api3Market() external view returns (address);
}
