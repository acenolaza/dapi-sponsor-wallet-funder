// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

contract MockSponsorWallet {
    bytes32 balanceReceived;

    receive() external payable {
        // Fail if tx was not initiated by randomPerson
        assert(tx.origin == 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC);
    }
}
