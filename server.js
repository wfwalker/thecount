// server.js

/**
 * Module dependencies.
 */

// INITIALIZE SERVER

var express = require('express');
var url = require('url');
var http = require('http');
var https = require('https');
var statistics = require('./statistics.js');
var catalog = require('./catalog.js');

var app = express();

// INITIALIZE LOGGING

var winston = require('winston');
var logger = new (winston.Logger)({
    transports: [
        // TODO: only show debug logs if this is dev server
        new (winston.transports.Console)({ level: 'info' }),
        new (winston.transports.File)({ filename: 'thecount.log' })
    ]
});

// CONFIGURE SERVER

// statically serve up some assets, cache everything for a day

app.use("/fonts", express.static('fonts', { maxage: 86400000 }));
app.use("/images", express.static('images', { maxage: 86400000 }));
app.use("/scripts", express.static('scripts', { maxage: 86400000 }));
app.use("/stylesheets", express.static('stylesheets', { maxage: 86400000 }));
app.use("/", express.static('assets', { maxage: 86400000 }));

// LAUNCH SERVER

var myPort = process.env.PORT || 8080;
var mHost = process.env.VCAP_APP_HOST || "127.0.0.1";

app.listen(myPort);

logger.info("server running", mHost, myPort);

// PARSE CATALOG metadata

function sumAppcacheEntrySizes(app) {
    var total = 0;

    for (var key in app.appcache_entry_sizes) {
        var value = app.appcache_entry_sizes[key];
        total = total + parseInt(value);
    }

    return total;
}

// GLOBALS

var marketplaceCatalog = {};
var globalStatistics = {};
var appsByAuthor = {};

try {
    logger.info('About to Parse Catalog');

    // parse the giant apps.json created by thecount.js command-line tool or by /rebuild
    var marketplaceCatalog = require('./apps.json');
    logger.info('loaded ' + Object.keys(marketplaceCatalog).length + ' apps');
    logger.info('parsed catalog'); 

    // compute extra per-app data. for example, the sum of the size of all the appcache entries for each app

    for (index in marketplaceCatalog) {
        var marketplaceApp = marketplaceCatalog[index];
        if (marketplaceApp.manifest && marketplaceApp.manifest.appcache_path) {
            marketplaceApp.appcache_size = sumAppcacheEntrySizes(marketplaceApp);
        }
    }

    logger.info('added appcache size');

    globalStatistics = statistics.computeGlobalStatistics(marketplaceCatalog);
    logger.info('global stats', globalStatistics);
}
catch (e) {
    logger.info('error parsing catalog');
    logger.info(e);
}

// Middleware to filter the catalogue by url params
// Someone was already abusing globals when I got here

app.use(function(req, resp, next){
    logger.info('filter middleware, starting count', Object.keys(marketplaceCatalog).length);
    req.apps = marketplaceCatalog;
    var since = req.query.since;
    var until = req.query.until;
    var limit = req.query.limit;
    var min_ratings = req.query.min_ratings;

    logger.info('filter criteria', {since: since, until: until, limit: limit, min_ratings: min_ratings});

    if (since || until || limit || min_ratings) {
        logger.info("found filter url params");
        var count = 0;
        filteredCatalog = {};
        startDate = since ? Date.parse(since) : null;
        endDate = until ? Date.parse(until) : null;
        minRatings = min_ratings ? parseInt(min_ratings) : null;
        logger.info('real filter criteria', {since: startDate, until: endDate, limit: limit, minRatings: minRatings});

        for (index in marketplaceCatalog) {
            var app = marketplaceCatalog[index];
            var createdDate = Date.parse(app.created);

            // if there's no ratings, or no ratings count, OR if there is a minRatings and this guy has fewer, then SKIP
            if ((!app.ratings) || (!app.ratings.count) || (minRatings && app.ratings.count < minRatings))
                continue;
            if ( startDate && createdDate < startDate )
                continue;
            if ( endDate && createdDate >= endDate )
                continue;
            if ( count >= limit)
                continue;

            filteredCatalog[index] = app;
            count++;
        }
        logger.info("filter middleware, ending count", Object.keys(filteredCatalog).length);
        req.apps = filteredCatalog;
    }
    next();
});


