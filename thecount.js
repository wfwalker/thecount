// thecount.js -- node command-line utility to analyze Firefox Marketplace catalog
// online version at http://wfwalker.github.io/thecount/
// see https://github.com/wfwalker/thecount

var request = require('request');
var fs = require('fs');
var Q = require('q');
var parseArgs = require('minimist');

// global scope

var theScope = {};
theScope.apps = {};
theScope.pendingRequests = 0;

// creates a Q promise that
//      resolves upon getting the bytes at the supplied URL and parsing them as JSON
//      rejects otherwise

function getPromiseForRequestAndParseJSON(inURL) {
    var deferred = Q.defer();

    theScope.pendingRequests += 1;

    request(inURL, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            theScope.pendingRequests -= 1;

            try {
                deferred.resolve(JSON.parse(body));
            }
            catch (e) {
                console.log('cannot parse ' + inURL + ', ' + e);
                deferred.reject(new Error(e));
            }
        } else {
            theScope.pendingRequests -= 1;
            console.log('cannot retrieve ' + inURL + ', ' + error);
            deferred.reject(new Error(error));
        }
    });

    return deferred.promise;
}

// returns a Q Promise for retrieving and parsing an app's manifest

function getManifest(inApp) {
    return getPromiseForRequestAndParseJSON(inApp.manifest_url).catch(function (error) {
        console.log('MANIFEST CATCH ' + error);
        // TODO: this doesn't seem to work
        return {'error' : error};
    });
}

    
function addPromiseForManifest(subpromises, app) {
    if (app.manifest_url) {
        subpromises.push(getManifest(app).then(function (data) {
            theScope.apps[app.id].manifest = data;
        }));
    }
}

// returns a Q Promise for searching the Apps catalog using the Marketplace API

function searchAppData(inSearchURL) {
    return getPromiseForRequestAndParseJSON(inSearchURL).then(function (data) {
        // resolved
        var subpromises = [];

        for (index in data.objects) {
            var app = data.objects[index];
            theScope.apps[app.id] = app;
            addPromiseForManifest(subpromises, app);
        }

        if (data.meta.next) {
            console.log(data.meta.offset + '/' + data.meta.total_count + ' pending ' + theScope.pendingRequests + ' size ' + Object.keys(theScope.apps).length);
            subpromises.push(searchAppData('https://marketplace.firefox.com' + data.meta.next));
        }

        return Q.all(subpromises);
    });
}

function findAppData() {
    return searchAppData('https://marketplace.firefox.com/api/v1/apps/search/?format=JSON&limit=200');
}

// Emitting CSV

function emitCSV(inOutputFile, inData) {
    var stream = fs.createWriteStream(inOutputFile);

    stream.once('open', function(fd) {
        for (var index in inData) {
            var row = inData[index];
            stream.write(row.join(',') + '\n');
        }
        stream.end();

        console.log('wrote ' + inData.length + ' rows to ' + inOutputFile);
    });     
}

function emitPackageSizeTable(inOutputFile) {

    var rows = [];

    rows.push([
        'name',
        'type',
        'payments',
        'ratings',
        'weekly_downloads',
        'package size'
    ]);

    for (index in theScope.apps) {
        var app = theScope.apps[index];
        var appNameKeys = Object.keys(app.name);

        rows.push([
            app.name[appNameKeys[0]].replace(/,/g, ''),
            app.app_type,
            app.premium_type,
            app.ratings ? app.ratings.count : '',
            (app.weekly_downloads != 'null') ? app.weekly_downloads: '',
            app.manifest && app.manifest.size ? app.manifest.size : ''
        ]);
    }

    emitCSV(inOutputFile, rows);
}

function emitPackageSizeSummary(inOutputFile) {
    var appTotal = 0;
    var appCount = 0;
    var min = 100000000;
    var max = 0;
    var rows = [];

    var countsByMB = [];

    for (var index = 0; index < 50; index++) {
        countsByMB[index] = 0;
    }

    for (index in theScope.apps) {
        var app = theScope.apps[index];

        if (app.manifest && app.manifest.size) {
            var mb = Math.round(app.manifest.size / 1000000);
            countsByMB[mb] = countsByMB[mb] + 1;

            appTotal = appTotal + Math.round(app.manifest.size);
            min = Math.min(min, app.manifest.size);
            max = Math.max(max, app.manifest.size);
            appCount = appCount + 1;
        }
    }

    rows.push(['total', appTotal]);
    rows.push(['count', appCount]);
    rows.push(['average', Math.round(appTotal / appCount)]);
    rows.push(['min', min]);
    rows.push(['max', max]);

    rows.push(['size', 'count']);

    for (var index = 0; index < 50; index++) {
        rows.push([index, countsByMB[index]]);
    }

    emitCSV(inOutputFile, rows);
}

// Creating and Loading the local database

function loadDB(inJSONFilename) {
    var raw = fs.readFileSync(inJSONFilename);

    try {
        theScope.apps = JSON.parse(raw); 
        console.log('loaded ' + Object.keys(theScope.apps).length + ' objects');
    }
    catch (e) {
        console.log('cannot parse ' + inJSONFilename + ', ' + e);
        theScope.apps = [];
    }
}

function createMarketplaceCatalogDB(inOutputFile) {
    return findAppData().then(function() {
        console.log('DONE ALL ' + theScope.apps.length); 

        fs.writeFile(inOutputFile, JSON.stringify(theScope.apps, null, 4), function(err) {
            if (err) {
              console.log(err);
            } else {
              console.log("JSON saved to " + inOutputFile);
            }
        }); 
    }).catch(function (error) {
        console.log('create err ' + error);
    });
}

// MAIN - parse command-line arguments and either build the database or analyze it

var argv = parseArgs(process.argv.slice(2));

if (argv['build']) {
    createMarketplaceCatalogDB('apps.json');
}

if (argv['emit']) {
    loadDB('apps.json');
    emitPackageSizeSummary('package-size-summary.csv');
    emitPackageSizeTable('marketplace-app-table.csv');
}

