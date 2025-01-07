// test/adminFacet.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DiamondProxy - AdminFacet", function () {
  let diamondProxy, adminFacet, adminFacetInstance, owner, addr1;

  before(async function () {
    // Retrieve the list of accounts
    [owner, addr1] = await ethers.getSigners();

    // 1. Deploy DiamondProxy
    const DiamondProxyFactory = await ethers.getContractFactory("DiamondProxy");
    diamondProxy = await DiamondProxyFactory.deploy();
    // No need to call deployed() in ethers v6
    console.log("DiamondProxy deployed at:", diamondProxy.address);

    // Validate DiamondProxy deployment
    expect(diamondProxy.address).to.match(/^0x[a-fA-F0-9]{40}$/);

    // 2. Deploy AdminFacet
    const AdminFacetFactory = await ethers.getContractFactory("AdminFacet");
    adminFacet = await AdminFacetFactory.deploy();
    // No need to call deployed() in ethers v6
    console.log("AdminFacet deployed at:", adminFacet.address);

    // Validate AdminFacet deployment
    expect(adminFacet.address).to.match(/^0x[a-fA-F0-9]{40}$/);

    // 3. Perform diamondCut to add AdminFacet to DiamondProxy
    // Use diamondProxy directly to call diamondCut
    // Assuming 'diamondCut' function is present in DiamondProxy's ABI
    const functionSelectors = Object.keys(adminFacet.interface.functions).map((fn) =>
      adminFacet.interface.getSighash(fn)
    );

    const facetCut = {
      facetAddress: adminFacet.address,
      action: 0, // 0 = Add
      functionSelectors: functionSelectors,
    };

    // Perform the diamondCut
    const tx = await diamondProxy.diamondCut([facetCut], ethers.constants.AddressZero, "0x");
    await tx.wait(); // Wait for the transaction to be mined
    console.log("AdminFacet added to DiamondProxy via diamondCut");

    // 4. Connect AdminFacet to DiamondProxy
    adminFacetInstance = await ethers.getContractAt("AdminFacet", diamondProxy.address);
    console.log("AdminFacet instance connected to DiamondProxy at:", adminFacetInstance.address);

    // Verify that adminFacetInstance is correctly connected
    const initialOwner = await adminFacetInstance.getOwner();
    expect(initialOwner).to.equal(owner.address);
  });

  it("should set a new owner", async function () {
    // Set a new owner
    await adminFacetInstance.connect(owner).setOwner(addr1.address);

    // Verify the new owner using the getter
    const currentOwner = await adminFacetInstance.getOwner();
    expect(currentOwner).to.equal(addr1.address);
  });

  it("should have initial payment token as zero address", async function () {
    const zeroAddress = ethers.constants.AddressZero;
    const currentPaymentToken = await adminFacetInstance.getPaymentToken();
    expect(currentPaymentToken).to.equal(zeroAddress);
  });

  it("should set a new payment token", async function () {
    const paymentToken = addr1.address;
    const zeroAddress = ethers.constants.AddressZero;

    // Expect the PaymentTokenUpdated event to be emitted with correct arguments
    await expect(
      adminFacetInstance.connect(owner).setPaymentToken(paymentToken)
    )
      .to.emit(adminFacetInstance, "PaymentTokenUpdated")
      .withArgs(zeroAddress, paymentToken);

    // Verify the state change
    const currentPaymentToken = await adminFacetInstance.getPaymentToken();
    expect(currentPaymentToken).to.equal(paymentToken);
  });
});
