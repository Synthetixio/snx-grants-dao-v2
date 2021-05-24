//SPDX-License-Identifier: Unlicense
pragma solidity ^0.5.16;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(address gDAOContract, uint256 amountToMint) public {
        _mint(gDAOContract, amountToMint);
    }
}
