$(document).ready(function () {
  const WIDTH = 40;
  const HEIGHT = 24;
  const MIN_ROOM_SIZE = 3;
  const MAX_ROOM_SIZE = 8;
  const MIN_CORRIDORS = 3;
  const MAX_CORRIDORS = 5;
  const NUM_SWORDS = 2;
  const DETECTION_RANGE = 12;
  const HERO_MAX_HEALTH = 120;
  const ENEMY_MAX_HEALTH = 40;
  const overlay = document.querySelector('.overlay')
  const message = document.querySelector('.message')

  let NUM_ENEMIES = 10;
  let NUM_POTIONS = 10;
  let grid = Array(HEIGHT).fill().map(() => Array(WIDTH).fill('wall'));
  let hero = null;
  let enemies = [];
  let potions = [];
  let swords = [];
  let health = 100;
  let minDamage = 12;
  let maxDamage = 20;
  let isMoving = false;
  let isGameOver = false;
  let status = document.querySelector('.status')
  let levelStatus = document.querySelector('.level')
  let levelCount = 1;

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }


//Первоначальная загрузка поля, отрисовка комнат и коридоров  
  function initBoard() {
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        $('#field').append(`<div class="cell wall" data-x="${x}" data-y="${y}"></div>`);
      }
    }
  }

  function canPlaceRoom(x, y, w, h) {
    if (x + w > WIDTH || y + h > HEIGHT) return false;
    for (let i = y - 1; i <= y + h; i++) {
      for (let j = x - 1; j <= x + w; j++) {
        if (i >= 0 && i < HEIGHT && j >= 0 && j < WIDTH && grid[i][j] !== 'wall') {
          return false;
        }
      }
    }
    return true;
  }

  function placeRoom(x, y, w, h) {
    for (let i = y; i < y + h; i++) {
      for (let j = x; j < x + w; j++) {
        grid[i][j] = 'room';
      }
    }
  }

  function generateRooms() {
    const numRooms = Math.floor(Math.random() * (10 - 5 + 1)) + 5;
    let roomsPlaced = 0;
    while (roomsPlaced < numRooms) {
      const w = Math.floor(Math.random() * (MAX_ROOM_SIZE - MIN_ROOM_SIZE + 1)) + MIN_ROOM_SIZE;
      const h = Math.floor(Math.random() * (MAX_ROOM_SIZE - MIN_ROOM_SIZE + 1)) + MIN_ROOM_SIZE;
      const x = Math.floor(Math.random() * (WIDTH - w));
      const y = Math.floor(Math.random() * (HEIGHT - h));
      if (canPlaceRoom(x, y, w, h)) {
        placeRoom(x, y, w, h);
        roomsPlaced++;
      }
    }
  }

  function generateCorridors() {
    const numHorizontal = Math.floor(Math.random() * (MAX_CORRIDORS - MIN_CORRIDORS + 1)) + MIN_CORRIDORS;
    const numVertical = Math.floor(Math.random() * (MAX_CORRIDORS - MIN_CORRIDORS + 1)) + MIN_CORRIDORS;
    for (let i = 0; i < numHorizontal; i++) {
      const y = Math.floor(Math.random() * HEIGHT);
      for (let x = 0; x < WIDTH; x++) {
        grid[y][x] = 'corridor';
      }
    }
    for (let i = 0; i < numVertical; i++) {
      const x = Math.floor(Math.random() * WIDTH);
      for (let y = 0; y < HEIGHT; y++) {
        grid[y][x] = 'corridor';
      }
    }
  }

  function checkConnectivity() {
    const visited = Array(HEIGHT).fill().map(() => Array(WIDTH).fill(false));
    const queue = [];
    let startFound = false;

    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        if (grid[y][x] === 'room' || grid[y][x] === 'corridor') {
          queue.push({ x, y });
          visited[y][x] = true;
          startFound = true;
          break;
        }
      }
      if (startFound) break;
    }

    if (!startFound) return;

    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 }, 
      { dx: 0, dy: -1 }];

    while (queue.length > 0) {
      const { x, y } = queue.shift();
      for (const dir of directions) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        if (
          nx >= 0 && nx < WIDTH &&
          ny >= 0 && ny < HEIGHT &&
          !visited[ny][nx] &&
          (grid[ny][nx] === 'room' || grid[ny][nx] === 'corridor')
        ) {
          visited[ny][nx] = true;
          queue.push({ x: nx, y: ny });
        }
      }
    }

    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        if ((grid[y][x] === 'room' || grid[y][x] === 'corridor') && !visited[y][x]) {
          connectIsolatedZone(x, y, visited);
        }
      }
    }
  }

  function connectIsolatedZone(x, y, visited) {
    let closest = null;
    let minDist = Infinity;

    for (let cy = 0; cy < HEIGHT; cy++) {
      for (let cx = 0; cx < WIDTH; cx++) {
        if ((grid[cy][cx] === 'room' || grid[cy][cx] === 'corridor') && visited[cy][cx]) {
          const dist = Math.abs(cx - x) + Math.abs(cy - y);
          if (dist < minDist) {
            minDist = dist;
            closest = { x: cx, y: cy };
          }
        }
      }
    }

    if (closest) {
      let cx = x, cy = y;
      while (cx !== closest.x || cy !== closest.y) {
        if (cx < closest.x) cx++;
        else if (cx > closest.x) cx--;
        else if (cy < closest.y) cy++;
        else if (cy > closest.y) cy--;
        grid[cy][cx] = 'corridor';
      }
    }
  }

  function generateDungeon() {
    generateRooms();
    generateCorridors();
    checkConnectivity();
  }

  //проходимые клетки
  function getEmptyCells() {
    let emptyCells = [];
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        if (grid[y][x] === 'room' || grid[y][x] === 'corridor') {
          emptyCells.push({ x, y });
        }
      }
    }
    return emptyCells;
  }

  function canMoveTo(x, y) {
    return (
      x >= 0 &&
      x < WIDTH &&
      y >= 0 &&
      y < HEIGHT &&
      (grid[y][x] === 'room' || grid[y][x] === 'corridor') &&
      !enemies.some(e => e.x === x && e.y === y) &&
      !(hero && hero.x === x && hero.y === y)
    );
  }
