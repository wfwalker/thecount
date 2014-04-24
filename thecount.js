// thecount.js -- node command-line utility to analyze Firefox Marketplace catalog
// online version at http://wfwalker.github.io/thecount/
// see https://github.com/wfwalker/thecount

var request = require('request');
var fs = require('fs');
var Q = require('q');
var parseArgs = require('minimist');
var url = require('url');
var parseAppcacheManifest = require("parse-appcache-manifest");
var admZip = require('adm-zip');
var util = require('util');

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

    request({ uri: inURL, strictSSL: false }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            theScope.pendingRequests -= 1;

            try {
                deferred.resolve(JSON.parse(body.trim()));
            }
            catch (e) {
                console.log('cannot parse ' + inURL + ', ' + e);
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
//      resolves upon getting the bytes at the supplied URL, saving them in /tmp,
//      then parsing the manifest.webapp as JSON
//      rejects otherwise

function getPromiseForDownloadPackageAndExtractManifest(inURL, inFilename) {
    var deferred = Q.defer();

    theScope.pendingRequests += 1;

    request({ uri: inURL, strictSSL: false, encoding: null }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            theScope.pendingRequests -= 1;

            try {
                fs.writeFileSync(inFilename, body);
                var zip = new admZip(inFilename);
                var manifestBuffer = zip.readFile("manifest.webapp");
                // console.log(JSON.parse(manifestBuffer));
                deferred.resolve(JSON.parse(manifestBuffer.toString().trim()));
            }
            catch (e) {
                console.log('cannot parse ' + inURL + ', ' + e);
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
        return {'error' : error.toString() };
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
        return {'error' : error.toString() };
    });
}

// returns a Q promise for retrieving an app's appcache manifest
// catches errors and returns them as JSON

function getAppPackageAndExtractManifest(inApp) {
    var filename = '/tmp/' + inApp.id + '.zip';
    var manifestURL = url.parse(inApp.manifest_url);
    var packageURL = url.resolve(manifestURL, inApp.manifest.package_path);
    // console.log('packageURL ' + packageURL);

    return getPromiseForDownloadPackageAndExtractManifest(packageURL, filename).catch(function (error) {
        console.log('getAppPackageAndExtractManifest app.id=' + inApp.id + ' ' + packageURL + ' CATCH ' + error);
        // TODO: this doesn't seem to work
        return {'error' : error.toString() };
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

            // for apps with a package, add a promise to retrieve the package and the manifest inside it
            if (data.package_path) {
                theScope.apps[app.id].miniManifest = data;

                subpromises.push(getAppPackageAndExtractManifest(theScope.apps[app.id]).then(function (manifestFromPackage) {
                    theScope.apps[app.id].manifest = manifestFromPackage;

                    // now that the package is here, grab the filenames
                    var packageFilename = '/tmp/' + app.id + '.zip';
                    var zip = new admZip(packageFilename);
                    var zipEntries = zip.getEntries(); // an array of ZipEntry records
                    theScope.apps[app.id].package_entries = [];

                    zipEntries.forEach(function(zipEntry) {
                        var filename = zipEntry.entryName.substring(zipEntry.entryName.lastIndexOf('/') + 1);
                        theScope.apps[app.id].package_entries.push(filename);
                    });
                }));
            }

            // for apps that use appcache, add promises to retrieve the size of each
            // asset listed in the appcache manifest
            if (data.appcache_path) {
                theScope.apps[app.id].appcache_entry_sizes = {};

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

// QUERIES --------------------------------------------

function getFilenames(inApp) {
    var unionOfFilenames = [];
    var stopNames = ['', 'app.js', 'main.js', 'manifest.webapp', 'zigbert.rsa', 'zigbert.sf', 'manifest.mf', 'ids.json', 'index.html'];

    if (inApp.package_entries) {
        unionOfFilenames.push.apply(unionOfFilenames, inApp.package_entries);
    }

    if (inApp.appcache_entry_sizes) {
        for (var entryIndex in inApp.appcache_entry_sizes) {
            unionOfFilenames.push(entryIndex.substring(entryIndex.lastIndexOf('/') + 1));
        }
    } 

    var uniqueFilenames = unionOfFilenames.filter(function(elem, pos, self) {
        return self.indexOf(elem) == pos;
    });

    var filteredFilenames = uniqueFilenames.filter(function(elem, pos, self) {
        return elem.indexOf('.js') > 0 && stopNames.indexOf(elem) == -1;
    });

    return filteredFilenames;
}

function firstAppName(app) {
    var appNameKeys = Object.keys(app.name);
    return app.name[appNameKeys[0]].replace(/,/g, '');
}

function whoUsesFile(inFilename) {
    console.log('who uses "' + inFilename + "'");
    for (index in theScope.apps) {
        var app = theScope.apps[index];

        var filenames = getFilenames(app);
        if (filenames.indexOf(inFilename) >= 0) {
            console.log(firstAppName(app) + ' by ' + app.author);
        }
    }
}

// VERIFICATION -------------------------------------------------------------------------------

function verifyLocales() {
    for (index in theScope.apps) {
        var app = theScope.apps[index];

        if (app.default_locale) {
            if (app.supported_locales.length == 0) {
                // console.log('app ' + app.id + ' has default locale but no supported_locales');
            }
        }

        if (app.supported_locales.length > 0) {
            if (! app.manifest.locales) {
                console.log('app ' + app.id + ' has supported_locales but no manifest.locales');
            } else if (Object.keys(app.manifest.locales).length != app.supported_locales.length) {
                console.log('app ' + app.id + ' has ' + Object.keys(app.manifest.locales).length + ' manifest locales but ' + app.supported_locales.length + ' supported locales')
            }
        }
    }    
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
        console.log('DONE ALL ' + Object.keys(theScope.apps).length + ', still pending ' + theScope.pendingRequests); 

    }).catch(function (error) {
        console.log('createMarketplaceCatalogDB err ' + error);
    }).finally(function() {
        fs.writeFile(inOutputFile, JSON.stringify(theScope.apps, null, 4), function(err) {
            if (err) {
              console.log('error writing JSON: ' + err);
            } else {
              console.log("JSON saved to " + inOutputFile);
            }
        }); 
    });
}

// MAIN - parse command-line arguments and either build the database or analyze it

var argv = parseArgs(process.argv.slice(2));

if (argv['build']) {
    createMarketplaceCatalogDB('apps.json');
}

if (argv['file']) {
    loadDB('apps.json');
    whoUsesFile(argv['file']);
}

if (argv['verify']) {
    loadDB('apps.json');

    verifyLocales();
}
