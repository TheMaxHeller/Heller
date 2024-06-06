(function () {
  let playerId;
  let playerRef;
  let players = {};
  let playerElements = {};
  let coins = {};
  let coinElements = {};
  let startTime;
  let timerInterval; // Ensure this is declared at the top

  const gameContainer = document.querySelector(".game-container");
  const playerNameInput = document.querySelector("#player-name");
  const playerColorButton = document.querySelector("#player-color");
  const deathScreen = document.querySelector(".death-screen");
  const timeBoard = document.querySelector(".time-board");
  const retryButton = document.querySelector("#retry-button");

  const mapData = {
    minX: 2,
    maxX: 88,
    minY: 2,
    maxY: 48,
    blockedSpaces: {
      "2-88x48": true,
    },
  };

  const playerColors = ["blue", "red", "orange", "yellow", "green", "purple"];

  function randomFromArray(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  function getKeyString(x, y) {
    return `${x}x${y}`;
  }

  function createName() {
    const prefix = randomFromArray([
      "COOL", "SUPER", "HIP", "SMUG", "COOL", "SILKY", "GOOD", "SAFE",
      "DEAR", "DAMP", "WARM", "RICH", "LONG", "DARK", "SOFT", "BUFF", "DOPE",
    ]);
    const animal = randomFromArray([
      "BEAR", "DOG", "CAT", "FOX", "LAMB", "LION", "BOAR", "GOAT",
      "VOLE", "SEAL", "PUMA", "MULE", "BULL", "BIRD", "BUG",
    ]);
    return `${prefix} ${animal}`;
  }

  function isSolid(x, y) {
    const blockedNextSpace = mapData.blockedSpaces[getKeyString(x, y)];
    return (
      blockedNextSpace ||
      x >= mapData.maxX ||
      x < mapData.minX ||
      y >= mapData.maxY ||
      y < mapData.minY ||
      platforms.some(platform => 
        x >= platform.x &&
        x < platform.x + platform.width &&
        y >= platform.y &&
        y < platform.y + platform.height
      )
    );
  }

  function getRandomSafeSpot() {
    const minX = 12;
    const maxX = 77;
    const y = 5;
    const x = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
    return { x, y };
  }

// Function to generate a random platform
function generatePlatform() {
  var PlatX = Math.floor(Math.random() * (40 - 10 + 1)) + 10; //platform x spawn
  var PlatY = Math.floor(Math.random() * (45 - 15 + 1)) + 15; //Platform y spawn
  var PlatW = Math.floor(Math.random() * (40 - 10 + 1)) + 10; //Platform width
  var PlatH = Math.floor(Math.random() * (15 - 10 + 1)) + 10; //Platform height
  var PlatD = Math.random() < 0.5 ? 1 : -1; //Platform direction
  var PlatS = Math.random() * (0.6 - 0.1) + 0.1; // Platform speed

  return {
      x: PlatX,
      y: PlatY,
      width: PlatW,
      height: PlatH,
      direction: PlatD,
      speed: PlatS
  };
}

// Array to hold platforms
const platforms = [];

// Generate a specified number of platforms
for (let i = 0; i < 4; i++) {
  platforms.push(generatePlatform());
}

console.log(platforms); // Output the generated platforms

  function createPlatforms() {
    platforms.forEach((platform, index) => {
      const platformElement = document.createElement("div");
      platformElement.classList.add("Platform", "grid-cell");
      platformElement.style.width = `${platform.width * 16}px`;
      platformElement.style.height = `${platform.height * 16}px`;
      platformElement.style.transform = `translate3d(${platform.x * 16}px, ${platform.y * 16}px, 0)`;
      platformElement.dataset.index = index;
      gameContainer.appendChild(platformElement);
      platform.element = platformElement;
  
      // Add platform coordinates to blockedSpaces
      for (let x = platform.x; x < platform.x + platform.width; x++) {
        for (let y = platform.y; y < platform.y + platform.height; y++) {
          mapData.blockedSpaces[getKeyString(x, y)] = true;
        }
      }
    });
  }
  

  function movePlatforms() {
    platforms.forEach((platform) => {
      platform.x += platform.speed * platform.direction;
      if (platform.x <= 0 || platform.x >= mapData.maxX - platform.width) {
        platform.direction *= -1; // Change direction
      }
      platform.element.style.transform = `translate3d(${platform.x * 16}px, ${platform.y * 16}px, 0)`;
    });
  }

  function checkPlatformCollisions(player) {
    platforms.forEach((platform) => {
      const playerBottom = player.y + 1;
      const playerTop = player.y;
      const platformTop = platform.y;
      const platformBottom = platform.y + platform.height;

      // Check if player is landing on top of the platform
      if (
        playerBottom >= platformTop &&
        playerTop < platformTop &&
        player.x >= platform.x &&
        player.x < platform.x + platform.width &&
        player.velocityY >= 0 
      ) {
        player.y = platformTop - 1;
        player.velocityY = 0;
        player.jumping = false;
        player.jumpCount = 0;
      }

      // Check if player is hitting the platform from below
      if (
        playerTop <= platformBottom &&
        playerBottom > platformBottom &&
        player.x >= platform.x &&
        player.x < platform.x + platform.width &&
        player.velocityY < 0
      ) {
        player.y = platformBottom;
        player.velocityY = 0;
      }

      // Check if player is hitting the platform from the sides
      if (
        player.x + 1 > platform.x && 
        player.x < platform.x + platform.width && 
        player.y >= platform.y && 
        player.y < platform.y + platform.height
      ) {
        if (player.velocityX > 0) {
          player.x = platform.x - 1;
        } else if (player.velocityX < 0) {
          player.x = platform.x + platform.width;
        }
        player.velocityX = 0;
      }
    });
  }

  function togglePlatformVisibility() {
    platforms.forEach((platform) => {
      const visible = Math.random() > 0.5; // Randomly show or hide
      platform.element.style.display = visible ? "block" : "none";
    });
  }

  function placeCoin() {
    const { x, y } = getRandomSafeSpot();
    const coinRef = firebase.database().ref(`coins/${getKeyString(x, y)}`);
    coinRef.set({
      x,
      y,
    });

    const coinTimeouts = [2000, 3000, 4000, 5000];
    setTimeout(() => {
      placeCoin();
    }, randomFromArray(coinTimeouts));
  }

  function attemptGrabCoin(x, y) {
    const key = getKeyString(x, y);
    if (coins[key]) {
      firebase.database().ref(`coins/${key}`).remove();
      playerRef.update({
        coins: players[playerId].coins + 1,
      });
    }
  }

  const heldDirections = [];

  function handleArrowPress(xChange = 0, yChange = 0) {
    const player = players[playerId];
    if (!player) return; // Ensure player data is available

    if (yChange === -1) { // Jumping
      if (player.jumpCount < 2) { // Allow a maximum of 2 jumps
        player.jumping = true;
        player.velocityY = -7; // Initial jump velocity
        player.jumpCount += 1; // Increment the jump count
      }
    } else {
      const newX = player.x + xChange;

      if (!isSolid(newX, player.y)) {
        player.x = newX; // Directly update x position
        if (xChange === 1) {
          player.direction = "right";
        }
        if (xChange === -1) {
          player.direction = "left";
        }

        playerRef.set(player);
        attemptGrabCoin(newX, player.y);
      }
    }
  }

  function step() {
    if (heldDirections.length > 0) {
      const direction = heldDirections[0];
      if (direction === "ArrowUp" && players[playerId] && players[playerId].jumpCount < 2) {
        handleArrowPress(0, -1);
      } else if (direction === "ArrowDown") {
        handleArrowPress(0, 1);
      } else if (direction === "ArrowLeft") {
        handleArrowPress(-1, 0);
      } else if (direction === "ArrowRight") {
        handleArrowPress(1, 0);
      }
    }

    requestAnimationFrame(step);
  }

  function gameLoop() {
    Object.keys(players).forEach((key) => {
      const player = players[key];
  
      player.velocityY += player.accelerationY;
      let newY = player.y + player.velocityY;
  
      if (isSolid(player.x, newY)) {
        player.y = Math.floor(player.y);
        player.velocityY = 0;
        player.jumping = false; // Stop jumping when landing
        player.jumpCount = 0; // Reset jump count when landing
      } else {
        player.y = newY;
      }
  
      checkPlatformCollisions(player); // Check for platform collisions
  
      playerRef.set(player);
  
      // Check for death
      if (player.y >= 49) {
        endGame();
      }
    });
  
    movePlatforms(); // Move platforms
  
    requestAnimationFrame(gameLoop);
  }
  

  function startGame() {
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000); // Set the interval and store the ID

    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        playerId = user.uid;
        playerRef = firebase.database().ref(`players/${playerId}`);

        const name = createName();
        playerNameInput.value = name;

        const { x, y } = getRandomSafeSpot();

        playerRef.set({
          id: playerId,
          name,
          direction: "right",
          color: randomFromArray(playerColors),
          x,
          y,
          coins: 0,
          velocityY: 0,
          accelerationY: 0.8,
          jumping: false,
          jumpCount: 0, // Initialize jumpCount
        });

        playerRef.onDisconnect().remove();

        initGame();
        requestAnimationFrame(gameLoop);
      }
    });

    firebase.auth().signInAnonymously().catch((error) => {
      var errorCode = error.code;
      var errorMessage = error.message;
      console.log(errorCode, errorMessage);
    });
  }

  function updateTimer() {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    document.querySelector(".timer").innerText = `Time: ${elapsedTime}s`;
  }

  function endGame() {
    console.log("End game called"); // Debug statement
    clearInterval(timerInterval); // Stop the timer
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    timeBoard.innerText = `You survived for ${elapsedTime} seconds!`;
    deathScreen.style.display = "block";
  }

  function resetGame() {
    deathScreen.style.display = "none";
    playerRef.remove();
    startGame();
  }

  retryButton.addEventListener("click", resetGame);

  function initGame() {
    new KeyPressListener("ArrowUp", () => {
      if (!heldDirections.includes("ArrowUp")) heldDirections.unshift("ArrowUp");
    });
    new KeyPressListener("ArrowDown", () => {
      if (!heldDirections.includes("ArrowDown")) heldDirections.unshift("ArrowDown");
    });
    new KeyPressListener("ArrowLeft", () => {
      if (!heldDirections.includes("ArrowLeft")) heldDirections.unshift("ArrowLeft");
    });
    new KeyPressListener("ArrowRight", () => {
      if (!heldDirections.includes("ArrowRight")) heldDirections.unshift("ArrowRight");
    });

    document.addEventListener("keyup", (event) => {
      const index = heldDirections.indexOf(event.code);
      if (index > -1) {
        heldDirections.splice(index, 1);
      }
    });

    const allPlayersRef = firebase.database().ref(`players`);
    const allCoinsRef = firebase.database().ref(`coins`);

    allPlayersRef.on("value", (snapshot) => {
      players = snapshot.val() || {};
      Object.keys(players).forEach((key) => {
        const characterState = players[key];
        let el = playerElements[key];
        if (!el) {
          el = document.createElement("div");
          el.classList.add("Character", "grid-cell");
          playerElements[key] = el;
          gameContainer.appendChild(el);
        }
        el.querySelector(".Character_name").innerText = characterState.name;
        el.querySelector(".Character_coins").innerText = characterState.coins;
        el.setAttribute("data-color", characterState.color);
        el.setAttribute("data-direction", characterState.direction);
        const left = 16 * characterState.x + "px";
        const top = 16 * characterState.y - 4 + "px";
        el.style.transform = `translate3d(${left}, ${top}, 0)`;
      });
    });

    allPlayersRef.on("child_added", (snapshot) => {
      const addedPlayer = snapshot.val();
      console.log("Player added:", addedPlayer);
    
      const characterElement = document.createElement("div");
      characterElement.classList.add("Character", "grid-cell");
      if (addedPlayer.id === playerId) {
        characterElement.classList.add("you");
      }
      characterElement.innerHTML = (`
        <div class="Character_shadow grid-cell"></div>
        <div class="Character_sprite grid-cell"></div>
        <div class="Character_name-container">
          <span class="Character_name"></span>
          <span class="Character_coins">0</span>
        </div>
        <div class="Character_you-arrow"></div>
      `);
      playerElements[addedPlayer.id] = characterElement;
    
      // Fill in some initial state
      characterElement.querySelector(".Character_name").innerText = addedPlayer.name;
      characterElement.querySelector(".Character_coins").innerText = addedPlayer.coins;
      characterElement.setAttribute("data-color", addedPlayer.color);
      characterElement.setAttribute("data-direction", addedPlayer.direction);
      const left = 16 * addedPlayer.x + "px";
      const top = 16 * addedPlayer.y - 4 + "px";
      characterElement.style.transform = `translate3d(${left}, ${top}, 0)`;
      gameContainer.appendChild(characterElement);
    
      console.log("Player element created and added to the game container:", characterElement);
    });
    

    allPlayersRef.on("child_removed", (snapshot) => {
      const removedKey = snapshot.val().id;
      if (playerElements[removedKey]) {
        gameContainer.removeChild(playerElements[removedKey]);
        delete playerElements[removedKey];
      }
    });

    allCoinsRef.on("value", (snapshot) => {
      coins = snapshot.val() || {};
    });

    allCoinsRef.on("child_added", (snapshot) => {
      const coin = snapshot.val();
      const key = getKeyString(coin.x, coin.y);
      coins[key] = true;

      const coinElement = document.createElement("div");
      coinElement.classList.add("Coin", "grid-cell");
      coinElement.innerHTML = `
        <div class="Coin_shadow grid-cell"></div>
        <div class="Coin_sprite grid-cell"></div>
      `;

      const left = 16 * coin.x + "px";
      const top = 16 * coin.y - 4 + "px";
      coinElement.style.transform = `translate3d(${left}, ${top}, 0)`;

      coinElements[key] = coinElement;
      gameContainer.appendChild(coinElement);
    });

    allCoinsRef.on("child_removed", (snapshot) => {
      const { x, y } = snapshot.val();
      const keyToRemove = getKeyString(x, y);
      if (coinElements[keyToRemove]) {
        gameContainer.removeChild(coinElements[keyToRemove]);
        delete coinElements[keyToRemove];
      }
    });

    playerNameInput.addEventListener("change", (e) => {
      const newName = e.target.value || createName();
      playerNameInput.value = newName;
      playerRef.update({
        name: newName,
      });
    });

    playerColorButton.addEventListener("click", () => {
      const mySkinIndex = playerColors.indexOf(players[playerId].color);
      const nextColor = playerColors[mySkinIndex + 1] || playerColors[0];
      playerRef.update({
        color: nextColor,
      });
    });

    placeCoin();
    createPlatforms(); // Initialize platforms
    requestAnimationFrame(step); // Start the movement loop
  }

  // Initial start
  startGame();
})();
