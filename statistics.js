
// retrieve one integer value for each app in the catalog using the provided getter

function getValues(inApps, getIntValuePerAppFn) {
    var values = [];
    var appsFound = 0;
    var sumOfValues = 0.0;

    for (index in inApps) {
        var app = inApps[index];
        var intValue = getIntValuePerAppFn(app);

        if (intValue != null) {
            appsFound++;
            values.push(intValue);
            sumOfValues = sumOfValues + (1.0 * intValue);
        }
    }

    return { total: appsFound, values: values, average: Math.round(100.0 * sumOfValues / (1.0 * appsFound)) / 100.0 }
}

// returns the price for paid apps, null otherwise

function getPrice(inApp) {
    if (inApp.price) {
        return inApp.price;
    } else {
        return null;
    }
}

// returns the average rating for apps with more than five ratings, null otherwise

function getAverageRating(inApp) {
    if (inApp.ratings && inApp.ratings.count > 5) {
        return inApp.ratings.average;
    } else {
        return null;
    }
}

// returns the number of abuse reports filed for this app, null otherwise

function getAbuseReportCount(inApp) {
    if (inApp.appStats && inApp.appStats.abuse_reports) {
        return inApp.appStats.abuse_reports.total;
    } else {
        return null;
    }
}

// returns the number of installs recorded for this app, null otherwise

function getInstallCount(inApp) {
    if (inApp.appStats && inApp.appStats.installs) {
        return inApp.appStats.installs.total;
    } else {
        return null;
    }
}


// returns the number of user ratings for apps with 50 or fewer ratings; null otherwise

function getRatingCount(inApp) {
    if (! inApp.ratings || inApp.ratings.count > 50){ 
        return null;
    } else {
        return inApp.ratings.count;
    }
}

// returns the number of user ratings for apps with 50 or fewer ratings; null otherwise

function getNumberOfVersions(inApp) {
    if (! inApp.versions ){ 
        return null;
    } else {
        return Object.keys(inApp.versions).length;
    }
}

// returns the package size, in millions of bytes, for packaged apps; null otherwise

function getPackageSize(inApp) {
    if (inApp.miniManifest && inApp.miniManifest.size) {
        return inApp.miniManifest.size;
    }

    if (inApp.manifest && inApp.manifest.size) {
        return inApp.manifest.size;
    }

    return null;
}

// returns the manifest protocol

function getManifestProtocol(inApp) {
    if (inApp.manifest_url && inApp.manifest_url.indexOf('https') >= 0) {
        return ['https'];
    } else {
        return ['http'];
    }
}

// returns how many days since the app was reviewed

function getDaysSinceReviewed(inApp) {
    var reviewedDate = Date.parse(inApp.reviewed);
    var now = Date.now();
    return (now - reviewedDate) / (24 * 60 * 60 * 1000.0);
}

// returns how many days since the app was created

function getDaysSinceCreated(inApp) {
    var reviewedDate = Date.parse(inApp.created);
    var now = Date.now();
    return (now - reviewedDate) / (24 * 60 * 60 * 1000.0);
}

// returns date when app was reviewed

function getReviewedDate(inApp) {
    return Date.parse(inApp.reviewed);
}

// returns date when app was created

function getCreationDate(inApp) {
    return Date.parse(inApp.created);
}

// returns date when app was last updated

function getLastUpdatedDate(inApp) {
    return Date.parse(inApp.last_updated);
}

// Create two dimensional table counting platform designators versus app categories

function getPlatformTable(inApps, inRowStringsFn) {
    var counts = {};
    var appCount = 0;
    var allPlatformTags = getAllPlatformTags();

    for (index in inApps) {
        var app = inApps[index];
        var platformStrings = getPlatformTags(app);

        appCount++;

        var rowStrings = inRowStringsFn(app);

        for (catIndex in rowStrings) {
            var catString = rowStrings[catIndex];

            if (! counts[catString]) {
                counts[catString] = {};
                counts[catString]['category'] = catString;

                for (var initIndex in allPlatformTags) {
                    var initPlatformCategory = allPlatformTags[initIndex];
                    counts[catString][initPlatformCategory] = 0;
                    counts[catString]['total'] = 0;
                }
            }

            counts[catString]['total']++;

            for (var platIndex in platformStrings) {
                var aPlatformString = platformStrings[platIndex];
                counts[catString][aPlatformString]++;
            }
        }
    }    

    var countsArray = [];

    for (var index2 in counts) {
        countsArray.push(counts[index2]);
        // console.log(counts[index2]);
    }

    console.log('app count', appCount);
    return countsArray;
}

