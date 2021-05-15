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

		it('should successfully reassign grant', async () => {
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
	});

	// describe('when managing initiatives', () => {});

	// describe('when managing funds', () => {});
});
