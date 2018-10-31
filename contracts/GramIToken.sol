pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract MultiAdmin is Ownable{
	mapping (address => bool) public isAdmin;  
    
    modifier onlyAdmin() {
        require(msg.sender == owner || isAdmin[msg.sender] == true);
        _;
    }

    // add admin
    function addAdmin(address _admin) payable public onlyOwner returns (bool) {
        isAdmin[_admin]=true;
        return true;
    }
    
    // remove admin
    function removeAdmin(address _admin) payable public onlyOwner returns (bool) {
        isAdmin[_admin]=false;
        return true;
    }
}

contract VaultedToken is BasicToken, MultiAdmin {
	using SafeMath for uint256;

	// token vault
    // 
    // each transfer will be put in the vault [address][transfer0...N][balance1...N]
    // each transfer will be put in a separate transfer index 
    // each transfer will also increment tokenVaultCount per address
    // each transfer's held date will be stored in tokenVaultReleaseDates per index
    // 
    // tokenVault[0xda3e3b90775AE1a07e2Baf323B7608f41CB2E2a7][0] = 1000;
    // tokenVault[0xda3e3b90775AE1a07e2Baf323B7608f41CB2E2a7][1] = 500;
    // tokenVault[0xda3e3b90775AE1a07e2Baf323B7608f41CB2E2a7][2] = 300;
    // tokenVaultCount[0xda3e3b90775AE1a07e2Baf323B7608f41CB2E2a7] == 3;
    // tokenVaultReleaseDates[0xda3e3b90775AE1a07e2Baf323B7608f41CB2E2a7][0] = 1539105855; // now
    // tokenVaultReleaseDates[0xda3e3b90775AE1a07e2Baf323B7608f41CB2E2a7][1] = 1570579200; // now + 1 year
    // tokenVaultReleaseDates[0xda3e3b90775AE1a07e2Baf323B7608f41CB2E2a7][2] = 1541721600; // now + 1 month
    mapping(address => mapping (uint => uint)) public tokenVault; // balance per address per transfer
    mapping(address => mapping (uint => uint256)) public tokenVaultReleaseDates; // releaes dates per transfer
    mapping(address => uint) public tokenVaultCount; // how many entries per address in the vault
    
    uint256 public holdingWallet = 0; // transfer tokens from owner to holding Vault and release upon vesting 	

    event ReleasedVestedTokens(address indexed vested_address, uint256 vested_value);

    constructor() 
    	Ownable()
    	public {
    		
    	}

    function vaultAddTransaction(address _address, uint256 _value, uint256 _releaseDate) internal {
    	require(_address!=0x0);    	

    	holdingWallet=holdingWallet.add(_value);

    	uint256 i = tokenVaultCount[_address];
    	tokenVault[_address][i] = _value;
    	tokenVaultCount[_address]=i.add(1);
        tokenVaultReleaseDates[_address][i]=_releaseDate;    
    }

    //
    function releaseVestedTransactions(address _address) public onlyOwner payable {
    	//address _address = msg.sender;
    	require(_address!=0x0);

        uint256 _vestedAmount=0;

    	for(uint256 i=0; i<tokenVaultCount[_address]; i++)
    	{
    		if(tokenVaultReleaseDates[_address][i]<=block.timestamp)
    		{
    			// releaseable;
				uint256 amount = tokenVault[_address][i];
    			if(amount>0)
                {
                    tokenVault[_address][i]=0;
                    _vestedAmount=_vestedAmount.add(amount);
                    holdingWallet=holdingWallet.sub(amount);                                        
                }
    		}
    	}

        if(_vestedAmount>0)
        {
            super.transfer(_address,_vestedAmount);
            emit ReleasedVestedTokens(_address, _vestedAmount);
        }
    }

    function getTransactionCount(address _address) public view returns (uint256) {
        require(_address!=0x0);
        return tokenVaultCount[_address];
    }

    function getTransactionBalance(address _address, uint256 _txn_index) public view returns (uint256) {
        require(_address!=0x0);
        require(_txn_index<tokenVaultCount[_address]);
        return tokenVault[_address][_txn_index];
    }

    function getTransactionVestingDate(address _address, uint256 _txn_index) public view returns (uint256) {
        require(_address!=0x0);
        require(_txn_index<tokenVaultCount[_address]);
        return tokenVaultReleaseDates[_address][_txn_index];
    }

    function getHoldingWalletBalance() onlyAdmin public view returns (uint256) {
        return(holdingWallet);
    }
}


