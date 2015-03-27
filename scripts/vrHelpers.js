var renderer = null;
var scene = null;
var camera = null;
var clock = new THREE.Clock();
var controls = null;
var projector = null;
var highlight = null;
var targetList = [];

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

	var material = new THREE.MeshPhongMaterial( { color: 0x808080 } );
	var geometry = new THREE.BoxGeometry(scaledRatings, 1, scaledRatings );

	inApp.cube = new THREE.Mesh( geometry, material );

	inApp.cube.position.x = Math.random() * 100 - 50;
	inApp.cube.position.y = Math.random() * 2 +2;
	inApp.cube.position.z = Math.random() * 100 - 50;
	inApp.cube.app = inApp;

	scene.add(inApp.cube);
	targetList.push(inApp.cube);

	var spritey = makeTextSprite(
			inApp.slug, 
			{
				fontsize: 24,
				borderColor: {r:255, g:0, b:0, a:1.0},
				backgroundColor: {r:255, g:100, b:100, a:0.8}
			});

	spritey.position.set(inApp.cube.position.x, inApp.cube.position.y + 0.5, inApp.cube.position.z);

	scene.add(spritey);		
}

function createVRScene(inView) {
	console.log('createVRScene');
	var model = inView.get('model');

	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(800, 600);
	projector = new THREE.Projector();
	$('.vr')[0].appendChild(renderer.domElement);

	var floorTexture = new THREE.ImageUtils.loadTexture( 'checkerboard.jpg' );
	floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping; 
	floorTexture.repeat.set( 10, 10 );
	// DoubleSide: render texture on both sides of mesh
	var floorMaterial = new THREE.MeshBasicMaterial( { map: floorTexture, side: THREE.DoubleSide } );
	var floorGeometry = new THREE.PlaneGeometry(100, 100, 1, 1);
	var floor = new THREE.Mesh(floorGeometry, floorMaterial);
	floor.rotation.x = Math.PI / 2;
	scene.add(floor);	

	// make sure the camera's "far" value is large enough so that it will render the skyBox!
	var skyBoxGeometry = new THREE.CubeGeometry( 1000, 1000, 1000 );
	// BackSide: render faces from inside of the cube, instead of from outside (default).
	var skyBoxMaterial = new THREE.MeshBasicMaterial( { color: 0xC0C0C0, side: THREE.BackSide } );
	var skyBox = new THREE.Mesh( skyBoxGeometry, skyBoxMaterial );
	scene.add(skyBox);	

	hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
	hemiLight.color.setHSL( 0.6, 1, 0.6 );
	hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
	hemiLight.position.set( 0, 500, 0 );
	scene.add( hemiLight );

	for (var index = 0; index < model.length; index++) {
		addAppModelToScene(model[index]);
	}

	controls = new THREE.FirstPersonControls(camera);
	controls.movementSpeed = 4;
	controls.lookSpeed = 0.08;

	camera.position.y = 10;

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
			intersects[0].object.material.color = {r: 0.9, g: 0.9, b: 0.9};
			console.log(highlight.manifest_url);
		}

		if (intersects[0].distance < 5) {
			console.log('BOOM');
			window.location='/#/app/' + highlight.id;
		}
	} else {
		if (highlight != null) {
			for (var resetIndex = 0; resetIndex < targetList.length; resetIndex++) {
				targetList[resetIndex].material.color = {r: 0.5, g: 0.5, b: 0.5};
			}
			highlight = null;
		}
	}
}

function render() {
	controls.update( clock.getDelta() );

	handleSelection();

	renderer.render(scene, camera);
	requestAnimationFrame(render);
}