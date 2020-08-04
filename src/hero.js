import {createTerminal} from 'terminal-kit';
import {effect, state} from './index';

const term = createTerminal();
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
  term.green('You found potion !\n');
  life.value += potionRecoveryLife;
  term.green(`Hero has recovered ${potionRecoveryLife} life\n`);
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

function showObjectInfo(name, life) {
  console.log(`[${name}] Life: ${life}`);
}

function showMenu(itemsWithShortcuts, hintText, callback, selectedIndex) {
  const items = Object.values(itemsWithShortcuts);
  hintText && showHint(hintText);
  term.singleColumnMenu(
    items,
    {
      leftPadding: ' ',
      exitOnUnexpectedKey: true,
      selectedIndex,
    },
    (error, {selectedIndex, unexpectedKey}) => {
      if (unexpectedKey) {
        const shortcut = unexpectedKey.toLowerCase();
        if (shortcut in itemsWithShortcuts) {
          return callback(
            shortcut,
            itemsWithShortcuts[shortcut],
            selectedIndex,
          );
        }
        showError('Invalid selection');
        return showMenu(itemsWithShortcuts, hintText, callback, selectedIndex);
      }
      return callback(
        Object.keys(itemsWithShortcuts)[selectedIndex],
        items[selectedIndex],
        selectedIndex,
      );
    },
  );
}

let lastMovementSelectedIndex;
function listenMovingKeys() {
  showMenu(
    {
      a: 'Left',
      d: 'Right',
      w: 'Up',
      s: 'Down',
    },
    '? Please select hero movement',
    (key, value, index) => {
      lastMovementSelectedIndex = index;
      directionMap[key]();
    },
    lastMovementSelectedIndex,
  );
}

function showError(text) {
  term.red(text + '\n');
}

function showHint(text) {
  term.cyan(text + '\n');
}

function showHeading(text) {
  term.cyan(text.toUpperCase() + '\n');
}

function generateMap() {
  for (let i = 0; i < mapSize; i++) {
    map[i] = [];
    for (let j = 0; j < mapSize; j++) {
      map[i][j] = ' ';
    }
  }
}

function showMap(text = 'Map') {
  showHeading(text);
  map.forEach((row, rowIndex) => {
    console.log('');
    row.forEach((value, columnIndex) => {
      if (rowIndex === position.value.y && columnIndex === position.value.x) {
        term.bgRed('   ');
      } else {
        term.bgGreen('   ');
      }
    });
  });
  console.log('');
}

function showBattleMenu() {
  showMenu(
    {
      continue: 'Attach monster',
      run: 'Run',
    },
    undefined,
    (key) => {
      if (key === 'run') {
        run();
      } else {
        continueBattle();
      }
    },
  );
}

const run = effect();
const continueBattle = effect();

const battleEpic = effect(function* () {
  const monsterLifeValue = Math.ceil(
    monsterMinLife + Math.random() * monsterMaxLife,
  );

  const monsterLife = state(monsterLifeValue);
  console.log('');
  showError('A monster found');
  showHeading('Battle start', true);

  function showBattleSummary() {
    console.log('');
    showHeading('Summary');
    showHeroInfo();
    showObjectInfo('Monster', monsterLife.value);
  }

  // forever loop for battle
  // the loop will be ended when hero is die or monster is killed
  while (true) {
    showBattleMenu();

    const userSelection = yield {continueBattle, run};

    if (userSelection.run) {
      return;
    }
    // hero attack phase
    const heroAttackValue = Math.ceil(Math.random() * heroMaxAttack);
    console.log('Hero attacks: ' + heroAttackValue);
    takeDamage(monsterLife, heroAttackValue);

    // monster is killed
    if (!monsterLife.value) {
      showHeading('You won', true);
      return;
    }

    // monster attack phase
    const monsterAttachValue = Math.ceil(Math.random() * monsterMaxAttack);
    console.log('Monster attacks: ' + monsterAttachValue);
    takeDamage(life, monsterAttachValue);

    // hero is die
    if (!life.value) {
      showHeading('You lose', true);
      return;
    }

    // hero and mosnter are still alive
    showBattleSummary();
  }
});

export default effect(function* () {
  showHeading('Game started', true);
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
      showError('Cannot move');
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
  showHeading('Game Over', true);
});
