<img src="https://user-images.githubusercontent.com/37840702/129260175-386273d3-a3ec-453a-be0c-2f4fe166dbe7.png" width="100%" />

About Presaga : https://unitynetwork.medium.com/presaga-a-summary-of-unity-networks-first-dapp-6012f84693a8

## Presaga_core_contracts

All the smart contracts were borrowed from Gnosis and to whom we owe a lot for providing the whole DeFi community solid and very reliable smart contracts.

It's also worth noting the key changes we have made to the smart contracts in order to make them suit the needs of Presaga and its community best.

---

Check out full documentation of Gnosis here :
Automated Market Makers for the Prediction Markets 2.0 (Conditional Tokens) platform.

- Online Documentation: https://docs.gnosis.io/conditionaltokens/
- Gnosis: https://gnosis.io

---

# Smart contracts deployment:

- On Rinkeby Testnet :

```
0xAD1b960183F58dE5B13aeEe7A192df31e9C31fec FACTORY
0x2DfE08D2bCdf84c0396DA5E1B80B29cFA5bFd9C0 CONDITIONAL TOKEN
0xccb918995124882f3589ec23dd5bd38d078226c4 UNT Token
```

- On Arbitrum Testnet :

```
0x049ab2cCb0daB98f86857D0d8B1C008249b86845 UNT Token address on Arbitrum testnet
0x2d4C34E48c50EC6140037A6159D773F40Bd512D3 L2 FACTORY
0xD26f0E6998CC7EFF9F097e172cb6037c143aE3c7 L2 CONDITIONAL TOKENS
```

## Why disable funding by the crowd at the first place ?

Well, we believe that trading with your money in Presaga should be as fair as possible, and to make the market behave in a very correct way as to not turn into a wild west, we thought it would be best to have more control over the market. And to control every market we needed to upgrade the priviliges in the actual smart contracts by giving the owner (who is also the oracle) the exclusive right to close or open the market when the community sees fit. So that trading would become impossible specially when we are betting on a soccer game or the olympics. The result can be obvious at the last minutes, and we want our markets to be closed during the match, during moment of no uncertainty!

At the heart of Presaga you will find the Deterministic Fixed Price Market Maker Factory smart contract that is responsible for creating the market maker in a deterministic way. Here are the 2 main changes made to the smart contracts in order to upgrade priviliges of the creator :

- Each MM will have a creator/owner :

We initialize the owner of the MM to the `msg.sender` using `create2Clone` at the moment of creation as shown below:

```Solidity
 address owner = msg.sender;
 FixedProductMarketMaker fixedProductMarketMaker = FixedProductMarketMaker(
                create2Clone(
                    address(implementationMaster),
                    saltNonce,
                    abi.encode(
                        conditionalTokens,
                        collateralToken,
                        conditionIds,
                        fee,
                        owner // is owner and oracle
                    )
                )
            );

```

- Markets can be closed & opened by the owner :

Closing and opening a market maker is now possible thanks to the new modifier `isOpen` :

```Solidity
modifier isOpen() {
        //if applied to the buy and sell functions will prevent users from buying or selling until the market is open
        require(!closed, "Market is closed");
        _;
    }
```

the modifier makes sure that the state of the market is set to open before initiating any transaction. If the state closed is set to true then adding funds/buying/selling & removing funds will not be allowed until the owner/oracle of the market maker changes state by calling the function `changestateMarket()`:

```Solidity

 function changeMarketState() public {
        //if market is open sets it to closed and vice versa

        //only owner/oracle has the right to update market state
        require(msg.sender == owner, "Only owner!");
        closed = !closed;
    }


```

- We have also tested the new changes we made to the smart contract to make sure everything works in a fool-proof way.
  You can run the following command to start the tests :

```
$ truffle test
```

## License

All smart contracts are released under the `LGPL 3.0`\_ license.

Security and Liability

LGPL 3.0: https://www.gnu.org/licenses/lgpl-3.0.en.html
