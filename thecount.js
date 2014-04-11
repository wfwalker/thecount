// thecount.js -- node command-line utility to analyze Firefox Marketplace catalog
// online version at http://wfwalker.github.io/thecount/
// see https://github.com/wfwalker/thecount

var request = require('request');
var fs = require('fs');
var Q = require('q');
var parseArgs = require('minimist');
var url = require('url');

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
                // console.log('cannot parse ' + inURL + ', ' + e);
                deferred.reject(new Error(e));
            }
        } else {
            theScope.pendingRequests -= 1;
            // console.log('cannot retrieve ' + inURL + ', ' + error);
            deferred.reject(new Error(error));
        }
    });

    return deferred.promise;
}

function getPromiseForRequest(inURL) {
    var deferred = Q.defer();

    theScope.pendingRequests += 1;

    request(inURL, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            theScope.pendingRequests -= 1;
            deferred.resolve(body);
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
        // console.log('MANIFEST CATCH ' + error);
        // TODO: this doesn't seem to work
        return {'error' : error};
    });
}

// returns a Q promise for retrieving an app's appcache manifest

function getAppcacheManifest(inApp) {
    var manifestURL = url.parse(inApp.manifest_url);
    var appcacheManifestURL = url.resolve(manifestURL, inApp.manifest.appcache_path);

    return getPromiseForRequest(appcacheManifestURL).catch(function (error) {
        console.log('APPCACHE MANIFEST CATCH ' + error);
        // TODO: this doesn't seem to work
        return {'error' : error};
    });
}

// adds to the existing array of promises one or two promises
// to retrieve the app manifest and appcache manifest
    
function addPromiseForManifest(subpromises, app) {
    if (app.manifest_url) {
        // add a subpromise for the app manifest
        subpromises.push(getManifest(app).then(function (data) {
            theScope.apps[app.id].manifest = data;

            if (data.appcache_path) {
                console.log('found ' + data.appcache_path);
                // add a subpromise for the appcache manifest
                subpromises.push(getAppcacheManifest(theScope.apps[app.id]).then(function (appcacheData) {
                    theScope.apps[app.id].appcache_manifest = appcacheData;
                }));
            }
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

// returns a Q promise to retrieve the entire firefox marketplace catalog

function findAppData() {
    return searchAppData('https://marketplace.firefox.com/api/v1/apps/search/?format=JSON&limit=200');
}

// CVS REPORT GENERATION --------------------------------------------------------------------------------------

// Emitting CSV into the given file for the given data rows

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

// emit a table with one row per app showing various attributes

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

// Compute the distribution of packaged app sizes

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

function emitPermissionUsageSummary(inOutputFile) {
    var rows = [];

    var permissionCounts = {};
    var appsFound = 0;

    for (index in theScope.apps) {
        var app = theScope.apps[index];

        if (app.manifest.permissions) {
            appsFound++;

            var permissionKeys = Object.keys(app.manifest.permissions);
            for (var permissionsIndex in permissionKeys) {
                var permission = permissionKeys[permissionsIndex];

                if (permissionCounts[permission]) {
                    permissionCounts[permission]++;
                } else {
                    permissionCounts[permission] = 1;
                }
            }
        }
    }

    rows.push(['total', appsFound]);
    
    for (countKey in permissionCounts) {
        var count = permissionCounts[countKey];
        rows.push([countKey, count]);
    }

    emitCSV(inOutputFile, rows);
}


// Build a summary of all the common attributes of apps

function emitAppKindSummary(inOutputFile) {
    var rows = [];

    var packaged = 0, privileged = 0, hosted = 0;

    var desktop = 0, firefoxos = 0, androidtablet = 0, androidmobile = 0;

    var freeapp = 0, premiumapp = 0, freeinapp = 0, premiuminapp = 0;

    for (index in theScope.apps) {
        var app = theScope.apps[index];

        if (app.app_type == 'hosted') { hosted++; }
        if (app.app_type == 'privileged') { privileged++; }
        if (app.app_type == 'packaged') { packaged++; }

        if (app.premium_type == 'free') { freeapp++; }
        if (app.premium_type == 'premium') { premiumapp++; }
        if (app.premium_type == 'free-inapp') { freeinapp++; }
        if (app.premium_type == 'premium-inapp') { premiuminapp++; }

        if (app.device_types.indexOf('desktop') > -1) { desktop++; }
        if (app.device_types.indexOf('firefoxos') > -1) { firefoxos++; }
        if (app.device_types.indexOf('android-tablet') > -1) { androidtablet++; }
        if (app.device_types.indexOf('android-mobile') > -1) { androidmobile++; }
    }

    rows.push(['total', Object.keys(theScope.apps).length]);
    rows.push(['hosted', hosted]);
    rows.push(['privileged', privileged]);
    rows.push(['packaged', packaged]);

    rows.push(['free', freeapp]);
    rows.push(['premium', premiumapp]);
    rows.push(['free-inapp', freeinapp]);
    rows.push(['premium-inapp', premiuminapp]);

    rows.push(['desktop', desktop]);
    rows.push(['firefoxos', firefoxos]);
    rows.push(['android-tablet', androidtablet]);
    rows.push(['android-mobile', androidmobile]);

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
    emitAppKindSummary('app-kind-summary.csv');
    emitPermissionUsageSummary('app-permission-summary.csv');
}

