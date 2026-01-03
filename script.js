const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const label = document.getElementById('stageLabel');
const logtextarea = document.getElementById('log');
const liveLabel = document.getElementById('liveLabel');
const endpanel = document.getElementById('endPanel');
const endtitle = document.getElementById('endTitle');


const ButtonStart = document.getElementById('startButton');
const ButtonStop = document.getElementById('stopButton');
const ButtonResume = document.getElementById('resumeButton');
const ButtonRestart = document.getElementById('restartButton');

let startButtonAvailable = true;
let stopButtonAvailable = false;
let resumeButtonAvailable = false;

let gamestarted = false;
let gamerunning = false;
let currentStage = 0;
let lastShot = 0;
let lives = 3;
const fireRate = 600;
const cW = canvas.width;
const cH = canvas.height;

let enemies = [
    { w: 30, h: 30, color: 'red', hp: 2, speed: 0.01, cooldown: 6500, damage: 1, projectileSpeed: 1 },
    { w: 10, h: 10, color: 'blue', hp: 1, speed: 0.02, cooldown: 4000, damage: 1, projectileSpeed: 1.5 },
    { w: 20, h: 20, color: 'green', hp: 3, speed: 0.005, cooldown: 7000, damage: 2, projectileSpeed: 0.8 }
];
let enemiesOnMap = [];
let projectilesOnMap = [];

let player = {
    x: cW / 2 - 15,
    y: cH - 40,
    w: 30,
    h: 30,
    hp: 3,
    damage: 1
};

canvas.addEventListener('click', () => canvas.focus());

document.addEventListener('DOMContentLoaded', initializeCanvas);


document.addEventListener('keydown', (event) => {
    if ((event.key === 'w' || event.key === 'W' || event.key === 'ArrowUp') && gamerunning) {
        playerShoot();
    }

    if ((event.key === 'a' || event.key === 'A' || event.key === 'ArrowLeft') && gamerunning) {
        playerMoveLeft();
    }

    if ((event.key === 'd' || event.key === 'D' || event.key === 'ArrowRight') && gamerunning) {
        playerMoveRight();
    }

    if (event.code === 'Space') {
        e.preventDefault();
        if (gamestarted && gamerunning && stopButtonAvailable) stopGame();
        else if (gamestarted && !gamerunning && resumeButtonAvailable) resumeGame();
    }
});

function updateButtons() {
    ButtonStart.disabled  = !startButtonAvailable;
    ButtonStop.disabled   = !stopButtonAvailable;
    ButtonResume.disabled = !resumeButtonAvailable;
}


let lastFrameTime = performance.now();

function gameLoop(now) {
    if (!gamerunning) return;

    const delta = now - lastFrameTime;
    lastFrameTime = now;

    update(delta);
    updateCanvas();

    requestAnimationFrame(gameLoop);
}

function update(delta) {
    if (!gamerunning) return;

    for (let e = enemiesOnMap.length - 1; e >= 0; e--) {
        const enemy = enemiesOnMap[e];
        enemy.y += (enemy.speed + currentStage * 0.004) * delta/4;
        if (enemy.y > cH) {
            enemiesOnMap.splice(e, 1);
        }
        
        if (enemy.firstshot) {
            enemy.startcooldown -= delta;
            if (enemy.startcooldown <= 0) {
                enemyShoot(enemy);
                enemy.firstshot = false;
            }
        } else {
            enemy.lastShot += delta;
            if (enemy.lastShot >= enemy.cooldown) {
                enemyShoot(enemy);
                enemy.lastShot = 0;
            }
        }

        if (isColliding(enemy, player)) {
            enemiesOnMap.splice(e, 1);
            player.hp -= 1;
            log(`Player hit! HP: ${player.hp}`);
            updateLiveLabel();
            if (player.hp <= 0) {
                endGame();
            }
        }
    }

    for (let p = projectilesOnMap.length - 1; p >= 0; p--) {
        const projectile = projectilesOnMap[p];

        if (projectile.color == "white") {
            projectile.y -= 5;

            // Kollision mit Enemies
            for (let e = enemiesOnMap.length - 1; e >= 0; e--) {
                const enemy = enemiesOnMap[e];

                if (isColliding(projectile, enemy)) {
                    if (enemy.hp > projectile.damage) {
                        enemy.hp -= projectile.damage;
                    } else {
                        enemiesOnMap.splice(e, 1);
                    }
                    projectilesOnMap.splice(p, 1);
                    break;
                }
            }

            if (projectile.y + projectile.h < 0) {
                projectilesOnMap.splice(p, 1);
            }
        } 
        else {

            projectile.y += projectile.speed;
            if (isColliding(projectile, player)) {
                projectilesOnMap.splice(p, 1);
                player.hp -= projectile.damage;
                log(`Player hit! HP: ${player.hp}`);
                updateLiveLabel();
                if (player.hp <= 0) {
                    endGame();
                }
            }
            if (projectile.y > cH) {
                projectilesOnMap.splice(p, 1);
            }
        }
    }

    if (enemiesOnMap.length === 0) {
        nextStage();
    }

}

