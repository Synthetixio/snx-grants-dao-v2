//SPDX-License-Identifier: Unlicense
pragma solidity ^0.5.16;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";

contract GrantsDAOV2 is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    uint256 public grantsCount;
    uint256 public initiativesCount;
    uint256 public competitionCount;

    mapping(string => Grant) public grants;
    mapping(string => Initiative) public initiatives;
    mapping(string => Competition) public competitions;

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
     * @notice The enum for the possible states that a competition can be in
     * ACTIVE - when the competition is initially created on the contract
     * COMPLETED - when a competition has been concluded successfully
     * CANCELLED - when a competition fails to be completed
     */
    enum CompetitionState {ACTIVE, COMPLETED, CANCELLED}

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
     * @notice A struct representing a competition or hackathon bounty
     */
    struct Competition {
        string competitionHash;
        string title;
        string description;
        address paymentCurrency;
        uint256 totalBounty;
        uint256[] placeAmounts;
        uint256 createdAt;
        uint256 modifiedAt;
        CompetitionState state;
    }

    /**
     * @notice Event emitted when a new grant is created
     */
    event NewGrant(string indexed grantHash, string proposer, address receivingAddress);

    /**
     * @notice Event emitted when a new grant is created
     */
    event NewInitiative(string indexed initiativeHash);

    /**
     * @notice Event emitted when a new competition is created
     */
    event NewCompetition(string indexed competitionHash);

    /**
     * @notice Event emitted when an initiative is assigned
     */
    event InitiativeAssigned(string indexed initiativeHash, address assignee);

    /**
     * @notice Event emitted when an grant is re-assigned
     */
    event GrantReassigned(string indexed grantHash, address assignee);

    /**
     * @notice Event emitted when a grant milestone is paid
     */
    event GrantMilestoneReleased(string indexed grantHash, uint256 amount, address receiver, address paymentCurrency);

    /**
     * @notice Event emitted when an initiative milestone is paid
     */
    event InitiativeMilestoneReleased(
        string indexed initiativeHash,
        uint256 amount,
        address receiver,
        address paymentCurrency
    );

    /**
     * @notice Event emitted when an grant is completed
     */
    event GrantCompleted(string indexed grantHash);

    /**
     * @notice Event emitted when an initiative is completed
     */
    event InitiativeCompleted(string indexed initiativeHash);

    /**
     * @notice Event emitted when an competition is completed
     */
    event CompetitionCompleted(string indexed competitionHash);

    /**
     * @notice Event emitted when an grant is cancelled
     */
    event GrantCancelled(string indexed grantHash, string reason);

    /**
     * @notice Event emitted when an initiative is cancelled
     */
    event InitiativeCancelled(string indexed initiativeHash, string reason);

    /**
     * @notice Event emitted when an competition is cancelled
     */
    event CompetitionCancelled(string indexed competitionHash, string reason);

    /**
     * @notice Event emitted when a withdrawal from the contract occurs
     */
    event Withdrawal(address indexed receiver, uint256 amount, address token);

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
        require(grants[_grantHash].createdAt == 0, "duplicate grants hash");

        grants[_grantHash] = Grant(
            _grantHash,
            _title,
            _description,
            _milestones,
            _paymentCurrency,
            _proposer,
            _receivingAddress,
            0,
            block.timestamp,
            block.timestamp,
            GrantState.ACTIVE
        );

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
     */
    function createInitiative(
        string memory _initiativeHash,
        string memory _title,
        string memory _description,
        uint256[] memory _milestones,
        address _paymentCurrency
    ) public onlyOwner() {
        require(initiatives[_initiativeHash].createdAt == 0, "duplicate initiatives hash");

        initiatives[_initiativeHash] = Initiative(
            _initiativeHash,
            _title,
            _description,
            _milestones,
            _paymentCurrency,
            address(0),
            0,
            block.timestamp,
            block.timestamp,
            InitiativeState.OPEN
        );

        initiativesCount += 1;

        emit NewInitiative(_initiativeHash);
    }

    /**
     * @notice Called by the owners (gDAO multisig) to create a new competition
     * Emits NewCompetition event.
     * @param _competitionHash The ipfs hash of an competition, if passed through ipfs should return the content of this initiative
     * @param _title The title of the initiative
     * @param _description The description of the initiative
     * @param _paymentCurrency The currency that the bounty is to be paid in
     * @param _totalBounty The total bounty amount allocated to this competition
     * @param _placeAmounts The amounts rewarded for each place, where index [0,1,2] represents 1st, 2nd, 3rd place and so on
     */
    function createCompetition(
        string memory _competitionHash,
        string memory _title,
        string memory _description,
        address _paymentCurrency,
        uint256 _totalBounty,
        uint256[] memory _placeAmounts
    ) public onlyOwner() {
        require(competitions[_competitionHash].createdAt == 0, "duplicate competition hash");

        competitions[_competitionHash] = Competition(
            _competitionHash,
            _title,
            _description,
            _paymentCurrency,
            _totalBounty,
            _placeAmounts,
            block.timestamp,
            block.timestamp,
            CompetitionState.ACTIVE
        );
        competitionCount += 1;
        emit NewCompetition(_competitionHash);
    }

    /**
     * @notice Called by the owners (gDAO multisig) to assign a initiative to a payable address
     * Emits InitiativeAssigned event.
     * @param _hash The hash of the initiative to modify
     * @param _assignee An address to assign the initiative to
     */
    function assignInitiative(string memory _hash, address _assignee) public onlyOwner() {
        Initiative storage initiative = initiatives[_hash];

        initiative.state = InitiativeState.ASSIGNED;

        initiative.receivingAddress = _assignee;

        emit InitiativeAssigned(_hash, _assignee);
    }

    /**
     * @notice Called by the owners (gDAO multisig) to assign a initiative to a payable address
     * Emits InitiativeAssigned event.
     * @param _hash The hash of the initiative to modify
     * @param _assignee An address to assign the initiative to
     */
    function reassignGrant(string memory _hash, address _assignee) public onlyOwner() {
        grants[_hash].receivingAddress = _assignee;

        emit GrantReassigned(_hash, _assignee);
    }

    /**
     * @notice Called by the owners (gDAO multisig) to release a milestone payment on a grant
     * Emits GrantMilestoneReleased event or GrantCompleted
     * @param _hash The hash of the grant to release payment for
     */
    function progressGrant(string memory _hash) public onlyOwner() {
        Grant storage grant = grants[_hash];

        require(grant.state == GrantState.ACTIVE, "grant is not active");

        uint256 currentMilestone = grant.currentMilestone;

        // If the current milestone is the last one, mark the grant as completed
        if (currentMilestone == grant.milestones.length - 1) {
            grant.state = GrantState.COMPLETED;
            emit GrantCompleted(_hash);
        } else {
            grant.currentMilestone += 1;
        }

        grant.modifiedAt = block.timestamp;

        _transferMilestonePayment(grant.milestones[currentMilestone], grant.paymentCurrency, grant.receivingAddress);

        emit GrantMilestoneReleased(
            _hash,
            grant.milestones[currentMilestone],
            grant.receivingAddress,
            grant.paymentCurrency
        );
    }

    /**
     * @notice Called by the owners (gDAO multisig) to release a milestone payment on an initiative
     * Emits InitiativeMilestoneReleased event or InitiativeCompleted
     * @param _hash The hash of the grant to release payment for
     */
    function progressInitiative(string memory _hash) public onlyOwner() {
        Initiative storage initiative = initiatives[_hash];

        require(initiative.state == InitiativeState.ASSIGNED, "initiative has not been assigned");

        uint256 currentMilestone = initiative.currentMilestone;

        // If the current milestone is the last one, mark the initiative as completed
        if (currentMilestone == initiative.milestones.length - 1) {
            initiative.state = InitiativeState.COMPLETED;
            emit InitiativeCompleted(_hash);
        } else {
            initiative.currentMilestone += 1;
        }

        initiative.modifiedAt = block.timestamp;

        _transferMilestonePayment(
            initiative.milestones[currentMilestone],
            initiative.paymentCurrency,
            initiative.receivingAddress
        );

        emit InitiativeMilestoneReleased(
            _hash,
            initiative.milestones[currentMilestone],
            initiative.receivingAddress,
            initiative.paymentCurrency
        );
    }

    /**
     * @notice Called by the owners (gDAO multisig) to release all payments on an grant
     * Emits GrantCompleted
     * @param _hash The hash of the grant to release all payments
     */
    function completeGrant(string memory _hash) public onlyOwner() {
        Grant storage grant = grants[_hash];

        require(grant.state == GrantState.ACTIVE, "grant is not active");

        uint256 currentMilestone = grant.currentMilestone;

        uint256 total;

        for (uint256 i = currentMilestone; i < grant.milestones.length; i++) {
            total += grant.milestones[i];
            emit GrantMilestoneReleased(_hash, grant.milestones[i], grant.receivingAddress, grant.paymentCurrency);
        }

        grant.currentMilestone = grant.milestones.length - 1;

        grant.state = GrantState.COMPLETED;

        grant.modifiedAt = block.timestamp;

        _transferMilestonePayment(total, grant.paymentCurrency, grant.receivingAddress);

        emit GrantCompleted(_hash);
    }

    /**
     * @notice Called by the owners (gDAO multisig) to release a milestone payment on an initiative
     * Emits InitiativeCompleted
     * @param _hash The hash of the initiative to release all payments
     */
    function completeInitiative(string memory _hash) public onlyOwner() {
        Initiative storage initiative = initiatives[_hash];

        require(initiative.state == InitiativeState.ASSIGNED, "initiative has not been assigned");

        uint256 currentMilestone = initiative.currentMilestone;

        uint256 total;

        for (uint256 i = currentMilestone; i < initiative.milestones.length; i++) {
            total += initiative.milestones[i];
            emit InitiativeMilestoneReleased(
                _hash,
                initiative.milestones[i],
                initiative.receivingAddress,
                initiative.paymentCurrency
            );
        }

        initiative.currentMilestone = initiative.milestones.length - 1;

        initiative.state = InitiativeState.COMPLETED;

        initiative.modifiedAt = block.timestamp;

        _transferMilestonePayment(total, initiative.paymentCurrency, initiative.receivingAddress);

        emit InitiativeCompleted(_hash);
    }

    /**
     * @notice Called by the owners (gDAO multisig) to pay out the places of a competition
     * Emits CompetitionCompleted
     * @param _hash The hash of the competition to release payments for
     * @param _winners An array of addresses specifying the winners from (1st...Nth)
     */
    function completeCompetition(string memory _hash, address[] memory _winners) public onlyOwner() {
        Competition storage competition = competitions[_hash];
        IERC20 token = IERC20(competition.paymentCurrency);
        require(_winners.length == competition.placeAmounts.length, "winners length invalid");
        require(competition.state == CompetitionState.ACTIVE, "competition is not active");
        require(token.balanceOf(address(this)) >= competition.totalBounty, "insufficient balance");

        for (uint256 i = 0; i < competition.placeAmounts.length; i++) {
            _transferMilestonePayment(competition.placeAmounts[i], competition.paymentCurrency, _winners[i]);
        }

        competition.state = CompetitionState.COMPLETED;

        emit CompetitionCompleted(_hash);
    }

    /**
     * @notice Called by the owners (gDAO multisig) to cancel a grant
     * Emits GrantCancelled
     * @param _hash The hash of the grant to cancel
     * @param _reason The reason why the grant was cancelled
     */
    function cancelGrant(string memory _hash, string memory _reason) public onlyOwner() {
        Grant storage grant = grants[_hash];

        grant.state = GrantState.CANCELLED;

        grant.modifiedAt = block.timestamp;

        emit GrantCancelled(_hash, _reason);
    }

    /**
     * @notice Called by the owners (gDAO multisig) to cancel a initiative
     * Emits InitiativeCancelled
     * @param _hash The hash of the initiative to cancel
     * @param _reason The reason why the initiative was cancelled
     */
    function cancelInitiative(string memory _hash, string memory _reason) public onlyOwner() {
        Initiative storage initiative = initiatives[_hash];

        initiative.state = InitiativeState.CANCELLED;

        initiative.modifiedAt = block.timestamp;

        emit InitiativeCancelled(_hash, _reason);
    }

    /**
     * @notice Called by the owners (gDAO multisig) to cancel a competition
     * Emits CompetitionCancelled
     * @param _hash The hash of the initiative to cancel
     * @param _reason The reason why the initiative was cancelled
     */
    function cancelCompetition(string memory _hash, string memory _reason) public onlyOwner() {
        Competition storage competition = competitions[_hash];

        competition.state = CompetitionState.CANCELLED;

        competition.modifiedAt = block.timestamp;

        emit CompetitionCancelled(_hash, _reason);
    }

    /**
     * @notice Called by the owners (gDAO multisig) to withdraw any ERC20 deposited in this account
     * Emits Withdrawal
     * @param _receiver The hash of the initiative to release all payments
     * @param _amount The amount of specified erc20 to withdraw
     * @param _token The hash of the initiative to release all payments
     */
    function withdraw(
        address _receiver,
        uint256 _amount,
        address _token
    ) public onlyOwner() {
        IERC20 token = IERC20(_token);

        require(token.balanceOf(address(this)) >= _amount, "insufficient balance");

        token.safeTransfer(_receiver, _amount);

        emit Withdrawal(_receiver, _amount, _token);
    }

    /**
     * @notice An internal function that handles the transfer of funds from the contract to the payable address
     * @param _milestoneAmount The amount to transfer
     * @param _paymentCurrency The ERC20 address of token to transfer
     * @param _receiver The address of the receiver
     */
    function _transferMilestonePayment(
        uint256 _milestoneAmount,
        address _paymentCurrency,
        address _receiver
    ) internal {
        IERC20 token = IERC20(_paymentCurrency);

        require(token.balanceOf(address(this)) >= _milestoneAmount, "insufficient balance");

        token.safeTransfer(_receiver, _milestoneAmount);
    }
}
