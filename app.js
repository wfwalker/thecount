
// ----------------------------- D3 STUFF ------------------------------------------

function addFrequencyTable(inScope, getArrayOfStringsPerAppFn, inDivClass, inLimit) {
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

    chartData = chartData.slice(0, inLimit);

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

function getAuthor(inApp) {
    return [inApp.author];
}

function getPermissionKeys(inApp) {
    if (inApp.manifest.permissions && (Object.keys(inApp.manifest.permissions).length > 0)) {
        return Object.keys(inApp.manifest.permissions);
    } else {
        return [];
    }
}

function getSupportedLocales(inApp) {
    var unionOfLocales = [];

    if (inApp.supported_locales && inApp.supported_locales.length > 0) {
        unionOfLocales.push.apply(unionOfLocales, inApp.supported_locales);
    }

    if (inApp.manifest && inApp.manifest.locales && Object.keys(inApp.manifest.locales).length > 0) {
        unionOfLocales.push.apply(unionOfLocales, Object.keys(inApp.manifest.locales));
    } 

    if (inApp.default_locale) {
        unionOfLocales.push(inApp.default_locale);
    }

    var uniqueLocales = unionOfLocales.filter(function(elem, pos, self) {
        return self.indexOf(elem) == pos;
    });

    return uniqueLocales;
}

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

    $scope.getCacheSize = function (app) {
        if (app.manifest && app.manifest.size) {
            return app.manifest.size;
        }

        if (app.miniManifest && app.miniManifest.size) {
            return app.miniManifest.size;
        }

        if (app.appcache_entry_count) {
            var cacheSize = 0;

            for (var entryIndex in app.appcache_entry_sizes) {
                var entry = app.appcache_entry_sizes[entryIndex];
                if (parseInt(entry) != NaN) {
                    cacheSize += parseInt(entry);
                }
            }

            return cacheSize;
        }

        return '';
    }

    $scope.firstAppName = function(app) {
        var appNameKeys = Object.keys(app.name);
        return app.name[appNameKeys[0]].replace(/,/g, '');
    }
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

        // hide the statrows, only use those for when we don't have cached JSON
        $('.statrow').hide();

        addFrequencyTable(theScope, getPermissionKeys, 'permissionsChart', 15);
        addFrequencyTable(theScope, getSupportedLocales, 'localeFrequencyChart', 15);
        addFrequencyTable(theScope, getCategoryStrings, 'categoriesChart', 15);
        addFrequencyTable(theScope, getPackageSize, 'packageSizesChart', 15);
        addFrequencyTable(theScope, getAuthor, 'authorsChart', 15);
        addFrequencyTable(theScope, getFilenames, 'filenamesChart', 100);

        angular.element('[ng-controller=AppListCtrl]').scope().$digest();
    }).fail(function (e) {
        console.log('failed to load cached json, doing it the old way');

        findPrivilegedAppData(theScope.apps, function() { console.log("DONE PRIVILEGED"); });
        findPackagedAppData(theScope.apps, function() { console.log("DONE PACKAGED"); });
        findHostedAppData(theScope.apps, function() { console.log("DONE HOSTED"); });       
    });
});