function getPlatformTagsByCategoryTable(inApps) {
    return getPlatformTable(inApps, function (app) {
        return app.categories;
    });
};

// Create two dimensional table counting platform designators versus app categories

function getPlatformTagsByPopularityTable(inApps) {
    return getPlatformTable(inApps, function (app) {
        var popularityStrings = ['all'];

        if (app.ratings && app.ratings.count > 400) {
            popularityStrings.push('400 reviews');
        }
        if (app.ratings && app.ratings.count > 200) {
            popularityStrings.push('200 reviews');
        } 
        if (app.ratings && app.ratings.count > 40) {
            popularityStrings.push('40 reviews');
        } 
        if (app.ratings && app.ratings.count > 4) {
            popularityStrings.push('4 reviews');
        }

        return popularityStrings;
    });
}

// FREQUENCY HELPER CODE

// computes the frequency of occurrence of strings associated with each app
// using the given getter function. Used for properties where each app may have 
// any number of string values.

function getFrequency(inApps, getArrayOfStringsPerAppFn) {
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

                var stringKey = strings[stringIndex];

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

    return {total: appsFound, chartData: chartData.slice(0, 40)};
}

// returns the author of an app
// TODO: use distribution? Definitely only one value

function getAuthor(inApp) {
    if (inApp.author && inApp.author != '') {
        return [inApp.author];
    } else {
        return [];
    }
}

// returns the installs_allowed_from string for the given app
// TODO: parse the list? list already parsed?

function getInstallsAllowedFrom(inApp) {
    if (inApp.manifest && inApp.manifest.installs_allowed_from) {
        if (inApp.manifest.installs_allowed_from == '*') {
            return ['*'];
        } else {
            return ['other'];
        }
    } else {
        return ['none'];
    }
}

// returns the list of orientation values for the given app

function getOrientation(inApp) {
    var orientations = [];

    if (inApp.manifest && inApp.manifest.fullscreen) {
        orientations.push('fullscreen');
    }

    if (inApp.manifest && inApp.manifest.orientation) {
        orientations = orientations.concat(inApp.manifest.orientation);
    }

    return orientations;
}

// returns the list of permission strings for the given app

function getPermissionKeys(inApp) {
    if (inApp.manifest && inApp.manifest.permissions && (Object.keys(inApp.manifest.permissions).length > 0)) {
        return Object.keys(inApp.manifest.permissions);
    } else {
        return [];
    }
}

// returns the list of permission strings for the given app

function getContentRatingDescriptors(inApp) {
    if (inApp.content_ratings && inApp.content_ratings.descriptors && (inApp.content_ratings.descriptors.length > 0)) {
        return inApp.content_ratings.descriptors;
    } else {
        return [];
    }
}


// returns the list of icon sizes for the given app

function getIconSizes(inApp) {
    if (inApp.manifest && inApp.manifest.icons) {
        return Object.keys(inApp.manifest.icons);
    } else {
        return [];
    }
}

// returns the number of previews

function getNumberOfPreviews(inApp) {
    if (inApp.previews) {
        return inApp.previews.length;
    } else {
        return 0;
    }
}

// returns the list of supported locales for the given app
// the list is the union of supported_locales, default locale, and locales listed in the manifest

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

// returns the list of supported regions for the given app

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

// returns a list of category strings for the given app,
// including payment types, security model types, device compatibility, and ESRB ratings

function getCategoryStrings(inApp) {
    var categories = []

    if (inApp.categories) { categories.push.apply(categories, inApp.categories); }

    return categories;
}

// returns a list of payment categories for the given app,

function getPaymentCategories(inApp) {
    var categories = []

    if (inApp.premium_type == 'free') { categories.push('free'); }
    if (inApp.premium_type == 'premium') { categories.push('premium'); }
    if (inApp.premium_type == 'free-inapp') { categories.push('free-inapp'); }
    if (inApp.premium_type == 'premium-inapp') { categories.push('premium-inapp'); }

    return categories;
}

// returns a list of platform category strings for the given app,

function getAllPlatformTags() {
    return ['hosted', 'privileged', 'desktop', 'appcache', 'browser_chrome', 'packaged', 'firefoxos', 'fullscreen', 'meta_viewport', 'public_stats', 'tarako', 'android', 'androidtablet', 'androidmobile'];
}

