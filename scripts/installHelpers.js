// code for making app install buttons and their interactions

// utility logging function for updates
function installLog(inMessage) {
	console.log(inMessage);
	$('#progress').text(inMessage);
}

// global dictionary of app records
var appRecordsByManifest = {};

// install() or installPackage() succeeded
// start tracking download events
function installSuccess(e) {
	installLog('success');
	$('button').off('click');
	console.log('disabled click handlers');

	// add the newly installed app to appRecordsByManifest
	var appRecord = this.result;
	appRecordsByManifest[appRecord.manifestURL] = appRecord;

	$('.installButton').click(launchButtonEventHandler);
	console.log('enabled launch handler');
	$('.installButton').html('Launch');

	console.log(appRecord);
	appRecord.ondownloaderror = function(e) {
		installLog('download error: ' + appRecord.downloadError.name);
		$('.installButton').addClass('btn-danger');
	}
	appRecord.ondownloadsuccess = function(e) {
		installLog('download succeeded');
	}
}

// install() or installPackage() failed
function installFail(e) {
	installLog('install failed: ' + this.error.name);
	$('.installButton').addClass('btn-danger');
}

// when clicking on launch button
// get the App object for that manifest and launch it
function launchButtonEventHandler(e) {
	installLog("clicked launch");
	var url = '';

	if (e.target.getAttribute("data-manifest-url")) {
		url = e.target.getAttribute("data-manifest-url");
	} else if (e.target.getAttribute("data-package-manifest-url")) {
		url = e.target.getAttribute("data-package-manifest-url");
	} else {
		installLog("ERROR: found neither data-packaged-manifest-url nor data-manifest-url");
	}

	if (appRecordsByManifest[url]) {
		installLog('launching');
		appRecordsByManifest[url].launch();	
		installLog('launched');
	} else {
		installLog('manifest not found');		
	}
}

function installButtonEventHandler(e) {
	installLog("clicked install");

	if (e.target.getAttribute("data-manifest-url")) {
		var url = e.target.getAttribute("data-manifest-url");

		var request = navigator.mozApps.install(url);
		request.onsuccess = installSuccess;
		request.onerror = installFail;

	} else if (e.target.getAttribute("data-package-manifest-url")) {
		var url = e.target.getAttribute("data-package-manifest-url");

		var request = navigator.mozApps.installPackage(url);
		request.onsuccess = installSuccess;
		request.onerror = installFail;
		
	} else {
		installLog("ERROR: found neither data-packaged-manifest-url nor data-manifest-url");
	}
}

function wireUpInstallButtons(installedManifestURLs) {
	console.log('wiring up install buttons');
	console.log(installedManifestURLs);

	$('.installButton').each(function(index) {
		if ($(this).attr('data-manifest-url') && installedManifestURLs.indexOf($(this).attr('data-manifest-url')) >= 0) {
			console.log("hosted app already installed");
			$(this).click(launchButtonEventHandler);
			$(this).attr('value', 'Launch');
		} else if ($(this).attr('data-package-manifest-url') && installedManifestURLs.indexOf($(this).attr('data-package-manifest-url')) >= 0) {
			console.log("packaged app already installed");
			$(this).click(launchButtonEventHandler);
			$(this).attr('value', 'Launch');
		} else {
			$(this).click(installButtonEventHandler);
		}
	});
}

// Stuff to do when the page loads

$(document).ready(function() {

	// set up table sorting behavior

	// $('.tablesorter-table').tablesorter({
	//     theme : 'blue',
	 
	//     headers: { 0: { sorter: false }, 1: { sorter: true }, 4: { sorter: false } },
	 
	//     // header layout template; {icon} needed for some themes
	//     headerTemplate : '{content}{icon}',
	 
	//     // initialize column styling of the table
	//     widgets : ["columns"],
	//     widgetOptions : {
	// 		// change the default column class names
	// 		// primary is the first column sorted, secondary is the second, etc
	// 		columns : [ "primary", "secondary", "tertiary" ]
	//     }
	// });

});