module.exports = function (deployer) {
  //deployer.deploy(artifacts.require("Migrations"));
  deployer.deploy(artifacts.require("WETH9"));
};
