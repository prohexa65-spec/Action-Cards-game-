const modes = {
  naruto: {
    cards: [
      { name: 'Naruto Uzumaki', title: 'THE NINE-TAILED HERO', atk: 85, def: 70 },
      { name: 'Sasuke Uchiha', title: 'THE LAST UCHIHA', atk: 90, def: 65 },
      { name: 'Sakura Haruno', title: 'THE POWERFUL HEALER', atk: 75, def: 80 },
      { name: 'Kakashi Hatake', title: 'THE COPY NINJA', atk: 80, def: 85 },
      { name: 'Gaara', title: 'THE SAND GUARDIAN', atk: 70, def: 95 },
      { name: 'Itachi Uchiha', title: 'THE SHARINGAN MASTER', atk: 88, def: 78 }
    ],
    powers: [
      { name: 'Rasengan', stat: 'atk', amount: 25, level: 'EPIC' },
      { name: 'Sharingan', stat: 'def', amount: 15, level: 'RARE' },
      { name: 'Chidori', stat: 'atk', amount: 20, level: 'RARE' },
      { name: 'Susanoo', stat: 'def', amount: 30, level: 'LEGENDARY' },
      { name: 'Shadow Clone', stat: 'atk', amount: 10, level: 'COMMON' },
      { name: 'Sand Shield', stat: 'def', amount: 20, level: 'EPIC' }
    ]
  },
  football: {
    cards: [
      { name: 'Lionel Messi', title: 'THE PLAYMAKER', atk: 90, def: 65 },
      { name: 'Cristiano Ronaldo', title: 'THE GOAL MACHINE', atk: 95, def: 60 },
      { name: 'Kylian Mbappé', title: 'THE SPEEDSTER', atk: 88, def: 65 },
      { name: 'Alexia Putellas', title: 'THE MIDFIELD MAESTRO', atk: 83, def: 78 },
      { name: 'Virgil van Dijk', title: 'THE WALL', atk: 65, def: 95 },
      { name: 'Alisson Becker', title: 'THE KEEPER', atk: 60, def: 90 }
    ],
    powers: [
      { name: 'Super Shot', stat: 'atk', amount: 25, level: 'EPIC' },
      { name: 'Speed Boost', stat: 'atk', amount: 15, level: 'RARE' },
      { name: 'Dribbling', stat: 'atk', amount: 10, level: 'COMMON' },
      { name: 'Super Save', stat: 'def', amount: 30, level: 'LEGENDARY' },
      { name: 'Power Kick', stat: 'atk', amount: 20, level: 'RARE' },
      { name: 'Tackle', stat: 'def', amount: 20, level: 'EPIC' }
    ]
  }
};

const $ = id => document.getElementById(id);
let mode = 'naruto';
let game = null;
let wheelRotation = 0;
let spinTimer = null;
let customPhoto = '';
let photoRequest = 0;
const customStorageKey = 'card-clash-custom-cards-v1';

function loadCustomCards() {
  try {
    const saved = JSON.parse(localStorage.getItem(customStorageKey) || '{}');
    for (const key of Object.keys(modes)) {
      if (!Array.isArray(saved[key])) continue;
      saved[key].forEach(card => {
        if (!card || typeof card.name !== 'string' || !card.name.trim() || card.name.length > 40 ||
            !Number.isInteger(card.atk) || card.atk < 0 || card.atk > 999 ||
            !Number.isInteger(card.def) || card.def < 0 || card.def > 999) return;
        const photo = typeof card.photo === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(card.photo) ? card.photo : '';
        modes[key].cards.push({ name: card.name, title: 'CUSTOM CARD', atk: card.atk, def: card.def, photo, custom: true });
      });
    }
  } catch (error) {
    // Storage may be unavailable or contain invalid data; built-in cards still work.
  }
}

