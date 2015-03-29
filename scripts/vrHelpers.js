var renderer = null;
var scene = null;
var camera = null;
var clock = new THREE.Clock();
var controls = null;
var projector = null;
var highlight = null;
var targetList = [];
var brickTexture = null;
var woodTexture = null;
var floorTexture = null;

function makeTextSprite( message, parameters )
{
	if ( parameters === undefined ) parameters = {};

	var fontface = parameters.hasOwnProperty("fontface") ? 
		parameters["fontface"] : "Arial";

	var fontsize = parameters.hasOwnProperty("fontsize") ? 
		parameters["fontsize"] : 18;

	var borderThickness = parameters.hasOwnProperty("borderThickness") ? 
		parameters["borderThickness"] : 4;

	var borderColor = parameters.hasOwnProperty("borderColor") ?
		parameters["borderColor"] : { r:0, g:0, b:0, a:1.0 };

	var backgroundColor = parameters.hasOwnProperty("backgroundColor") ?
		parameters["backgroundColor"] : { r:255, g:255, b:255, a:1.0 };

	var canvas = document.createElement('canvas');
	var context = canvas.getContext('2d');
	context.font = "Bold " + fontsize + "px " + fontface;

	// get size data (height depends only on font size)
	var metrics = context.measureText( message );
	var textWidth = metrics.width;

	// background color
	context.fillStyle   = "rgba(" + backgroundColor.r + "," + backgroundColor.g + ","
								  + backgroundColor.b + "," + backgroundColor.a + ")";
	// border color
	context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + ","
								  + borderColor.b + "," + borderColor.a + ")";

	context.lineWidth = borderThickness;
	roundRect(context, borderThickness/2, borderThickness/2, textWidth + borderThickness, fontsize * 1.4 + borderThickness, 6);
	// 1.4 is extra height factor for text below baseline: g,j,p,q.

	// text color
	context.fillStyle = "rgba(0, 0, 0, 1.0)";

	context.fillText( message, borderThickness, fontsize + borderThickness);

	// canvas contents will be used for a texture
	var texture = new THREE.Texture(canvas) 
	texture.needsUpdate = true;

	var spriteMaterial = new THREE.SpriteMaterial( 
		{ map: texture } );
	var sprite = new THREE.Sprite( spriteMaterial );
	sprite.scale.set(2,2,2);
	return sprite;	
}

// function for drawing rounded rectangles
function roundRect(ctx, x, y, w, h, r) 
{
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r);
    ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h);
    ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r);
    ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
    ctx.fill();
	ctx.stroke();   
}

function addAppModelToScene(inApp) {
	var scaledRatings = Math.min(4.0, 0.5 + inApp.ratings.count / 100.0);

	var material = new THREE.MeshBasicMaterial( {
		map: inApp.is_packaged? brickTexture : woodTexture,
		color: {r: 0.9, g: 0.9, b: 0.9} } );

	// TODO: use scale.x,scale.y,scale.z instead of dimensioning here?
	var geometry = new THREE.BoxGeometry(scaledRatings, scaledRatings, scaledRatings );

	inApp.cube = new THREE.Mesh( geometry, material );

	inApp.cube.castShadow = true;

	inApp.cube.position.x = Math.random() * 100 - 50;
	inApp.cube.position.y = scaledRatings / 2;
	inApp.cube.position.z = Math.random() * 100 - 50;
	inApp.cube.app = inApp;

	scene.add(inApp.cube);
	targetList.push(inApp.cube);

	var appLabel = makeTextSprite(
			inApp.slug, 
			{
				fontsize: 24,
				borderColor: inApp.app_type == 'privileged' ? {r:0, g:255, b:0, a:1.0} : {r:255, g:0, b:0, a:1.0},
				backgroundColor: inApp.app_type == 'privileged' ? {r:100, g:255, b:100, a:0.8} : {r:255, g:100, b:100, a:0.8}
			});

	appLabel.position.set(inApp.cube.position.x, inApp.cube.position.y + scaledRatings / 2, inApp.cube.position.z);

	scene.add(appLabel);		
}

function createVRScene(inView) {
	console.log('createVRScene');
	var model = inView.get('model');

	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(800, 600);
    renderer.shadowMapEnabled = true;
    renderer.shadowMapSoft = true;

	projector = new THREE.Projector();
	$('.vr')[0].appendChild(renderer.domElement);

	floorTexture = new THREE.ImageUtils.loadTexture( 'roadway.jpg' );
	floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping; 
	floorTexture.repeat.set( 20, 20 );

	// DoubleSide: render texture on both sides of mesh
	var floorMaterial = new THREE.MeshBasicMaterial( { map: floorTexture, side: THREE.DoubleSide } );
	var floorGeometry = new THREE.PlaneGeometry(100, 100, 1, 1);
	var floor = new THREE.Mesh(floorGeometry, floorMaterial);
	floor.rotation.x = Math.PI / 2;
    floor.receiveShadow = true;
	scene.add(floor);	

	brickTexture = new THREE.ImageUtils.loadTexture( 'brick-texture3.jpg' );
	brickTexture.wrapS = brickTexture.wrapT = THREE.RepeatWrapping; 
	brickTexture.repeat.set( 2, 2 );

	woodTexture = new THREE.ImageUtils.loadTexture( 'wood-texture.jpg' );
	woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping; 
	woodTexture.repeat.set( 1, 1 );

	// make sure the camera's "far" value is large enough so that it will render the skyBox!
	var skyBoxGeometry = new THREE.CubeGeometry( 1000, 1000, 1000 );
	// BackSide: render faces from inside of the cube, instead of from outside (default).
	var skyBoxMaterial = new THREE.MeshBasicMaterial( { color: 0x007fff, side: THREE.BackSide } );
	var skyBox = new THREE.Mesh( skyBoxGeometry, skyBoxMaterial );
	scene.add(skyBox);	

	for (var index = 0; index < model.length; index++) {
		addAppModelToScene(model[index]);
	}

	controls = new THREE.FirstPersonControls(camera);
	controls.movementSpeed = 4;
	controls.lookSpeed = 0.08;
    controls.constrainVertical = true;
    controls.verticalMin = Math.PI * 0.25;
    controls.verticalMax = Math.PI * 0.55;

	camera.position.y = 1;

	render();
}

function handleSelection() {
	var vector = new THREE.Vector3( 0, 0, 1 );
	vector.unproject( camera );
	var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );

	var intersects = ray.intersectObjects( targetList );

	if (intersects.length == 1) {
		if ((highlight == null) || (highlight != intersects[0].object.app)) {
			highlight = intersects[0].object.app;
			intersects[0].object.material.color = {r: 0.9, g: 0.1, b: 0.1};
			console.log(highlight.manifest_url);
		}

		if (intersects[0].distance < 5) {
			console.log('BOOM');
			// window.location='/#/app/' + highlight.id;
		}
	} else {
		if (highlight != null) {
			for (var resetIndex = 0; resetIndex < targetList.length; resetIndex++) {
				targetList[resetIndex].material.color = {r: 0.9, g: 0.9, b: 0.9};
			}
			highlight = null;
		}
	}
}

function render() {
	controls.update( clock.getDelta() );

	camera.position.y = THREE.Math.clamp( camera.position.y, 0.5, 5.0 );

	handleSelection();

	renderer.render(scene, camera);
	requestAnimationFrame(render);
}