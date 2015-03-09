// thecount.js -- node command-line utility to analyze Firefox Marketplace catalog
// online version at http://wfwalker.github.io/thecount/
// see https://github.com/wfwalker/thecount

var catalog = require('./catalog.js');
var parseArgs = require('minimist');

// MAIN - parse command-line arguments and either build the database or analyze it

var argv = parseArgs(process.argv.slice(2));

if (argv['build']) {
    catalog.createMarketplaceCatalogDB('apps.json');

    setInterval(function() {
    	var report = catalog.progressReport();
    	report.errorApps = report.errorApps.length; 
    	console.log("\033[2J\033[;H");
    	console.log(report);
	}, 5000);
}

