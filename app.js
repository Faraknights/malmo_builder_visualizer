var container;
var canvas;
var camera, scene, renderer;
var controls;
var clock = new THREE.Clock();
var gridSize = 11;
var cellSize = 1;
var borderThickness = 0.05;
var isDragging = false;
var mouseDownPosition;
const cellThickness = 0.1;

var game;

const Type = {
  BORDER: 'border',
  CUBE: 'cube',
  BOARD_CELL: 'boardCell'
};

const Color = {
    RED: '#c0392b',
    BLUE: '#3498db',
    ORANGE: '#e67e22',
    PURPLE: '#9b59b6',
    YELLOW: '#f1c40f',
    GREEN: '#27ae60'
}

const inventory = {
    RED: 10,
    BLUE: 10,
    ORANGE: 10,
    PURPLE: 10,
    YELLOW: 10,
    GREEN: 10
}

var placedBlocks = []

let historyChat = ["Mission 0 started"]

function init() {
    container = document.getElementById('container');
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 3000);
    camera.position.set(0, 5, 20);
    camera.lookAt(0, 0, 0);

    scene = new THREE.Scene();

    var cellGeometry = new THREE.PlaneGeometry(cellSize, cellSize);
    var borderMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    var cellMaterial = new THREE.MeshBasicMaterial({ color: 0x888888, side: THREE.FrontSide });

    for (var i = 0; i < gridSize; i++) {
        for (var j = 0; j < gridSize; j++) {
            var x = (i - (gridSize - 1) / 2) * (cellSize + borderThickness);
            var z = (j - (gridSize - 1) / 2) * (cellSize + borderThickness);

            var cellMesh = new THREE.Mesh(cellGeometry, cellMaterial);
            cellMesh.position.set(x, -cellThickness / 2, z);
            cellMesh.rotation.x = -Math.PI / 2;
            scene.add(cellMesh);

            if (i < gridSize - 1) {
                var borderX = new THREE.Mesh(new THREE.PlaneGeometry(borderThickness, cellSize), borderMaterial);
                borderX.position.set(x + cellSize / 2 + borderThickness / 2, -cellThickness / 2, z);
                borderX.rotation.x = -Math.PI / 2;
                borderX["type"] = Type.BORDER
                scene.add(borderX);
            }

            if (j < gridSize - 1) {
                var borderZ = new THREE.Mesh(new THREE.PlaneGeometry(cellSize, borderThickness), borderMaterial);
                borderZ.position.set(x, -cellThickness / 2, z + cellSize / 2 + borderThickness / 2);
                borderZ.rotation.x = -Math.PI / 2;
                borderZ["type"] = Type.BORDER
                scene.add(borderZ);
            }

            cellMesh["x"] = i
            cellMesh["y"] = j
            cellMesh["z"] = -1
            cellMesh["type"] = Type.BOARD_CELL
        }
    }

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 500;
    controls.maxPolarAngle = Math.PI;
    controls.enableKeys = false; 
    
    renderer.setClearColor('#212431');
    canvas = document.querySelector('#container > canvas');
}

function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
    controls.update();
}

init();
render();

function placeBlock(x, y, z, color){
    temp = y
    x = x + 5
    y = z + 5
    z = temp - 1
    var cubeGeometry = new THREE.BoxGeometry(cellSize, cellSize, cellSize);
    var cubeMaterial = new THREE.MeshBasicMaterial({ color: color});
    var cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cubeMesh.position.set(
        (x - (gridSize - 1) / 2) * (cellSize + borderThickness),
        0.5 + borderThickness + z + z * borderThickness,
        (y - (gridSize - 1) / 2) * (cellSize + borderThickness)
    );

    const edges = new THREE.EdgesGeometry(cubeGeometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 10 }));
    cubeMesh.add(line);
    cubeMesh["type"] = Type.CUBE
    cubeMesh["x"] = x
    cubeMesh["y"] = y
    cubeMesh["z"] = z

    scene.add(cubeMesh);
}


const breakBlock = (x, y, z) => {
    temp = y
    x = x + 5
    y = z + 5
    z = temp - 1
    var currentMesh;
    scene.children.forEach(function(mesh) {
        if (mesh.x === x && mesh.y === y && mesh.z === z) {
            currentMesh = mesh
        }
    })
    scene.remove(currentMesh)
};

const historyChatElement = document.querySelector('#historyChat');
historyChatElement.textContent = historyChat
const addChat = (message) => {
    historyChat.push(message)
    historyChatElement.textContent = historyChat.join('\n')
};

var changes = [];
document.getElementById('fileInput').addEventListener('change',function() {
    var file = this.files[0]
    var reader = new FileReader();
    reader.onload = function(event) {
        game = JSON.parse(event.target.result).WorldStates;

        for (let i = 1; i < game.length; i++) {
            chat = game[i].ChatHistory.filter(item => !game[i-1].ChatHistory.includes(item))
            if(chat != ""){
                changes.push({ func: addChat, values: [chat[0]]})
            } else {
                blocks = game[i].BlocksInGrid.filter(item => {
                    return !game[i-1].BlocksInGrid.some(prevItem => {
                        return prevItem.X === item.X && prevItem.Y === item.Y && prevItem.Z === item.Z;
                    });
                })
                if(blocks.length == 1){
                    changes.push({ func: placeBlock, values: [blocks[0].X, blocks[0].Y, blocks[0].Z, blocks[0].Colour]})
                } else {
                    blocks = game[i - 1].BlocksInGrid.filter(item => {
                        return !game[i].BlocksInGrid.some(prevItem => {
                            return prevItem.X === item.X && prevItem.Y === item.Y && prevItem.Z === item.Z;
                        });
                    })
                    changes.push({ func: breakBlock, values: [blocks[0].X, blocks[0].Y, blocks[0].Z]})
                }
            }
        }
        document.getElementById('hider').style.display = "none"
    };
    reader.readAsText(file);
});

currentStatus = -1
function play(i){
    changes[i].func(...changes[i].values)
}

const nextElement = document.querySelector('#side > button');
nextElement.addEventListener("click", (event) => {
    if(currentStatus < changes.length - 1){
        currentStatus += 1
        play(currentStatus)
    }
})