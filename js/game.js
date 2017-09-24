var renderer;
var scene;
var camera;
var spotLight;
var light = [];

var groundPlane;
var wall = [];
var walldist = 200;

var help = false;
var helpRest = false;

var ball = [];
var ballsLeft = 10;
var ballLaunched = false;
var mvDelta = (1/2) * (Math.PI / 180);
var force = 12500;

var cannonAngleX = 0;
var cannonAngleZ = Math.PI;
var camdist = 12;

var platform;
var platformPlaced = false;
var target = [];
var tNo = 0;

var score = 0;
var gameOver = false;
var total;

// Make Physijs work correctly
Physijs.scripts.worker = 'libs/physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

function initGame()
{
  scene = new Physijs.Scene();
  scene.setGravity(new THREE.Vector3(0, 0, -30));

  createGroundPlane();
  createWalls();

  createCannon();

  camera = new THREE.PerspectiveCamera(45,
    window.innerWidth / window.innerHeight, 0.1, 1000);
  setupRenderer();
  addSpotLight();

  document.body.appendChild(renderer.domElement); // Output to the stream
  render(); // Call render
}

function render()
{
  scene.simulate(); // Physics simulation

  keyboardControls();

  updateScore();
  updateBallsLeft();
  if (!helpRest) { showHelp(); helpRest = true; }

  if (tNo < 4)
  {
    if (!scene.getObjectByName("Platform"))
      createPlatform();

    createTarget(tNo);
  }

  if (!gameOver) { checkGameStatus(); }

  positionCamera();
  moveLights();

  requestAnimationFrame(render);
  renderer.render(scene, camera);
}

function createGroundPlane()
{
  var texture = new THREE.TextureLoader().load('images/ground.jpg');
  var planeMaterial = new Physijs.createMaterial(
                          new THREE.MeshStandardMaterial({map:texture}),
                          0.4,
                          0.8);
  var planeGeometry = new THREE.PlaneGeometry(400, 400, 6);
  groundPlane = new Physijs.BoxMesh(planeGeometry, planeMaterial, 0);
  groundPlane.name = "GroundPlane";

  scene.add(groundPlane);
}

function createWalls()
{
  var texture = new THREE.TextureLoader().load('images/tent_seuss.jpg');
  var boxMaterial = new Physijs.createMaterial(
                        new THREE.MeshStandardMaterial({map:texture}),
                        0.4,
                        0.8);
  var boxGeometry = new THREE.BoxGeometry(200, 1, 200);

  for (var i = 0; i < 8; i++)
  {
    wall[i] = new Physijs.BoxMesh(boxGeometry, boxMaterial, 0);
    wall[i].name = "Wall" + i;
    wall[i].position.z = 100;

    // x position
    if (i % 2 === 0)
    {
      if (i % 4 != 0)
        wall[i].position.x = (i < 4 ? 1 : -1) * walldist;
    }
    else
    {
      if (i < 4)
        wall[i].position.x = walldist * Math.cos(Math.PI / 4);
      else
        wall[i].position.x = -walldist * Math.cos(Math.PI / 4);
    }

    // y position
    if (i % 2 === 0)
    {
      if (i % 4 === 0)
        wall[i].position.y = walldist;
    }
    else
    {
      if (i < 2 || i > 6)
        wall[i].position.y = -walldist * Math.cos(Math.PI / 4);
      else
        wall[i].position.y = walldist * Math.cos(Math.PI / 4);
    }

    wall[i].rotation.z = i * (Math.PI / 4);

    scene.add(wall[i]);
  }
}

function createCannon()
{
  var cylinderGeometry = new THREE.CylinderGeometry(3, 2, 16, 32);
  var cylinderMaterial = new THREE.MeshStandardMaterial({color: 0x515151});
  var can = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
  can.position.y = -5;

  // Create Object3D wrapper that will allow use to correctly rotate
  cannon = new THREE.Object3D();
  cannon.add(can);
  cannon.name = "Cannon";

  cannon.rotation.z = cannonAngleZ;

  cannon.position.y = -100;
  cannon.position.z = 20;

  scene.add(cannon);
}

function positionCamera()
{
  // Orient camera to cannon
  camera.position.x = cannon.position.x
    - (camdist * Math.sin(Math.PI - cannonAngleZ));
  camera.position.y = cannon.position.y - 2
    - (camdist * (Math.cos(cannonAngleZ - Math.PI) * Math.cos(cannonAngleX)));
  camera.position.z = cannon.position.z + 8
    - (camdist * Math.sin(cannonAngleX));

  // Aim in same direction as that of the cannon
  camera.rotation.y = cannonAngleZ + Math.PI;
  camera.rotation.x = cannonAngleX + Math.PI/2;
}

