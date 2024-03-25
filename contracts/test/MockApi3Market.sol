// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

contract MockApi3Market {
    function getHashValue(
        bytes32 hashType
    ) external view returns (bytes32 hashValue) {
        hashValue = 0xa40d2dcecad9e1c26887b2bb5980347b9318ac920b5795c9065feea6281ca137;
    }

    function computeExpectedSponsorWalletBalance(
        bytes32 dapiName
    ) external view returns (uint256 expectedSponsorWalletBalance) {
        expectedSponsorWalletBalance = 123456789000000000;
    }

    bytes32 public constant DAPI_MANAGEMENT_MERKLE_ROOT_HASH_TYPE =
        keccak256(abi.encodePacked("dAPI management Merkle root"));
}