// ROUTING PARAMETERS

// deal with an app_id parameter in a REST route by retrieving an app by its numeric ID

app.param('app_id', function(req, resp, next, id) {
	var appID = parseInt(req.param('app_id'));
	logger.info('param :app_id', appID);
	req.appData = marketplaceCatalog[appID];
    logger.debug('param :app_id ' + req.appData);    
	next();
});

// deal with an author parameter in a REST route by retrieving all the apps whose author is the given string

app.param('author', function(req, resp, next, id) {
    var author = req.param('author')
    logger.info('param :author' + author);
    var apps = [];

    for (index in marketplaceCatalog) {
        var app = marketplaceCatalog[index];
        if (app.author == author) {
            apps.push(app);
        }
    }

    req.author = author;
    req.apps = apps;
    next();
});

// deal with an category parameter in a REST route by retrieving all the apps whose category list contains the given string

app.param('category', function(req, resp, next, id) {
    var category = req.param('category')
    logger.info('param :category', category);
    var apps = [];

    for (index in marketplaceCatalog) {
        var app = marketplaceCatalog[index];
        if (app.categories.indexOf(category) >= 0) {
            apps.push(app);
        }
    }

    req.category = category;
    req.apps = apps;
    next();
});

// deal with an platform parameter in a REST route by retrieving all the apps whose platform list contains the given string

app.param('platform', function(req, resp, next, id) {
    var platform = req.param('platform')
    logger.info('param :platform', platform);
    var apps = [];

    for (index in marketplaceCatalog) {
        var app = marketplaceCatalog[index];
        if (statistics.getPlatformCategories(app).indexOf(platform) >= 0) {
            apps.push(app);
        }
    }

    req.platform = platform;
    req.apps = apps;
    next();
});


// deal with an premium parameter in a REST route by retrieving all the specified kind of premium apps 

app.param('premium_type', function(req, resp, next, id) {
    var premium_type = req.param('premium_type')
    logger.info('param :premium_type', premium_type);
    var apps = [];

    for (index in req.apps) {
        var app = req.apps[index];
        if (app.premium_type && app.premium_type == premium_type) {
            apps.push(app);
        }
    }

    req.premium_type = premium_type;
    req.apps = apps;
    next();
});


// deal with a search parameter in a REST route by retrieving all the apps matching the given string

app.param('search', function(req, resp, next, id) {
    var search = req.param('search')
    logger.info('param :search', search);
    var apps = [];

    for (index in req.apps) {
        var app = req.apps[index];
        if (JSON.stringify(app).indexOf(search) >= 0) {
            apps.push(app);
        }
    }

    req.search = search;
    req.apps = apps;
    next();
});


// deal with an min_ratings parameter by retrieving all the apps that have at least that many user ratings

app.param('min_ratings', function(req, resp, next, id) {
    var min_ratings = req.param('min_ratings')
    logger.info('param :min_ratings', min_ratings);
    var apps = [];

    for (index in req.apps) {
        var app = req.apps[index];
        if (app.ratings && app.ratings.count > min_ratings) {
            apps.push(app);
        }
    }

    req.min_ratings = min_ratings;
    req.apps = apps;
    next();
});

// deal with an min_ratings parameter by retrieving all the apps that have at least that many user ratings

app.param('max_ratings', function(req, resp, next, id) {
    var max_ratings = req.param('max_ratings')
    logger.info('param :max_ratings', max_ratings);
    var apps = [];

    for (index in req.apps) {
        var app = req.apps[index];
        if (app.ratings && app.ratings.count <= max_ratings) {
            apps.push(app);
        }
    }

    req.max_ratings = max_ratings;
    req.apps = apps;
    next();
});

// deal with an activity parameter by retrieving all the apps that support that activity

