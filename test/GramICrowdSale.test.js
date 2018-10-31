const { ether } =require('openzeppelin-solidity/test/helpers/ether.js');

const BigNumber = web3.BigNumber;
require('chai')
	.use(require('chai-bignumber')(BigNumber))
	.should();

const GramIToken = artifacts.require('GramIToken');
const GramICrowdSale = artifacts.require('GramICrowdSale');

contract('GramICrowdsale', function(accounts) {

	const _name = 'GramI Token';
	const _symbol = 'GramI';
	const _decimals = 4;
	const _defaultHoldTime = 0; //86400; // 1 day
	const _defaultNoSellTime = 0;

	const _totalSupply = 100000000;

	const _owner = accounts[0];
	const _admin1 = accounts[1];
	const _admin2 = accounts[2];
	const _investor1 = accounts[3];
	const _investor2 = accounts[4];
	const _tokenReceiver1 = accounts[5];
	const _tokenReceiver2 = accounts[6];
	const _crowdsale_tokens = 17500000;

	beforeEach(async function() {
		this.token = await GramIToken.new(_name, _symbol, _decimals, _defaultHoldTime, _defaultNoSellTime);		

		this.rate = 50;
		this.wallet = _owner;
		
		this.crowdsale = await GramICrowdSale.new(this.rate, this.wallet, this.token.address);

		// transfer 1750 tokens to crowdsale
		await this.token.transfer(this.crowdsale.address, _crowdsale_tokens, {from: _owner});

	});

	describe('Crowdsale Setup', function() {
		it('tracks the token', async function() {
			const tok=await this.crowdsale.token();
			tok.should.equal(this.token.address);
		})

		it('tracks the wallet', async function() {
			const wall=await this.crowdsale.wallet();
			wall.should.equal(this.wallet);
		})

		it('tracks the rate', async function() {
			const rate=await this.crowdsale.rate();
			rate.should.be.bignumber.equal(this.rate);
		})

		it('has the expected number of tokens to sell', async function() {
			const cs_balance=await this.token.balanceOf(this.crowdsale.address);
			//console.log("Crowdsale Balance: " + cs_balance + " Expected: " + _crowdsale_tokens);
			cs_balance.should.be.bignumber.equal(_crowdsale_tokens);		
		})
	});

	describe('Accepts Payment', function() {
		it('should accept payment', async function () {
			const value=ether(1);
			await this.crowdsale.sendTransaction({value: value, from: _investor1 });
		});
	});

	describe('somefunc', function() {
		it('should have an event', async function() {
			const ret=await this.crowdsale.somefunc();
			console.log(ret.logs[0].event);			
			//ret.should.be.bignumber.equal(1);

			
		})
	})



});