function getPlatformTags(inApp) {
    var categories = []

    if (inApp.manifest && inApp.manifest.chrome && inApp.manifest.chrome.navigation) {
        categories.push('browser_chrome'); 
    }

    if (inApp.app_type == 'hosted') { categories.push('hosted'); }
    if (inApp.app_type == 'privileged') { categories.push('privileged'); }
    if (inApp.app_type == 'packaged' || inApp.app_type == 'privileged') { categories.push('packaged'); }

    if (inApp.manifest && inApp.manifest.origin) { categories.push('origin'); }
    if (inApp.manifest && inApp.manifest.redirects) { categories.push('redirects'); }
    if (inApp.manifest && inApp.manifest.appcache_path) { categories.push('appcache'); }
    if (inApp.manifest && inApp.manifest.role) { categories.push(inApp.manifest.role); }
    if (inApp.manifest && inApp.manifest.fullscreen) { categories.push('fullscreen'); }

    if (inApp.meta_viewport) { categories.push('meta_viewport'); }
    if (inApp.public_stats) { categories.push('public_stats'); }

    if (inApp.tags.indexOf('tarako') > -1) { categories.push('tarako'); }
    
    if (inApp.device_types.indexOf('desktop') > -1) { categories.push('desktop'); }
    if (inApp.device_types.indexOf('firefoxos') > -1) { categories.push('firefoxos'); }
    if (inApp.device_types.indexOf('android-tablet') > -1) { categories.push('androidtablet'); }
    if (inApp.device_types.indexOf('android-mobile') > -1) { categories.push('androidmobile'); }
    if ((inApp.device_types.indexOf('android-tablet') > -1) || (inApp.device_types.indexOf('android-mobile') > -1)) { categories.push('android'); }
    return categories;
}


// returns the list of activites supported by the given app

function getActivityKeys(inApp) {
    if (inApp.manifest && inApp.manifest.activities && (Object.keys(inApp.manifest.activities).length > 0)) {
        return Object.keys(inApp.manifest.activities);
    } else {
        return [];
    }
}

// create a list of mappings from filenames to known libraries

var knownLibraries = {};
knownLibraries['bootstrap.js'] = 'Bootstrap';
knownLibraries['bootstrap-responsive.css'] = 'Bootstrap';
knownLibraries['bootstrap.min.js'] = 'Bootstrap';
knownLibraries['bootstrap.min.css'] = 'Bootstrap';
knownLibraries['bootstrap.css'] = 'Bootstrap';

knownLibraries['backbone.js'] = 'Backbone';
knownLibraries['backbone-min.js'] = 'Backbone';

knownLibraries['jquery-1.10.1.min.js'] = 'jQuery';
knownLibraries['jquery-1.10.2.js'] = 'jQuery';
knownLibraries['jquery-1.10.2.min.js'] = 'jQuery';
knownLibraries['jquery-1.11.1.js'] = 'jQuery';
knownLibraries['jquery-1.11.1.min.js'] = 'jQuery';
knownLibraries['jquery-1.3.1.min.js'] = 'jQuery';
knownLibraries['jquery-1.6.4.min.js'] = 'jQuery';
knownLibraries['jquery-1.7.1-min.js'] = 'jQuery';
knownLibraries['jquery-1.7.1.min.js'] = 'jQuery';
knownLibraries['jquery-1.8.2.js'] = 'jQuery';
knownLibraries['jquery-1.9.1.js'] = 'jQuery';
knownLibraries['jquery-1.9.1.min.js'] = 'jQuery';
knownLibraries['jquery-2.0.2.js'] = 'jQuery';
knownLibraries['jquery-2.0.3.js'] = 'jQuery';
knownLibraries['jquery-2.1.1.min.js'] = 'jQuery';
knownLibraries['jquery-2.0.0.min.js'] = 'jQuery';
knownLibraries['jquery.min.js'] = 'jQuery';
knownLibraries['jquery.js'] = 'jQuery';

knownLibraries['localforage.js'] = 'LocalForage';

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

