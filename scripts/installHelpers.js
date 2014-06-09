function successHandler() {
	console.log('success');
	var appRecord = this.result;
	console.log(appRecord);
}

function errorHandler() {
	console.log('error ' + this.error.name);
}

function myInstallPackage(inMiniManifestURL) {
	var request = navigator.mozApps.installPackage(inMiniManifestURL);
	request.onsuccess = successHandler;
	request.onerror = errorHandler;
}

function myInstallHosted(inManifestURL) {
	var request = navigator.mozApps.install(inManifestURL);
	request.onsuccess = successHandler;
	request.onerror = errorHandler;
}
