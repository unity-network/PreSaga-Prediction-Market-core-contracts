const FPMMDeterministicFactory = artifacts.require("FPMMDeterministicFactory");

module.exports = function (deployer) {
  deployer.deploy(FPMMDeterministicFactory);
};
