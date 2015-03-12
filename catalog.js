// thecount.js -- node command-line utility to analyze Firefox Marketplace catalog
// online version at http://wfwalker.github.io/thecount/
// see https://github.com/wfwalker/thecount

var request = require('request');
var fs = require('fs');
var Q = require('q');
var url = require('url');
var parseAppcacheManifest = require("parse-appcache-manifest");
var admZip = require('adm-zip');
var util = require('util');
var cheerio = require('cheerio');

var winston = require('winston');
var logger = new (winston.Logger)({
    transports: [
        // TODO: only show debug logs if this is dev server
        new (winston.transports.Console)({ level: 'info' }),
        new (winston.transports.File)({ filename: 'thecountbuilder.log' })
    ]
});

// global scope

var theScope = {};
theScope.apps = {};
theScope.pendingRequests = 0;
theScope.finishedRequests = 0;
theScope.isRunning = false;
theScope.timeout = 240000;

// creates a Q promise that 
//      resolves upon getting the bytes at the supplied URL and parsing them as JSON
//      rejects otherwise

function requestAndParseJSON(inURL) {
    var deferred = Q.defer();

    theScope.pendingRequests += 1;

    logger.debug('about to request', inURL);

    request({ uri: inURL, strictSSL: false, timeout: theScope.timeout }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            theScope.pendingRequests -= 1;

            try {
                logger.debug('about to parse JSON', inURL);
                var parsedJSON = JSON.parse(body.trim());
                logger.debug('parsed JSON', inURL);
                deferred.resolve(parsedJSON);
            }
            catch (e) {
                logger.error('Cannot parse JSON', inURL);
                deferred.reject(new Error(e));
            }
        } else {
            theScope.pendingRequests -= 1;
            theScope.finishedRequests += 1;
            logger.error('Cannot retrieve JSON', inURL);
            deferred.reject(new Error(error));
        }
    });

    logger.debug('done requesting', inURL);

    return deferred.promise;
}

// creates a Q promise that 
//      resolves upon getting the bytes at the supplied URL, saving them in /tmp,
//      then parsing the manifest.webapp as JSON
//      rejects otherwise

function getPromiseForDownloadPackageAndExtractManifest(inURL, inFilename) {
    var deferred = Q.defer();

    theScope.pendingRequests += 1;

    logger.debug('about to request', inURL);   

    request({ uri: inURL, strictSSL: false, timeout: theScope.timeout, encoding: null }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            theScope.pendingRequests -= 1;
            theScope.finishedRequests += 1;

            try {
                logger.debug('about to write file', inFilename);
                fs.writeFileSync(inFilename, body);
                var zip = new admZip(inFilename);
                var manifestBuffer = zip.readFile("manifest.webapp");
                logger.debug('about to parse manifest', inURL);
                var parsedJSON = JSON.parse(manifestBuffer.toString().trim());
                logger.debug('parsed manifest', inURL);
                deferred.resolve(parsedJSON);
            }
            catch (e) {
                logger.error('Cannot parse Manifest', inURL, e);
                deferred.reject(new Error(e));
            }
        } else {
            theScope.pendingRequests -= 1;
            theScope.finishedRequests += 1;
            logger.info('cannot retrieve', inURL, error, response);
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

    logger.debug('about to request', inURL);

    request({ uri: inURL, strictSSL: false, timeout: theScope.timeout }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            theScope.pendingRequests -= 1;
            theScope.finishedRequests += 1;
            logger.debug('retrieved', inURL);
            deferred.resolve(body);
        } else {
            theScope.pendingRequests -= 1;
            theScope.finishedRequests += 1;
            logger.info('cannot retrieve', inURL);
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

    logger.debug('about to request', inURL);

    request({ uri: inURL, strictSSL: false, timeout: theScope.setTimeout }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            theScope.pendingRequests -= 1;
            theScope.finishedRequests += 1;
            logger.debug('retrieved', inURL);
            deferred.resolve(response.headers['content-length']);
        } else {
            theScope.pendingRequests -= 1;
            theScope.finishedRequests += 1;
            logger.info('cannot retrieve', inURL);
            deferred.reject(new Error(error));
        }
    });

    logger.debug('done requesting', inURL);

    return deferred.promise;
}


// returns a Q Promise for retrieving and parsing an app's manifest
// catches errors and returns them as JSON

function getManifest(inApp) {
    return requestAndParseJSON(inApp.manifest_url).catch(function (error) {
        logger.error('getManifest catch', inApp.manifest_url);
        // TODO: this doesn't seem to work
        return {'error' : error.toString() };
    });
}

// returns a Q Promise for retrieving and parsing an app's statistics
// catches errors and returns them as JSON

