pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";

contract GramICrowdSale is Crowdsale {

	//event Here(bytes32 where);
	event Here();
	uint256 public _state;

	constructor(
			uint256 _rate, 
			address _wallet, 
			ERC20 _token
	) 
		Crowdsale(_rate, _wallet, _token)
		public {

			emit Here();

	}

	

	function () external payable {
    	//buyTokens(msg.sender);
    	//emit Here("Here I am ");
    	//emit Here();
    	super.buyTokens(msg.sender);
  	}

  	function somefunc() public payable  {
  		//_state=1;
  		emit Here();


  	}
}