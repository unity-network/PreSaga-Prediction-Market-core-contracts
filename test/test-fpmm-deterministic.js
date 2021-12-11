const { step } = require("mocha-steps");
const { expectEvent, expectRevert } = require("openzeppelin-test-helpers");
const { getConditionId, getCollectionId, getPositionId } =
  require("@gnosis.pm/conditional-tokens-contracts/utils/id-helpers")(
    web3.utils
  );
const { randomHex, toBN } = web3.utils;

const ConditionalTokens = artifacts.require("ConditionalTokens");
const WETH9 = artifacts.require("WETH9");
const FPMMDeterministicFactory = artifacts.require("FPMMDeterministicFactory");
const FixedProductMarketMaker = artifacts.require("FixedProductMarketMaker");

contract("FPMMDeterministicFactory", function ([, creator, oracle, investor2]) {
  const questionId = randomHex(32);
  const numOutcomes = 10;
  const conditionId = getConditionId(oracle, questionId, numOutcomes);
  const collectionIds = Array.from({ length: numOutcomes }, (_, i) =>
    getCollectionId(conditionId, toBN(1).shln(i))
  );

  let conditionalTokens;
  let collateralToken;
  let fpmmDeterministicFactory;
  let positionIds;
  before(async function () {
    conditionalTokens = await ConditionalTokens.deployed();
    collateralToken = await WETH9.deployed();
    fpmmDeterministicFactory = await FPMMDeterministicFactory.deployed();
    positionIds = collectionIds.map((collectionId) =>
      getPositionId(collateralToken.address, collectionId)
    );
  });

  let fixedProductMarketMaker;
  const saltNonce = toBN(2020);
  const feeFactor = toBN(2e18);
  const initialFunds = toBN(10e18);
  const initialDistribution = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  const expectedFundedAmounts = initialDistribution.map((n) => toBN(1e18 * n));
  const question = web3.utils.asciiToHex("IS this a metaverse? ");

  step("can be created and funded by factory", async function () {
    await collateralToken.deposit({ value: initialFunds, from: creator });
    await collateralToken.approve(
      fpmmDeterministicFactory.address,
      initialFunds,
      { from: creator }
    );

    await conditionalTokens.prepareCondition(oracle, questionId, numOutcomes);
    const createArgs = [
      saltNonce,
      conditionalTokens.address,
      collateralToken.address,
      [conditionId],
      feeFactor,
      initialFunds,
      initialDistribution,
      question,

      { from: creator },
    ];
    const fixedProductMarketMakerAddress =
      await fpmmDeterministicFactory.create2FixedProductMarketMaker.call(
        ...createArgs
      );

    // TODO: somehow abstract this deterministic address calculation into a utility function
    fixedProductMarketMakerAddress.should.be.equal(
      web3.utils.toChecksumAddress(
        `0x${web3.utils
          .soliditySha3(
            { t: "bytes", v: "0xff" },
            { t: "address", v: fpmmDeterministicFactory.address },
            {
              t: "bytes32",
              v: web3.utils.keccak256(
                web3.eth.abi.encodeParameters(
                  ["address", "uint"],
                  [creator, saltNonce.toString()]
                )
              ),
            },
            {
              t: "bytes32",
              v: web3.utils.keccak256(
                `0x3d3d606380380380913d393d73${fpmmDeterministicFactory.address.replace(
                  /^0x/,
                  ""
                )}5af4602a57600080fd5b602d8060366000396000f3363d3d373d3d3d363d73${(
                  await fpmmDeterministicFactory.implementationMaster()
                ).replace(
                  /^0x/,
                  ""
                )}5af43d82803e903d91602b57fd5bf3${web3.eth.abi
                  .encodeFunctionCall(
                    {
                      name: "cloneConstructor",
                      type: "function",
                      inputs: [
                        {
                          type: "bytes",
                          name: "data",
                        },
                      ],
                    },
                    [
                      web3.eth.abi.encodeParameters(
                        [
                          "address",
                          "address",
                          "bytes32[]",
                          "uint",
                          "address",
                          "bytes32",
                        ],
                        [
                          conditionalTokens.address,
                          collateralToken.address,
                          [conditionId],
                          feeFactor.toString(),
                          creator,
                          question,
                        ]
                      ),
                    ]
                  )
                  .replace(/^0x/, "")}`
              ),
            }
          )
          .slice(-40)}`
      )
    );

    const createTx =
      await fpmmDeterministicFactory.create2FixedProductMarketMaker(
        ...createArgs
      );
    /*  expectEvent.inLogs(createTx.logs, "FixedProductMarketMakerCreation", {
      creator,
      fixedProductMarketMaker: fixedProductMarketMakerAddress,
      conditionalTokens: conditionalTokens.address,
      collateralToken: collateralToken.address,
      conditionIds: [conditionId],
      fee: feeFactor,
    });

    expectEvent.inLogs(createTx.logs, "FPMMFundingAdded", {
      funder: fpmmDeterministicFactory.address,
      amountsAdded: expectedFundedAmounts,
      sharesMinted: initialFunds,
    }); */

    fixedProductMarketMaker = await FixedProductMarketMaker.at(
      fixedProductMarketMakerAddress
    );

    (await collateralToken.balanceOf(creator)).should.be.a.bignumber.equal("0");
    (
      await fixedProductMarketMaker.balanceOf(creator)
    ).should.be.a.bignumber.equal(initialFunds);
    (await fpmmDeterministicFactory.markets(0)).should.be.equal(
      fixedProductMarketMakerAddress
    );

    for (let i = 0; i < positionIds.length; i++) {
      (
        await conditionalTokens.balanceOf(
          fixedProductMarketMaker.address,
          positionIds[i]
        )
      ).should.be.a.bignumber.equal(expectedFundedAmounts[i]);
      (
        await conditionalTokens.balanceOf(creator, positionIds[i])
      ).should.be.a.bignumber.equal(initialFunds.sub(expectedFundedAmounts[i]));

      (await fixedProductMarketMaker.closed()).should.be.equal(false); //checks if the state of the market is initially set to open
    }
  });

  const feePoolManipulationAmount = toBN(30e18);
  const testAdditionalFunding = toBN(1e18);
  const expectedTestEndingAmounts = initialDistribution.map((n) =>
    toBN(1.1e18 * n)
  );

  step(
    "Owner address is correctly set to owner at creation",
    async function () {
      (await fixedProductMarketMaker.owner()).should.be.equal(creator);
    }
  );

  step("Market question is correctly set at creation", async function () {
    const marketQuestion = await fixedProductMarketMaker.question();
    console.log(marketQuestion);
    (await fixedProductMarketMaker.question()).should.be.equal(
      question + "0000000000000000000000"
    );
  });

  const addedFunds2 = toBN(5e18);
  step("reverts if funded when market is closed", async function () {
    await fixedProductMarketMaker.changeMarketState({ from: creator });
    const marketIsClosed = await fixedProductMarketMaker.closed(); //checks if the state of the market is initially set to true (open)

    (await fixedProductMarketMaker.closed()).should.be.equal(true);
    await collateralToken.deposit({ value: addedFunds2, from: investor2 });
    await collateralToken.approve(
      fixedProductMarketMaker.address,
      addedFunds2,
      { from: investor2 }
    );

    const collectedFeesBefore = await fixedProductMarketMaker.collectedFees();

    await expectRevert(
      fixedProductMarketMaker.addFunding(addedFunds2, [], {
        from: investor2,
      }),
      "Market is closed"
    );
  });
  step(
    "reverts if trying to change market maker state when msg.sender is not the owner",
    async function () {
      await expectRevert(
        fixedProductMarketMaker.changeMarketState({
          from: investor2,
        }),
        "Only owner!"
      );
    }
  );
  const addedFunds3 = toBN(5e18);
  step(
    "can continue being funded by investors after state is changed from closed to open ",
    async function () {
      await fixedProductMarketMaker.changeMarketState({ from: creator });
      const currentPoolBalances = await conditionalTokens.balanceOfBatch(
        new Array(positionIds.length).fill(fixedProductMarketMaker.address),
        positionIds
      );
      await collateralToken.deposit({ value: addedFunds2, from: creator });
      await collateralToken.approve(
        fixedProductMarketMaker.address,
        addedFunds2,
        { from: creator }
      );
      const maxPoolBalance = currentPoolBalances.reduce((a, b) =>
        a.gt(b) ? a : b
      );
      const currentPoolShareSupply =
        await fixedProductMarketMaker.totalSupply();

      const collectedFeesBefore = await fixedProductMarketMaker.collectedFees();
      const addFundingTx = await fixedProductMarketMaker.addFunding(
        addedFunds3,
        [],
        { from: creator }
      );

      expectEvent.inLogs(addFundingTx.logs, "FPMMFundingAdded", {
        funder: creator,
        // amountsAdded,
        sharesMinted: currentPoolShareSupply
          .mul(addedFunds2)
          .div(maxPoolBalance),
      });
    }
  );
  const burnedShares1 = toBN(1e18);
  step(
    "Reverts when trying to remove funds when market is unresolved",
    async function () {
      await expectRevert(
        fixedProductMarketMaker.removeFunding(burnedShares1, { from: creator }),
        "Market is not resolved yet"
      );
    }
  );
});
