import Table from 'cli-table';
import {effect, state} from './index';

const mapSize = 5;
const monsterMaxAttack = 5;
const monsterMaxLife = 50;
const monsterMinLife = 10;
const heroMaxAttack = 20;
const map = [];
const potionRecoveryLife = 20;
const directionMap = {a: left, d: right, w: up, s: down};
const objectTypes = {
  nothing: 0,
  potion: 1,
  monster: 2,
};

const position = state({x: 0, y: 0});
const life = state(100);

const moveSuccess = effect();
const collideBoundary = effect();

const takeDamage = effect((target, damage) => {
  target.mutate((value) => Math.max(value - damage, 0));
});

const move = effect(function* ({x: offsetX = 0, y: offsetY = 0}) {
  let {x, y} = position.value;
  x += offsetX;
  y += offsetY;
  if (x < 0 || x >= mapSize) {
    return collideBoundary();
  }
  if (y < 0 || y >= mapSize) {
    return collideBoundary();
  }
  position.mutate({x, y});
  console.log(
    `Hero moved to [${position.value.x + 1}, ${position.value.y + 1}]`,
  );
  moveSuccess();
});

const drinkPotion = effect(function* () {
  console.log('');
  console.log('You found potion !');
  life.value += potionRecoveryLife;
  console.log(`Hero has recovered ${potionRecoveryLife} life`);
  showHeroInfo();
});

const anyKeyPressed = effect();

function generateObject() {
  const values = Object.values(objectTypes);
  return values[Math.floor(Math.random() * values.length)];
}

function left() {
  move({x: -1});
}

function up() {
  move({y: -1});
}

function down() {
  move({y: 1});
}

function right() {
  move({x: 1});
}

function showHeroInfo() {
  showObjectInfo('Hero', life.value);
}

function printTable(rows, head) {
  const options = {};
  if (head) {
    if (typeof head === 'string') {
      printTable([[head.toUpperCase()]]);
    } else {
      options.head = head;
    }
  }
  const table = new Table(options);
  table.push(...rows);
  console.log(table.toString());
}

function showMovementKeys() {
  console.log('A (left), W (up), D (right), S (down)');
}

function showObjectInfo(name, life) {
  console.log(`[${name}] Life: ${life}`);
}

function listenMovingKeys() {
  console.log('');
  console.log('? Press the key below to move your hero:');
  showMovementKeys();
  onKeyPress((key) => {
    if (key in directionMap) {
      directionMap[key]();
      return false;
    } else {
      console.log('Invalid movement key: ' + key);
      showMovementKeys();
      return true;
    }
  });
}

function heading(text, border) {
  if (border) {
    printTable([[text]]);
  } else {
    console.log(text.toUpperCase());
  }
}

function listenAnyKey(message) {
  console.log(message);

  onKeyPress(() => {
    anyKeyPressed();
    return false;
  });
}

function generateMap() {
  for (let i = 0; i < mapSize; i++) {
    map[i] = [];
    for (let j = 0; j < mapSize; j++) {
      map[i][j] = ' ';
    }
  }
}

function showMap() {
  console.log('');
  heading('Map');
  printTable(
    map.map((columns, row) =>
      columns.map((value, column) =>
        row === position.value.y && column === position.value.x ? 'x' : value,
      ),
    ),
  );
}

function onKeyPress(listener) {
  const stdin = process.stdin;

  stdin.setRawMode(true);
  stdin.setEncoding('utf8');

  function wrappedListener(key) {
    if (listener(key) === false) {
      stdin.off('data', wrappedListener);
    }
  }
  stdin.on('data', wrappedListener);
}

const battleEpic = effect(function* () {
  const monsterLifeValue = Math.ceil(
    monsterMinLife + Math.random() * monsterMaxLife,
  );

  const monsterLife = state(monsterLifeValue);
  console.log('');
  console.log('A monster found');
  heading('Battle start', true);

  function showBattleSummary() {
    console.log('');
    heading('Summary');
    showHeroInfo();
    showObjectInfo('Monster', monsterLife.value);
  }

  // forever loop for battle
  // the loop will be ended when hero is die or monster is killed
  while (true) {
    console.log('');
    listenAnyKey('? Press any key to attack monster');
    yield anyKeyPressed;

    // hero attack phase
    const heroAttackValue = Math.ceil(Math.random() * heroMaxAttack);
    console.log('Hero attacks: ' + heroAttackValue);
    takeDamage(monsterLife, heroAttackValue);

    // monster is killed
    if (!monsterLife.value) {
      heading('You won', true);
      return;
    }

    // monster attack phase
    const monsterAttachValue = Math.ceil(Math.random() * monsterMaxAttack);
    console.log('Monster attacks: ' + monsterAttachValue);
    takeDamage(life, monsterAttachValue);

    // hero is die
    if (!life.value) {
      heading('You lose', true);
      return;
    }

    // hero and mosnter are still alive
    showBattleSummary();
  }
});

export default effect(function* () {
  heading('Game started', true);
  generateMap();
  showHeroInfo();
  showMap();
  generateMap();
  // main game story
  while (true) {
    // hero movement loop
    while (true) {
      listenMovingKeys();
      // listen moveSuccess or collideBoundary effects
      const {success} = yield {
        success: moveSuccess,
        fail: collideBoundary,
      };

      if (success) {
        showMap();
        // end movement loop
        break;
      }

      // continue to listen movement keys
      console.log('Cannot move');
    }

    // after moving, we generate some random object
    const objectType = generateObject();
    // found a potion
    if (objectType === objectTypes.potion) {
      drinkPotion();
    }
    // found a monster
    else if (objectType === objectTypes.monster) {
      // start battle
      yield battleEpic();
      // hero is die
      if (!life.value) {
        break;
      }
    } else {
      console.log('You place is safe');
    }
  }
  heading('Game Over', true);
});
