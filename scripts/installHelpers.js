function installLog(inMessage) {
	console.log(inMessage);
	$('#progress').text(inMessage);
}

function installSuccess(e) {
	installLog('success');
	var appRecord = this.result;
	appRecord.ondownloaderror = function(e) {
		installLog('ondownloaderror');
		installLog(appRecord.downloadError.name);
		$('button').addClass('btn-danger');
	}
	appRecord.ondownloadsuccess = function(e) {
		installLog('ondownloadsuccess');
	}
}

function installFail(e) {
	installLog('error ' + this.error.name);
	$('button').addClass('btn-danger');
}

function installButtonEventHandler(e) {
	installLog("clicked " + e.target.innerHTML.trim());
	// document.getElementById('installSpinner').style.display = 'block';

	if (e.target.getAttribute("data-manifest-url")) {
		installLog("install hosted " + e.target.innerHTML.trim());

		var url = e.target.getAttribute("data-manifest-url");
		installLog("hosted manifest url " + url);

		var request = navigator.mozApps.install(url);
		request.onsuccess = installSuccess;
		request.onerror = installFail;

	} else if (e.target.getAttribute("data-package-manifest-url")) {
		installLog("install packaged " + e.target.innerHTML.trim());

		var url = e.target.getAttribute("data-package-manifest-url");
		installLog("packaged manifest url " + url);

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
			console.log("INSTALLIFIED");
			button.setAttribute('disabled', 'true');
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
			installedManifestURLs.push(installListRequest.result[installListIndex].manifestURL);
		}

		wireUpInstallButtons(installedManifestURLs);
	};

});