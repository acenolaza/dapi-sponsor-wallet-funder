const {
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { StandardMerkleTree } = require('@openzeppelin/merkle-tree');

const MAXIMUM_SUBSCRIPTION_QUEUE_LENGTH = 5;

describe('DapiSponsorWalletFunder', function () {
    async function deploy() {
        const roleNames = ['deployer', 'owner', 'randomPerson'];
        const accounts = await ethers.getSigners();
        const roles = roleNames.reduce((acc, roleName, index) => {
            return { ...acc, [roleName]: accounts[index] };
        }, {});

        const MockSponsorWallet = await ethers.getContractFactory("MockSponsorWallet", roles.deployer);
        const mockSponsorWallet = await MockSponsorWallet.deploy();

        const dapiName = ethers.encodeBytes32String('ETH/USD');
        const dataFeedId = "0x1c9a270cbb4ef1588638981be015232f9fbfa6978d137fed669e4095e0b82f31";
        const sponsorWalletAddress = await mockSponsorWallet.getAddress();

        const dapiManagementMerkleTree = StandardMerkleTree.of(
            [[dapiName, dataFeedId, sponsorWalletAddress]],
            ['bytes32', 'bytes32', 'address']
        )

        const Api3MarketMock = await ethers.getContractFactory("MockApi3Market", roles.deployer);
        const api3MarketMock = await Api3MarketMock.deploy();

        const DapiSponsorWalletFunder = await ethers.getContractFactory('DapiSponsorWalletFunder', roles.deployer);
        const dapiSponsorWalletFunder = await DapiSponsorWalletFunder.deploy(
            api3MarketMock.getAddress(),
        );

        await dapiSponsorWalletFunder.connect(roles.deployer).transferOwnership(roles.owner.address);

        return {
            roles,
            api3MarketMock,
            mockSponsorWallet,
            dapiSponsorWalletFunder,
            dapiName,
            dataFeedId,
            sponsorWalletAddress,
            dapiManagementMerkleTree
        }
    }

    describe('constructor', function () {
        context('Api3Market is not zero', function () {
            it('constructs', async function () {
                const { roles, dapiSponsorWalletFunder, api3MarketMock } =
                    await loadFixture(deploy);
                expect(await dapiSponsorWalletFunder.owner()).to.equal(roles.owner.address);
                expect(await dapiSponsorWalletFunder.api3Market()).to.equal(await api3MarketMock.getAddress());
            });
        });
        context('Api3Market is zero', function () {
            it('reverts', async function () {
                const { roles } = await loadFixture(deploy);
                const DapiSponsorWalletFunder = await ethers.getContractFactory('DapiSponsorWalletFunder', roles.deployer);
                await expect(DapiSponsorWalletFunder.deploy(ethers.ZeroAddress)).to.be.revertedWith('Api3Market address zero');
            });
        });
    });

    describe('fund', function () {
        context('dapiName is not zero', function () {
            context('dataFeedId is not zero', function () {
                context('sponsorWallet is not zero', function () {
                    context('dapiManagementMerkleRoot is not invalid', function () {
                        context('dapiManagementMerkleProof is not invalid', function () {
                            context('fund is needed', function () {
                                context('balance is not insufficient', function () {
                                    context('transfer is not unsuccessful', function () {
                                        it('funds', async function () {
                                            const { roles, dapiSponsorWalletFunder, dapiName, dataFeedId, sponsorWalletAddress, dapiManagementMerkleTree } = await loadFixture(deploy);
                                            const dapiManagementMerkleProof = dapiManagementMerkleTree.getProof(0);
                                            await roles.deployer.sendTransaction({
                                                to: await dapiSponsorWalletFunder.getAddress(),
                                                value: ethers.parseEther('1'),
                                            });
                                            await expect(dapiSponsorWalletFunder.connect(roles.randomPerson).fund(dapiName, dataFeedId, sponsorWalletAddress, dapiManagementMerkleTree.root, dapiManagementMerkleProof)).to.emit(dapiSponsorWalletFunder, 'FundedSponsorWallet').withArgs(dapiName, sponsorWalletAddress, '123456789000000000', roles.randomPerson.address);
                                        });
                                    });
                                    context('transfer is unsuccessful', function () {
                                        it('reverts', async function () {
                                            const { roles, dapiSponsorWalletFunder, dapiName, dataFeedId, sponsorWalletAddress, dapiManagementMerkleTree } = await loadFixture(deploy);
                                            const dapiManagementMerkleProof = dapiManagementMerkleTree.getProof(0);
                                            await roles.deployer.sendTransaction({
                                                to: await dapiSponsorWalletFunder.getAddress(),
                                                value: ethers.parseEther('1'),
                                            });
                                            await expect(dapiSponsorWalletFunder.connect(roles.deployer).fund(dapiName, dataFeedId, sponsorWalletAddress, dapiManagementMerkleTree.root, dapiManagementMerkleProof)).to.be.revertedWith("Transfer unsuccessful");
                                        });
                                    });
                                });
                                context('balance is not insufficient', function () {
                                    it('reverts', async function () {
                                        const { roles, dapiSponsorWalletFunder, dapiName, dataFeedId, sponsorWalletAddress, dapiManagementMerkleTree } = await loadFixture(deploy);
                                        const dapiManagementMerkleProof = dapiManagementMerkleTree.getProof(0);
                                        await expect(dapiSponsorWalletFunder.connect(roles.randomPerson).fund(dapiName, dataFeedId, sponsorWalletAddress, dapiManagementMerkleTree.root, dapiManagementMerkleProof)).to.be.revertedWith("Insufficient balance");
                                    });
                                });
                            })
                            context('fund is not needed', function () {
                                it('reverts', async function () {
                                    const { roles, dapiSponsorWalletFunder, dapiName, dataFeedId, sponsorWalletAddress, dapiManagementMerkleTree } = await loadFixture(deploy);
                                    const dapiManagementMerkleProof = dapiManagementMerkleTree.getProof(0);
                                    await roles.deployer.sendTransaction({
                                        to: await dapiSponsorWalletFunder.getAddress(),
                                        value: ethers.parseEther('1'),
                                    });
                                    await roles.deployer.sendTransaction({
                                        to: roles.randomPerson.address,
                                        value: ethers.parseEther('1'),
                                    });
                                    await roles.randomPerson.sendTransaction({
                                        to: sponsorWalletAddress,
                                        value: ethers.parseEther('1'),
                                    });
                                    await expect(dapiSponsorWalletFunder.connect(roles.randomPerson).fund(dapiName, dataFeedId, sponsorWalletAddress, dapiManagementMerkleTree.root, dapiManagementMerkleProof)).to.be.revertedWith("Fund not needed");
                                });
                            });
                        });
                        context('dapiManagementMerkleProof is invalid', function () {
                            it('reverts', async function () {
                                const { roles, dapiSponsorWalletFunder, dapiName, dataFeedId, sponsorWalletAddress, dapiManagementMerkleTree } = await loadFixture(deploy);
                                const dapiManagementMerkleProof = [ethers.keccak256(ethers.toUtf8Bytes("invalidProof"))];
                                await roles.deployer.sendTransaction({
                                    to: await dapiSponsorWalletFunder.getAddress(),
                                    value: ethers.parseEther('1'),
                                });
                                await expect(
                                    dapiSponsorWalletFunder.connect(roles.randomPerson).fund(
                                        dapiName,
                                        dataFeedId,
                                        sponsorWalletAddress,
                                        dapiManagementMerkleTree.root,
                                        dapiManagementMerkleProof
                                    )
                                ).to.be.revertedWith('Invalid proof');
                            });
                        });
                    });
                    context('dapiManagementMerkleRoot is invalid', function () {
                        it('reverts', async function () {
                            const { roles, dapiSponsorWalletFunder, dapiName, dataFeedId, sponsorWalletAddress, dapiManagementMerkleTree } = await loadFixture(deploy);
                            const invalidMerkleRoot = ethers.keccak256(ethers.toUtf8Bytes("invalidRoot"));
                            const dapiManagementMerkleProof = dapiManagementMerkleTree.getProof(0);
                            await roles.deployer.sendTransaction({
                                to: await dapiSponsorWalletFunder.getAddress(),
                                value: ethers.parseEther('1'),
                            });
                            await expect(
                                dapiSponsorWalletFunder.connect(roles.randomPerson).fund(
                                    dapiName,
                                    dataFeedId,
                                    sponsorWalletAddress,
                                    invalidMerkleRoot,
                                    dapiManagementMerkleProof
                                )
                            ).to.be.revertedWith('Invalid root');
                        });
                    });
                })
                context('sponsorWallet is zero', function () {
                    it('reverts', async function () {
                        const { roles, dapiSponsorWalletFunder, dapiName, dataFeedId, dapiManagementMerkleTree } = await loadFixture(deploy);
                        const dapiManagementMerkleProof = dapiManagementMerkleTree.getProof(0);
                        await roles.deployer.sendTransaction({
                            to: await dapiSponsorWalletFunder.getAddress(),
                            value: ethers.parseEther('1'),
                        });
                        await expect(dapiSponsorWalletFunder.connect(roles.randomPerson).fund(dapiName, dataFeedId, ethers.ZeroAddress, dapiManagementMerkleTree.root, dapiManagementMerkleProof)).to.be.revertedWith('Sponsor wallet address zero');
                    });
                });
            });
            context('dataFeedId is zero', function () {
                it('reverts', async function () {
                    const { roles, dapiSponsorWalletFunder, dapiName, sponsorWalletAddress, dapiManagementMerkleTree } = await loadFixture(deploy);
                    const dapiManagementMerkleProof = dapiManagementMerkleTree.getProof(0);
                    await roles.deployer.sendTransaction({
                        to: await dapiSponsorWalletFunder.getAddress(),
                        value: ethers.parseEther('1'),
                    });
                    await expect(dapiSponsorWalletFunder.connect(roles.randomPerson).fund(dapiName, ethers.ZeroHash, sponsorWalletAddress, dapiManagementMerkleTree.root, dapiManagementMerkleProof)).to.be.revertedWith('Data feed ID zero');
                });
            });
        });
        context('dapiName is zero', function () {
            it('reverts', async function () {
                const { roles, dapiSponsorWalletFunder, dataFeedId, sponsorWalletAddress, dapiManagementMerkleTree } = await loadFixture(deploy);
                const dapiManagementMerkleProof = dapiManagementMerkleTree.getProof(0);
                await roles.deployer.sendTransaction({
                    to: await dapiSponsorWalletFunder.getAddress(),
                    value: ethers.parseEther('1'),
                });
                await expect(dapiSponsorWalletFunder.connect(roles.randomPerson).fund(ethers.ZeroHash, dataFeedId, sponsorWalletAddress, dapiManagementMerkleTree.root, dapiManagementMerkleProof)).to.be.revertedWith('dAPI name zero');
            });
        });
    });

    describe('withdraw', function () {
        context('Sender is the owner', function () {
            context('Recipient address is not zero', function () {
                context('Amount is not zero', function () {
                    context('Balance is not insufficient', function () {
                        context('Transfer is successful', function () {
                            it('withdraws', async function () {
                                const { roles, dapiSponsorWalletFunder } = await loadFixture(deploy);
                                await roles.deployer.sendTransaction({
                                    to: await dapiSponsorWalletFunder.getAddress(),
                                    value: ethers.parseEther('1'),
                                });
                                await expect(dapiSponsorWalletFunder.connect(roles.owner).withdraw(roles.randomPerson, ethers.parseEther('1'))).to.emit(dapiSponsorWalletFunder, 'Withdrew').withArgs(roles.randomPerson.address, ethers.parseEther('1'), roles.owner.address);
                            });
                        });
                        context('Transfer is not successful', function () {
                            it('reverts', async function () {
                                const { roles, dapiSponsorWalletFunder, mockSponsorWallet } = await loadFixture(deploy);
                                await roles.deployer.sendTransaction({
                                    to: await dapiSponsorWalletFunder.getAddress(),
                                    value: ethers.parseEther('1'),
                                });
                                await expect(dapiSponsorWalletFunder.connect(roles.owner).withdraw(await mockSponsorWallet.getAddress(), ethers.parseEther('1'))).to.be.revertedWith('Transfer unsuccessful');
                            });
                        });
                    });
                    context('Balance is insufficient', function () {
                        it('reverts', async function () {
                            const { roles, dapiSponsorWalletFunder } = await loadFixture(deploy);
                            await expect(dapiSponsorWalletFunder.connect(roles.owner).withdraw(roles.randomPerson, ethers.parseEther('1'))).to.be.revertedWith('Insufficient balance');
                        });
                    })
                });
                context('Amount is not zero', function () {
                    it('reverts', async function () {
                        const { roles, dapiSponsorWalletFunder } = await loadFixture(deploy);
                        await expect(dapiSponsorWalletFunder.connect(roles.owner).withdraw(roles.randomPerson, 0)).to.be.revertedWith('Amount zero');
                    });
                });
            });
            context('Recipient address is zero', function () {
                it('reverts', async function () {
                    const { roles, dapiSponsorWalletFunder } = await loadFixture(deploy);
                    await expect(dapiSponsorWalletFunder.connect(roles.owner).withdraw(ethers.ZeroAddress, ethers.parseEther('1'))).to.be.revertedWith('Recipient address zero');
                });
            });
        });
        context('Sender is not the owner', function () {
            it('reverts', async function () {
                const { roles, dapiSponsorWalletFunder } = await loadFixture(deploy);
                await expect(dapiSponsorWalletFunder.connect(roles.randomPerson).withdraw(roles.randomPerson, ethers.parseEther('1'))).to.be.revertedWith('Ownable: caller is not the owner');
            });
        });
    });
});