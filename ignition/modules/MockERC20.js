// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("mockERC20Module", (m) => {

  const mockERC20 = m.contract("MockERC20") ;

  return { mockERC20 };
});