knownLibraries['jquery.mobile-1.0.min.js'] = 'jQuery';
knownLibraries['jquery.mobile-1.1.0.min.css'] = 'jQuery';
knownLibraries['jquery.mobile-1.1.0.min.js'] = 'jQuery Mobile';
knownLibraries['jquery.mobile-1.2.0.css'] = 'jQuery';
knownLibraries['jquery.mobile-1.2.0.js'] = 'jQuery Mobile';
knownLibraries['jquery.mobile-1.2.0.min.css'] = 'jQuery';
knownLibraries['jquery.mobile-1.2.0.min.js'] = 'jQuery Mobile';
knownLibraries['jquery.mobile-1.3.0.min.css'] = 'jQuery';
knownLibraries['jquery.mobile-1.3.0.min.js'] = 'jQuery Mobile';
knownLibraries['jquery.mobile-1.3.1.min.css'] = 'jQuery';
knownLibraries['jquery.mobile-1.3.1.min.js'] = 'jQuery Mobile';
knownLibraries['jquery.mobile-1.3.2.js'] = 'jQuery';
knownLibraries['jquery.mobile-1.3.2.min.css'] = 'jQuery Mobile';
knownLibraries['jquery.mobile-1.3.2.min.css'] = 'jQuery';
knownLibraries['jquery.mobile-1.3.2.min.js'] = 'jQuery Mobile';
knownLibraries['jquery.mobile-1.4.0.min.css'] = 'jQuery';
knownLibraries['jquery.mobile-1.4.0.min.js'] = 'jQuery Mobile';
knownLibraries['jquery.mobile-1.4.2.css'] = 'jQuery';
knownLibraries['jquery.mobile-1.4.2.js'] = 'jQuery';
knownLibraries['jquery.mobile-1.4.2.min.css'] = 'jQuery';
knownLibraries['jquery.mobile-1.4.2.min.js'] = 'jQuery Mobile';
knownLibraries['jquery.mobile-1.6.4.min.js'] = 'jQuery Mobile';
knownLibraries['jquery.mobile.js'] = 'jQuery Mobile';
knownLibraries['jquery.mobile.min.js'] = 'jQuery Mobile';

knownLibraries['jquery.mobile.icons.min.css'] = 'jQuery Mobile';
knownLibraries['jquery.mobile.min.css'] = 'jQuery Mobile';
knownLibraries['jquery.mobile.structure-1.0.min.css'] = 'jQuery Mobile';
knownLibraries['jquery.mobile.structure-1.3.2.min.css'] = 'jQuery Mobile';
knownLibraries['jquery.mobile.structure-1.4.2.min.css'] = 'jQuery Mobile';
knownLibraries['jquery.mobile.structure.min.css'] = 'jQuery Mobile';
knownLibraries['jquery.mobile.theme-1.0.min.css'] = 'jQuery Mobile';
knownLibraries['jquery.mobile.theme-1.3.2.min.css'] = 'jQuery Mobile';

knownLibraries['jquery-ui.min.js'] = 'jQuery UI';

knownLibraries['fxpay.min.js'] = 'fxPay';

knownLibraries['tgs-adapters-0.3.min.js'] = 'TreSensa';
knownLibraries['tgs-0.3.css'] = 'TreSensa';
knownLibraries['tgs-0.3.min.js'] = 'TreSensa';
knownLibraries['tge-1.0.min.js'] = 'TreSensa';
knownLibraries['tgl-1.0.min.js'] = 'TreSensa';
knownLibraries['tgl.boot.min.js'] = 'TreSensa';
knownLibraries['GameConfig.js'] = 'TreSensa';
knownLibraries['viewporter.min.js'] = 'TreSensa';

knownLibraries['mippin.css'] = 'Mippin';
knownLibraries['Model.js'] = 'Mippin';
knownLibraries['View.js'] = 'Mippin';
knownLibraries['Controller.js'] = 'Mippin';
knownLibraries['AppUX.js'] = 'Mippin';
knownLibraries['Vars.js'] = 'Mippin';

knownLibraries['tappable.js'] = 'Tappable';

knownLibraries['brick-1.0.1.js'] = 'Brick';
knownLibraries['brick-1.0.1.min.js'] = 'Brick';
knownLibraries['brick-1.0.1.css'] = 'Brick';
knownLibraries['brick.js'] = 'Brick';
knownLibraries['brick.min.js'] = 'Brick';

knownLibraries['ember-1.6.1.min.js'] = 'Ember';

knownLibraries['require.js'] = 'Require.js';
knownLibraries['zepto.js'] = 'Zepto.js';
knownLibraries['zepto.min.js'] = 'Zepto.js';
knownLibraries['c2runtime.js'] = 'Construct 2';
knownLibraries['c2webappstart.js'] = 'Construct 2';

knownLibraries['firebase.js'] = 'Firebase';

