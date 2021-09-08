// Load dependencies
const chai = require("chai")
chai.use(require("chai-as-promised"))
const expect = chai.expect
// Load compiled artifacts
const MultiSigWallet = artifacts.require('MultiSigWallet'); //artifacts.require is provided by truffle!
contract("MultiSigWallet", (accounts) =>{
	const owners= [accounts[0],accounts[1],accounts[2]];
	const Num_Confirmations_Required=2;

	let wallet;
	beforeEach(async () =>{
		// Deploy a new MultiSigWallet contract instance before each test case.
		wallet= await MultiSigWallet.new(owners,Num_Confirmations_Required);
	});
	describe("fallback", async () => {
	    it("should receive ether", async () => {
	      const { logs } = await wallet.sendTransaction({from: accounts[0],value:1});

	      assert.equal(logs[0].event, "Deposit");
	      assert.equal(logs[0].args.to, accounts[0]);
	      assert.equal(logs[0].args.amount, 1);
	      assert.equal(logs[0].args.balance, 1);
	    });
	});

	describe("submitTransaction", () => {
	    const to = accounts[9];
	    const value = 0;	
	    const data = "0x00";

	    it("should submit tx", async () => {
	      const { logs } = await wallet.submitTx(to, value, data, {from: owners[0],});

	      assert.equal(logs[0].event, "Submit");
	      assert.equal(logs[0].args.owner, owners[0]);
	      assert.equal(logs[0].args.txIndex, 0);
	      assert.equal(logs[0].args.to, to);
	      assert.equal(logs[0].args.value, value);
	      assert.equal(logs[0].args.data, data);

	      assert.equal(await wallet.getTransactionCount(), 1);

	      const tx = await wallet.getTransaction(0);
	      assert.equal(tx.to, to);
	      assert.equal(tx.value, value);
	      assert.equal(tx.data, data);
	      assert.equal(tx.numConfirmations, 0);
	      assert.equal(tx.executed, false);
	    });

	    it("should reject if not owner", async () => {
      		await expect(wallet.submitTx(to, value, data, {from: accounts[3],})).to.be.rejected;
    	});
    });

	describe("executeTransaction", () => {
	      beforeEach(async () => {
	      	const to = owners[0];
	      	const value = 0;
	      	const data = "0x00";

	      	await wallet.submitTx(to, value, data);
	      	await wallet.confirmTx(0, { from: owners[0] });
	      	await wallet.confirmTx(0, { from: owners[1] });
    	});

    	//execute tx should succeed
		  it("should execute", async () =>{
			const res= await wallet.executeTx(0, {from: owners[0]});
			const{ logs }=res;

			//checking the event executed or not 
			assert.equal(logs[0].event, "Execute");
			assert.equal(logs[0].args.owner, owners[0]);
			assert.equal(logs[0].args.txIndex, 0);

			const tx= await wallet.getTransaction(0);
			assert.equal(tx.executed, true);

		});
		  //execute tx should fail if already executed 
		  it("should reject if already executed", async () => {
	      	await wallet.executeTx(0, { from: owners[0] });

	      
	        // try {
	        // 	//again calling executeTx 
	        // 	await wallet.executeTx(0, { from: owners[0] });
	        // 	throw new Error("tx did not fail");
	        // }	catch (error) {
	        //   	assert.equal(error.reason, "tx already executed"); // "error.reason" came here from MultisigWallet.sol
	        // }

	        //alternate way without try & catch
	        await expect(wallet.executeTx(0, { from: owners[0]})).to.be.rejected;
	    });
	    it("should reject if not owner", async () => {
      		await expect(wallet.executeTx(0, { from: accounts[3]})).to.be.rejected;
    	}); 
		  it("should reject if tx does not exist", async () => {
      		await expect(wallet.executeTx(1, { from: owners[0]})).to.be.rejected;
    	});
	});
});	
