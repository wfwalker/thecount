// thecount.js -- node command-line utility to analyze Firefox Marketplace catalog
// online version at http://wfwalker.github.io/thecount/
// see https://github.com/wfwalker/thecount

var catalog = require('./catalog.js');
var parseArgs = require('minimist');

// MAIN - parse command-line arguments and either build the database or analyze it

var argv = parseArgs(process.argv.slice(2));

if (argv['build']) {
    catalog.createMarketplaceCatalogDB('apps.json');
}

// if (argv['file']) {
//     loadDB('apps.json');
//     whoUsesFile(argv['file']);
// }

// if (argv['permission']) {
//     loadDB('apps.json');
//     whoUsesPermission(argv['permission']);
// }

// if (argv['appcache']) {
//     loadDB('apps.json');
//     whoHasAppcache();
// }

// if (argv['verify']) {
//     loadDB('apps.json');

//     verifyLocales();
// }