function handleAppStats(inApp) {
    logger.info('getting stats', inApp.id);

    return requestAndParseJSON('https://marketplace.firefox.com/api/v2/stats/app/' + inApp.id + '/totals/').catch(function (error) {
        logger.error('handleAppStats catch', inApp.id);
        // TODO: this doesn't seem to work
        return {'error' : error.toString() };
    }).then(function(data) {
        logger.info('handleAppStats', inApp.id);
        theScope.apps[inApp.id].appStats = data;
    });
}

// returns a Q promise for retrieving an app's appcache manifest
// catches errors and returns them as JSON

function getAppcacheManifest(inApp) {
    var manifestURL = url.parse(inApp.manifest_url);
    var appcacheManifestURL = url.resolve(manifestURL, inApp.manifest.appcache_path);

    return getPromiseForRequest(appcacheManifestURL).catch(function (error) {
        logger.error('getAppcacheManifest CATCH', inApp.id);
        // TODO: this doesn't seem to work
        return {'error' : error.toString() };
    });
}

// returns a Q promise for retrieving an app's appcache manifest
// catches errors and returns them as JSON

function getLaunchPage(inApp) {
    var manifestURL = url.parse(inApp.manifest_url);
    var launchPathURL = manifestURL; 

    if (inApp.manifest.launch_path) {
        launchPathURL = url.resolve(manifestURL, inApp.manifest.launch_path);
    }

    return getPromiseForRequest(launchPathURL).catch(function (error) {
        logger.error('getLaunchPage catch', launchPathURL);
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

    return getPromiseForDownloadPackageAndExtractManifest(packageURL, filename).catch(function (error) {
        logger.error('getAppPackageAndExtractManifest catch', inApp.id);
        // TODO: this doesn't seem to work
        return {'error' : error.toString() };
    });
}

// returns a Q promise for retrieving the size of a resource on the web
// catches errors and returns 0 instead

function getAppcacheManifestEntrySize(inEntryURL) {
    return getPromiseForResponseContentSize(inEntryURL).catch(function (error) {
        logger.error('getAppcacheManifestEntrySize catch', inEntryURL);
        // TODO: this doesn't seem to work
        return 0;
    })

}

// adds to the existing array of promises a promise
// to retrieve the size of an entry in the appcache manifest

function getAppcacheEntry(app, entryURL) {
    return getAppcacheManifestEntrySize(entryURL).then(function (responseContentLength) {
        theScope.apps[app.id].appcache_entry_sizes[entryURL] = responseContentLength;
    });    
}

// adds to the existing array of promises one or two promises
// to retrieve the app manifest and appcache manifest
    
function handleManifest(app) {
    if (app.manifest_url) {
        var manifestURL = url.parse(app.manifest_url);

        // get the manifest and handle packaged and hosted apps
        return getManifest(app).then(function (data) {
            theScope.apps[app.id].manifest = data;
            theScope.apps[app.id].included_scripts = [];

            // for apps with a package, add a promise to retrieve the package and the manifest inside it
            if (data.package_path) {
                theScope.apps[app.id].miniManifest = data;

                return getAppPackageAndExtractManifest(theScope.apps[app.id]).catch(function (error) {
                    logger.debug('catch getAppPackageAndExtractManifest inside addPromiseForManifest', app.id);
                }).then(function (manifestFromPackage) {
                    logger.debug('got manifest from package', app.manifest_url);
                    theScope.apps[app.id].manifest = manifestFromPackage;

                    // now that the package is here, grab the filenames
                    var packageFilename = '/tmp/' + app.id + '.zip';
                    logger.debug('about to create admZip', packageFilename);
                    var zip = new admZip(packageFilename);
                    var zipEntries = zip.getEntries(); // an array of ZipEntry records
                    theScope.apps[app.id].package_entries = [];

                    logger.debug('about to iterate thru zip entries', packageFilename);
                    zipEntries.forEach(function(zipEntry) {
                        var filename = zipEntry.entryName.substring(zipEntry.entryName.lastIndexOf('/') + 1);
                        theScope.apps[app.id].package_entries.push(filename);
                    });
                });
            // for hosted apps, get launch page
            } else {
                return getLaunchPage(theScope.apps[app.id]).catch(function (error) {
                    logger.error('catch getLaunchPage inside addPromiseForManifest', app.id);
                }).then(function (launchPageData) {
                    logger.debug('got launch page', app.id);
                    theScope.apps[app.id].included_scripts = [];
                    logger.debug('about to parse launch page', app.id);
                    $ = cheerio.load(launchPageData);
                    logger.debug('parsed launch page', app.id);

                    // TODO: don't just look in launch page for hosted apps
                    // also do it for packaged apps
                    $('html').find('meta').each(function (index, metaTag) {
                        if (metaTag.attribs.name && metaTag.attribs.name == 'viewport') {
                            logger.debug("VIEWPORT", app.id);
                            theScope.apps[app.id].meta_viewport = metaTag.attribs.content;
                        } else {
                            // say nothin'
                        }
                    })

                    $('html').find('script').each(function (index, scriptTag) {
                        if (scriptTag.attribs.src) {
                            theScope.apps[app.id].included_scripts.push(scriptTag.attribs.src);
                            // logger.info(app.id + ' ' + scriptTag.attribs.src);
                        }
                    });
                }).then(function () {
                    // for apps that use appcache, add promises to retrieve the size of each
                    // asset listed in the appcache manifest
                    if (data.appcache_path) {
                        theScope.apps[app.id].appcache_entry_sizes = {};

                        // get the appcache manifest
                        getAppcacheManifest(theScope.apps[app.id]).catch(function (error) {
                            logger.error('catch getAppcacheManifest inside addPromiseForManifest', app.id);
                        }).then(function (appcacheData) {
                            logger.debug("got appcache data", app.id);
                            theScope.apps[app.id].appcache_manifest = appcacheData;

                            var entries = parseAppcacheManifest(appcacheData);
                            theScope.apps[app.id].appcache_entry_count = entries.cache.length;

                            var temp = [];

                            for (var entryIndex = 0; entryIndex < entries.cache.length; entryIndex++) {
                                var entry = entries.cache[entryIndex];
                                var entryURL = url.resolve(manifestURL, entry);

                                // collect promises for the size of each appcache entry
                                temp.push(getAppcacheEntry(app, entryURL));
                            }

                            return Q.allSettled(temp);
                        });
                    }
                });
            }
        });
    }
}

// returns a Q Promise for searching the Apps catalog using the Marketplace API

function searchAppData(inSearchURL) {
    return requestAndParseJSON(inSearchURL).then(function (data) {
        // resolved
        var subpromises = [];

        for (index in data.objects) {
            var app = data.objects[index];
            theScope.apps[app.id] = app;

            // add a subpromise for fetching the manifest
            subpromises.push(handleManifest(app));

            if (app.public_stats) {
                // add a subpromise for fetching app stats
                subpromises.push(handleAppStats(app));
            }
        }

        if (data.meta.next) {
            logger.info(data.meta.offset + '/' + data.meta.total_count + ' pending ' + theScope.pendingRequests + ' size ' + Object.keys(theScope.apps).length);
            theScope.totalCount = data.meta.total_count;
            subpromises.push(searchAppData('https://marketplace.firefox.com' + data.meta.next));
        }

        return Q.allSettled(subpromises);
    });
}

// returns a Q promise to retrieve the entire firefox marketplace catalog

function findAppData() {
    return searchAppData('https://marketplace.firefox.com/api/v1/apps/search/?format=JSON&region=None&limit=100');
}

// retrieve all the data in the Firefox Marketplace catalog using the Marketplace API

function createMarketplaceCatalogDB(inOutputFile) {
    theScope.isRunning = true;
    theScope.startTime = Date.now();

    return findAppData().then(function() {
        logger.info('DONE ALL ' + Object.keys(theScope.apps).length + ', still pending ' + theScope.pendingRequests); 
    }).catch(function (error) {
        logger.info('createMarketplaceCatalogDB err');
        logger.info(error.stack);
    }).finally(function() {
        theScope.isRunning = false;
        fs.writeFile(inOutputFile, JSON.stringify(theScope.apps, null, 4), function(err) {
            if (err) {
              logger.error('error writing JSON', inOutputFile);
            } else {
              logger.info("JSON saved to", inOutputFile);
            }
        }); 
    });
}

// returns a JSON blob describing the progress of the catalog scraper.

function progressReport() {
    console.log('starting ProgressReport');
    var manifestCount = 0;
    var errorApps = [];

    for (index in theScope.apps) {
        var app = theScope.apps[index];

        if (app.manifest) {
            manifestCount = manifestCount + 1;
        }

        if ((app.manifest && app.manifest.error) || (app.appcache_manifest && app.appcache_manifest.error)) {
            errorApps.push(app);
        }
    }

    return {
        apps: Object.keys(theScope.apps).length, 
        pendingRequests: theScope.pendingRequests,
        finishedRequests: theScope.finishedRequests,
        manifestCount: manifestCount,
        totalCount: theScope.totalCount,
        elapsedSeconds: (Date.now() - theScope.startTime) / 1000,
        appPercentage: 100 * (Object.keys(theScope.apps).length / theScope.totalCount),
        manifestPercentage: 100 * manifestCount / theScope.totalCount,
        errorApps: errorApps,
        isRunning: theScope.isRunning };
}

// returns true if the catalog scraper is running, false otherwise.

function isRunning() {
    return theScope.isRunning;
}

module.exports.createMarketplaceCatalogDB = createMarketplaceCatalogDB;
module.exports.progressReport = progressReport;
module.exports.isRunning = isRunning;
