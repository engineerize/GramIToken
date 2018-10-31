var Grami = artifacts.require("./GramIToken.sol");

module.exports = function(deployer) {
	const _name = "GramI Token";
	const _symbol = "GramI";
	const _decimals = 4;
	const _defaultHoldTime = 120;
	const _defaultNoSellUnixTime = 0;
  	deployer.deploy(Grami, _name, _symbol, _decimals, _defaultHoldTime, _defaultNoSellUnixTime);
};
