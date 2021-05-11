const { expect } = require('chai');
const { smockit } = require('@eth-optimism/smock');

describe('GrantsDAOV2', function () {
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

		milestones = [milestoneOne, milestoneTwo, milestoneThree, milestoneFour];
		paymentCurrency = '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f';
		proposer = 'Danijel';

		GrantsDAOV2 = await ethers.getContractFactory('GrantsDAOV2');
		[owner, maliciousAddress, receivingAddress, ...addrs] = await ethers.getSigners();
		gDAOV2 = await GrantsDAOV2.deploy();

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

	describe.only('when managing grants', () => {
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

		it('should successfully release the first milestone', async () => {
			await expect(gDAOV2.releaseMilestone(grantHash))
				.to.emit(gDAOV2, 'MilestoneCompleted')
				.withArgs(grantHash, amount);

			expect(grant.currentMilestone).to.equal(1);
		});

		it('should successfully release the second milestone', async () => {});

		// it('should successfully cancel a grant', async () => {});
	});

	// describe('when managing initiatives', () => {});

	// describe('when managing funds', () => {});
});