app.param('activity', function(req, resp, next, id) {
    var activity = req.param('activity')
    logger.info('param :activity', activity);
    var apps = [];

    for (index in req.apps) {
        var app = req.apps[index];

        if (app.manifest && app.manifest.activities && (Object.keys(app.manifest.activities).length > 0)) {
            if (Object.keys(app.manifest.activities).indexOf(activity) >= 0) {
                apps.push(app);
            }
        }
    }

    req.activity = activity;
    req.apps = apps;
    next();
});


// deal with a library parameter by retrieving all the apps that use the given JS/CSS library (i. e., jQuery)

app.param('library', function(req, resp, next, id) {
    var library = req.param('library')
    logger.info('param :library', library);
    var apps = [];

    for (index in req.apps) {
        var app = req.apps[index];
        if (statistics.getLibraryNames(app).indexOf(library) >= 0) {
            apps.push(app);
        }
    }

    req.library = library;
    req.apps = apps;
    next();
});

// deal with a file parameter by retrieving all the apps that contain the given filename

app.param('filename', function(req, resp, next, id) {
    var filename = req.param('filename')
    logger.info('param :filename', filename);
    var apps = [];

    for (index in req.apps) {
        var app = req.apps[index];
        if (statistics.getFilenames(app).indexOf(filename) >= 0) {
            apps.push(app);
        }
    }

    req.filename = filename;
    req.apps = apps;
    next();
});

// deal with a permission parameter by retrieving all the apps that request that permission

app.param('permission', function(req, resp, next, id) {
    var permission = req.param('permission')
    logger.info('param :permission', permission);
    var apps = [];

    for (index in req.apps) {
        var app = req.apps[index];
        if (statistics.getPermissionKeys(app).indexOf(permission) >= 0) {
            apps.push(app);
        }
    }

    req.permission = permission;
    req.apps = apps;
    next();
});

// deal with a content_rating_descriptor parameter by retrieving all the apps that list that content_rating_descriptor

app.param('content_rating_descriptor', function(req, resp, next, id) {
    var content_rating_descriptor = req.param('content_rating_descriptor')
    logger.info('param :content_rating_descriptor', content_rating_descriptor);
    var apps = [];

    for (index in req.apps) {
        var app = req.apps[index];
        if (statistics.getContentRatingDescriptors(app).indexOf(content_rating_descriptor) >= 0) {
            apps.push(app);
        }
    }

    req.content_rating_descriptor = content_rating_descriptor;
    req.apps = apps;
    next();
});

// deal with a days_old parameter by retrieving all the apps that were published within that many days

app.param('days_old', function(req, resp, next, id) {
    var days_old = req.param('days_old')
    logger.info('param :days_old', days_old);
    var apps = [];

    for (index in req.apps) {
        var app = req.apps[index];
        if (statistics.getDaysSinceReviewed(app) < days_old) {
            apps.push(app);
        }
    }

    req.days_old = days_old;
    req.apps = apps;
    next();
});

// deal with a locale parameter by retrieving all the apps that support the given locale

app.param('locale', function(req, resp, next, id) {
    var locale = req.param('locale')
    logger.info('param :locale', locale);
    var apps = [];

    for (index in req.apps) {
        var app = req.apps[index];
        if (statistics.getSupportedLocales(app).indexOf(locale) >= 0) {
            apps.push(app);
        }
    }

    req.locale = locale;
    req.apps = apps;
    next();
});

// ROUTING

// route requests to retrieve a single app by ID

app.get('/apps/:app_id', function(req, resp, next) {
    logger.info('route /apps/:app_id');
    resp.json({app: req.appData});
});

// route requests to retrieve apps by author

app.get('/listing/author/:author', function(req, resp, next) {
    resp.json(req.apps);
});

// route requests to retrieve apps by content rating descriptor

app.get('/listing/content_rating_descriptor/:content_rating_descriptor', function(req, resp, next) {
    resp.json(req.apps);
});

// route requests to retrieve apps by permission

app.get('/listing/permission/:permission', function(req, resp, next) {
    resp.json(req.apps);
});

// route requests to retrieve apps by category

app.get('/listing/category/:category', function(req, resp, next) {
    resp.json(req.apps);
});

