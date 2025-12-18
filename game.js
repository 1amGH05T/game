const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const ghostImg = new Image();
ghostImg.src = "assets/ghost.png";


canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let gravity = 0.6;
let jumpPower = -12;
let speed = 4;

let coins = 0;
let highScore = localStorage.getItem("ghostHighScore") || 0;

document.getElementById("highScore").textContent = highScore;

const ghost = {
  x: 80,
  y: canvas.height - 140,
  width: 50,
  height: 50,
  velocityY: 0,
};

let obstacles = [];
let coinItems = [];
let gameOver = false;

function resetGame() {
  coins = 0;
  obstacles = [];
  coinItems = [];
  ghost.y = canvas.height - 140;
  ghost.velocityY = 0;
  gameOver = false;
  document.getElementById("coins").textContent = "0";
  document.getElementById("gameOver").style.display = "none";
  loop();
}

function jump() {
  if (!gameOver) {
    ghost.velocityY = jumpPower;
  }
}

window.addEventListener("click", jump);
window.addEventListener("touchstart", jump);

function spawnObstacle() {
  obstacles.push({
    x: canvas.width,
    y: canvas.height - 100,
    width: 40,
    height: 60,
  });
}

function spawnCoin() {
  coinItems.push({
    x: canvas.width,
    y: canvas.height - 160 - Math.random() * 120,
    radius: 12,
  });
}

setInterval(spawnObstacle, 2000);
setInterval(spawnCoin, 1400);

function drawGhost() {
  ctx.drawImage(
    ghostImg,
    ghost.x,
    ghost.y,
    ghost.width,
    ghost.height
  );
}


function drawObstacles() {
  ctx.fillStyle = "#ef4444";
  obstacles.forEach(o => {
    ctx.fillRect(o.x, o.y, o.width, o.height);
  });
}

function drawCoins() {
  ctx.fillStyle = "#facc15";
  coinItems.forEach(c => {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function checkCollision(rect, circle) {
  const distX = Math.abs(circle.x - rect.x - rect.width / 2);
  const distY = Math.abs(circle.y - rect.y - rect.height / 2);

  if (distX > (rect.width / 2 + circle.radius)) return false;
  if (distY > (rect.height / 2 + circle.radius)) return false;

  return true;
}

function endGame() {
  gameOver = true;

  if (coins > highScore) {
    highScore = coins;
    localStorage.setItem("ghostHighScore", highScore);
  }

  document.getElementById("finalScore").textContent = coins;
  document.getElementById("highScore").textContent = highScore;
  document.getElementById("gameOver").style.display = "flex";
}

function loop() {
  if (gameOver) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ghost.velocityY += gravity;
  ghost.y += ghost.velocityY;

  if (ghost.y + ghost.height > canvas.height - 40) {
    ghost.y = canvas.height - 40 - ghost.height;
    ghost.velocityY = 0;
  }

  obstacles.forEach(o => o.x -= speed);
  coinItems.forEach(c => c.x -= speed);

  obstacles.forEach(o => {
    if (
      ghost.x < o.x + o.width &&
      ghost.x + ghost.width > o.x &&
      ghost.y < o.y + o.height &&
      ghost.y + ghost.height > o.y
    ) {
      endGame();
    }
  });

  coinItems = coinItems.filter(c => {
    if (checkCollision(ghost, c)) {
      coins++;
      document.getElementById("coins").textContent = coins;
      return false;
    }
    return c.x + c.radius > 0;
  });

  drawGhost();
  drawObstacles();
  drawCoins();

  requestAnimationFrame(loop);
}

document.getElementById("restartBtn").addEventListener("click", resetGame);

loop();
