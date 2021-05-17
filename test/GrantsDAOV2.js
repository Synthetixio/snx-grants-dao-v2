const { expect } = require('chai');

describe('GrantsDAOV2', function () {
	let MockERC20;
	let mockERC20;
	let startingBalance;

	let GrantsDAOV2;
	let gDAOV2;
	let owner;
	let receivingAddress;
	let addrs;

	let grantHash;
	let title;
	let description;
	let milestones;
	let paymentCurrency;
	let proposer;

	let milestoneOne;
	let milestoneTwo;
	let milestoneThree;
	let milestoneFour;

	let initiativeHash;

	beforeEach(async () => {
		grantHash = 'QWERTY';
		title = 'Rebuild the whole Synthetix Protocol';
		description =
			"This proposal is to rebuild the whole Synthetix Protocol under CZ's new paradigm - Binance Smart Chain";

		milestoneOne = 250;
		milestoneTwo = 500;
		milestoneThree = 100;
		milestoneFour = 2000;

		startingBalance = 100000;

		milestones = [milestoneOne, milestoneTwo, milestoneThree, milestoneFour];
		proposer = 'Danijel';

		GrantsDAOV2 = await ethers.getContractFactory('GrantsDAOV2');
		[owner, maliciousAddress, receivingAddress, ...addrs] = await ethers.getSigners();
		gDAOV2 = await GrantsDAOV2.deploy();

		MockERC20 = await ethers.getContractFactory('MockERC20');

		mockERC20 = await MockERC20.deploy(gDAOV2.address, startingBalance);

		paymentCurrency = mockERC20.address;

		initiativeHash = 'UIOP';
	});

	describe('when creating grants', () => {
		describe('when called by non-owner', () => {
			it('should fail', async () => {
				await expect(
					gDAOV2
						.connect(maliciousAddress)
						.createGrant(
							grantHash,
							title,
							description,
							milestones,
							paymentCurrency,
							proposer,
							receivingAddress.address
						)
				).to.be.revertedWith('caller is not the owner');
			});
		});

		describe('when called by owner', () => {
			it('should successfully emit an event', async () => {
				await expect(
					gDAOV2
						.connect(owner)
						.createGrant(
							grantHash,
							title,
							description,
							milestones,
							paymentCurrency,
							proposer,
							receivingAddress.address
						)
				)
					.to.emit(gDAOV2, 'NewGrant')
					.withArgs(grantHash, proposer, receivingAddress.address);
			});

			it('should successfully create a grant in state', async () => {
				await gDAOV2
					.connect(owner)
					.createGrant(
						grantHash,
						title,
						description,
						milestones,
						paymentCurrency,
						proposer,
						receivingAddress.address
					);

				const grant = await gDAOV2.grants(grantHash);
				const grantsCount = await gDAOV2.grantsCount();

				expect(grant.grantHash).to.equal(grantHash);
				expect(grantsCount).to.equal(1);
			});
		});
	});

	describe('when creating an initiative', () => {
		describe('when called by non-owner', () => {
			it('should fail', async () => {
				await expect(
					gDAOV2
						.connect(maliciousAddress)
						.createInitiative(initiativeHash, title, description, milestones, paymentCurrency)
				).to.be.revertedWith('caller is not the owner');
			});
		});

		describe('when called by owner', () => {
			it('should successfully emit an event', async () => {
				await expect(
					gDAOV2
						.connect(owner)
						.createInitiative(initiativeHash, title, description, milestones, paymentCurrency)
				)
					.to.emit(gDAOV2, 'NewInitiative')
					.withArgs(initiativeHash);
			});

			it('should successfully create a initiative in state', async () => {
				await gDAOV2
					.connect(owner)
					.createInitiative(initiativeHash, title, description, milestones, paymentCurrency);

				const initative = await gDAOV2.initiatives(initiativeHash);
				const initiativesCount = await gDAOV2.initiativesCount();

				expect(initative.initiativeHash).to.equal(initiativeHash);
				expect(initiativesCount).to.equal(1);
			});
		});
	});

	describe('when managing grants', () => {
		let grant;

		beforeEach(async () => {
			await gDAOV2.createGrant(
				grantHash,
				title,
				description,
				milestones,
				paymentCurrency,
				proposer,
				receivingAddress.address
			);

			grant = await gDAOV2.grants(grantHash);
		});

		it('should fail if non-owner attempts to release payment', async () => {
			await expect(gDAOV2.connect(maliciousAddress).progressGrant(grantHash)).to.revertedWith(
				'caller is not the owner'
			);
		});

		it('should successfully release the first milestone', async () => {
			await expect(gDAOV2.progressGrant(grantHash))
				.to.emit(gDAOV2, 'GrantMilestoneReleased')
				.withArgs(grantHash, milestoneOne, receivingAddress.address, mockERC20.address);

			grant = await gDAOV2.grants(grantHash);

			expect(grant.currentMilestone).to.equal(1);
			expect(await mockERC20.balanceOf(gDAOV2.address)).to.equal(startingBalance - milestoneOne);
			expect(await mockERC20.balanceOf(receivingAddress.address)).to.equal(milestoneOne);
		});

		it('should successfully release the second milestone', async () => {
			await gDAOV2.progressGrant(grantHash);
			await gDAOV2.progressGrant(grantHash);

			grant = await gDAOV2.grants(grantHash);

			expect(grant.currentMilestone).to.equal(2);

			expect(await mockERC20.balanceOf(gDAOV2.address)).to.equal(
				startingBalance - (milestoneOne + milestoneTwo)
			);
			expect(await mockERC20.balanceOf(receivingAddress.address)).to.equal(
				milestoneOne + milestoneTwo
			);
		});

		it('should fail when non-owner reassigns grant', async () => {
			await expect(
				gDAOV2.connect(maliciousAddress).reassignGrant(grantHash, addrs[0].address)
			).to.revertedWith('caller is not the owner');
		});

		it('should successfully reassigning to different address', async () => {
			await expect(gDAOV2.reassignGrant(grantHash, addrs[0].address))
				.to.emit(gDAOV2, 'GrantReassigned')
				.withArgs(grantHash, addrs[0].address);

			grant = await gDAOV2.grants(grantHash);

			expect(grant.receivingAddress).to.equal(addrs[0].address);
		});

		it('should successfully release payment after reassigning', async () => {
			await gDAOV2.progressGrant(grantHash);
			await gDAOV2.reassignGrant(grantHash, addrs[0].address);

			await gDAOV2.progressGrant(grantHash);

			expect(await mockERC20.balanceOf(receivingAddress.address)).to.equal(milestoneOne);
			expect(await mockERC20.balanceOf(addrs[0].address)).to.equal(milestoneTwo);
		});

		it('should fail when non-owner cancels a grant', async () => {
			await expect(gDAOV2.connect(maliciousAddress).cancelGrant(grantHash)).to.revertedWith(
				'caller is not the owner'
			);
		});

		it('should successfully cancel a grant', async () => {
			await expect(gDAOV2.cancelGrant(grantHash))
				.to.emit(gDAOV2, 'GrantCancelled')
				.withArgs(grantHash);
		});

		it('should fail when attempting to release payment on cancelled grant', async () => {
			await gDAOV2.cancelGrant(grantHash);

			await expect(gDAOV2.progressGrant(grantHash)).to.revertedWith('grant is not active');
		});

		it('should successfully complete a grant', async () => {
			for (let i = 0; i < milestones.length - 1; i++) {
				await gDAOV2.progressGrant(grantHash);
			}

			await expect(gDAOV2.progressGrant(grantHash))
				.to.emit(gDAOV2, 'GrantCompleted')
				.withArgs(grantHash);
		});

		it('should fail when non-owner attempts to complete a grant', async () => {
			await expect(gDAOV2.connect(maliciousAddress).completeGrant(grantHash)).to.revertedWith(
				'caller is not the owner'
			);
		});

		it('should fail when attempting to complete a non-active grant', async () => {
			await gDAOV2.cancelGrant(grantHash);
			await expect(gDAOV2.completeGrant(grantHash)).to.revertedWith('grant is not active');
		});

		it('should successfully complete a initiative', async () => {
			await expect(gDAOV2.completeGrant(grantHash))
				.to.emit(gDAOV2, 'GrantCompleted')
				.withArgs(grantHash);

			expect(await mockERC20.balanceOf(receivingAddress.address)).to.equal(
				milestoneOne + milestoneTwo + milestoneThree + milestoneFour
			);
		});
	});

	describe('when managing initisatives', () => {
		let initative;

		beforeEach(async () => {
			await gDAOV2.createInitiative(
				initiativeHash,
				title,
				description,
				milestones,
				paymentCurrency
			);

			initative = await gDAOV2.initiatives(initiativeHash);
		});

		it('should fail if non-owner attemps to assign receiver', async () => {
			await expect(
				gDAOV2.connect(maliciousAddress).assignInitiative(initiativeHash, receivingAddress.address)
			).to.be.revertedWith('caller is not the owner');
		});

		it('should successfully assign receiver', async () => {
			await expect(gDAOV2.assignInitiative(initiativeHash, receivingAddress.address))
				.to.emit(gDAOV2, 'InitiativeAssigned')
				.withArgs(initiativeHash, receivingAddress.address);
		});

		it('should fail if non-owner attempts to release payment', async () => {
			await gDAOV2.assignInitiative(initiativeHash, receivingAddress.address);
			await expect(
				gDAOV2.connect(maliciousAddress).progressInitiative(initiativeHash)
			).to.revertedWith('caller is not the owner');
		});

		it('should fail if attempt to release payment on non-assigned initiative', async () => {
			await expect(gDAOV2.progressInitiative(initiativeHash)).to.revertedWith(
				'initiative has not been assigned'
			);
		});

		it('should successfully release the first milestone', async () => {
			await gDAOV2.assignInitiative(initiativeHash, receivingAddress.address);

			await expect(gDAOV2.progressInitiative(initiativeHash))
				.to.emit(gDAOV2, 'InitiativeMilestoneReleased')
				.withArgs(initiativeHash, milestoneOne, receivingAddress.address, mockERC20.address);

			initiative = await gDAOV2.initiatives(initiativeHash);

			expect(initiative.currentMilestone).to.equal(1);
			expect(await mockERC20.balanceOf(gDAOV2.address)).to.equal(startingBalance - milestoneOne);
			expect(await mockERC20.balanceOf(receivingAddress.address)).to.equal(milestoneOne);
		});

		it('should successfully release the second milestone', async () => {
			await gDAOV2.assignInitiative(initiativeHash, receivingAddress.address);

			await gDAOV2.progressInitiative(initiativeHash);
			await gDAOV2.progressInitiative(initiativeHash);

			initiative = await gDAOV2.initiatives(initiativeHash);

			expect(initiative.currentMilestone).to.equal(2);

			expect(await mockERC20.balanceOf(gDAOV2.address)).to.equal(
				startingBalance - (milestoneOne + milestoneTwo)
			);
			expect(await mockERC20.balanceOf(receivingAddress.address)).to.equal(
				milestoneOne + milestoneTwo
			);
		});

		it('should fail when non-owner reassigns initiative', async () => {
			await expect(
				gDAOV2.connect(maliciousAddress).assignInitiative(initiativeHash, addrs[0].address)
			).to.revertedWith('caller is not the owner');
		});

		it('should successfully reassign initiative', async () => {
			await expect(gDAOV2.assignInitiative(initiativeHash, addrs[0].address))
				.to.emit(gDAOV2, 'InitiativeAssigned')
				.withArgs(initiativeHash, addrs[0].address);

			initiative = await gDAOV2.initiatives(initiativeHash);

			expect(initiative.receivingAddress).to.equal(addrs[0].address);
		});

		it('should successfully release payment after reassigning', async () => {
			await gDAOV2.assignInitiative(initiativeHash, receivingAddress.address);
			await gDAOV2.progressInitiative(initiativeHash);
			await gDAOV2.assignInitiative(initiativeHash, addrs[0].address);

			await gDAOV2.progressInitiative(initiativeHash);

			expect(await mockERC20.balanceOf(receivingAddress.address)).to.equal(milestoneOne);
			expect(await mockERC20.balanceOf(addrs[0].address)).to.equal(milestoneTwo);
		});

		it('should fail when non-owner cancels a grant', async () => {
			await expect(
				gDAOV2.connect(maliciousAddress).cancelInitiative(initiativeHash)
			).to.revertedWith('caller is not the owner');
		});

		it('should successfully cancel a grant', async () => {
			await expect(gDAOV2.cancelInitiative(initiativeHash))
				.to.emit(gDAOV2, 'InitiativeCancelled')
				.withArgs(initiativeHash);
		});

		it('should fail when attempting to release payment on cancelled grant', async () => {
			await gDAOV2.cancelInitiative(initiativeHash);

			await expect(gDAOV2.progressInitiative(initiativeHash)).to.revertedWith(
				'initiative has not been assigned'
			);
		});

		it('should successfully complete a grant', async () => {
			await gDAOV2.assignInitiative(initiativeHash, receivingAddress.address);

			for (let i = 0; i < milestones.length - 1; i++) {
				await gDAOV2.progressInitiative(initiativeHash);
			}

			await expect(gDAOV2.progressInitiative(initiativeHash))
				.to.emit(gDAOV2, 'InitiativeCompleted')
				.withArgs(initiativeHash);
		});

		it('should fail when non-owner attempts to complete a initiative', async () => {
			await gDAOV2.assignInitiative(initiativeHash, receivingAddress.address);

			await expect(
				gDAOV2.connect(maliciousAddress).completeInitiative(initiativeHash)
			).to.revertedWith('caller is not the owner');
		});

		it('should fail when non-owner attempts to complete a non-assigned initiative', async () => {
			await expect(gDAOV2.completeInitiative(initiativeHash)).to.revertedWith(
				'initiative has not been assigned'
			);
		});

		it('should successfully complete a initiative', async () => {
			await gDAOV2.assignInitiative(initiativeHash, receivingAddress.address);
			await expect(gDAOV2.completeInitiative(initiativeHash))
				.to.emit(gDAOV2, 'InitiativeCompleted')
				.withArgs(initiativeHash);

			expect(await mockERC20.balanceOf(receivingAddress.address)).to.equal(
				milestoneOne + milestoneTwo + milestoneThree + milestoneFour
			);
		});
	});

	describe('when managing funds', () => {
		let mockEmptyToken;
		let withdrawalAmount = 500;
		beforeEach(async () => {
			MockERC20 = await ethers.getContractFactory('MockERC20');

			mockEmptyToken = await MockERC20.deploy(gDAOV2.address, 0);
		});

		it('should fail when the contract does not have enough to release payment', async () => {
			await gDAOV2.createGrant(
				grantHash,
				title,
				description,
				milestones,
				mockEmptyToken.address,
				proposer,
				receivingAddress.address
			);

			await expect(gDAOV2.progressGrant(grantHash)).to.revertedWith(
				'contract has insufficient balance'
			);
		});

		it('should fail when a non-owner attempts to withdraw erc20 funds', async () => {
			await expect(
				gDAOV2
					.connect(maliciousAddress)
					.withdraw(maliciousAddress.address, withdrawalAmount, mockERC20.address)
			).to.revertedWith('caller is not the owner');
		});

		it('should fail when there is insufficient balance', async () => {
			await expect(
				gDAOV2.withdraw(receivingAddress.address, withdrawalAmount, mockEmptyToken.address)
			).to.revertedWith('insufficient balance in contract');
		});

		it('should successfully allow owner to withdraw erc20 funds', async () => {
			await expect(gDAOV2.withdraw(owner.address, withdrawalAmount, mockERC20.address))
				.to.emit(gDAOV2, 'Withdrawal')
				.withArgs(owner.address, withdrawalAmount, mockERC20.address);

			expect(await mockERC20.balanceOf(owner.address)).to.equal(withdrawalAmount);
		});
	});

	describe('when accessing view functions', () => {
		beforeEach(async () => {
			await gDAOV2.createGrant(
				grantHash,
				title,
				description,
				milestones,
				paymentCurrency,
				proposer,
				receivingAddress.address
			);

			await gDAOV2.createInitiative(
				initiativeHash,
				title,
				description,
				milestones,
				paymentCurrency
			);
		});

		it('should return the correct milestones for a grant', async () => {
			let grantMilestonesBN = await gDAOV2.returnGrantMilestones(grantHash);

			let grantMilestones = grantMilestonesBN.map((e) => e.toNumber());

			expect(grantMilestones).contains(milestoneOne);
			expect(grantMilestones).contains(milestoneTwo);
			expect(grantMilestones).contains(milestoneThree);
			expect(grantMilestones).contains(milestoneFour);
		});

		it('should return the correct milestones for a initative', async () => {
			let initiativeMilestonesBN = await gDAOV2.returnInitiativeMilestones(initiativeHash);

			let initiativeMilestones = initiativeMilestonesBN.map((e) => e.toNumber());

			expect(initiativeMilestones).contains(milestoneOne);
			expect(initiativeMilestones).contains(milestoneTwo);
			expect(initiativeMilestones).contains(milestoneThree);
			expect(initiativeMilestones).contains(milestoneFour);
		});
	});
});
