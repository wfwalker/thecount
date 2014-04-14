// thecount.js -- node command-line utility to analyze Firefox Marketplace catalog
// online version at http://wfwalker.github.io/thecount/
// see https://github.com/wfwalker/thecount

var request = require('request');
var fs = require('fs');
var Q = require('q');
var parseArgs = require('minimist');
var url = require('url');
var parseAppcacheManifest = require("parse-appcache-manifest");

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

// creates a Q promise that 
//      resolves upon getting the bytes at the supplied URL
//      rejects otherwise

function getPromiseForRequest(inURL) {
    var deferred = Q.defer();

    theScope.pendingRequests += 1;

    request(inURL, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            theScope.pendingRequests -= 1;
            deferred.resolve(body);
        } else {
            theScope.pendingRequests -= 1;
            // console.log('cannot retrieve ' + inURL + ', ' + error);
            deferred.reject(new Error(error));
        }
    });

    return deferred.promise;
}

// creates a Q promise that 
//      resolves upon getting a response to a HEAD request and returns the content-length header
//      rejects otherwise

function getPromiseForResponseContentSize(inURL) {
    var deferred = Q.defer();

    theScope.pendingRequests += 1;

    request(inURL, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            theScope.pendingRequests -= 1;
            deferred.resolve(response.headers['content-length']);
        } else {
            theScope.pendingRequests -= 1;
            // console.log('cannot retrieve ' + inURL + ', ' + error);
            deferred.reject(new Error(error));
        }
    });

    return deferred.promise;
}


// returns a Q Promise for retrieving and parsing an app's manifest
// catches errors and returns them as JSON

function getManifest(inApp) {
    return getPromiseForRequestAndParseJSON(inApp.manifest_url).catch(function (error) {
        console.log('getManifest ' + inApp.manifest_url + ' CATCH ' + error);
        // TODO: this doesn't seem to work
        return {'error' : error};
    });
}

// returns a Q promise for retrieving an app's appcache manifest
// catches errors and returns them as JSON

function getAppcacheManifest(inApp) {
    var manifestURL = url.parse(inApp.manifest_url);
    var appcacheManifestURL = url.resolve(manifestURL, inApp.manifest.appcache_path);

    return getPromiseForRequest(appcacheManifestURL).catch(function (error) {
        console.log('getAppcacheManifest ' + appcacheManifestURL + ' CATCH ' + error);
        // TODO: this doesn't seem to work
        return {'error' : error};
    });
}

// returns a Q promise for retrieving the size of a resource on the web
// catches errors and returns 0 instead

function getAppcacheManifestEntrySize(inEntryURL) {
    return getPromiseForResponseContentSize(inEntryURL).catch(function (error) {
        // console.log('getAppcacheManifestEntrySize ' + inEntryURL + ' CATCH ' + error);
        // TODO: this doesn't seem to work
        return 0;
    })

}

// adds to the existing array of promises a promise
// to retrieve the size of an entry in the appcache manifest

function addPromiseForAppcacheEntry(subpromises, app, entryURL) {
    subpromises.push(getAppcacheManifestEntrySize(entryURL).then(function (responseContentLength) {
        theScope.apps[app.id].appcache_entry_sizes[entryURL] = responseContentLength;
    }));    
}

// adds to the existing array of promises one or two promises
// to retrieve the app manifest and appcache manifest
    
function addPromiseForManifest(subpromises, app) {
    if (app.manifest_url) {
        var manifestURL = url.parse(app.manifest_url);

        // add a subpromise for the app manifest
        subpromises.push(getManifest(app).then(function (data) {
            theScope.apps[app.id].manifest = data;
            theScope.apps[app.id].appcache_entry_sizes = {};

            if (data.appcache_path) {
                // add a subpromise for the appcache manifest
                subpromises.push(getAppcacheManifest(theScope.apps[app.id]).then(function (appcacheData) {
                    theScope.apps[app.id].appcache_manifest = appcacheData;

                    var entries = parseAppcacheManifest(appcacheData);
                    theScope.apps[app.id].appcache_entry_count = entries.cache.length;

                    for (var entryIndex = 0; entryIndex < entries.cache.length; entryIndex++) {
                        var entry = entries.cache[entryIndex];
                        var entryURL = url.resolve(manifestURL, entry);

                        // add a subpromise for the size of each appcache entry
                        addPromiseForAppcacheEntry(subpromises, app, entryURL);
                    }
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

// CSV REPORT GENERATION --------------------------------------------------------------------------------------

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
        'package size',
        'appcache entries'
    ]);

    for (index in theScope.apps) {
        var app = theScope.apps[index];
        var appNameKeys = Object.keys(app.name);

        var manifestURL = url.parse(app.manifest_url);

        rows.push([
            app.name[appNameKeys[0]].replace(/,/g, ''),
            app.app_type,
            app.premium_type,
            app.ratings ? app.ratings.count : '',
            (app.weekly_downloads != 'null') ? app.weekly_downloads: '',
            app.manifest && app.manifest.size ? app.manifest.size : '',
            app.appcache_entry_count
        ]);
    }

    emitCSV(inOutputFile, rows);
}

// Compute the distribution of packaged app sizes

function emitPackageSizeSummary(inOutputFile) {
    var appTotal = 0.0;
    var appCount = 0;
    var min = 100000000.0;
    var max = 0.0;
    var rows = [];

    var countsByMB = [];

    for (var index = 0; index < 50; index++) {
        countsByMB[index] = 0;
    }

    for (index in theScope.apps) {
        var app = theScope.apps[index];

        if (app.appcache_entry_count > 0) {
            var appcacheEntriesTotal = 0;

            for (var entryIndex in app.appcache_entry_sizes) {
                var entry = app.appcache_entry_sizes[entryIndex];
                if (parseInt(entry) != NaN) {
                    appcacheEntriesTotal += parseInt(entry);
                }
            }

            appTotal = appTotal + Math.round(appcacheEntriesTotal);
            min = Math.min(min, appcacheEntriesTotal);
            max = Math.max(max, appcacheEntriesTotal);
            appCount = appCount + 1;      
        }

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
        rows.push(['"' + index + '"', countsByMB[index]]);
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

    var packaged = 0, privileged = 0, hosted = 0, appcache = 0;

    var desktop = 0, firefoxos = 0, androidtablet = 0, androidmobile = 0;

    var freeapp = 0, premiumapp = 0, freeinapp = 0, premiuminapp = 0;

    for (index in theScope.apps) {
        var app = theScope.apps[index];

        if (app.app_type == 'hosted') { hosted++; }
        if (app.app_type == 'privileged') { privileged++; }
        if (app.app_type == 'packaged') { packaged++; }
        if (app.manifest.appcache_path) { appcache++; }

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
    rows.push(['appcache', appcache]);

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