// обработка действия героя: движение, атака, подбор предметов, реакция врагов
  $(document).off('keydown').on('keydown', function (e) {
    if (isMoving || !hero || isGameOver) return;
    isMoving = true;

    if (e.key === ' ') {
      const adjacentCells = [
        { x: hero.x + 1, y: hero.y },
        { x: hero.x - 1, y: hero.y },
        { x: hero.x, y: hero.y + 1 },
        { x: hero.x, y: hero.y - 1 }
      ];
      enemies = enemies.filter(enemy => {
        if (typeof enemy.health !== 'number' || isNaN(enemy.health)) {
          console.error('Invalid enemy health during attack:', enemy);
          return true;
        }
        const isAdjacent = adjacentCells.some(cell => cell.x === enemy.x && cell.y === enemy.y);
        if (isAdjacent) {
          const damage = Math.floor(Math.random() * (maxDamage - minDamage + 1)) + minDamage;
          enemy.health -= damage;
          if (enemy.health <= 0) return false;
        }
        return true;
      });
      moveEnemies();
      renderBoard();
    } else {
      let newHero = { x: hero.x, y: hero.y };
      switch (e.key.toLowerCase()) {
        case 'w': newHero.y--; break;
        case 's': newHero.y++; break;
        case 'a': newHero.x--; break;
        case 'd': newHero.x++; break;
        default:
          isMoving = false;
          return;
      }
      if (canMoveTo(newHero.x, newHero.y)) {
        hero = newHero;
        const potionIndex = potions.findIndex(p => p.x === hero.x && p.y === hero.y);
        if (potionIndex !== -1) {
          const potion = potions[potionIndex];
          $(`.cell[data-x="${potion.x}"][data-y="${potion.y}"]`).removeClass('potion');
          health = Math.min(health + 40, HERO_MAX_HEALTH);
          if (potionIndex < potions.length - 1) {
            potions[potionIndex] = potions[potions.length - 1];
          }
          potions.pop();
        }
        const swordIndex = swords.findIndex(s => s.x === hero.x && s.y === hero.y);
        if (swordIndex !== -1) {
          const sword = swords[swordIndex];
          $(`.cell[data-x="${sword.x}"][data-y="${sword.y}"]`).removeClass('sword');
          minDamage += 5;
          maxDamage += 13;
          if (swordIndex < swords.length - 1) {
            swords[swordIndex] = swords[swords.length - 1];
          }
          swords.pop();
          console.log(`Sword collected at (${sword.x}, ${sword.y}), hero damage: ${minDamage}–${maxDamage}`);
        }
        moveEnemies();
        renderBoard();
      }
    }
    setTimeout(() => { isMoving = false; }, 10);
  });

  function manhattanDistance(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }
