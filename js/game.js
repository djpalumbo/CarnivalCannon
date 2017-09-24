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
var defense;
var defMoveDir = Math.PI / 2;

var score = 0;
var gameOver = false;
var total;

var cannon_fire;
var cannon_hit;
var lion_roar;
var lion_hit;
var tiger_roar;
var tiger_hit;
var bear_roar;
var bear_hit;
var chicken_roar;
var chicken_hit;
var music;
var music_play = true;

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

  loadSounds();
  playMusic();

  document.body.appendChild(renderer.domElement); // Output to the stream
  render();
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

  chickenDefense();

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
    wall[i].name = "Wall";
    wall[i].position.z = 100;

    if (i % 2 === 0) // x position
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

    if (i % 2 === 0) // y position
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
  ball[bNo].addEventListener('collision',
    function (other_object, linear_velocity, angular_velocity)
    {
      if (other_object.name === "Target"
          // || other_object.name === "Wall"
          || other_object.name === "Defense"
          || other_object.name === "Platform")
        cannon_hit.play();
    });
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
      platform.position.z = randBtwn(-10, 25);
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
        lion_roar.play();
        break;
      case 1:
        texture = new THREE.TextureLoader().load("images/tiger.png");
        targetGeo = new THREE.BoxGeometry(4, 21, 28);
        tiger_roar.play();
        break;
      case 2:
        texture = new THREE.TextureLoader().load("images/bear.png");
        targetGeo = new THREE.BoxGeometry(4, 24, 24);
        bear_roar.play();
        break;
      case 3:
        texture = new THREE.TextureLoader().load("images/chicken.png");
        targetGeo = new THREE.BoxGeometry(2, 16, 12);
        chicken_roar.play();
        createDefense();
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
    switch(tNo)
    {
      case 0:
        lion_hit.play();
        break;
      case 1:
        tiger_hit.play();
        break;
      case 2:
        bear_hit.play();
        break;
      case 3:
        chicken_hit.play();
        break;
    }
    scene.remove(platform);
    scene.remove(target);
    tNo++;
    score++;
  }
}

function createDefense()
{
  var ballGeometry = new THREE.SphereGeometry(16, 24, 24);
  var ballMaterial = Physijs.createMaterial(
                       new THREE.MeshStandardMaterial({color:0x262626}),
                       1, 1);
  defense = new Physijs.SphereMesh(ballGeometry, ballMaterial, 10000);
  defense.name = "Defense";

  scene.add(defense);
}

function chickenDefense()
{
  if (scene.getObjectByName("Defense"))
  {
    if (scene.getObjectByName("Target"))
    {
      defense.__dirtyPosition = true;

      defense.position.x = target.position.x + (25 * Math.cos(defMoveDir));
      defMoveDir += (4/3) * Math.PI / 180;
      if (defMoveDir >= 2 * Math.PI)
        defMoveDir = 0;
      defense.position.y = target.position.y - 50;
      defense.position.z = target.position.z;
    }
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
  else if (ballsLeft === 0
            && ball[1].position.z <= 10
            && scene.getObjectByName("Target")
            && target.getLinearVelocity().lengthSq() < 0.0001)
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
    cannon_fire.play();
    ballsLeft--;

    if (gameOver && score === 4)
    {
      ballLaunched = false;
    }
  }
  if (ballLaunched && Key.isDown(Key.R)) // Reload
    if (ballsLeft > 0)
      ballLaunched = false;

  // Show help menu
  if (Key.isDown(Key.H))
    if (!helpRest) { help = !help; }

  // Toggle music on/off
  if (Key.isDown(Key.M))
  {
    music_play = !music_play;
    if (music_play)
      music.play();
    else
      music.pause();
  }
}

function setupRenderer()
{
  renderer = new THREE.WebGLRenderer();
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
      + "<br>&nbsp;&nbsp;&nbsp;R : Reload"
      + "<br>&nbsp;&nbsp;&nbsp;M : Toggle music"
        + " (" + (music_play ? "ON" : "OFF") + ")";
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

function playMusic()
{
  music.addEventListener('ended', function()
  {
    if (music_play)
    {
      this.currentTime = 0;
      this.play();
    }
  }, false);
  music.play();
}

function loadSounds()
{
  cannon_fire = new Audio("sounds/cannon_fire.wav");
  cannon_hit = new Audio("sounds/cannon_hit.wav");
  lion_roar = new Audio("sounds/lion_roar.wav");
  lion_hit = new Audio("sounds/lion_hit.wav");
  tiger_roar = new Audio("sounds/tiger_roar.wav");
  tiger_hit = new Audio("sounds/tiger_hit.wav");
  bear_roar = new Audio("sounds/bear_roar.wav");
  bear_hit = new Audio("sounds/bear_hit.wav");
  chicken_roar = new Audio("sounds/chicken_roar.wav");
  chicken_hit = new Audio("sounds/chicken_hit.wav");
  music = new Audio("sounds/music.wav");
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