function saveCustomCards() {
  const cards = {};
  for (const key of Object.keys(modes)) cards[key] = modes[key].cards.filter(card => card.custom);
  try {
    localStorage.setItem(customStorageKey, JSON.stringify(cards));
    return true;
  } catch (error) {
    return false;
  }
}

function cardPhoto(card) {
  return card.photo ? `<img class="card-photo" src="${card.photo}" alt="" />` : '';
}

// User-provided names are always inserted as text, never as HTML.
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function populateCards() {
  const cards = modes[mode].cards;
  $('powerLegend').innerHTML = modes[mode].powers.map((power, i) => `<span><i class="legend-color color-${i}"></i>${power.name} <small>+${power.amount} ${power.stat.toUpperCase()}</small></span>`).join('');
  [1, 2].forEach((number, index) => {
    const select = $('card' + number);
    select.innerHTML = cards.map((card, i) => `<option value="${i}">${escapeHTML(card.name)} — ATK ${card.atk} / DEF ${card.def}</option>`).join('');
    select.value = String(index);
    updatePreview(number);
  });
}

function updatePreview(number) {
  const card = modes[mode].cards[Number($('card' + number).value)];
  $('preview' + number).innerHTML = `<div class="preview-identity">${cardPhoto(card)}<div><div class="preview-name">${escapeHTML(card.name)}</div><div class="preview-sub">${card.title}</div></div></div><div class="stat-pills"><span>ATK ${card.atk}</span><span>DEF ${card.def}</span></div>`;
}

