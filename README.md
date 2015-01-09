thecount
========

TheCount is a web server based on data gathered from the Firefox Marketplace using its Marketplace API.
This version uses a JS MVC framework.

## Data Gathering

There's a standalone command-line tool called `thecount.js` that uses the Marketplace API to download all the metadata about all the apps in the Marketplace catalog. This tool also retrieves all the appcache manifests for all of those apps, and downloads all the ZIP packages for all the packaged apps. All this metadata is collected into a single JS object and then written as JSON (approximately 50MB).

## Analytics

TheCount runs a Node server that shows frequency and distribution of various traits across the Firefox Marketplace app catalog. These include distribution of package sizes and frequency of use of common JS libraries.

## Store

TheCount also offers a minimal app disovery and installation experienced based on this metadata. I did this as an exercise to prove to myself that a carrier or handset maker participating in the Open Web Apps ecosystem could make their own store based on the data available from the Marketplace API.

## How To Use

1. Install dependencies: `npm install`
2. Collect metadata: `node thecount.js --build`
3. Run the server: `node server.js`

### Deploy your own

1. Set up your account on [Mozilla
   PaaS](https://mana.mozilla.org/wiki/pages/viewpage.action?pageId=30081453)
2. `cp stackato.yml-dist stackato.yml`
3. Update `stackato.yml` with your own app name. (e.g., "thecount-username")
4. [`stackato
   push`](https://mana.mozilla.org/wiki/pages/viewpage.action?pageId=30081453#MozillaPaaS%28Stackato%29-TestingpushingandmakingserviceswiththeClient)
