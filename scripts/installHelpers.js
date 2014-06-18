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
	$('button').click(launchButtonEventHandler);
	$('button').html('Launch');

	var appRecord = this.result;
	appRecord.ondownloaderror = function(e) {
		installLog('download error: ' + appRecord.downloadError.name);
		$('button').addClass('btn-danger');
	}
	appRecord.ondownloadsuccess = function(e) {
		installLog('download succeeded');
	}
}

// install() or installPackage() failed
function installFail(e) {
	installLog('install failed: ' + this.error.name);
	$('button').addClass('btn-danger');
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
	var buttons = document.getElementsByTagName("button");

	for (var index = 0; index < buttons.length; index++) {
		var button = buttons[index];

		if (button.getAttribute('data-manifest-url') && installedManifestURLs.indexOf(button.getAttribute('data-manifest-url')) >= 0) {
			console.log("app already installed");
			button.addEventListener('click', launchButtonEventHandler);
			button.innerHTML = 'Launch';
		} else {
			button.addEventListener('click', installButtonEventHandler);
		}
	}	
}

$(document).ready(function() {
	var installListRequest = window.navigator.mozApps.getInstalled();
	var installedManifestURLs = []

	installListRequest.onerror = function(e) {
		alert("Error calling getInstalled: " + installListRequest.error.name);

		wireUpInstallButtons([]);
	};

	installListRequest.onsuccess = function(e) {
		for (var installListIndex = 0; installListIndex < installListRequest.result.length; installListIndex++) {
			var manifestURL = installListRequest.result[installListIndex].manifestURL;
			installedManifestURLs.push(manifestURL);
			appRecordsByManifest[manifestURL] = installListRequest.result[installListIndex];
		}

		wireUpInstallButtons(installedManifestURLs);
	};

});