// если герой в радиусе 12 клеток, враг начнёт к нему двигаться
  function moveEnemyToHero(enemy) {
    if (typeof enemy.health !== 'number' || isNaN(enemy.health)) {
      console.error('Invalid enemy health in moveEnemyToHero:', enemy);
      return enemy;
    }
    let possibleMoves = [
      { x: enemy.x + 1, y: enemy.y },
      { x: enemy.x - 1, y: enemy.y },
      { x: enemy.x, y: enemy.y + 1 },
      { x: enemy.x, y: enemy.y - 1 }
    ].filter(move => canMoveTo(move.x, move.y));
    if (possibleMoves.length === 0) return enemy;
    let bestMove = possibleMoves[0];
    let minDistance = manhattanDistance(bestMove.x, bestMove.y, hero.x, hero.y);
    for (let move of possibleMoves) {
      let distance = manhattanDistance(move.x, move.y, hero.x, hero.y);
      if (distance < minDistance) {
        minDistance = distance;
        bestMove = move;
      }
    }
    return { x: bestMove.x, y: bestMove.y, health: enemy.health };
  }
// если герой дальше, враг двигается в случайном направлении
  function moveEnemyRandomly(enemy) {
    if (typeof enemy.health !== 'number' || isNaN(enemy.health)) {
      console.error('Invalid enemy health in moveEnemyRandomly:', enemy);
      return enemy;
    }
    let possibleMoves = [
      { x: enemy.x + 1, y: enemy.y },
      { x: enemy.x - 1, y: enemy.y },
      { x: enemy.x, y: enemy.y + 1 },
      { x: enemy.x, y: enemy.y - 1 }
    ].filter(move => canMoveTo(move.x, move.y));
    if (possibleMoves.length === 0) return enemy;
    const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    return { x: move.x, y: move.y, health: enemy.health };
  }


// обработка действий врагов: атака героя и выбор варианта движения
  function moveEnemies() {
    if (!hero || isGameOver) return;
    enemies = enemies.map(enemy => {
      if (typeof enemy.health !== 'number' || isNaN(enemy.health)) {
        console.error('Invalid enemy health in moveEnemies:', enemy);
        return enemy;
      }
      let distance = manhattanDistance(enemy.x, enemy.y, hero.x, hero.y);
      if (distance === 1) {
        const damage = Math.floor(Math.random() * (15 - 11 + 1)) + 11;
        const heroCell = $(`.cell[data-x="${hero.x}"][data-y="${hero.y}"]`);
        setTimeout(() => heroCell.addClass('attacked'), 300);
        health -= damage;
        if (health <= 0) {
          isGameOver = true;
          heroCell.removeClass('attacked');
          overlay.style.display = 'block'
          message.style.display = 'block'
          message.textContent = 'Game over'
        } else {
          setTimeout(() => heroCell.removeClass('attacked'), 500);
        }
        return enemy;
      }
      if (distance <= DETECTION_RANGE) {
        return moveEnemyToHero(enemy);
      } else {
        return moveEnemyRandomly(enemy);
      }
    });
    if (!isGameOver) renderBoard();
  }
  function clearGameBoard() {
    $('#field').empty();
  }

