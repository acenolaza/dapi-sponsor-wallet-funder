// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@api3/contracts/api3-server-v1/interfaces/IApi3Market.sol";
import "@api3/contracts/utils/ExtendedSelfMulticall.sol";
import "@api3/contracts/vendor/@openzeppelin/contracts@4.9.5/access/Ownable.sol";
import "@api3/contracts/vendor/@openzeppelin/contracts@4.9.5/utils/cryptography/MerkleProof.sol";
import "./interfaces/IDapiSponsorWalletFunder.sol";

/// @title Contract for funding dAPI sponsor wallets
/// @notice This contract is used to fund sponsor wallets of dAPIs by fetching
/// the expected sponsor wallet balance from Api3Market contract and comparing
/// that value with the current balance of the sponsor wallet.
/// dAPI sponsor wallets are funded when a subscription is purchased but if the
/// dAPI was underpriced and the sponsor wallet balance is lower than
/// the expected amount then this contract can be used to make sure the dAPI
/// keeps getting updated based on subscription update parameters
contract DapiSponsorWalletFunder is
    Ownable,
    ExtendedSelfMulticall,
    IDapiSponsorWalletFunder
{
    /// @notice Api3Market contract address
    address public immutable api3Market;

    /// @dev Contract deployer will be set as owner
    /// @param api3Market_ Api3Market contract address
    constructor(address api3Market_) {
        require(api3Market_ != address(0), "Api3Market address zero");
        api3Market = api3Market_;
    }

    /// @dev Funds transferred to this contract can be transferred to the
    /// sponsor wallets of dAPIs by anyone or withdrawn by the owner
    receive() external payable {}

    /// @notice Called by the owner to renounce the ownership of the contract
    function renounceOwnership() public virtual override(Ownable, IOwnable) {
        super.renounceOwnership();
    }

    /// @notice Called by the owner to transfer the ownership of the contract
    /// @param newOwner New owner address
    function transferOwnership(
        address newOwner
    ) public virtual override(Ownable, IOwnable) {
        super.transferOwnership(newOwner);
    }

    /// @notice Returns the owner address
    /// @return Owner address
    function owner()
        public
        view
        virtual
        override(Ownable, IOwnable)
        returns (address)
    {
        return super.owner();
    }

    // TODO: should this function be payable in order to forward funds from sender to sponsor wallet in a single tx?
    /// @notice Called by anyone to fund a sponsor wallet for a dAPI
    /// @param dapiName dAPI name
    /// @param dataFeedId Data feed ID
    /// @param sponsorWallet Sponsor wallet address
    /// @param dapiManagementMerkleRoot dAPI management merkle tree root
    /// @param dapiManagementMerkleProof dAPI management merkle tree proof
    function fund(
        bytes32 dapiName,
        bytes32 dataFeedId,
        address payable sponsorWallet,
        bytes32 dapiManagementMerkleRoot,
        bytes32[] memory dapiManagementMerkleProof
    ) external returns (uint256 amount) {
        require(dapiName != bytes32(0), "dAPI name zero");
        require(dataFeedId != bytes32(0), "Data feed ID zero");
        require(sponsorWallet != address(0), "Sponsor wallet address zero");
        require(
            IApi3Market(api3Market).getHashValue(
                IApi3Market(api3Market).DAPI_MANAGEMENT_MERKLE_ROOT_HASH_TYPE()
            ) == dapiManagementMerkleRoot,
            "Invalid root"
        );
        require(
            MerkleProof.verify(
                dapiManagementMerkleProof,
                dapiManagementMerkleRoot,
                keccak256(
                    bytes.concat(
                        keccak256(
                            abi.encode(dapiName, dataFeedId, sponsorWallet)
                        )
                    )
                )
            ),
            "Invalid proof"
        );
        uint256 expectedBalance = IApi3Market(api3Market)
            .computeExpectedSponsorWalletBalance(dapiName);
        uint256 currentBalance = sponsorWallet.balance;
        require(currentBalance < expectedBalance, "Fund not needed");
        amount = expectedBalance - currentBalance;
        require(address(this).balance >= amount, "Insufficient balance");
        emit FundedSponsorWallet(dapiName, sponsorWallet, amount, msg.sender);
        (bool success, ) = sponsorWallet.call{value: amount}("");
        require(success, "Transfer unsuccessful");
    }

    /// @notice Called by the owner to withdraw funds
    /// @param recipient Recipient address
    /// @param amount Amount
    function withdraw(
        address payable recipient,
        uint256 amount
    ) external onlyOwner {
        require(recipient != address(0), "Recipient address zero");
        require(amount != 0, "Amount zero");
        require(amount <= address(this).balance, "Insufficient balance");
        emit Withdrew(recipient, amount, msg.sender);
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Transfer unsuccessful");
    }
}