contract EnumerableToken is MultiAdmin {
	using SafeMath for uint256;

	// token owners
    uint256 private numberOfTokenOwners = 0;
    mapping (uint256 => address) private tokenOwnersList; // all the addresses of owners indexed by 0, 1, 2, ... , numberOfTokenOwners-1
    mapping (address => uint256) private tokenOwnersListIndex; // address to index mapping

    constructor() public {
    	tokenOwnersList[0] = 0x0;	
    }

    function ownerAdd(address new_owner) internal {
    	if(tokenOwnersListIndex[new_owner] == 0)	// make sure the owner does not exist before
    	{
    		numberOfTokenOwners=numberOfTokenOwners.add(1);	// it is one-based index
	    	tokenOwnersList[numberOfTokenOwners]=new_owner;
	        tokenOwnersListIndex[new_owner]=numberOfTokenOwners;	        
	    }   
    }

    function getTokenOwnerCount() public view onlyAdmin returns (uint256) {
    	return numberOfTokenOwners;
    }

    // it is a one-based index
    function getTokenOwnerAtIndex(uint256 _index) view onlyAdmin public returns (address) {
    	require(_index<=numberOfTokenOwners);
    	return tokenOwnersList[_index];
    }

    function getTokenOwnersIndex(address _address) view onlyAdmin public returns (uint256) {
    	return tokenOwnersListIndex[_address];
    }
}

contract FoundersToken is VaultedToken {
    using SafeMath for uint256;
    using SafeERC20 for ERC20Basic;

    uint constant MAX_FOUNDERS_COUNT = 10;
    uint constant MAX_SCHEDULE_COUNT = 10;
    uint constant FULLY_VESTED_STEP = MAX_SCHEDULE_COUNT; // better readibility

    // founders 
    bool public foundersAreSet = false;         // ONLY ONE SETUP is allowed
    uint8 public foundersVestingSteps;          // Number of vesting steps. For example, a three year vesting has three steps with 33.33% vesting each year
    uint256 public foundersVestingTimeStep;
    uint256 public foundersVestingCliff;
    uint256[] public foundersVestingSchedule;
    uint256 public foundersSetupDate;           // date when founders were setup

    mapping ( address => bool ) public isFounder;

    event foundersAreSetEvent();
    event founderVestingSet(address _founder, uint _step, uint _value, uint _vestTime);
    event founderRevokedEvent(address _founder);

    constructor(uint8 _foundersVestingSteps, uint256 _foundersVestingCliff, uint256 _foundersVestingTimeStep) public
            
    {
        require(_foundersVestingSteps>0 && _foundersVestingSteps<=MAX_SCHEDULE_COUNT);
        require(_foundersVestingTimeStep>0);// to setup schedule after each timestep
        
        foundersAreSet = false;
        foundersVestingSteps = _foundersVestingSteps;
        foundersVestingCliff = _foundersVestingCliff;
        foundersVestingTimeStep = _foundersVestingTimeStep;              
    }

    function oneTimeSetupForFounders(address[] _founders, uint256[] _values) public payable onlyOwner 
    {
        require(foundersAreSet==false);
        require(_founders.length>=0 && _founders.length<=MAX_FOUNDERS_COUNT);
        require(_values.length==_founders.length);

        uint256 nowTime = now;
        foundersVestingSchedule = new uint256[](foundersVestingSteps);
    
        for(uint256  i=0; i<foundersVestingSteps; i++)
        {
            foundersVestingSchedule[i]=(nowTime.add(foundersVestingCliff).add(i.mul(foundersVestingTimeStep)));
        }

        uint256 _valuePerVestingStep=0;
        for(f=0; f<_founders.length; f++)
        {
            _valuePerVestingStep=_values[f].div(foundersVestingSteps);
            for(uint256 s=0; s<foundersVestingSteps; s++)
            {                   
                vaultAddTransaction(_founders[f], _valuePerVestingStep, foundersVestingSchedule[s]);
                //emit founderVestingSet(_founders[f], s, _valuePerVestingStep, foundersVestingSchedule[s]);
            }
        }
        
        for(uint256 f=0; f<_founders.length; f++)
        {
            isFounder[_founders[f]]=true;
        }

        foundersSetupDate=nowTime;
        foundersAreSet=true;

        emit foundersAreSetEvent();
    }

    function revokeFoundersUnVestedTokens(address _founder) public onlyOwner payable returns (bool)
    {
        require(foundersAreSet==true);
        require(isFounder[_founder]==true);
        require(tokenVaultCount[_founder]>0 && tokenVaultCount[_founder]>=foundersVestingSteps);
        // since there may be more than the vesting transactions, we should only work with the first
        // so may transactions.
        uint256 nowT=now;
        uint256 _unvestedAmount=0;

        for (uint256 i=0;i<foundersVestingSteps; i++)
        {
            if(tokenVaultReleaseDates[_founder][i]>nowT)
            {
                // have not vested yet
                _unvestedAmount=tokenVault[_founder][i];
                tokenVault[_founder][i]=0;                
            }
        }

        if(_unvestedAmount>0)
        {
            // transfer to owner
            super.transfer(owner, _unvestedAmount); 
            emit founderRevokedEvent(_founder);
        }
        
        return true;
    }

    function isAFounder(address _address) public view returns (bool) {
        require(foundersAreSet);
        return isFounder[_address];
    }
}

