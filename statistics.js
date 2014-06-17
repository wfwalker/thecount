
// DISTRIBUTION HEPLER CODE

function getValues(inApps, getIntValuePerAppFn) {
    var values = [];

    for (index in inApps) {
        var app = inApps[index];
        var intValue = getIntValuePerAppFn(app);

        if (intValue != null) {
            values.push(intValue);
        }
    }

    return values
}

function getDistribution(inApps, getIntValuePerAppFn) {
    var counts = {};
    var appsFound = 0;
    var maxValue = -999;
    var minValue = 999;

    for (index in inApps) {
        var app = inApps[index];
        var intValue = getIntValuePerAppFn(app);

        if (intValue != null) {
            appsFound++;

            if (counts[intValue]) {
                counts[intValue]++;
            } else {
                counts[intValue] = 1;
            }

            minValue = Math.min(minValue, intValue);
            maxValue = Math.max(maxValue, intValue);            
        }
    }

    console.log(counts);

    var chartData = [];

    for (var index = minValue; index <= maxValue; index++) {
        if (counts[index]) {
            chartData.push({ 'label' : index, 'val': counts[index] });
        } else {
            chartData.push({ 'label' : index, 'val': 0 });
        }
    }

    return chartData;
}

function getAverageRating(inApp) {
    if (inApp.ratings && inApp.ratings.count > 5) {
        return inApp.ratings.average;
    } else {
        return null;
    }
}

// NOTE: don't show the tiny handful of apps with more than 50 ratings since 
// showing them makes the graph useless
function getRatingCount(inApp) {
    if (! inApp.ratings || inApp.ratings.count > 50){ 
        return null;
    } else {
        return inApp.ratings.count;
    }
}

function getPackageSize(inApp) {
    if (inApp.miniManifest && inApp.miniManifest.size) {
        return Math.round(inApp.miniManifest.size / 1000000);
    }

    if (inApp.manifest && inApp.manifest.size) {
        return Math.round(inApp.manifest.size / 1000000);
    }

    return null;
}

function getDaysOld(inApp) {
    var reviewedDate = Date.parse(inApp.reviewed);
    var now = Date.now();
    return (now - reviewedDate) / (24 * 60 * 60 * 1000.0);
}

// FREQUENCY HELPER CODE

function getFrequency(inApps, getArrayOfStringsPerAppFn, inLimit) {
    console.log('getFrequency');

    var counts = {};
    var appsFound = 0;

    for (index in inApps) {
        var app = inApps[index];
        var strings = getArrayOfStringsPerAppFn(app);

        if (strings.length > 0) {
            appsFound++;

            for (var stringIndex = 0; stringIndex < strings.length; stringIndex++) {
                if (! strings[stringIndex]) {
                    console.log('AOOGAH ' + app.id);
                    console.log(strings);
                }

                var stringKey = strings[stringIndex].replace(':', '-');

                if (counts[stringKey]) {
                    counts[stringKey]++;
                } else {
                    counts[stringKey] = 1;
                }
            }
        }
    }

    var chartData = [];

    for (index in counts) {
        chartData.push({ 'label' : index, 'val': counts[index] });
    }

    chartData.sort(function(a, b) {
        return b.val - a.val;
    });

    chartData = chartData.slice(0, inLimit);
    return chartData;
}

function getAuthor(inApp) {
    if (inApp.author && inApp.author != '') {
        return [inApp.author];
    } else {
        return [];
    }
}

function getInstallsAllowedFrom(inApp) {
    if (inApp.manifest && inApp.manifest.installs_allowed_from) {
        return inApp.manifest.installs_allowed_from;
    } else {
        return ['none'];
    }
}

function getPermissionKeys(inApp) {
    if (inApp.manifest && inApp.manifest.permissions && (Object.keys(inApp.manifest.permissions).length > 0)) {
        return Object.keys(inApp.manifest.permissions);
    } else {
        return [];
    }
}