function setMode(nextMode) {
  if (game && !confirm('Changing modes will end the current match. Continue?')) return;
  resetGame();
  mode = nextMode;
  $('customCardMode').textContent = mode.toUpperCase();
  document.querySelectorAll('.mode-card').forEach(button => {
    const selected = button.dataset.mode === mode;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  populateCards();
}

function log(message) {
  const item = document.createElement('li');
  item.textContent = message;
  $('battleLog').prepend(item);
}

function startGame() {
  const players = [1, 2].map(number => ({
    name: $('name' + number).value.trim() || 'Player ' + number,
    card: modes[mode].cards[Number($('card' + number).value)],
    wins: 0, points: 0, atkBoost: 0, defBoost: 0, guard: 0
  }));
  game = { players, turn: Math.floor(Math.random() * 2), spun: false, spinning: false, power: null };
  $('battleLog').innerHTML = '';
  $('setup').hidden = true;
  $('arena').hidden = false;
  log(`${players[game.turn].name} was randomly selected to go first!`);
  render();
  $('arena').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function render() {
  if (!game) return;
  const active = game.players[game.turn];
  $('turnBanner').textContent = `⚡ ${active.name}'s turn — make your move!`;
  game.players.forEach((player, i) => {
    const effects = [];
    if (player.atkBoost) effects.push(`+${player.atkBoost} ATK power`);
    if (player.defBoost) effects.push(`+${player.defBoost} DEF power`);
    if (player.guard) effects.push(`+${player.guard} DEF guard`);
    $('battlePlayer' + (i + 1)).innerHTML = `<div class="battle-card ${i === 1 ? 'two' : ''} ${game.turn === i ? 'current' : ''}"><div class="player-label"><span class="player-number">0${i + 1}</span><span>${escapeHTML(player.name)} ${game.turn === i ? '· TURN' : ''}</span></div><div class="battle-card-identity">${cardPhoto(player.card)}<h3>${escapeHTML(player.card.name)}</h3></div><div class="card-type">${player.card.title}</div><div class="stat-pills"><span>ATK ${player.card.atk}</span><span>DEF ${player.card.def}</span></div><div class="score"><strong>${player.wins}</strong> WINS &nbsp; / &nbsp; <strong>${player.points}</strong> POINTS</div><div class="buff-line">${effects.join(' · ') || 'No active boosts'}</div></div>`;
  });
  $('spinBtn').disabled = game.spun || game.spinning;
  $('usePowerBtn').disabled = !game.power || game.spinning;
  $('attackBtn').disabled = game.spinning;
  $('defendBtn').disabled = game.spinning;
  $('powerResult').innerHTML = game.spinning ? 'Spinning for power...' : game.power ? `<strong>${game.power.name}</strong> · ${game.power.level}<br>+${game.power.amount} ${game.power.stat.toUpperCase()} when used` : game.spun ? 'Power used! Make your move.' : 'Your power awaits';
}

function spinPower() {
  if (!game || game.spun || game.spinning) return;
  const powers = modes[mode].powers;
  const index = Math.floor(Math.random() * powers.length);
  game.spinning = true;
  game.spun = true;
  // Each 60-degree segment maps to a power; land its center under the top pointer.
  const target = (360 - (index * 60 + 30)) % 360;
  wheelRotation += 1800 + ((target - (wheelRotation % 360) + 360) % 360);
  $('wheel').style.transform = `rotate(${wheelRotation}deg)`;
  render();
  spinTimer = setTimeout(() => {
    if (!game) return;
    game.spinning = false;
    game.power = powers[index];
    log(`${game.players[game.turn].name} spun ${game.power.name} (${game.power.level}, +${game.power.amount} ${game.power.stat.toUpperCase()}).`);
    render();
  }, 3000);
}

function usePower() {
  if (!game || !game.power || game.spinning) return;
  const player = game.players[game.turn];
  const power = game.power;
  player[power.stat + 'Boost'] += power.amount;
  game.power = null;
  log(`${player.name} activated ${power.name}: +${power.amount} ${power.stat.toUpperCase()} on their next ${power.stat === 'atk' ? 'attack' : 'defense'}.`);
  render();
  animateCard(game.turn, 'power-flash');
}

function animateCard(index, animation) {
  const card = $('battlePlayer' + (index + 1)).firstElementChild;
  if (!card) return;
  card.classList.add(animation);
  card.addEventListener('animationend', () => card.classList.remove(animation), { once: true });
}

function nextTurn() {
  game.turn = 1 - game.turn;
  game.spun = false;
  game.power = null;
  render();
}

function attack() {
  if (!game || game.spinning) return;
  const attackerIndex = game.turn;
  const attacker = game.players[attackerIndex];
  const defender = game.players[1 - attackerIndex];
  const atk = attacker.card.atk + attacker.atkBoost;
  const def = defender.card.def + defender.defBoost + defender.guard;
  let result;
  if (atk > def) {
    attacker.wins++;
    attacker.points += 3;
    result = `${attacker.name} wins the battle and earns 3 points!`;
  } else if (atk < def) {
    defender.wins++;
    defender.points += 3;
    result = `${defender.name} wins the defense and earns 3 points!`;
  } else {
    attacker.points++;
    defender.points++;
    result = 'It’s a tie! Both players earn 1 point.';
  }
  log(`${attacker.name} attacked ${defender.name}: ${atk} ATK vs ${def} DEF. ${result}`);
  attacker.atkBoost = 0;
  defender.defBoost = 0;
  defender.guard = 0;
  nextTurn();
  animateCard(attackerIndex, 'impact');
  animateCard(atk > def ? attackerIndex : 1 - attackerIndex, 'power-flash');
}

function defend() {
  if (!game || game.spinning) return;
  const player = game.players[game.turn];
  player.guard = 15;
  log(`${player.name} takes a defensive stance: +15 DEF against the next attack. Guard does not stack.`);
  nextTurn();
}

function resetGame() {
  clearTimeout(spinTimer);
  game = null;
  $('arena').hidden = true;
  $('setup').hidden = false;
  $('battleLog').innerHTML = '';
  wheelRotation = 0;
  $('wheel').style.transform = 'rotate(0deg)';
}

async function readCardPhoto() {
  const request = ++photoRequest;
  const file = $('cardPhoto').files[0];
  const addButton = $('customCardForm').querySelector('button');
  customPhoto = '';
  if (!file) {
    addButton.disabled = false;
    $('photoStatus').textContent = 'Name detection depends on your browser; you can always enter the name yourself.';
    return;
  }
  if (!file.type.startsWith('image/') || file.size > 12 * 1024 * 1024) {
    addButton.disabled = false;
    $('photoStatus').textContent = 'Choose an image under 12 MB, or add the card without a photo.';
    $('cardPhoto').value = '';
    return;
  }
  addButton.disabled = true;
  $('photoStatus').textContent = 'Processing photo…';
  const originalName = $('customName').value;
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
    if (request !== photoRequest) return;
    const scale = Math.min(1, 320 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image processing unavailable');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    customPhoto = canvas.toDataURL('image/jpeg', 0.75);
    let message = 'Photo ready. Enter the card name and printed stats.';
    if ('TextDetector' in window) {
      try {
        const lines = await new window.TextDetector().detect(image);
        if (request !== photoRequest) return;
        const detected = lines.map(line => line.rawValue && line.rawValue.trim()).find(Boolean);
        if (detected && !originalName && $('customName').value === originalName) {
          $('customName').value = detected.slice(0, 40);
          message = 'Text detected. Check and correct the name, then enter the printed stats.';
        } else {
          message = 'Photo ready. Review the name and enter the printed stats.';
        }
      } catch (error) {
        message = 'Photo ready. Automatic name detection is unavailable; enter the name and stats.';
      }
    }
    if (request === photoRequest) $('photoStatus').textContent = message;
  } catch (error) {
    if (request === photoRequest) {
      customPhoto = '';
      $('cardPhoto').value = '';
      $('photoStatus').textContent = 'Could not read that photo. Try another image or enter the card without one.';
    }
  } finally {
    URL.revokeObjectURL(url);
    if (request === photoRequest) addButton.disabled = false;
  }
}

function addCustomCard(event) {
  event.preventDefault();
  const name = $('customName').value.trim();
  const atk = Number($('customAtk').value);
  const def = Number($('customDef').value);
  if (!name || $('customAtk').value === '' || $('customDef').value === '' ||
      !Number.isInteger(atk) || atk < 0 || atk > 999 || !Number.isInteger(def) || def < 0 || def > 999) {
    $('photoStatus').textContent = 'Enter a name and whole-number ATK and DEF values from 0 to 999.';
    return;
  }
  const card = { name, title: 'CUSTOM CARD', atk, def, photo: customPhoto, custom: true };
  const index = modes[mode].cards.push(card) - 1;
  [1, 2].forEach(number => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${name} — ATK ${atk} / DEF ${def}`;
    $('card' + number).append(option);
  });
  $('card1').value = String(index);
  updatePreview(1);
  const saved = saveCustomCards();
  $('customCardForm').reset();
  customPhoto = '';
  photoRequest++;
  $('photoStatus').textContent = saved
    ? `Added ${name} to ${mode === 'naruto' ? 'Naruto' : 'Football'} cards and selected it for Player 1.`
    : `Added ${name} for this session, but browser storage is unavailable or full.`;
}

$('cardPhoto').addEventListener('change', readCardPhoto);
$('customCardForm').addEventListener('submit', addCustomCard);
loadCustomCards();

document.querySelectorAll('.mode-card').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.mode !== mode) setMode(button.dataset.mode);
}));
[1, 2].forEach(number => $('card' + number).addEventListener('change', () => updatePreview(number)));
$('startBtn').addEventListener('click', startGame);
$('spinBtn').addEventListener('click', spinPower);
$('usePowerBtn').addEventListener('click', usePower);
$('attackBtn').addEventListener('click', attack);
$('defendBtn').addEventListener('click', defend);
$('resetBtn').addEventListener('click', () => {
  if (confirm('Start a new match? Current scores and battle history will be cleared.')) {
    resetGame();
    $('setup').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});
populateCards();
