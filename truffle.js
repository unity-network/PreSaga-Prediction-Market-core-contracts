require("chai/register-should");
require("mocha-steps");
//var config = require("./config.js");
var private = require("./keys.js");
var HDWalletProvider = require("truffle-hdwallet-provider");

const MNEMONIC = private.key;
const config = {
  networks: {
    rinkeby: {
      provider: function () {
        return new HDWalletProvider(
          MNEMONIC,
          "https://rinkeby.infura.io/v3/ad81d172bbf84c088e319d2658dcdf2a"
        );
      },
      network_id: 4,
      //gas: 4000000, //make sure this gas allocation isn't over 4M, which is the max

      networkCheckTimeout: 1000000,
    },
    arbitrum: {
      provider: function () {
        return new HDWalletProvider(
          MNEMONIC,
          "https://rinkeby.arbitrum.io/rpc"
        );
      },
      network_id: 421611,
      gas: 287971805,
      //make sure this gas allocation isn't over 4M, which is the max
      /*    timeout: 100000000,
      networkCheckTimeout: 100000000, */
    },
    arbitrum: {
      provider: function () {
        return new HDWalletProvider(
          MNEMONIC,
          "https://rinkeby.arbitrum.io/rpc",
          0,
          3
        );
      },
      network_id: 421611,
      gas: 287971805,
      //make sure this gas allocation isn't over 4M, which is the max
      /*    timeout: 100000000,
      networkCheckTimeout: 100000000, */
    },
    goerli: {
      host: "localhost",
      port: 8545,
      network_id: "5",
    },
    develop: {
      host: "localhost",
      port: 7545,
      network_id: "*",
    },
  },
  mocha: {
    enableTimeouts: false,
    grep: process.env.TEST_GREP,
    reporter: "eth-gas-reporter",
    reporterOptions: {
      currency: "USD",
      excludeContracts: ["Migrations"],
    },
  },
  compilers: {
    solc: {
      version: "0.5.10",
      settings: {
        optimizer: {
          enabled: true,
        },
      },
    },
  },
};

const _ = require("lodash");

try {
  _.merge(config, require("./truffle-local"));
} catch (e) {
  if (e.code === "MODULE_NOT_FOUND") {
    // eslint-disable-next-line no-console
    console.log("No local truffle config found. Using all defaults...");
  } else {
    // eslint-disable-next-line no-console
    console.warn("Tried processing local config but got error:", e);
  }
}

module.exports = config;
