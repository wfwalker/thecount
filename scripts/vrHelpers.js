var renderer = null;
var scene = null;
var camera = null;
var clock = new THREE.Clock();
var controls = null;

function createVRScene(kind, param, model) {
	console.log('createVRScene', kind, param);

	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(800, 600);
	$('.vr')[0].appendChild(renderer.domElement);

	for (var index = 0; index < model.length; index++) {
		var geometry = new THREE.BoxGeometry( 1, 1, 1 );
		var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
		var cube = new THREE.Mesh( geometry, material );

		cube.position.x = 15 * Math.sin(Math.PI * index / 10);
		cube.position.y = -10 + 2 * (index / 10);
		cube.position.z = 15 * Math.cos(Math.PI * index / 10);
		scene.add( cube );
	}

	controls = new THREE.FirstPersonControls(camera);
	controls.movementSpeed = 4;
	controls.lookSpeed = 0.05;

	render();
}

function render() {
	controls.update( clock.getDelta() );	
	renderer.render(scene, camera);
	requestAnimationFrame(render);
}