function getIconSizes(inApp) {
    if (inApp.manifest && inApp.manifest.icons) {
        return Object.keys(inApp.manifest.icons);
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

function getSupportedRegions(inApp) {
    var regions = [];

    if (inApp.regions) {
        for (var index in inApp.regions) {
            var region = inApp.regions[index];
            regions.push(region.name);
        }
    }

    return regions;
}

function getCategoryStrings(inApp) {
    var categories = []

    if (inApp.categories) { categories.push.apply(categories, inApp.categories); }

    if (inApp.ratings && inApp.ratings.count > 5) { categories.push('five user ratings'); }
    if (inApp.content_ratings && inApp.content_ratings.rating) { categories.push('esrb'); } else { categories.push('NO esrb'); }
    if (inApp.app_type == 'hosted') { categories.push('hosted'); }
    if (inApp.app_type == 'privileged') { categories.push('privileged'); }
    if (inApp.app_type == 'packaged') { categories.push('packaged'); }
    if (inApp.manifest && inApp.manifest.appcache_path) { categories.push('appcache'); }

    if (inApp.premium_type == 'free') { categories.push('free'); }
    if (inApp.premium_type == 'premium') { categories.push('premium'); }
    if (inApp.premium_type == 'free-inapp') { categories.push('free w/inapp'); }
    if (inApp.premium_type == 'premium-inapp') { categories.push('premium w/inapp'); }

    if (inApp.device_types.indexOf('desktop') > -1) { categories.push('desktop'); }
    if (inApp.device_types.indexOf('firefoxos') > -1) { categories.push('firefox os'); }
    if (inApp.device_types.indexOf('android-tablet') > -1) { categories.push('android tablet'); categories.push('android'); }
    if (inApp.device_types.indexOf('android-mobile') > -1) { categories.push('android mobile'); categories.push('android'); }
    
    return categories;
}

function getActivityKeys(inApp) {
    if (inApp.manifest && inApp.manifest.activities && (Object.keys(inApp.manifest.activities).length > 0)) {
        return Object.keys(inApp.manifest.activities);
    } else {
        return [];
    }
}

var knownLibraries = {};
knownLibraries['bootstrap.js'] = 'Bootstrap';
knownLibraries['bootstrap.min.js'] = 'Bootstrap';

knownLibraries['backbone.js'] = 'Backbone';
knownLibraries['backbone-min.js'] = 'Backbone';

knownLibraries['jquery.js'] = 'jQuery';
knownLibraries['jquery-1.8.2.js'] = 'jQuery';
knownLibraries['jquery-1.9.1.js'] = 'jQuery';
knownLibraries['jquery-2.0.2.js'] = 'jQuery';
knownLibraries['jquery-2.0.3.js'] = 'jQuery';

knownLibraries['jquery-1.10.2.min.js'] = 'jQuery';
knownLibraries['jquery-1.9.1.min.js'] = 'jQuery';
knownLibraries['jquery-1.3.1.min.js'] = 'jQuery';
knownLibraries['jquery-1.7.1-min.js'] = 'jQuery';
knownLibraries['jquery-1.7.1.min.js'] = 'jQuery';
knownLibraries['jquery-1.10.1.min.js'] = 'jQuery';

knownLibraries['jquery.min.js'] = 'jQuery';
knownLibraries['jquery-2.0.0.min.js'] = 'jQuery';
knownLibraries['jquery-2.0.2.min.js'] = 'jQuery';
knownLibraries['jquery-2.0.3.min.js'] = 'jQuery';
knownLibraries['jquery-2.1.0.min.js'] = 'jQuery';
knownLibraries['jquery-1.7.2.min.js'] = 'jQuery';
knownLibraries['jquery-1.8.2.min.js'] = 'jQuery';
knownLibraries['jquery-1.8.3.min.js'] = 'jQuery';
knownLibraries['jquery-1.11.0.min.js'] = 'jQuery';
knownLibraries['jquery-1.4.2.min.js'] = 'jQuery';

knownLibraries['game.js'] = 'GameJS';
knownLibraries['game.min.js'] = 'GameJS';

knownLibraries['jquery.mobile-1.3.0.min.js'] = 'jQuery Mobile';
knownLibraries['jquery.mobile-1.3.2.min.js'] = 'jQuery Mobile';
knownLibraries['jquery.mobile-1.3.1.min.js'] = 'jQuery Mobile';
knownLibraries['jquery.mobile-1.2.0.js'] = 'jQuery Mobile';
knownLibraries['jquery.mobile-1.2.0.min.js'] = 'jQuery Mobile';
knownLibraries['jquery.mobile-1.1.0.min.js'] = 'jQuery Mobile';
knownLibraries['jquery.mobile.min.js'] = 'jQuery Mobile';
knownLibraries['jquery.mobile-1.4.0.min.js'] = 'jQuery Mobile';
knownLibraries['jquery.mobile-1.4.2.min.js'] = 'jQuery Mobile';
knownLibraries['jquery.mobile.js'] = 'jQuery Mobile';

knownLibraries['jquery-ui.min.js'] = 'jQuery UI';

knownLibraries['tgs-adapters-0.3.min.js'] = 'TreSensa';
knownLibraries['tgs-0.3.min.js'] = 'TreSensa';
knownLibraries['tge-1.0.min.js'] = 'TreSensa';
knownLibraries['tgl-1.0.min.js'] = 'TreSensa';
knownLibraries['tgl.boot.min.js'] = 'TreSensa';
knownLibraries['GameConfig.js'] = 'TreSensa';
knownLibraries['viewporter.min.js'] = 'TreSensa';

knownLibraries['Model.js'] = 'Mippin';
knownLibraries['View.js'] = 'Mippin';
knownLibraries['Controller.js'] = 'Mippin';
knownLibraries['AppUX.js'] = 'Mippin';
knownLibraries['Vars.js'] = 'Mippin';

knownLibraries['tappable.js'] = 'Tappable';

knownLibraries['require.js'] = 'Require.js';
knownLibraries['zepto.js'] = 'Zepto.js';
knownLibraries['zepto.min.js'] = 'Zepto.js';
knownLibraries['c2runtime.js'] = 'Construct 2';
knownLibraries['c2webappstart.js'] = 'Construct 2';
knownLibraries['angular.js'] = 'Angular';
knownLibraries['angular.min.js'] = 'Angular';
knownLibraries['cordova.js'] = 'Cordova';
knownLibraries['cordova_plugins.js'] = 'Cordova';
knownLibraries['cordova.min.js'] = 'Cordova';
knownLibraries['phonegap.js'] = 'Cordova';
knownLibraries['phonegap.min.js'] = 'Cordova';

knownLibraries['iscroll.js'] = 'Cubiq iSCroll.js';
knownLibraries['iscroll-lite.min.js'] = 'Cubiq iSCroll.js';
knownLibraries['add2home.js'] = 'Cubiq Add to home screen';

knownLibraries['inneractive.js'] = 'InnerActive Ads';
knownLibraries['receiptverifier.js'] = 'mozPay receipt verifier';

knownLibraries['PxLoader.min.js'] = 'PixelLab preloader';
knownLibraries['PxLoaderImage.min.js'] = 'PixelLab preloader';

knownLibraries['l10n.js'] = 'Web L10n';

knownLibraries['underscore.js'] = 'Underscore';
knownLibraries['underscore-min.js'] = 'Underscore';

function getFilenames(inApp) {
    var unionOfFilenames = [];
    var stopNames = ['', 'ads.js', 'init.js', 'app.js', 'index.js', 'main.js', 'script.js', 'manifest.webapp', 'zigbert.rsa', 'zigbert.sf', 'manifest.mf', 'ids.json', 'index.html'];

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

function getLibraryNames(inApp) {
    var filteredFilenames = getFilenames(inApp);

    var libraries = [];

    for (var filename in knownLibraries) {
        var library = knownLibraries[filename];

        if (filteredFilenames.indexOf(filename) >= 0) {
            libraries.push(library);
        }
    }

    uniqueLibraries = libraries.filter(function(elem, pos, self) {
        return self.indexOf(elem) == pos;
    });

    return uniqueLibraries;
}

module.exports.getLibraryNames = getLibraryNames;
module.exports.getDistribution = getDistribution;
module.exports.getValues = getValues;

module.exports.getRatingCount = getRatingCount;
module.exports.getAverageRating = getAverageRating;
module.exports.getPackageSize = getPackageSize;
module.exports.getDaysOld = getDaysOld;

module.exports.getFrequency = getFrequency;
module.exports.getAuthor = getAuthor;
module.exports.getInstallsAllowedFrom = getInstallsAllowedFrom;
module.exports.getPermissionKeys = getPermissionKeys;
module.exports.getIconSizes = getIconSizes;
module.exports.getSupportedLocales = getSupportedLocales;
module.exports.getSupportedRegions = getSupportedRegions;
module.exports.getCategoryStrings = getCategoryStrings;
module.exports.getActivityKeys = getActivityKeys;
module.exports.getFilenames = getFilenames;

