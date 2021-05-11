//SPDX-License-Identifier: Unlicense
pragma solidity ^0.5.16;

import "hardhat/console.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/introspection/ERC165.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";

contract GrantsDAOV2 is Ownable, ERC165 {
    using SafeMath for uint;
    using SafeERC20 for IERC20;

    uint256 public grantsCount;
    uint256 public initiativesCount;

    mapping(string => Grant) public grants;
    mapping(string => Initiative) public initiatives;

    /**
     * @notice The enum for the possible states that a grant can be in
     * ACTIVE - when the grant is initially created on the contract
     * COMPLETED - when all the milestones are paid out
     * CANCELLED - when a grant fails to reach all milestone payments
     */
    enum GrantState {ACTIVE, COMPLETED, CANCELLED}

    /**
     * @notice The enum for the possible states that a grant can be in
     * OPEN - when an initiative is open for someone to take up
     * ASSIGNED - when an initiative is assigned to someone
     * COMPLETED -  when all the milestones are paid out
     * CANCELLED - when a initiative fails to reach all milestone payments
     */
    enum InitiativeState {OPEN, ASSIGNED, COMPLETED, CANCELLED}

    /**
     * @notice A struct representing a grant
     */
    struct Grant {
        string grantHash;
        string title;
        string description;
        uint256[] milestones;
        address paymentCurrency;
        string proposer;
        address receivingAddress;
        uint256 currentMilestone;
        uint256 createdAt;
        uint256 modifiedAt;
        GrantState state;
    }

    /**
     * @notice A struct representing a initiative
     */
    struct Initiative {
        string initiativeHash;
        string title;
        string description;
        uint256[] milestones;
        address paymentCurrency;
        address receivingAddress;
        uint256 currentMilestone;
        uint256 createdAt;
        uint256 modifiedAt;
        InitiativeState state;
    }

    /**
     * @notice Event emitted when a new grant is created
     */
    event NewGrant(string grantHash, string proposer, address receivingAddress);

    /**
     * @notice Event emitted when a new grant is created
     */
    event NewInitiative(string initiativeHash);

    /**
     * @notice Contract is created by a deployer who then sets the grantsDAO multisig to be the owner
     */
    constructor() public {}

    /**
     * @notice Called by the owners (gDAO multisig) to create a new grant
     * Emits NewGrant event.
     * @param _grantHash The ipfs hash of a grant (retrieved from the snapshot proposal)
     * @param _title The title of the grant
     * @param _description The description of the grant
     * @param _milestones An array specifying the number of milestones and the respective payment amounts
     * @param _paymentCurrency An address specifying the ERC20 token to be paid in
     * @param _proposer The identifier of the proposer
     * @param _receivingAddress The address in which to receive the grant milestones in
     */
    function createGrant(
        string memory _grantHash,
        string memory _title,
        string memory _description,
        uint256[] memory _milestones,
        address _paymentCurrency,
        string memory _proposer,
        address _receivingAddress
    ) public onlyOwner() {
        Grant memory newGrant =
            Grant(
                _grantHash,
                _title,
                _description,
                _milestones,
                _paymentCurrency,
                _proposer,
                _receivingAddress,
                0,
                now,
                now,
                GrantState.ACTIVE
            );

        grants[_grantHash] = newGrant;

        grantsCount += 1;

        emit NewGrant(_grantHash, _proposer, _receivingAddress);
    }

    /**
     * @notice Called by the owners (gDAO multisig) to create a new initiative
     * Emits NewInitiative event.
     * @param _initiativeHash The ipfs hash of an initiatve, if passed through ipfs should return the content of this initiative
     * @param _title The title of the initiative
     * @param _description The description of the initiative
     * @param _milestones An array specifying the number of milestones and the respective payment amounts
     * @return The initiative id
     */
    function createInitiative(
        string memory _initiativeHash,
        string memory _title,
        string memory _description,
        uint256[] memory _milestones,
        address _paymentCurrency
    ) public onlyOwner() {
        Initiative memory newInitiative =
            Initiative(
                _initiativeHash,
                _title,
                _description,
                _milestones,
                _paymentCurrency,
                address(0),
                0,
                now,
                now,
                InitiativeState.OPEN
            );

        initiatives[_initiativeHash] = newInitiative;

        initiativesCount += 1;

        emit NewInitiative(_initiativeHash);
    }
}