function createBall(bNo)
{
  var ballGeometry = new THREE.SphereGeometry(3, 24, 24);
  var ballMaterial = Physijs.createMaterial(
                       new THREE.MeshStandardMaterial({color:0x262626}),
                       0.95,
                       0.95);
  ball[bNo] = new Physijs.SphereMesh(ballGeometry, ballMaterial);

  ball[bNo].position.x = cannon.position.x + Math.cos((Math.PI/2)-cannon.rotation.z) * 10;
  ball[bNo].position.y = cannon.position.y - Math.cos(cannon.rotation.z) * 10;
  ball[bNo].position.z = cannon.position.z - Math.sin(cannon.rotation.y) * 10;

  ball[bNo].name = 'CannonBall' + bNo;
}

function createPlatform()
{
  var texture = new THREE.TextureLoader().load('images/wood.jpg');
  var platformMat = new Physijs.createMaterial(
                        new THREE.MeshStandardMaterial({map:texture}),
                        0.4,
                        0.8);
  var platformGeo = new THREE.BoxGeometry(10, 10, 100);
  platform = new Physijs.BoxMesh(platformGeo, platformMat, 0);
  platform.name = "Platform";

  platform.__dirtyPosition = true;

  switch(tNo)
  {
    case 0:
      platform.position.x = randBtwn(-25, 25);
      platform.position.y = 50;
      platform.position.z = randBtwn(-45, -5);
      break;
    case 1:
      platform.position.x = randBtwn(-25, 25);
      platform.position.y = 100;
      platform.position.z = randBtwn(-45, -5);
      break;
    case 2:
      platform.position.x = randBtwn(-75, 75);
      platform.position.y = 150;
      platform.position.z = randBtwn(25, 50);
      break;
    case 3:
      platform.position.y = 150;
      platform.position.z = randBtwn(-25, 25);
      break;
  }

  scene.add(platform);
}

function createTarget(tNo)
{
  if (!scene.getObjectByName("Target"))
  {
    var texture;
    var targetMat;
    var targetGeo;

    switch(tNo)
    {
      case 0:
        texture = new THREE.TextureLoader().load("images/lion.png");
        targetGeo = new THREE.BoxGeometry(3, 18, 24);
        break;
      case 1:
        texture = new THREE.TextureLoader().load("images/tiger.png");
        targetGeo = new THREE.BoxGeometry(4, 21, 28);
        break;
      case 2:
        texture = new THREE.TextureLoader().load("images/bear.png");
        targetGeo = new THREE.BoxGeometry(4, 24, 24);
        break;
      case 3:
        texture = new THREE.TextureLoader().load("images/chicken.png");
        targetGeo = new THREE.BoxGeometry(2, 16, 12);
        break;
    }

    targetMat = new Physijs.createMaterial(
      new THREE.MeshLambertMaterial({map:texture}),
      0.4, 0.8);

    target = new Physijs.BoxMesh(targetGeo, targetMat);
    target.name = "Target";

    target.rotation.x = Math.PI / 2;
    target.rotation.y = Math.PI / 2;

    target.position.x = platform.position.x;
    target.position.y = platform.position.y;
    target.position.z = platform.position.z
                        + (platform.geometry.parameters.depth / 2)
                        + (target.geometry.parameters.height / 2)
                        + 0.05;

    scene.add(target);

    target.addEventListener('collision', scoreCheck);
  }
}

function scoreCheck(other_object, linear_velocity, angular_velocity)
{
  if (other_object.name === "GroundPlane")
  {
    scene.remove(platform);
    scene.remove(target);
    tNo++;
    score++;
  }
}

function checkGameStatus()
{
  if (score === 4)
  {
    gameOver = true;
    total = score + ballsLeft;
    gameOverScreen();
    ballLaunched = false;
    ballsLeft = 999;
    force = 30000;
  }
  else if (ballsLeft === 0)
  {
    gameOver = true;
    total = score;
    gameOverScreen();
  }
}

function keyboardControls()
{
  // Cannon aim contols
  if (Key.isDown(Key.W)) // Cannon up
  {
    cannonAngleX = cannon.rotation.x += mvDelta;

    if (cannon.rotation.x > Math.PI / 4)
    { cannonAngleX = cannon.rotation.x = (Math.PI / 4); }
  }
  if (Key.isDown(Key.S)) // Cannon down
  {
    cannonAngleX = cannon.rotation.x -= mvDelta;

    if (cannon.rotation.x < 0)
    { cannonAngleX = cannon.rotation.x = 0; }
  }
  if (Key.isDown(Key.A)) // Cannon left
  {
    cannonAngleZ = cannon.rotation.z += mvDelta;

    if (cannon.rotation.z > (3 * Math.PI / 2))
    { cannonAngleZ = cannon.rotation.z = (3 * Math.PI / 2); }
  }
  if (Key.isDown(Key.D)) // Cannon right
  {
    cannonAngleZ = cannon.rotation.z -= mvDelta;

    if (cannon.rotation.z < (Math.PI / 2))
    { cannonAngleZ = cannon.rotation.z = (Math.PI / 2); }
  }


  // Cannon fire & reload
  if (!ballLaunched && ballsLeft > 0 && Key.isDown(Key.F)) // Fire
  {
    createBall(ballsLeft);
    ballLaunched = true;
    scene.add(ball[ballsLeft]);
    ball[ballsLeft].applyCentralImpulse(new THREE.Vector3(vX(), vY(), vZ()));
    ballsLeft--;

    if (gameOver && score === 4)
    {
      ballLaunched = false;
    }
  }
  if (ballLaunched && Key.isDown(Key.R)) // Reload
  {
    if (ballsLeft > 0)
    {
      ballLaunched = false;
      // scene.remove(ball);
    }
  }


  // Show help menu
  if (Key.isDown(Key.H)) // Cannon up
    if (!helpRest) { help = !help; }
}