// route requests to retrieve apps by platform

app.get('/listing/platform/:platform', function(req, resp, next) {
    resp.json(req.apps);
});

// route requests to retrieve apps by locale

app.get('/listing/locale/:locale', function(req, resp, next) {
    resp.json(req.apps);
});

// route requests to retrieve apps by premium category

app.get('/listing/payment/:premium_type', function(req, resp, next) {
    resp.json(req.apps);
});

// route requests to search across the entire JSON for each app

app.get('/listing/search/:search', function(req, resp, next) {
    resp.json(req.apps);
});


// route requests to retrieve apps with errors

app.get('/listing/errors', function(req, resp, next) {
    var apps = [];

    for (index in req.apps) {
        var app = req.apps[index];
        if ((!app.manifest) || (app.manifest && app.manifest.error) || (app.appcache_manifest && app.appcache_manifest.error)) {
            apps.push(app);
        }
    }

    resp.json(apps);
});

// route requests to retrieve apps with appcache

app.get('/listing/appcache', function(req, resp, next) {
    var apps = [];

    for (index in req.apps) {
        var app = req.apps[index];
        if (app.manifest && app.manifest.appcache_path) {
            apps.push(app);
        }
    }

    resp.json(apps);
});


// route requests to retrieve apps by number of user ratings

app.get('/listing/min_ratings/:min_ratings', function(req, resp, next) {
    resp.json(req.apps);
});

// route requests to retrieve apps by number of user ratings

app.get('/listing/max_ratings/:max_ratings', function(req, resp, next) {
    resp.json(req.apps);
});

// route requests to retrieve apps by supported activity

app.get('/listing/activity/:activity', function(req, resp, next) {
    resp.json(req.apps);
});

// route requests to retrieve apps by which library they use

app.get('/listing/library/:library', function(req, resp, next) {
    resp.json(req.apps);
});

// route requests to retrieve apps by which filename they use

app.get('/listing/filename/:filename', function(req, resp, next) {
    resp.json(req.apps);
});

// route requests to retrieve apps by how old they are

app.get('/listing/days_old/:days_old', function(req, resp, next) {
    resp.json(req.apps);
});

// route requests to get the homepage

app.get('/globalstatistics', function(req, resp, next) {
    resp.json(globalStatistics);
});

// route requests to get packaged/hosted by category

app.get('/packaged_by_category', function(req, resp, next) {
    logger.info('packaged_by_category');
    resp.json({ tableData: statistics.getPackagedCategoryTable(req.apps) });
});

// This data structure defines all the routes for analytics in TheCount, their paths, their getter functions

