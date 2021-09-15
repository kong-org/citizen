require('dotenv').config();
require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("@nomiclabs/hardhat-etherscan");
require('@openzeppelin/hardhat-upgrades');

/**
 * @type import('hardhat/config').HardhatUserConfig
 */


// TODO: move to .env file
const INFURA_ROPSTEN_ID = process.env.INFURA_PROJECT_ID;
const INFURA_MAINNET_ID = process.env.INFURA_MAINNET_ID;
const ROPSTEN_PRIVATE_KEY = process.env.ROPSTEN_PRIVATE_KEY;
const MAINNET_PRIVATE_KEY = process.env.MAINNET_PRIVATE_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

module.exports = {
  solidity: {
    version: "0.8.6",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1,
      },
    },
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 100
  },
  networks: {
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_MAINNET_ID}`,
      accounts: [`${MAINNET_PRIVATE_KEY}`],
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${INFURA_ROPSTEN_ID}`,
      accounts: [`${ROPSTEN_PRIVATE_KEY}`],
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  }
};
