// -------------- MARKETPLACE QUERY STUFF -------------------------------------------

function getAppData(inAppName, inAppList) {
	console.log('getAppData ' + inAppName);

    $.ajax({
        url: 'https://marketplace.firefox.com/api/v1/apps/app/' + inAppName + '/?format=JSON',
        dataType: 'json'
    }).done(function(data) {
        inAppList.push(data);
        console.log(data);
        angular.element('[ng-controller=AppListCtrl]').scope().$digest();
    }).fail(function(data) {
        var appErrorPlaceholder = {
            id: inAppName, summary: data.responseJSON.message
        };
        inAppList.push(appErrorPlaceholder);
        console.log(appErrorPlaceholder);
    });    
}

function getManifest(inManifestURL) {
	console.log(inManifestURL);

    $.ajax({
        url: inManifestURL,
        dataType: 'json'
    }).done(function(data) {
        console.log(inManifestURL + ' ' + data.size);
        // angular.element('[ng-controller=AppListCtrl]').scope().$digest();
    }).fail(function(data) {
        console.log('getManifestFailed');
    });    
}

function searchAppData(inSearchURL, inAppList, cb) {
    $.ajax({
        url: inSearchURL,
        dataType: 'json'
    }).done(function(data) {
        $.each(data.objects, function(ix, app) { 
            inAppList.push(app);

            if (app.is_packaged) {
                console.log(inSearchURL);
                console.log(app.manifest_url);
                // getManifest(app.manifest_url);
            }
        });

        console.log('total count ' + data.meta.total_count);

        angular.element('[ng-controller=AppListCtrl]').scope().$digest();

        if (data.meta.next) {
    	    searchAppData('https://marketplace.firefox.com' + data.meta.next, inAppList, cb);
        } else {
        	cb();
        }
    }).fail(function(data) {
        var appErrorPlaceholder = {
            id: 'packaged', summary: data.responseJSON.message
        };
        inAppList.push(appErrorPlaceholder);
        console.log(appErrorPlaceholder);
    });    
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

// ----------------------------- D3 STUFF ------------------------------------------

function addFrequencyTable(inScope, getArrayOfStringsPerAppFn, inDivClass) {
    var counts = {};
    var appsFound = 0;

    for (index in inScope.apps) {
        var app = inScope.apps[index];
        var strings = getArrayOfStringsPerAppFn(app);

        if (strings.length > 0) {
            appsFound++;

            for (var stringIndex = 0; stringIndex < strings.length; stringIndex++) {
                var stringKey = strings[stringIndex];

                if (counts[stringKey]) {
                    counts[stringKey]++;
                } else {
                    counts[stringKey] = 1;
                }
            }
        }
    }

    console.log(counts);

    var chartData = [];

    for (index in counts) {
        chartData.push({ 'label' : index, 'val': counts[index] });
    }

    console.log('done addFrequencyTable, found ' + appsFound);

    chartData.sort(function(a, b) {
        return b.val - a.val;
    });

    x = d3.scale.linear()
        .domain([0, d3.max(chartData, get('val'))])
        .range([0, 80]);

    d3.select('.' + inDivClass)
        .selectAll("div")
            .data(chartData)
        .enter().append("div")
            .style("width", function(d) { 
                return x(d.val) + "%"; })
        .text(get('val'))
        .append('span')
            .attr('class', 'label')
            .text(get('label'));
}

// ----------------------------------------------------------------------------

function get(prop) {
  return function(d) {
    return d[prop];
  };
}

function getPermissionKeys(inApp) {
    if (inApp.manifest.permissions && (Object.keys(inApp.manifest.permissions).length > 0)) {
        return Object.keys(inApp.manifest.permissions);
    } else {
        return [];
    }
}

function getSupportedLocales(inApp) {
    if (inApp.supported_locales) {
        return inApp.supported_locales;
    } else {
        return [];
    }
}

function getCategoryStrings(inApp) {
    var categories = []

    if (inApp.app_type == 'hosted') { categories.push('hosted'); }
    if (inApp.app_type == 'privileged') { categories.push('privileged'); }
    if (inApp.app_type == 'packaged') { categories.push('packaged'); }
    if (inApp.manifest.appcache_path) { categories.push('appcache'); }

    if (inApp.premium_type == 'free') { categories.push('freeapp'); }
    if (inApp.premium_type == 'premium') { categories.push('premiumapp'); }
    if (inApp.premium_type == 'free-inapp') { categories.push('freeinapp'); }
    if (inApp.premium_type == 'premium-inapp') { categories.push('premiuminapp'); }

    if (inApp.device_types.indexOf('desktop') > -1) { categories.push('desktop'); }
    if (inApp.device_types.indexOf('firefoxos') > -1) { categories.push('firefoxos'); }
    if (inApp.device_types.indexOf('android-tablet') > -1) { categories.push('androidtablet'); categories.push('android'); }
    if (inApp.device_types.indexOf('android-mobile') > -1) { categories.push('androidmobile'); categories.push('android'); }
    
    return categories;
}

function getPackageSize(inApp) {
    if (inApp.manifest && inApp.manifest.size) {
        return [Math.round(inApp.manifest.size / 1000000)];
    }

    if (inApp.miniManifest && inApp.miniManifest.size) {
        return [Math.round(inApp.miniManifest.size / 1000000)];
    }

    return [];
}

// ------------------------------- ANGULAR STUFF -------------------------

var thecountApp = angular.module('thecountApp', []);
 
thecountApp.controller('AppListCtrl', function ($scope) {
	console.log('initialize');
    $scope.apps = [];
});

$(document).ready(function() {
	var theScope = angular.element('[ng-controller=AppListCtrl]').scope();

    console.log('try to load cached apps.json, built previously by thecount.js commandline tool');

    $.ajax('./apps.json').done(function(appDictionary) {
        var apps = [];
        for (var appID in appDictionary) {
            apps.push(appDictionary[appID]);
        }

        theScope.apps = apps;
        console.log('loaded ' + Object.keys(theScope.apps).length);

        addFrequencyTable(theScope, getPermissionKeys, 'permissionsChart');
        addFrequencyTable(theScope, getSupportedLocales, 'localeFrequencyChart');
        addFrequencyTable(theScope, getCategoryStrings, 'categoriesChart');
        addFrequencyTable(theScope, getPackageSize, 'packageSizesChart');

        angular.element('[ng-controller=AppListCtrl]').scope().$digest();
    }).fail(function (e) {
        console.log('failed to load cached json, doing it the old way');

        findPrivilegedAppData(theScope.apps, function() { console.log("DONE PRIVILEGED"); });
        findPackagedAppData(theScope.apps, function() { console.log("DONE PACKAGED"); });
        findHostedAppData(theScope.apps, function() { console.log("DONE HOSTED"); });       
    });
});
