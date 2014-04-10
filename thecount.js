var request = require('request');
var fs = require('fs');

var theScope = {};

theScope.apps = [];

function getAppData(inAppName, inAppList) {
    var theURL = 'https://marketplace.firefox.com/api/v1/apps/app/' + inAppName + '/?format=JSON';

    request(theURL, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body);
        }
    });
}

function getManifest(inApp) {
    request(inApp.manifest_url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            try {
                inApp.manifest = JSON.parse(body);                
            }
            catch (e) {
                console.log('cannot parse ' + inApp.manifest_url + ', ' + e);
            }
        }
    });
}

function searchAppData(inSearchURL, inAppList, cb) {
    request(inSearchURL, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var data = JSON.parse(body);

            for (index in data.objects) {
                var app = data.objects[index]
                inAppList.push(app);

                if (app.manifest_url) {
                    getManifest(app);
                }
            }

            console.log('doing ' + data.meta.offset + '/' + data.meta.total_count);

            if (data.meta.next) {
                searchAppData('https://marketplace.firefox.com' + data.meta.next, inAppList, cb);
            } else {
                cb();
            }
        }
    });
}

function findAppData(inAppList, cb) {
    searchAppData('https://marketplace.firefox.com/api/v1/apps/search/?format=JSON&limit=200', inAppList, cb);
}

function findPackagedAppData(inAppList, cb) {
	searchAppData('https://marketplace.firefox.com/api/v1/apps/search/?app_type=packaged&format=JSON&limit=200', inAppList, cb);
}

function findHostedAppData(inAppList, cb) {
	searchAppData('https://marketplace.firefox.com/api/v1/apps/search/?app_type=hosted&format=JSON&limit=200', inAppList, cb);
}

function findPrivilegedAppData(inAppList, cb) {
    searchAppData('https://marketplace.firefox.com/api/v1/apps/search/?app_type=privileged&format=JSON&limit=200', inAppList, cb);
}

function emitCSV(inJSONFilename) {
    var raw = fs.readFileSync(inJSONFilename);

    var fieldNames = [
        'name',
        'hosted',
        'package size'
    ];

    console.log(fieldNames.join(','));

    try {
        var data = JSON.parse(raw); 

        for (index in data) {
            var app = data[index];
            var appNameKeys = Object.keys(app.name);

            var csvFields = [
                app.name[appNameKeys[0]],
                app.app_type == 'hosted',
                app.manifest && app.manifest.size ? app.manifest.size : ''
            ];

            console.log(csvFields.join(','));
        }
    }
    catch (e) {
        console.log('cannot parse ' + inJSONFilename + ', ' + e);
    }
}

function createMarketplaceCatalogDB(inOutputFile) {
    findAppData(theScope.apps, function() {
        console.log('DONE ALL'); 

        fs.writeFile(inOutputFile, JSON.stringify(theScope.apps, null, 4), function(err) {
            if(err) {
              console.log(err);
            } else {
              console.log("JSON saved to " + inOutputFile);
            }
        }); 
    });
}


emitCSV('apps.json');

// createMarketplaceCatalogDB('apps.json');