//рендер игрового поля
  function renderBoard() {
    status.textContent = `HEALTH: ${health}/${HERO_MAX_HEALTH} \xa0\xa0\xa0\xa0\xa0\xa0\xa0 DAMAGE: ${minDamage}-${maxDamage} \xa0\xa0\xa0\xa0\xa0\xa0\xa0 ENEMIES LEFT: ${enemies.length}/${NUM_ENEMIES} `
    levelStatus.textContent = `LEVEL ${levelCount} OF 5`
    $('.hp-bar').remove();
    $('.cell').each(function () {
      const x = parseInt($(this).data('x'));
      const y = parseInt($(this).data('y'));
      $(this).removeClass('wall room corridor hero enemy').addClass(grid[y][x]);
    });
    if (hero) {
      const heroCell = $(`.cell[data-x="${hero.x}"][data-y="${hero.y}"]`);
      heroCell.addClass('hero');
      const heroHpPercent = (health / HERO_MAX_HEALTH) * 100;
      heroCell.append(`<div class="hp-bar hero-hp" style="width: ${heroHpPercent}%"></div>`);
    }
    enemies.forEach(enemy => {
      const enemyCell = $(`.cell[data-x="${enemy.x}"][data-y="${enemy.y}"]`);
      enemyCell.addClass('enemy');
      const enemyHpPercent = (enemy.health / ENEMY_MAX_HEALTH) * 100;
      enemyCell.append(`<div class="hp-bar enemy-hp" style="width: ${enemyHpPercent}%"></div>`);
    });
    if (enemies.length == 0) {
      overlay.style.display = 'block'
      message.style.display = 'block'
      message.textContent = 'You win!'
      /*
      if (levelCount < 5) {
        console.log('11111')
        levelCount++
        NUM_ENEMIES += 2
        NUM_POTIONS -= 2
        clearGameBoard();
        console.log('cleared')
        initBoard();
        console.log('initiated')
        generateDungeon();
        let emptyCells = getEmptyCells();
        if (emptyCells.length < 1 + NUM_ENEMIES + NUM_POTIONS + NUM_SWORDS) {
          console.error('Not enough empty cells');
          return;
        }
        shuffle(emptyCells);
        hero = emptyCells[0];
        enemies = emptyCells.slice(1, 1 + NUM_ENEMIES).map(cell => ({ x: cell.x, y: cell.y, health: ENEMY_MAX_HEALTH }));
        potions = emptyCells.slice(1 + NUM_ENEMIES, 1 + NUM_ENEMIES + NUM_POTIONS);
        swords = emptyCells.slice(1 + NUM_ENEMIES + NUM_POTIONS, 1 + NUM_ENEMIES + NUM_POTIONS + NUM_SWORDS);
        potions.forEach(potion => {
          $(`.cell[data-x="${potion.x}"][data-y="${potion.y}"]`).addClass('potion');
        });
        swords.forEach(sword => {
          $(`.cell[data-x="${sword.x}"][data-y="${sword.y}"]`).addClass('sword');
        });
      } else {
        overlay.style.display = 'block'
        message.style.display = 'block'
        message.textContent = 'You win!'
      }
      */
    }
    potions.forEach(potion => {
      $(`.cell[data-x="${potion.x}"][data-y="${potion.y}"]`).addClass('potion');
    });
    swords.forEach(sword => {
      $(`.cell[data-x="${sword.x}"][data-y="${sword.y}"]`).addClass('sword');
    });
  }


  // начало игры, отрисовка поля, размещение персонажей и предметов
  initBoard();
  generateDungeon();
  let emptyCells = getEmptyCells();
  if (emptyCells.length < 1 + NUM_ENEMIES + NUM_POTIONS + NUM_SWORDS) {
    console.error('Not enough empty cells');
    return;
  }
  shuffle(emptyCells);
  hero = emptyCells[0];
  enemies = emptyCells.slice(1, 1 + NUM_ENEMIES).map(cell => ({ x: cell.x, y: cell.y, health: ENEMY_MAX_HEALTH }));
  potions = emptyCells.slice(1 + NUM_ENEMIES, 1 + NUM_ENEMIES + NUM_POTIONS);
  swords = emptyCells.slice(1 + NUM_ENEMIES + NUM_POTIONS, 1 + NUM_ENEMIES + NUM_POTIONS + NUM_SWORDS);
  potions.forEach(potion => {
    $(`.cell[data-x="${potion.x}"][data-y="${potion.y}"]`).addClass('potion');
  });
  swords.forEach(sword => {
    $(`.cell[data-x="${sword.x}"][data-y="${sword.y}"]`).addClass('sword');
  });
  renderBoard();
});