knownLibraries['font-awesome.min.css'] = 'Font Awesome';

knownLibraries['angular.js'] = 'Angular';
knownLibraries['angular-touch.js'] = 'Angular';
knownLibraries['angular.min.js'] = 'Angular';
knownLibraries['angular-touch.min.js'] = 'Angular';
knownLibraries['angular-route.min.js'] = 'Angular';

knownLibraries['angular-animate.js'] = 'Angular';
knownLibraries['angular-animate.min.js'] = 'Angular';
knownLibraries['angular-csp.css'] = 'Angular';
knownLibraries['angular-resource.js'] = 'Angular';
knownLibraries['angular-resource.min.js'] = 'Angular';
knownLibraries['angular-route.js'] = 'Angular';
knownLibraries['angular-sanitize.js'] = 'Angular';
knownLibraries['angular-sanitize.min.js'] = 'Angular';
knownLibraries['angular-ui-router.js'] = 'Angular';
knownLibraries['angular-ui-router.min.js'] = 'Angular';

knownLibraries['cordova.js'] = 'Cordova';
knownLibraries['cordova_plugins.js'] = 'Cordova';
knownLibraries['cordova.min.js'] = 'Cordova';
knownLibraries['phonegap.js'] = 'Cordova';
knownLibraries['phonegap.min.js'] = 'Cordova';

knownLibraries['iscroll.js'] = 'Cubiq iSCroll.js';
knownLibraries['iscroll-lite.min.js'] = 'Cubiq iSCroll.js';
knownLibraries['add2home.js'] = 'Cubiq Add to home screen';
knownLibraries['add2home.css'] = 'Cubiq Add to home screen';

knownLibraries['kik.js'] = 'Kik';

knownLibraries['modernizr.js'] = 'Modernizr';
knownLibraries['modernizr.custom.js'] = 'Modernizr';
knownLibraries['modernizr-2.6.2.min.js'] = 'Modernizr';
knownLibraries['modernizr-2.5.3.min.js'] = 'Modernizr';
knownLibraries['modernizr-1.js'] = 'Modernizr';

knownLibraries['action_menu.css'] = 'Firefox OS Building Blocks';
knownLibraries['action_icons.css'] = 'Firefox OS Building Blocks';
knownLibraries['progress_activity.css'] = 'Firefox OS Building Blocks';
knownLibraries['seekbars.css'] = 'Firefox OS Building Blocks';
knownLibraries['seekbars.js'] = 'Firefox OS Building Blocks';
knownLibraries['lists.css'] = 'Firefox OS Building Blocks';
knownLibraries['input_areas.css'] = 'Firefox OS Building Blocks';
knownLibraries['drawer.css'] = 'Firefox OS Building Blocks';

knownLibraries['adsbygoogle.js'] = 'Google AdSense';

knownLibraries['inneractive.js'] = 'InnerActive Ads';
knownLibraries['receiptverifier.js'] = 'mozPay receipt verifier';

knownLibraries['PxLoader.min.js'] = 'PixelLab preloader';
knownLibraries['PxLoaderImage.min.js'] = 'PixelLab preloader';

knownLibraries['l10n.js'] = 'Web L10n';

knownLibraries['include.js'] = 'Persona';

knownLibraries['underscore.js'] = 'Underscore';
knownLibraries['underscore-min.js'] = 'Underscore';

knownLibraries['jasmine.js'] = 'Jasmine';
knownLibraries['jasmine-html.js'] = 'Jasmine';
knownLibraries['jasmine.css'] = 'Jasmine';

// returns a list of unique JS filenames for the given app, omitting commonly used filenames.
// TODO: what about CSS?

function getFilenames(inApp) {
    var unionOfFilenames = [];
    var stopNames = ['', 'ads.js', 'init.js', 'app.js', 'index.js', 'main.js', 'script.js', 'manifest.webapp', 'zigbert.rsa', 'zigbert.sf', 'manifest.mf', 'ids.json', 'index.html', 'style.css', 'app.css', 'headers.css', 'buttons.css', 'main.css', 'stylesheet.css' ];

    if (inApp.package_entries) {
        unionOfFilenames.push.apply(unionOfFilenames, inApp.package_entries);
    }

    if (inApp.appcache_entry_sizes) {
        for (var entryIndex in inApp.appcache_entry_sizes) {
            unionOfFilenames.push(entryIndex.substring(entryIndex.lastIndexOf('/') + 1));
        }
    } 

    if (inApp.included_scripts) {
        for (var entryIndex in inApp.included_scripts) {
            var fullPath = inApp.included_scripts[entryIndex];
            unionOfFilenames.push(fullPath.substring(fullPath.lastIndexOf('/') + 1));
        }
    } 

    var uniqueFilenames = unionOfFilenames.filter(function(elem, pos, self) {
        return self.indexOf(elem) == pos;
    });

    var filteredFilenames = uniqueFilenames.filter(function(elem, pos, self) {
        return (elem.indexOf('.js') > 0 || elem.indexOf('.css') > 0)&& stopNames.indexOf(elem) == -1;
    });

    return filteredFilenames;
}

