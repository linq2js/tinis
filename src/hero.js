import Table from 'cli-table';
import {effect, state} from './index';

const mapSize = 5;
const monsterMaxAttack = 5;
const monsterMaxLife = 50;
const monsterMinLife = 10;
const heroMaxAttack = 20;
const map = [];
const potionRecoveryLife = 20;
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
    switch (key) {
      case 'a':
        left();
        break;
      case 'd':
        right();
        break;
      case 'w':
        up();
        break;
      case 's':
        down();
        break;
      default:
        console.log('Invalid movement key');
        showMovementKeys();
        return true;
    }
    return false;
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
  printTable(
    map.map((columns, row) =>
      columns.map((value, column) =>
        row === position.value.y && column === position.value.x ? 'x' : value,
      ),
    ),
    'Map',
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

  while (true) {
    console.log('');
    listenAnyKey('? Press any key to attack monster');
    yield anyKeyPressed;

    // hero attack phase
    const heroAttackValue = Math.ceil(Math.random() * heroMaxAttack);
    console.log('Hero attacks: ' + heroAttackValue);
    takeDamage(monsterLife, heroAttackValue);
    if (!monsterLife.value) {
      heading('You won', true);
      return;
    }

    // monster attack phase
    const monsterAttachValue = Math.ceil(Math.random() * monsterMaxAttack);
    console.log('Monster attacks: ' + monsterAttachValue);
    takeDamage(life, monsterAttachValue);

    if (!life.value) {
      heading('You lose', true);
      return;
    }

    showBattleSummary();
  }
});

export default effect(function* () {
  heading('Game started', true);
  generateMap();
  showHeroInfo();
  showMap();
  generateMap();
  while (true) {
    // listen hero moving
    while (true) {
      listenMovingKeys();
      const {success} = yield {
        success: moveSuccess,
        fail: collideBoundary,
      };

      if (success) {
        showMap();
        break;
      } else {
        // continue to listen movement keys
        console.log('Cannot move');
      }
    }
    const objectType = generateObject();
    if (objectType === objectTypes.potion) {
      drinkPotion();
    } else if (objectType === objectTypes.monster) {
      yield battleEpic();
      if (!life.value) {
        break;
      }
    } else {
      console.log('You place is safe');
    }
  }
  heading('Game Over', true);
});
