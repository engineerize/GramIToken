
module.exports = {

  networks: {
		development: {
			host: "127.0.0.1",
			port: 8544,
			network_id: "*" // Match any network
		}
  },	
  solc: {
  	optimizer: {
  		enabled: true,
  		runs: 200
  	}
  }
};