// returns a list of known libraries for the given app, based on mapping its filenames

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

    if (uniqueLibraries.length == 0) {
        uniqueLibraries.push('Unknown');
    }

    return uniqueLibraries;
}

// returns a list of filenames not associated with libraries

function getUnknownFilenames(inApp) {
    var filteredFilenames = getFilenames(inApp);

    var unknownFilenames = [];

    for (var index in filteredFilenames) {
        var filename = filteredFilenames[index];
        if (! knownLibraries[filename]) {
            unknownFilenames.push(filename);
        }
    }

    return unknownFilenames;
}

function computeGlobalStatistics(marketplaceCatalog) {
    var authors = [];
    var earliestCreated = new Date();
    var latestCreated = new Date(0);
    var ratingCount = 0;

    for (index in marketplaceCatalog) {
        var marketplaceApp = marketplaceCatalog[index];
        var createdDate = Date.parse(marketplaceApp.created);

        if (createdDate < earliestCreated) {
            earliestCreated = createdDate;
        }

        if (createdDate > latestCreated) {
            latestCreated = createdDate;
        }

        if (authors.indexOf(marketplaceApp.author) < 0) {
            authors.push(marketplaceApp.author);
        }

        if (marketplaceApp.ratings && marketplaceApp.ratings.count) {
            ratingCount += marketplaceApp.ratings.count;
        }
    }

    return {
        appCount: Object.keys(marketplaceCatalog).length,
        authorCount: authors.length,
        ratingCount: ratingCount,
        earliestCreated: earliestCreated,
        latestCreated: latestCreated
    };
}

// We export these functions for use by the server (see server.js)

module.exports.getLibraryNames = getLibraryNames;
module.exports.getUnknownFilenames = getUnknownFilenames;
module.exports.knownLibraries = knownLibraries;
module.exports.getValues = getValues;

module.exports.getPlatformTagsByCategoryTable = getPlatformTagsByCategoryTable;
module.exports.getPlatformTagsByPopularityTable = getPlatformTagsByPopularityTable;

module.exports.getRatingCount = getRatingCount;
module.exports.getAverageRating = getAverageRating;
module.exports.getAbuseReportCount = getAbuseReportCount;
module.exports.getInstallCount = getInstallCount;
module.exports.getPrice = getPrice;
module.exports.getNumberOfVersions = getNumberOfVersions;
module.exports.getPackageSize = getPackageSize;
module.exports.getDaysSinceCreated = getDaysSinceCreated;
module.exports.getDaysSinceReviewed = getDaysSinceReviewed;
module.exports.getCreationDate = getCreationDate;
module.exports.getReviewedDate = getReviewedDate;
module.exports.getLastUpdatedDate = getLastUpdatedDate;

module.exports.getFrequency = getFrequency;
module.exports.getManifestProtocol = getManifestProtocol;
module.exports.getAuthor = getAuthor;
module.exports.getOrientation = getOrientation;
module.exports.getInstallsAllowedFrom = getInstallsAllowedFrom;
module.exports.getPermissionKeys = getPermissionKeys;
module.exports.getContentRatingDescriptors = getContentRatingDescriptors;
module.exports.getIconSizes = getIconSizes;
module.exports.getNumberOfPreviews = getNumberOfPreviews;
module.exports.getSupportedLocales = getSupportedLocales;
module.exports.getSupportedRegions = getSupportedRegions;
module.exports.getCategoryStrings = getCategoryStrings;
module.exports.getPlatformTags = getPlatformTags;
module.exports.getPaymentCategories = getPaymentCategories;
module.exports.getActivityKeys = getActivityKeys;
module.exports.getFilenames = getFilenames;

module.exports.computeGlobalStatistics = computeGlobalStatistics;