contract GramIToken is StandardToken, DetailedERC20, MultiAdmin, VaultedToken, EnumerableToken, FoundersToken {

    uint256 defaultHoldTimeInSeconds=0;   // same time added to each txn
    uint256 defaultNoSellUnixTime=0;      // each txn is held till this unixtime
    uint8 public _foundersVestingSteps=5;
    uint256 _foundersVestingCliff=3600; 
    uint256 _foundersVestingTimeStep=1200;
    bool bTransferInProgress=false;
    bool bTransferPaused=false;

    modifier onlyWhenNotPaused() {
        require(bTransferPaused==false);
        _;
    }

    event Paused();
    event UnPaused();
    event Mint(uint256 _mintCount, uint256 _newTotal);
    event Burn(uint256 _burnCount, uint256 _newTotal);

	constructor(string _name, string _symbol, uint8 _decimals, uint256 _defaultHoldTimeInSeconds, uint256 _defaultNoSellUnixTime) 
		DetailedERC20(_name, _symbol, _decimals) 
		EnumerableToken()
		VaultedToken()
        FoundersToken(_foundersVestingSteps, _foundersVestingCliff, _foundersVestingTimeStep)
		public 
	{
        defaultHoldTimeInSeconds=_defaultHoldTimeInSeconds;
        defaultNoSellUnixTime=_defaultNoSellUnixTime;

		totalSupply_ = 100000000;
		
        balances[owner] = totalSupply_;
		addTokenOwner(owner);
	}

    function resetTransferInProgress() public payable onlyAdmin returns (bool) {
        bTransferInProgress=false;
    }

    function addTransactionToVault(address _to, uint256 _value, uint256 _availableOn) public payable onlyOwner {
        vaultAddTransaction(_to, _value, _availableOn);
    }

    function addTokenOwner(address _newOwner) public payable onlyOwner {
        ownerAdd(_newOwner);
    }

    function setHoldTimeInSecondsForEachTransaction(uint256 _newDefault) public payable onlyAdmin {
        defaultHoldTimeInSeconds=_newDefault;
    }

    function setNoSellUnixTimeLimit(uint256 _newDefault) public payable onlyAdmin {
        defaultNoSellUnixTime=_newDefault;
    }

    function pauseTransfers() public payable onlyAdmin {
        bTransferPaused=true;
        emit Paused();
    }

    function unpauseTransfers() public payable onlyAdmin {
        bTransferPaused=false;
        emit UnPaused();
    }

    function mintTokens(uint256 _tokensToAdd) public payable onlyAdmin {
        balances[owner]=balances[owner].add(_tokensToAdd);
        totalSupply_=totalSupply_.add(_tokensToAdd);
        emit Mint(_tokensToAdd, totalSupply_);
    }

    function burnTokens(uint256 _value) public payable onlyAdmin {
        require(_value <= balances[owner]);
        balances[owner] = balances[owner].sub(_value);
        totalSupply_ = totalSupply_.sub(_value);
        emit Burn(_value, totalSupply_);
    }

    function transfer(address _to, uint256 _value) public onlyWhenNotPaused returns (bool)  {

        require(_value <= balances[msg.sender]);
        require(_to != address(0));

        if(defaultHoldTimeInSeconds>0 || defaultNoSellUnixTime>now)
        {
            require(bTransferInProgress==false);
            bTransferInProgress=true;

            uint256 _availableOn=now;

            if(defaultHoldTimeInSeconds>0 && defaultNoSellUnixTime<=now)
                _availableOn=now.add(defaultHoldTimeInSeconds);
            else if(defaultNoSellUnixTime>=now && defaultHoldTimeInSeconds==0)
                _availableOn=defaultNoSellUnixTime;

            vaultAddTransaction(_to, _value, _availableOn);
            balances[owner] = balances[owner].sub(_value);
            bTransferInProgress=false;
            emit Transfer(msg.sender, _to, _value);
        }
        else
        {
                require(super.transfer(_to, _value));
        }

        ownerAdd(_to);

        return true;
    }

    // ------------------------------------------------------------------------
    // Don't accept ETH
    // ------------------------------------------------------------------------
    function () public payable {
        revert();
    }
    /**
    * @dev Transfer all Ether held by the contract to the owner.
    */
    function reclaimEther() public onlyOwner {
        owner.transfer(address(this).balance);
    }
}