var graphs = [
    { kind: 'pie', routeFragment: 'manifest_protocol', title: 'manifest protocol', getter: statistics.getManifestProtocol },
    { kind: 'distribution', routeFragment: 'price', title: 'price', getter: statistics.getPrice },
    { kind: 'distribution', routeFragment: 'rating_count', title: 'num ratings', getter: statistics.getRatingCount },
    { kind: 'distribution', routeFragment: 'number_of_versions', title: 'number of versions', getter: statistics.getNumberOfVersions },
    { kind: 'distribution', routeFragment: 'number_of_previews', title: 'number of previews', getter: statistics.getNumberOfPreviews },
    { kind: 'distribution', routeFragment: 'rating', title: 'avg rating', getter: statistics.getAverageRating },
    { kind: 'distribution', routeFragment: 'abuse_report_count', title: 'abuse report count', getter: statistics.getAbuseReportCount },
    { kind: 'distribution', routeFragment: 'install_count', title: 'install count', getter: statistics.getInstallCount },
    { kind: 'distribution', routeFragment: 'package_size', title: 'package size in MB', getter: statistics.getPackageSize },
    { kind: 'distribution', routeFragment: 'days_since_reviewed', title: 'days since reviewed', getter: statistics.getDaysSinceReviewed },
    { kind: 'distribution', routeFragment: 'days_since_created', title: 'days since created', getter: statistics.getDaysSinceCreated },
    { kind: 'distribution', routeFragment: 'creation_date', title: 'creation date', getter: statistics.getCreationDate },
    { kind: 'distribution', routeFragment: 'reviewed_date', title: 'reviewed date', getter: statistics.getReviewedDate },
    { kind: 'distribution', routeFragment: 'last_updated_date', title: 'last updated date', getter: statistics.getLastUpdatedDate },
    { kind: 'frequency', routeFragment: 'unknown', title: 'unknown filenames', getter: statistics.getUnknownFilenames },
    { kind: 'frequency', routeFragment: 'icon_sizes', title: 'icon sizes', getter: statistics.getIconSizes },
    { kind: 'frequency', routeFragment: 'library', title: 'library', getter: statistics.getLibraryNames },
    { kind: 'frequency', routeFragment: 'file', title: 'file', getter: statistics.getFilenames },
    { kind: 'frequency', routeFragment: 'category', title: 'category', getter: statistics.getCategoryStrings },
    { kind: 'frequency', routeFragment: 'platform', title: 'platform', getter: statistics.getPlatformCategories },
    { kind: 'frequency', routeFragment: 'payment', title: 'payment', getter: statistics.getPaymentCategories },
    { kind: 'pie', routeFragment: 'payment', title: 'payment', getter: statistics.getPaymentCategories },
    { kind: 'frequency', routeFragment: 'author', title: 'author', getter: statistics.getAuthor },
    { kind: 'frequency', routeFragment: 'locale', title: 'locale', getter: statistics.getSupportedLocales },
    { kind: 'frequency', routeFragment: 'region', title: 'region', getter: statistics.getSupportedRegions },
    { kind: 'frequency', routeFragment: 'permission', title: 'permission', getter: statistics.getPermissionKeys },
    { kind: 'frequency', routeFragment: 'activity', title: 'activity', getter: statistics.getActivityKeys },
    { kind: 'frequency', routeFragment: 'content_rating_descriptor', title: 'content_rating descriptor', getter: statistics.getContentRatingDescriptors },
    { kind: 'frequency', routeFragment: 'orientation', title: 'orientation', getter: statistics.getOrientation },
    { kind: 'pie', routeFragment: 'installs_allowed_from', title: 'installs allowed from', getter: statistics.getInstallsAllowedFrom }
]

// helper functions to add GET route for the given entry in the data structure

function privateAddDistributionRoute(aGraph) {
    app.get('/distribution/' + aGraph.routeFragment, function(req, resp, next) {
        values = statistics.getValues(req.apps, aGraph.getter);

        resp.json(values);
    });
}

function privateAddFrequencyRoute(aGraph) {
    app.get('/frequency/' + aGraph.routeFragment, function(req, resp, next) {
        frequency = statistics.getFrequency(req.apps, aGraph.getter);

        // frequency
        resp.json(frequency);
    });
}

function privateAddPieRoute(aGraph) {
    app.get('/pie/' + aGraph.routeFragment, function(req, resp, next) {
        frequency = statistics.getFrequency(req.apps, aGraph.getter);

        // pie
        resp.json(frequency);
    });
}

// read through the list of routes and add them to the router using the above helper functions

for(var graphIndex = 0; graphIndex < graphs.length; graphIndex++) {
    var aGraph = graphs[graphIndex];

    if (aGraph.kind == 'distribution') {
        privateAddDistributionRoute(aGraph);
    } else if (aGraph.kind == 'pie') {
        privateAddPieRoute(aGraph);
    } else {
        privateAddFrequencyRoute(aGraph);
    }
}

// route requests to generate the database

app.get('/rebuild', function(req, resp, next) {
    logger.info('/rebuild');

    if (! catalog.isRunning()) {
        logger.info('starting rebuilder');
        catalog.createMarketplaceCatalogDB('bogus');
    } else {
        logger.info('rebuild already running, NOT starting rebuilder');
    }

    resp.redirect('/rebuildreport');
});

app.get('/rebuildreport', function(req, resp, next) {
    logger.info('/rebuildreport');

    resp.json(catalog.progressReport());
});

