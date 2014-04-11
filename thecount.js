var request = require('request');
var fs = require('fs');
var Q = require('q');

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
            try {
                theScope.pendingRequests -= 1;
                deferred.resolve(JSON.parse(body));
            }
            catch (e) {
                theScope.pendingRequests -= 1;
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

function emitPackageSizeTable(inDB) {
    var fieldNames = [
        'name',
        'type',
        'package size'
    ];

    console.log(fieldNames.join(','));

    for (index in inDB) {
        var app = inDB[index];
        var appNameKeys = Object.keys(app.name);

        var csvFields = [
            app.name[appNameKeys[0]],
            app.app_type,
            app.manifest && app.manifest.size ? app.manifest.size : ''
        ];

        console.log(csvFields.join(','));
    }
}

function emitPackageSizeSummary(inDB) {

    var appTotal = 0;
    var appCount = 0;
    var min = 100000000;
    var max = 0;

    var countsByMB = [];

    for (var index = 0; index < 50; index++) {
        countsByMB[index] = 0;
    }

    for (index in inDB) {
        var app = inDB[index];

        if (app.manifest && app.manifest.size) {
            var mb = Math.round(app.manifest.size / 1000000);
            countsByMB[mb] = countsByMB[mb] + 1;

            appTotal = appTotal + Math.round(app.manifest.size);
            min = Math.min(min, app.manifest.size);
            max = Math.max(max, app.manifest.size);
            appCount = appCount + 1;
        }
    }

    console.log('total,' + appTotal);
    console.log('count,' + appCount);
    console.log('average,' + Math.round(appTotal / appCount));
    console.log('min,' + min);
    console.log('max,' + max);

    var fieldNames = [
        'size',
        'count'
    ];

    console.log(fieldNames.join(','));

    for (var index = 0; index < 50; index++) {
        var csvFields = [
            index, countsByMB[index]
        ];

        console.log(csvFields.join('\t'));
    }

}


function emitCSV(inJSONFilename) {
    var raw = fs.readFileSync(inJSONFilename);

    try {
        var data = JSON.parse(raw); 

        emitPackageSizeTable(data);
        emitPackageSizeSummary(data);
    }
    catch (e) {
        console.log('cannot parse ' + inJSONFilename + ', ' + e);
    }
}

function createMarketplaceCatalogDB(inOutputFile) {
    return findAppData().then(function() {
        console.log('DONE ALL ' + theScope.apps.length); 

        fs.writeFile(inOutputFile, JSON.stringify(theScope.apps, null, 4), function(err) {
            if(err) {
              console.log(err);
            } else {
              console.log("JSON saved to " + inOutputFile);
            }
        }); 
    }).catch(function (error) {
        console.log('create err ' + error);
    });
}

//createMarketplaceCatalogDB('apps.json');

emitCSV('apps.json');