function setupRenderer()
{
  renderer = new THREE.WebGLRenderer();
  //						color     alpha
  renderer.setClearColor(0x000000, 1.0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
}

function addSpotLight()
{
  spotLight = new THREE.SpotLight(0xffbfb5);
  spotLight.position.set(0, 0, 275);
  spotLight.shadow.cameraNear = 10;
  spotLight.shadow.cameraFar = 100;
  spotLight.castShadow = true;
  spotLight.intensity = 1.5;
  spotLight.penumbra = 1;
  scene.add(spotLight);

  for (var i = 0; i < 4; i++)
  {
    light[i] = new THREE.SpotLight();

    switch(i)
    {
      case 0:
        light[i].color = new THREE.Color(0xff7d14);
        light[i].position.x = -200;
        light[i].position.y = -200;
        light[i].position.z =  175;
        light[i].intensity = 1.5;
        break;
      case 1:
        light[i].color = new THREE.Color(0x1481ff);
        light[i].position.x =  200;
        light[i].position.y = -200;
        light[i].position.z =  175;
        light[i].intensity = 1.5;
        break;
      case 2:
        light[i].color = new THREE.Color(0xeb14ff);
        light[i].position.z =  300;
        light[i].intensity = 1.5;
        break;
      case 3:
        light[i].position.z =  400;
        light[i].position.y = -300;
        light[i].intensity = 0.75;
        break;
    }

    light[i].name = "Light" + i;
    light[i].angle = 0.05;
  }
}

function moveLights()
{
  if (ballLaunched)
  {
    if (!scene.getObjectByName('Light0'))
      for (var i = 0; i < 3; i++)
        scene.add(light[i]);

    for (var i = 0; i < 3; i++)
      light[i].target = ball[ballsLeft + 1];
  }
  else
  {
    if (scene.getObjectByName('Light0'))
    {
      for (var i = 0; i < 3; i++)
        scene.remove(light[i]);
    }
  }

  if (scene.getObjectByName('Target'))
  {
    if (scene.getObjectByName('Light3') === undefined)
      scene.add(light[3]);

    light[3].target = target;
  }
}

function helpMenu()
{
  if (help)
  {
    document.getElementById('help').innerHTML =
      "<br><u>Controls</u>"
      + "<br>WASD : Aim the cannon"
      + "<br>&nbsp;&nbsp;&nbsp;F : Fire the cannon!"
      + "<br>&nbsp;&nbsp;&nbsp;R : Reload";
  }
  else
    document.getElementById('help').innerHTML =
      "<sf>Press H to toggle the help menu</sf>";
}

function gameOverScreen()
{
  if (gameOver)
  {
    if (score === 4)
      document.getElementById('gameOver').innerHTML =
        "<br><big>YOU WIN</big>"
        + "<br>&nbsp&nbspTotals:"
        + "<br>&nbsp&nbsp&nbsp" + score + " points"
        + "<br>&nbsp&nbsp<u>&nbsp" + (total - score) + " balls left&nbsp</u>"
        + "<br>&nbsp&nbsp&nbsp" + total + " overall";
    else
      document.getElementById('gameOver').innerHTML =
        "<br><big>YOU LOSE</big>"
        + "<br>Refresh to try again!";
  }
}

function showHelp()
{ setTimeout(function () { helpMenu(); helpRest = false; }, 100); }

function updateScore()
{ document.getElementById('score').innerHTML = "Score: " + score; }

function updateBallsLeft()
{ document.getElementById('balls').innerHTML = "" + ballsLeft + " balls left"; }

function randBtwn(min, max)
{ return min + (Math.random() * (max - min)); }

function vX()
{ return force * Math.sin(Math.PI - cannonAngleZ); }

function vY()
{ return force * (Math.cos(cannonAngleZ - Math.PI) * Math.cos(cannonAngleX)); }

function vZ()
{ return force * Math.sin(cannonAngleX); }