function isColliding(a, b) {
    return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    );
}

function startGame() {
    if (gamerunning || gamestarted) return;
    
    gamestarted = true;
    gamerunning = true;
    log('function startGame called');
    nextStage();
    requestAnimationFrame(gameLoop);
    startTimer();
    startButtonAvailable = false;
    stopButtonAvailable = true;
    resumeButtonAvailable = false;

    updateButtons();

}

function endGame() {
    if (!gamestarted) return;
    log('Game Over');
    gamerunning = false;
    gamestarted = false;

    startButtonAvailable = true;
    stopButtonAvailable = false;
    resumeButtonAvailable = false;

    updateButtons();
    endpanel.style.display = 'block';
}


function stopGame() {
    if (!gamestarted || !gamerunning) return;
    log('function stopGame called');
    gamerunning = false;
    stopButtonAvailable = false;
    resumeButtonAvailable = true;

    updateButtons();
}
    
function resumeGame() {
    if (!gamestarted || gamerunning) return;
    log('function resumeGame called');
    gamerunning = true;
    stopButtonAvailable = true;
    resumeButtonAvailable = false;

    updateButtons();
    requestAnimationFrame(gameLoop);
}




function initializeCanvas() {
    ctx.save();

    // Hintergrund Welt
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, cW, cH);

    // Units
    enemiesOnMap.forEach(u => {
        ctx.fillStyle = u.color
        ctx.fillRect(u.x, u.y, u.w, u.h);
    });
    projectilesOnMap.forEach(p => {
        ctx.fillStyle = p.color
        ctx.fillRect(p.x, p.y, p.w, p.h);
    });

    // Player
    ctx.fillStyle = "white";
    ctx.fillRect(player.x, player.y, player.w, player.h);


    ctx.restore();
}

function updateCanvas() {
    ctx.clearRect(0, 0, cW, cH);
    initializeCanvas();
}

function playerShoot() {
    const now = Date.now();
    if (now - lastShot < fireRate) return;
    lastShot = now;
    
    const projectile = {
        x: player.x + player.w / 2 - 2.5,
        y: player.y - 10,
        w: 5,
        h: 10,
        color: "white",
        damage: player.damage
    };
    projectilesOnMap.push(projectile);
}

function enemyShoot(enemy) {
    const projectile = {
        x: enemy.x + enemy.w / 2 - 2.5,
        y: enemy.y + enemy.h,
        w: 5,
        h: 10,
        color: enemy.color,
        damage: enemy.damage,
        speed: enemy.projectilespeed
    };
    projectilesOnMap.push(projectile);
}

function playerMoveLeft() {
    player.x -= 10;
    if (player.x < 0) player.x = 0;
    log(`Player left moved to x: ${player.x}`);
}

function playerMoveRight() {
    player.x += 10;
    if (player.x + player.w > cW) player.x = cW - player.w;
    log(`Player right moved to x: ${player.x}`);
}

function nextStage() {
    timer = 0;
    currentStage++;
    updateStageLabel();
    if (currentStage === 1) {
        for (let i = 0; i < 5; i++) {
            spawnEnemies("red", 50, 50 + i * 60);
        }
    }
    if(currentStage == 2){
        for (let i = 0; i < 5; i++) {
            spawnEnemies("red", 50, 50 + i * 60);
        }
    }
    if(currentStage == 3){
        for (let i = 0; i < 5; i++) {
            spawnEnemies("blue", 50, 50 + i * 60);
        }
    }
    if(currentStage == 4){
        for (let i = 0; i < 5; i++) {
            spawnEnemies("red", 50, 50 + i * 60);
        }
    }
}

function spawnEnemies(color, y, x) {
    const enemy = enemies.find(en => en.color === color);
    if (enemy) {
        const newEnemy = {
            x: x,
            y: y,
            w: enemy.w,
            h: enemy.h,
            color: enemy.color,
            hp: enemy.hp,
            speed: enemy.speed,
            firstshot: true,
            startcooldown: Math.random() * enemy.cooldown,
            cooldown: enemy.cooldown,
            lastShot: 0,
            damage: enemy.damage,
            projectilespeed: enemy.projectileSpeed
        };
        enemiesOnMap.push(newEnemy);
    }
}

function updateStageLabel() {
    stageLabel.value = `Stage: ${currentStage}`;
}



function log(message){
    logtextarea.value += message + '\n';
    logtextarea.scrollTop = logtextarea.scrollHeight;
}


function restartGame() {
    endpanel.style.display = 'none';
    enemiesOnMap = [];
    projectilesOnMap = [];
    player = {
        x: cW / 2 - 15,
        y: cH - 40,
        w: 30,
        h: 30,
        hp: 3,
        damage: 1
    };
    currentStage = 0;
    updateStageLabel();
    updateLiveLabel();
    gamestarted = false;
    gamerunning = false;
    ButtonStart.disabled = true;
    initializeCanvas();

}

function updateLiveLabel(){
    liveLabel.value = `Lives: ${player.hp}`;
}