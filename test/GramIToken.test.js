const BigNumber = web3.BigNumber;
const GramiToken = artifacts.require('GramIToken');
const { expectThrow } = require('openzeppelin-solidity/test/helpers/expectThrow');
const { inLogs } = require('openzeppelin-solidity/test/helpers/expectEvent');
const { EVMRevert } = require('openzeppelin-solidity/test/helpers/EVMRevert');
const { ether } = require('openzeppelin-solidity/test/helpers/ether');
const { advanceBlock } = require('openzeppelin-solidity/test/helpers/advanceToBlock');
const { increaseTimeTo, duration } = require('openzeppelin-solidity/test/helpers/increaseTime');
const { latestTime } = require('openzeppelin-solidity/test/helpers/latestTime');

require('chai')
	.use(require('chai-bignumber')(BigNumber))
	.should();

contract('GramiToken', function (accounts) {
	
	const _name = 'GramI Token';
	const _symbol = 'GramI';
	const _decimals = 4;
	const _defaultHoldTime = 120; //86400; // 1 day
	const _defaultNoSellTime = 0;

	const _totalSupply = 100000000;

	const _owner = accounts[0];
	const _admin1 = accounts[1];
	const _admin2 = accounts[2];
	const _tokenOwner1 = accounts[3];
	const _tokenOwner2 = accounts[4];
	const _tokenReceiver1 = accounts[5];
	const _tokenReceiver2 = accounts[6];



	beforeEach(async function() {
		this.token = await GramiToken.new(_name, _symbol, _decimals, _defaultHoldTime, _defaultNoSellTime);		
	});
	//1
	describe('token attributes', function() {
	
		it('has the correct name', async function() {
			const name = await this.token.name();
			name.should.equal(_name);
			name.should.not.equal("Booo");
		});

		it('has the correct symbol', async function() {
			const symbol = await this.token.symbol();
			symbol.should.equal(_symbol);
			symbol.should.not.equal("Booo");
		});

		it('has correct decimals', async function() {
			const decimals = await this.token.decimals();
			decimals.should.be.bignumber.equal(_decimals);
			decimals.should.be.bignumber.not.equal(5);
		});
	})
	// //2
	describe('test owner has the full starting balance', function() {
	
		it('has the correct starting balance', async function() {
			const owner_balance = await this.token.balanceOf(_owner);
			owner_balance.should.be.bignumber.equal(_totalSupply) 
			// name.should.not.equal("Booo");
		});
	})
	
	// //3
	describe('##EnumberableToken Testing', function() {
	
		it('tokenOwnerList Mapping has the owner', async function() {
			const _ownersIndex = await this.token.getTokenOwnersIndex(_owner);
			_ownersIndex.should.be.bignumber.equal(1);		
			// name.should.not.equal("Booo");
		});

		it('tokenOwner has owner at the right index', async function() {
			const _towner = await this.token.getTokenOwnerAtIndex(1);
			_towner.should.be.bignumber.equal(_owner);
			// name.should.not.equal("Booo");
		});

		it('tokenOwnerList Mapping should not have admin1', async function() {
			const _idx = await this.token.getTokenOwnersIndex(_tokenOwner1);
			_idx.should.be.bignumber.equal(0);		
		});		

		it('tokenOwnerList can add a new token owner', async function() {
			await this.token.addTokenOwner(_tokenOwner1);
			const _ownersIndex = await this.token.getTokenOwnersIndex(_tokenOwner1);
			_ownersIndex.should.be.bignumber.equal(2);		
		});

		it('tokenOwnerList has right count', async function() {
			
			const _count = await this.token.getTokenOwnerCount();
			_count.should.be.bignumber.equal(1);		
			await this.token.addTokenOwner(_tokenOwner1);
			const _count2 = await this.token.getTokenOwnerCount();
			_count2.should.be.bignumber.equal(2);					
		});
	})

	//4
	describe('##MultiAdmin testing', function() {
	
		it('owner is default admin', async function() {
			const isAd = await this.token.isAdmin(_owner);
			isAd.should.be.equal(false);
		});

		it('admin1 is not an admin by default', async function() {
			const isAd = await this.token.isAdmin(_admin1);
			isAd.should.be.equal(false);
		});

		it('owner can add an admin', async function() {
			await this.token.addAdmin(_admin1);
			const isAd = await this.token.isAdmin(_admin1);
			isAd.should.be.equal(true);
		});

		it('admin cannot add an admin', async function() {
			await expectThrow(this.token.addAdmin(_admin2, { from: _admin1 }), EVMRevert);			
		});

		it('owner can remove an admin', async function() {
			await this.token.addAdmin(_admin1);
			await this.token.removeAdmin(_admin1);
			const isAd = await this.token.isAdmin(_admin1);
			isAd.should.be.equal(false);
		});		
	})

	//5
	describe('##VestedToken testing', function() {
	
		it('can add txn to the vault with correct expiry and holding balance', async function() {
			const _txn1=1000;
			const _rel_time=_defaultHoldTime+Math.floor(new Date() / 1000);
			await this.token.addTransactionToVault(_tokenOwner1, _txn1, _rel_time);
			const _txn_count = await this.token.getTransactionCount(_tokenOwner1);
			_txn_count.should.be.bignumber.equal(1);			

			const inVaultBal=await this.token.getTransactionBalance(_tokenOwner1, 0);
			inVaultBal.should.be.bignumber.equal(_txn1);
			const inVaultExp=await this.token.getTransactionVestingDate(_tokenOwner1, 0);
			inVaultExp.should.be.bignumber.equal(_rel_time);

			const holdBal=await this.token.getHoldingWalletBalance();
			holdBal.should.be.bignumber.equal(_txn1);
		});

		it('can add two txn to the vault with correct expiry and holding balance', async function() {
			const _txn1=1000;
			const _rel_time=_defaultHoldTime+Math.floor(new Date() / 1000);
			await this.token.addTransactionToVault(_tokenOwner1, _txn1, _rel_time);

			const _txn2=100;
			const _rel_time2=_defaultHoldTime*2+Math.floor(new Date() / 1000);
			await this.token.addTransactionToVault(_tokenOwner1, _txn2, _rel_time2);

			const _txn_count = await this.token.getTransactionCount(_tokenOwner1);
			_txn_count.should.be.bignumber.equal(2);			

			const inVaultBal1=await this.token.getTransactionBalance(_tokenOwner1, 0);
			inVaultBal1.should.be.bignumber.equal(_txn1);
			const inVaultExp1=await this.token.getTransactionVestingDate(_tokenOwner1, 0);
			inVaultExp1.should.be.bignumber.equal(_rel_time);

			const inVaultBal2=await this.token.getTransactionBalance(_tokenOwner1, 1);
			inVaultBal2.should.be.bignumber.equal(_txn2);
			const inVaultExp2=await this.token.getTransactionVestingDate(_tokenOwner1, 1);
			inVaultExp2.should.be.bignumber.equal(_rel_time2);

			const holdBal=await this.token.getHoldingWalletBalance();
			holdBal.should.be.bignumber.equal(_txn1+_txn2);
		});

		it('can add two txn for token owner1 and three for token owner 2 to the vault with correct expiry and holding balance', async function() {
			const _txn1=1000;
			const _rel_time=_defaultHoldTime+Math.floor(new Date() / 1000);
			const _txn2=100;
			const _rel_time2=_defaultHoldTime*2+Math.floor(new Date() / 1000);

			await this.token.addTransactionToVault(_tokenOwner1, _txn1, _rel_time);					
			await this.token.addTransactionToVault(_tokenOwner1, _txn2, _rel_time2);

			await this.token.addTransactionToVault(_tokenOwner2, _txn2, _rel_time);					
			await this.token.addTransactionToVault(_tokenOwner2, _txn1, _rel_time2);
			await this.token.addTransactionToVault(_tokenOwner2, _txn2, _rel_time2);

			const _txn_count1 = await this.token.getTransactionCount(_tokenOwner1);
			_txn_count1.should.be.bignumber.equal(2);			

			const _txn_count2 = await this.token.getTransactionCount(_tokenOwner2);
			_txn_count2.should.be.bignumber.equal(3);			

			const inVaultBal1=await this.token.getTransactionBalance(_tokenOwner1, 0);
			inVaultBal1.should.be.bignumber.equal(_txn1);
			const inVaultExp1=await this.token.getTransactionVestingDate(_tokenOwner1, 0);
			inVaultExp1.should.be.bignumber.equal(_rel_time);

			const inVaultBal2=await this.token.getTransactionBalance(_tokenOwner1, 1);
			inVaultBal2.should.be.bignumber.equal(_txn2);
			const inVaultExp2=await this.token.getTransactionVestingDate(_tokenOwner1, 1);
			inVaultExp2.should.be.bignumber.equal(_rel_time2);

			const inVaultBal21=await this.token.getTransactionBalance(_tokenOwner2, 0);
			inVaultBal21.should.be.bignumber.equal(_txn2);
			const inVaultExp21=await this.token.getTransactionVestingDate(_tokenOwner2, 0);
			inVaultExp21.should.be.bignumber.equal(_rel_time);

			const inVaultBal22=await this.token.getTransactionBalance(_tokenOwner2, 1);
			inVaultBal22.should.be.bignumber.equal(_txn1);
			const inVaultExp22=await this.token.getTransactionVestingDate(_tokenOwner2, 1);
			inVaultExp22.should.be.bignumber.equal(_rel_time2);

			const inVaultBal23=await this.token.getTransactionBalance(_tokenOwner2, 2);
			inVaultBal23.should.be.bignumber.equal(_txn2);
			const inVaultExp23=await this.token.getTransactionVestingDate(_tokenOwner2, 2);
			inVaultExp23.should.be.bignumber.equal(_rel_time2);

			const holdBal=await this.token.getHoldingWalletBalance();
			holdBal.should.be.bignumber.equal(_txn1*2+_txn2*3);
		});

		it('should not release unvested txns', async function() {
			const _txn1=1000;
			const _rel_time=_defaultHoldTime+2*(Math.floor(new Date() / 1000));
			await this.token.addTransactionToVault(_tokenOwner1, _txn1, _rel_time);
			const _txn_count = await this.token.getTransactionCount(_tokenOwner1);
			_txn_count.should.be.bignumber.equal(1);			

			const inVaultBal=await this.token.getTransactionBalance(_tokenOwner1, 0);
			inVaultBal.should.be.bignumber.equal(_txn1);
			const inVaultExp=await this.token.getTransactionVestingDate(_tokenOwner1, 0);
			inVaultExp.should.be.bignumber.equal(_rel_time);

			const holdBalBefore=await this.token.getHoldingWalletBalance();
			holdBalBefore.should.be.bignumber.equal(_txn1);

			await this.token.releaseVestedTransactions(_tokenOwner1);
			
			const holdBalAfter=await this.token.getHoldingWalletBalance();
			holdBalAfter.should.be.bignumber.equal(holdBalBefore);
		});

		it('should release vested txns', async function() {
			const beforeBalOwner=await this.token.balanceOf(_owner);
			beforeBalOwner.should.be.bignumber.equal(_totalSupply);

			const _txn1=1000;
			const _rel_time=_defaultHoldTime+2*(Math.floor(new Date() / 1000));
			await this.token.addTransactionToVault(_tokenOwner1, _txn1, _rel_time);

			const _vested_txn=200;
			const _rel_time2=Math.floor(new Date() / 1000);
			await this.token.addTransactionToVault(_tokenOwner1, _vested_txn, _rel_time2);

			const _txn_count = await this.token.getTransactionCount(_tokenOwner1);
			_txn_count.should.be.bignumber.equal(2);			

			const beforeBal=await this.token.balanceOf(_tokenOwner1);
			beforeBal.should.be.bignumber.equal(0);
			
			const holdBalBefore=await this.token.getHoldingWalletBalance();
			holdBalBefore.should.be.bignumber.equal(_txn1+_vested_txn);

			await this.token.releaseVestedTransactions(_tokenOwner1);

			// // look for vesting event
			// for (var i = 0; i < vestingResult.logs.length; i++) {
			//     var log = vestingResult.logs[i];
			//     console.log(log);
			//     if (log.event == "ReleasedVestedTokens") {
			//     	// see how much we released
			//     	console.log(log.vested_value);
			//     	break;
			//     }
			//  }
			
			const holdBalAfter=await this.token.getHoldingWalletBalance();
			holdBalAfter.should.be.bignumber.equal(_txn1);
			const afterBal=await this.token.balanceOf(_tokenOwner1);
			afterBal.should.be.bignumber.equal(_vested_txn);
			
			// this test changes the blockchain time
			// so should be used right after starting the launch

			await increaseTimeTo(_rel_time);
			await this.token.releaseVestedTransactions(_tokenOwner1);
			const holdBalAfter2=await this.token.getHoldingWalletBalance();
			holdBalAfter2.should.be.bignumber.equal(0);
			const afterBal2=await this.token.balanceOf(_tokenOwner1);
			afterBal2.should.be.bignumber.equal(_txn1+_vested_txn);

			const afterBalOwner=await this.token.balanceOf(_owner);
			afterBalOwner.should.be.bignumber.equal(_totalSupply - _txn1 - _vested_txn);
			
		});		
	})

	//6

	const _founder1 = accounts[5];
	const _founder2 = accounts[6];
	const _founder3 = accounts[7];

	var _founders = [_founder1, _founder2, _founder3];
	var _founders_values = [1000000,100000,10000];
	// for 5 vesting steps
	// we should have:
	//  f1: 200'000, 200'000, 200'000, 200'000, 200'000
	//  f2: 20'000, 20'000, 20'000, 20'000, 20'000
	//  f3: 2'000, 2'000, 2'000, 2'000, 2'000
	

	describe('##FoundersToken testing', function() {
	
		it('founders setup flag - should work only once', async function() {			
			const f_rsetup = await this.token.foundersAreSet();
			assert.equal(f_rsetup, false);
			await this.token.oneTimeSetupForFounders(_founders, _founders_values);
			const f_rsetup2 = await this.token.foundersAreSet();
			assert.equal(f_rsetup2, true);
			await expectThrow(this.token.oneTimeSetupForFounders(_founders, _founders_values), EVMRevert);
		});

		it('can add founders to the vault with correct expiry and holding balance', async function() {			
			await this.token.oneTimeSetupForFounders(_founders, _founders_values);
			const f_1 = await this.token.isAFounder(_founder1);
			assert.equal(f_1, true);
			const f_2 = await this.token.isAFounder(_founder2);
			assert.equal(f_2, true);
			const f_3 = await this.token.isAFounder(_founder3);
			assert.equal(f_3, true);
			const a_1 = await this.token.isAFounder(_admin1);
			assert.equal(a_1, false);
			
			// check vesting
			const f_vsteps = await this.token.foundersVestingSteps();
			const f_vcliff = await this.token.foundersVestingCliff();
			const f_vtsteps = await this.token.foundersVestingTimeStep();
			const f_setupdate = await this.token.foundersSetupDate();
			// console.log("Founder Setup Date: " + f_setupdate + 
			// 	" Cliff: " + f_vcliff +
			// 	" Steps: " + f_vsteps +
			// 	" Time Steps: " + f_vtsteps);

			const _founder1_each_txn = _founders_values[0]/f_vsteps;
			const _founder2_each_txn = _founders_values[1]/f_vsteps;
			const _founder3_each_txn = _founders_values[2]/f_vsteps;

			var f_tv=0;		// transaction value
			var f_tt=0; 	// transaction time
			var f_tc=0; 	// transaction count
			var v_time=0;	
			var v_cliff_no=0;
			v_cliff_no=new Number(f_vcliff);
			f_setup_no=new Number(f_setupdate);

			f_tc = await this.token.getTransactionCount(_founder1);
			//console.log("Txn Count: " + f_tc + " Vesting Count: " + f_vsteps);
			//assert.equal(f_tc, f_vsteps);
			f_tc.should.be.bignumber.equal(f_vsteps);
			
			// founder 1's vesting
			for(var i=0; i<f_vsteps; i++)
			{
				f_tv = await this.token.getTransactionBalance(_founder1, i);
				assert.equal(f_tv, _founder1_each_txn);
				f_tt = await this.token.getTransactionVestingDate(_founder1, i);
				v_time= f_setup_no + (v_cliff_no)+(i*f_vtsteps);
				assert.equal(f_tt, v_time);
			}

			// founder 2's vesting
			for(var i=0; i<f_vsteps; i++)
			{
				f_tv = await this.token.getTransactionBalance(_founder2, i);
				assert.equal(f_tv, _founder2_each_txn);
				f_tt = await this.token.getTransactionVestingDate(_founder2, i);
				v_time= f_setup_no + (v_cliff_no)+(i*f_vtsteps);
				assert.equal(f_tt, v_time);
			}

			// founder 1's vesting
			for(var i=0; i<f_vsteps; i++)
			{
				f_tv = await this.token.getTransactionBalance(_founder3, i);
				assert.equal(f_tv, _founder3_each_txn);
				f_tt = await this.token.getTransactionVestingDate(_founder3, i);
				v_time= f_setup_no + (v_cliff_no)+(i*f_vtsteps);
				assert.equal(f_tt, v_time);
			}

		});
	

		it('a founder cannot transfer tokens before vesting', async function() {

			await this.token.oneTimeSetupForFounders(_founders, _founders_values);
			await expectThrow(this.token.transfer(_tokenReceiver1, 1, {from: _founder1}), EVMRevert);	
		});

		it('a founder\'s funds are released properly after vesting', async function() {
			// check vesting
			const f_vsteps = await this.token.foundersVestingSteps();
			const _founder1_each_txn = _founders_values[0]/f_vsteps;

			await this.token.oneTimeSetupForFounders(_founders, _founders_values);

			f_tt = await this.token.getTransactionVestingDate(_founder1, 0);
			f_tv = await this.token.balanceOf(_founder1);
			console.log("Vesting Time: " + f_tt + " Balance Before: " + f_tv);
			await increaseTimeTo(f_tt);
			await this.token.releaseVestedTransactions(_founder1);
			f_tv = await this.token.balanceOf(_founder1);
			console.log("Vested Value: " + f_tv + " Expected Value: " + _founder1_each_txn);
			assert.equal(f_tv.toNumber(), _founder1_each_txn);

			var txn_1 = 1;
			await this.token.transfer(_tokenReceiver1, txn_1, {from: _founder1});
			var f_funds=f_tv - txn_1;
			f_tv = await this.token.balanceOf(_founder1);
			
			console.log("Funds Now: " + f_tv + " Funds Expected: " + f_funds);
			assert.equal(f_tv.toNumber(), _founder1_each_txn);
		});
		
	});
});