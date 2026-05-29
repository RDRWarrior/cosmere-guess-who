firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const createRoomButton = document.getElementById("createRoomButton");
const joinRoomButton = document.getElementById("joinRoomButton");
const roomCodeInput = document.getElementById("roomCodeInput");

const boardElement = document.getElementById("board");
const gamePanel = document.getElementById("gamePanel");
//const secretCharacterText = document.getElementById("secretCharacter");
const currentTurnText = document.getElementById("currentTurn");
const endTurnButton = document.getElementById("endTurnButton");
//const boardSizeSelect = document.getElementById("boardSize");

//const playerOneNameInput = document.getElementById("playerOneName");
//const playerTwoNameInput = document.getElementById("playerTwoName");

//const visibleRoomCodeText = document.getElementById("visibleRoomCode");

const entryPanel = document.getElementById("entryPanel");
const lobbyPanel = document.getElementById("lobbyPanel");
const lobbyRoomCodeText = document.getElementById("lobbyRoomCode");
const lobbyPlayerOneText = document.getElementById("lobbyPlayerOne");
const lobbyPlayerTwoText = document.getElementById("lobbyPlayerTwo");
const lobbyBoardSizeSelect = document.getElementById("lobbyBoardSize");
const startGameButton = document.getElementById("startGameButton");

//const makeGuessButton = document.getElementById("makeGuessButton");

const resultsPanel = document.getElementById("resultsPanel");
const resultMessageText = document.getElementById("resultMessage");
const returnToLobbyButton = document.getElementById("returnToLobbyButton");

const lobbyPlayerNameInput = document.getElementById("lobbyPlayerName");

const leaveRoomButton = document.getElementById("leaveRoomButton");

const deckCheckboxes = document.querySelectorAll(".deck-checkbox");

const playAgainButton = document.getElementById("playAgainButton");

const characterInfoPanel = document.getElementById("characterInfoPanel");
const infoCharacterName = document.getElementById("infoCharacterName");
const infoCharacterDeck = document.getElementById("infoCharacterDeck");
const closeInfoButton = document.getElementById("closeInfoButton");

const infoWikiFrame = document.getElementById("infoWikiFrame");

const infoCharacterImage = document.getElementById("infoCharacterImage");

const crossedOutBoard = document.getElementById("crossedOutBoard");

const secretCharacterImage = document.getElementById("secretCharacterImage");
const secretCharacterButton = document.getElementById("secretCharacterButton");

const questionNotes = document.getElementById("questionNotes");

const spectatorLayout = document.getElementById("spectatorLayout");
const spectatorLegend = document.getElementById("spectatorLegend");

const spectatorPlayerOnePanel = document.getElementById("spectatorPlayerOnePanel");
const spectatorPlayerTwoPanel = document.getElementById("spectatorPlayerTwoPanel");

const spectatorPlayerOneName = document.getElementById("spectatorPlayerOneName");
const spectatorPlayerTwoName = document.getElementById("spectatorPlayerTwoName");

const spectatorPlayerOneImage = document.getElementById("spectatorPlayerOneImage");
const spectatorPlayerTwoImage = document.getElementById("spectatorPlayerTwoImage");

const spectatorPlayerOneSecret = document.getElementById("spectatorPlayerOneSecret");
const spectatorPlayerTwoSecret = document.getElementById("spectatorPlayerTwoSecret");

const spectatorPlayerOneCrossedCount = document.getElementById("spectatorPlayerOneCrossedCount");
const spectatorPlayerTwoCrossedCount = document.getElementById("spectatorPlayerTwoCrossedCount");

questionNotes.addEventListener("input", saveQuestionNotes);

secretCharacterButton.addEventListener("click", showSecretCharacterInfo);
secretCharacterImage.addEventListener("click", showSecretCharacterInfo);

lobbyPlayerNameInput.addEventListener("input", updatePlayerName);

playAgainButton.addEventListener("click", playAgain);

closeInfoButton.addEventListener("click", closeCharacterInfo);

let playerOneName = "Player 1";
let playerTwoName = "Player 2";

let currentRoomCode = "";
let isHost = false;

let playerRole = "none"; // "player1", "player2", or "spectator"

let currentTurn = 1;

let gameOver = false;

let playerOneSecret = "";
let playerTwoSecret = "";

let chosenCharacters = [];

let selectedDecks = ["Scadrial"];

let playerOneFlippedCards = [];
let playerTwoFlippedCards = [];

createRoomButton.addEventListener("click", createRoom);
joinRoomButton.addEventListener("click", joinRoom);

endTurnButton.addEventListener("click", endTurn);

startGameButton.addEventListener("click", startGame);

//makeGuessButton.addEventListener("click", makeGuess);

returnToLobbyButton.addEventListener("click", returnToLobby);

leaveRoomButton.addEventListener("click", leaveRoom);

lobbyBoardSizeSelect.addEventListener("change", updateBoardSize);

deckCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", updateSelectedDecks);
});

function createRoom() {
    currentRoomCode = generateRoomCode();

    isHost = true;

    playerRole = "player1";

    playerOneName = "Host";
    playerTwoName = "Waiting...";

    const roomData = {
        playerOneName: playerOneName,
        playerTwoName: playerTwoName,
        boardSize: 16,
        selectedDecks: ["Scadrial"],
        gameStarted: false
    };

    database.ref("rooms/" + currentRoomCode).set(roomData);

    showLobby();
}

function joinRoom() {
    currentRoomCode = roomCodeInput.value.trim().toUpperCase();

    if (!currentRoomCode) {
        alert("Enter a room code first.");
        return;
    }

    database.ref("rooms/" + currentRoomCode).once("value").then((snapshot) => {
        if (!snapshot.exists()) {
            alert("Room not found.");
            return;
        }

        isHost = false;

        const roomData = snapshot.val();

        if (!roomData.playerTwoName || roomData.playerTwoName === "Waiting...") {
            playerRole = "player2";
            playerTwoName = "Guest";

            database.ref("rooms/" + currentRoomCode).update({
                playerTwoName: playerTwoName
            });
        } else {
            playerRole = "spectator";
            alert("This room already has two players. You are joining as a spectator.");
        }

        showLobby();
    });
}

function generateRoomCode() {
    return Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase();
}

function showLobby() {
    if (isHost) {
        playerOneName = "Host";
        playerTwoName = "Waiting...";
    } else {
        playerOneName = "Host";
        playerTwoName = "Guest";
    }

    if (playerRole === "spectator") {
        lobbyPlayerNameInput.value = "Spectator";
        lobbyPlayerNameInput.disabled = true;
    } else {
        lobbyPlayerNameInput.value =
            playerRole === "player1" ? playerOneName : playerTwoName;

        lobbyPlayerNameInput.disabled = false;
    }

    lobbyRoomCodeText.textContent = currentRoomCode;
    lobbyPlayerOneText.textContent = `Player 1: ${playerOneName}`;
    lobbyPlayerTwoText.textContent = `Player 2: ${playerTwoName}`;

    entryPanel.classList.add("hidden");
    lobbyPanel.classList.remove("hidden");

    //startGameButton.style.display = isHost ? "block" : "none";

    setupDisconnectHandling();

    listenToRoom();
}

function listenToRoom() {
    database.ref("rooms/" + currentRoomCode).on("value", (snapshot) => {
        const roomData = snapshot.val();

        if (!roomData) {
            alert("The other player has left the game.");

            currentRoomCode = "";
            isHost = false;

            lobbyPanel.classList.add("hidden");
            gamePanel.classList.add("hidden");
            resultsPanel.classList.add("hidden");
            entryPanel.classList.remove("hidden");

            return;
        }

        playerOneName = roomData.playerOneName;
        playerTwoName = roomData.playerTwoName;

        lobbyPlayerOneText.textContent = `Player 1: ${playerOneName}`;
        lobbyPlayerTwoText.textContent = `Player 2: ${playerTwoName}`;

        const bothPlayersPresent =
            roomData.playerOneName &&
            roomData.playerTwoName &&
            roomData.playerTwoName !== "Waiting...";

        startGameButton.style.display =
            isHost && bothPlayersPresent ? "block" : "none";

        lobbyBoardSizeSelect.value = roomData.boardSize;

        lobbyBoardSizeSelect.disabled = !isHost;

        selectedDecks = roomData.selectedDecks || ["Scadrial"];

        deckCheckboxes.forEach((checkbox) => {
            checkbox.checked = selectedDecks.includes(checkbox.value);
            checkbox.disabled = !isHost;
        });

        if (roomData.gameStarted && roomData.chosenCharacters) {
            chosenCharacters = roomData.chosenCharacters;
            playerOneSecret = roomData.playerOneSecret;
            playerTwoSecret = roomData.playerTwoSecret;
            currentTurn = roomData.currentTurn || 1;

            gameOver = roomData.gameOver || false;   

            playerOneFlippedCards = roomData.playerOneFlippedCards || [];
            playerTwoFlippedCards = roomData.playerTwoFlippedCards || [];

            currentTurnText.textContent = currentTurn === 1 ? playerOneName : playerTwoName;

            if (playerRole === "spectator") {
                secretCharacterButton.textContent = "Spectating";
                secretCharacterImage.src = "images/placeholder.png";
            } else {
                updateSecretCharacterDisplay();
            }

            setBoardColumns(roomData.boardSize);
            renderBoard();

            updateTurnControls();

            showGame();

            if (gameOver) {
                resultMessageText.textContent = roomData.resultMessage || "Game over.";
                playAgainButton.style.display = isHost ? "inline-block" : "none";
                gamePanel.classList.add("hidden");
                resultsPanel.classList.remove("hidden");
            }
        }

        if (!roomData.gameStarted && !roomData.gameOver) {
            gamePanel.classList.add("hidden");
            resultsPanel.classList.add("hidden");

            if (currentRoomCode) {
                lobbyPanel.classList.remove("hidden");
            }
        }
    });
}

function setupDisconnectHandling() {
    const roomRef = database.ref("rooms/" + currentRoomCode);

    if (isHost) {
        roomRef.onDisconnect().remove();
    } else {
        roomRef.onDisconnect().update({
            playerTwoName: "Waiting...",
            gameStarted: false,
            gameOver: false,
            resultMessage: "",
            chosenCharacters: null,
            playerTwoSecret: "",
            playerTwoFlippedCards: []
        });
    }
}

function updateTurnControls() {
    if (playerRole === "spectator") {
        endTurnButton.disabled = true;
        endTurnButton.textContent = "Spectating";
        return;
    }

    endTurnButton.disabled = !isMyTurn() || gameOver;
    endTurnButton.textContent = isMyTurn()
        ? "End Turn"
        : "Waiting for opponent...";
}

function updatePlayerName() {
    if (playerRole === "spectator") return;

    const newName = lobbyPlayerNameInput.value.trim();

    if (!newName) {
        return;
    }

    if (playerRole === "player1") {
        database.ref("rooms/" + currentRoomCode).update({
            playerOneName: newName
        });
    } else if (playerRole === "player2") {
        database.ref("rooms/" + currentRoomCode).update({
            playerTwoName: newName
        });
    }
}

function updateSelectedDecks() {
    if (!isHost) return;

    selectedDecks = Array.from(deckCheckboxes)
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.value);

    if (selectedDecks.length === 0) {
        selectedDecks = ["Scadrial"];
    }

    database.ref("rooms/" + currentRoomCode).update({
        selectedDecks: selectedDecks
    });
}

function getNotesKey() {
    return `cosmereGuessWhoNotes_${currentRoomCode}_${playerRole}`;
}

function saveQuestionNotes() {
    if (!currentRoomCode) return;
    localStorage.setItem(getNotesKey(), questionNotes.value);
}

function loadQuestionNotes() {
    if (!currentRoomCode) return;
    questionNotes.value = localStorage.getItem(getNotesKey()) || "";
}

function updateBoardSize() {
    if (!isHost) return;

    database.ref("rooms/" + currentRoomCode).update({
        boardSize: parseInt(lobbyBoardSizeSelect.value)
    });
}

function startGame() {
    boardElement.innerHTML = "";
    crossedOutBoard.innerHTML = "";

    //visibleRoomCodeText.textContent = currentRoomCode;

    //playerOneName = playerOneNameInput.value || "Player 1";
    //playerTwoName = playerTwoNameInput.value || "Player 2";

    if (isHost) {
        playerOneName = lobbyPlayerNameInput.value || "Host";
    } else {
        playerTwoName = lobbyPlayerNameInput.value || "Guest";
    }

    lobbyPlayerOneText.textContent = `Player 1: ${playerOneName}`;
    lobbyPlayerTwoText.textContent = `Player 2: ${playerTwoName}`;

    currentTurn = 1;

    gameOver = false;

    currentTurnText.textContent = playerOneName;

    const boardSize = parseInt(lobbyBoardSizeSelect.value);

    updateSelectedDecks();

    chosenCharacters = getRandomCharacters(boardSize);
    playerOneFlippedCards = [];
    playerTwoFlippedCards = [];
    
    playerOneSecret = getRandomCharacterFromBoard(chosenCharacters);
    playerTwoSecret = getRandomCharacterFromBoard(chosenCharacters);

    database.ref("rooms/" + currentRoomCode).update({
        boardSize: boardSize,
        gameStarted: true,
        currentTurn: 1,
        chosenCharacters: chosenCharacters,
        playerOneSecret: playerOneSecret,
        playerTwoSecret: playerTwoSecret,
        playerOneFlippedCards: [],
        playerTwoFlippedCards: [],
        gameOver: false,
        resultMessage: ""
    });

    updateSecretCharacterDisplay();

    setBoardColumns(boardSize);

    renderBoard();

    showGame();
}

function showGame() {
    lobbyPanel.classList.add("hidden");
    resultsPanel.classList.add("hidden");
    gamePanel.classList.remove("hidden");

    updateSpectatorView();
    spectatorLegend.classList.toggle("hidden", playerRole !== "spectator");

    document.getElementById("crossedOutTitle").classList.toggle("hidden", playerRole === "spectator");
    crossedOutBoard.classList.toggle("hidden", playerRole === "spectator");

    loadQuestionNotes();
}

function getMyPlayerNumber() {
    if (playerRole === "player1") return 1;
    if (playerRole === "player2") return 2;
    return 0;
}

function isMyTurn() {
    if (playerRole === "spectator") return false;
    return currentTurn === getMyPlayerNumber();
}

function showCharacterInfo(character) {
    infoCharacterName.textContent = character.displayName;
    infoCharacterDeck.textContent = character.sourceDeck || "Unknown";

    if (character.image) {
        infoCharacterImage.src = character.image;
        infoCharacterImage.style.display = "block";
    } else {
        infoCharacterImage.style.display = "none";
    }

    const wikiName = (character.wikiPage || character.displayName)
        .replaceAll(" ", "_")
        .replaceAll("'", "%27");

    infoWikiFrame.src = `https://coppermind.net/wiki/${wikiName}`;

    characterInfoPanel.classList.remove("hidden");
}

function closeCharacterInfo() {
    characterInfoPanel.classList.add("hidden");
    infoWikiFrame.src = "";
}

function getMySecretCharacter() {
    const secretId = isHost ? playerOneSecret : playerTwoSecret;
    return chosenCharacters.find((character) => character.id === secretId);
}

function updateSecretCharacterDisplay() {
    const secretCharacter = getMySecretCharacter();

    if (!secretCharacter) {
        secretCharacterButton.textContent = "?";
        secretCharacterImage.src = "images/placeholder.png";
        return;
    }

    secretCharacterButton.textContent = secretCharacter.displayName;
    secretCharacterImage.src = secretCharacter.image || "images/placeholder.png";
}

function showSecretCharacterInfo() {
    if (playerRole === "spectator") return;

    const secretCharacter = getMySecretCharacter();

    if (secretCharacter) {
        showCharacterInfo(secretCharacter);
    }
}

function renderBoard() {
    boardElement.innerHTML = "";

    const myFlippedCards =
        playerRole === "player1" ? playerOneFlippedCards :
        playerRole === "player2" ? playerTwoFlippedCards :
        [];

    crossedOutBoard.innerHTML = "";

    const activeCharacters = [];
    const crossedCharacters = [];

    chosenCharacters.forEach((character) => {
        if (myFlippedCards.includes(character.id)) {
            crossedCharacters.push(character);
        } else {
            activeCharacters.push(character);
        }
    });

    activeCharacters.forEach((character) => {
        const characterId = character.id;
        const characterName = character.displayName;

        const card = document.createElement("div");
        card.classList.add("card");
        
        if (myFlippedCards.includes(characterId)) {
            card.classList.add("flipped");
        }
        
        const nameRow = document.createElement("div");
        nameRow.classList.add("card-name-row");

        const p1NameMarker = document.createElement("span");
        p1NameMarker.classList.add("name-x", "p1-name-x");
        p1NameMarker.textContent = playerOneFlippedCards.includes(characterId) ? "✕" : "";

        const nameText = document.createElement("button");
        nameText.classList.add("card-name-button");
        nameText.textContent = characterName;

        nameText.addEventListener("click", (event) => {
            event.stopPropagation();
            showCharacterInfo(character);
        });

        const p2NameMarker = document.createElement("span");
        p2NameMarker.classList.add("name-x", "p2-name-x");
        p2NameMarker.textContent = playerTwoFlippedCards.includes(characterId) ? "✕" : "";

        if (playerRole === "spectator") {
            card.classList.add("spectator-card");
            nameRow.appendChild(p1NameMarker);
            nameRow.appendChild(nameText);
            nameRow.appendChild(p2NameMarker);
        } else {
            nameRow.appendChild(nameText);
        }

        card.appendChild(nameRow);

        const cardImage = document.createElement("img");
        cardImage.classList.add("card-image");

        if (character.image) {
            cardImage.src = character.image;
            cardImage.alt = characterName;
        } else {
            cardImage.src = "images/placeholder.png";
            cardImage.alt = "No image available";
        }

        cardImage.onerror = () => {
            cardImage.src = "images/placeholder.png";
        };

        card.appendChild(cardImage);

        const actions = document.createElement("div");
        actions.classList.add("card-actions");

        const guessButton = document.createElement("button");
        guessButton.textContent = "Guess";
        guessButton.addEventListener("click", (event) => {
            event.stopPropagation();
            guessCharacter(characterId);
        });

        guessButton.disabled = playerRole === "spectator" || !isMyTurn() || gameOver;
        
        const flipButton = document.createElement("button");
        flipButton.textContent = myFlippedCards.includes(characterId)
            ? "Restore"
            : "Cross Out";

        if (myFlippedCards.includes(characterId)) {
            flipButton.classList.add("restore-button");
        } else {
            flipButton.classList.remove("restore-button");
        }
        
        flipButton.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleFlippedCard(characterId);
        });

        flipButton.disabled = playerRole === "spectator" || !isMyTurn() || gameOver;
        
        actions.appendChild(guessButton);
        actions.appendChild(flipButton);
        
        if (playerRole !== "spectator") {
            card.appendChild(actions);
        }
        boardElement.appendChild(card);
    });

    crossedCharacters.forEach((character) => {
        const miniCard = document.createElement("div");
        miniCard.classList.add("crossed-out-card");

        const name = document.createElement("span");
        name.textContent = character.displayName;

        const restoreButton = document.createElement("button");
        restoreButton.textContent = "Restore";

        restoreButton.addEventListener("click", () => {
            toggleFlippedCard(character.id);
        });

        miniCard.appendChild(name);
        miniCard.appendChild(restoreButton);

        crossedOutBoard.appendChild(miniCard);

        restoreButton.disabled = playerRole === "spectator" || !isMyTurn() || gameOver;
    });
}

function toggleFlippedCard(characterName) {
    if (gameOver) return;
    if (!isMyTurn()) return;

    const currentFlippedCards = isHost ? playerOneFlippedCards : playerTwoFlippedCards;

    if (currentFlippedCards.includes(characterName)) {
        const index = currentFlippedCards.indexOf(characterName);
        currentFlippedCards.splice(index, 1);
    } else {
        currentFlippedCards.push(characterName);
    }

    const updateData = {};

    if (isHost) {
        updateData.playerOneFlippedCards = playerOneFlippedCards;
    } else {
        updateData.playerTwoFlippedCards = playerTwoFlippedCards;
    }

    database.ref("rooms/" + currentRoomCode).update(updateData);
}

function getRandomCharacters(amount) {
    const deckPools = selectedDecks.map((deck) => {
        const charactersForDeck = CHARACTERS
            .filter((character) => character.namesByDeck[deck])
            .map((character) => ({
                id: character.id,
                displayName: character.namesByDeck[deck],
                sourceDeck: deck,
                image: character.imagesByDeck?.[deck] || character.image || "images/placeholder.png",
                wikiPage: character.wikiPage || null
            }));

        return shuffleArray(charactersForDeck);
    });

    const chosen = [];
    const usedIds = new Set();

    let deckIndex = 0;
    let safetyCounter = 0;

    while (chosen.length < amount && safetyCounter < 10000) {
        const pool = deckPools[deckIndex];

        while (pool && pool.length > 0) {
            const candidate = pool.shift();

            if (!usedIds.has(candidate.id)) {
                chosen.push(candidate);
                usedIds.add(candidate.id);
                break;
            }
        }

        deckIndex = (deckIndex + 1) % deckPools.length;
        safetyCounter++;

        const anyCardsLeft = deckPools.some((pool) =>
            pool.some((character) => !usedIds.has(character.id))
        );

        if (!anyCardsLeft) break;
    }

    return chosen;
}

function getCharacterById(characterId) {
    return chosenCharacters.find((character) => character.id === characterId);
}

function updateSpectatorView() {
    const isSpectator = playerRole === "spectator";

    spectatorLayout.classList.toggle("is-spectator", isSpectator);
    spectatorPlayerOnePanel.classList.toggle("hidden", !isSpectator);
    spectatorPlayerTwoPanel.classList.toggle("hidden", !isSpectator);
    spectatorLegend.classList.toggle("hidden", !isSpectator);

    if (!isSpectator) return;

    const p1Secret = getCharacterById(playerOneSecret);
    const p2Secret = getCharacterById(playerTwoSecret);

    spectatorPlayerOneName.textContent = playerOneName;
    spectatorPlayerTwoName.textContent = playerTwoName;

    spectatorPlayerOneSecret.textContent = p1Secret?.displayName || "?";
    spectatorPlayerTwoSecret.textContent = p2Secret?.displayName || "?";

    spectatorPlayerOneImage.src = p1Secret?.image || "images/placeholder.png";
    spectatorPlayerTwoImage.src = p2Secret?.image || "images/placeholder.png";

    spectatorPlayerOneCrossedCount.textContent = playerOneFlippedCards.length;
    spectatorPlayerTwoCrossedCount.textContent = playerTwoFlippedCards.length;
}

function shuffleArray(array) {
    return [...array].sort(() => Math.random() - 0.5);
}

function getRandomCharacterFromBoard(boardCharacters) {
    const character =
        boardCharacters[Math.floor(Math.random() * boardCharacters.length)];

    return character.id;
}

function getCharacterDisplayNameById(characterId) {
    const character = chosenCharacters.find((c) => c.id === characterId);

    return character ? character.displayName : characterId;
}

function setBoardColumns(boardSize) {
    const boardWidth = Math.sqrt(boardSize);
    const columns = Math.min(boardWidth, 8);

    boardElement.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
}

function endTurn() {
    if (gameOver) return;
    if (!isMyTurn()) return;

    const nextTurn = currentTurn === 1 ? 2 : 1;

    database.ref("rooms/" + currentRoomCode).update({
        currentTurn: nextTurn
    });
}

function guessCharacter(characterName) {
    if (gameOver) return;
    if (!isMyTurn()) return;

    const guessedCharacter = getCharacterDisplayNameById(characterName);

    const confirmed = confirm(
        `Guess ${guessedCharacter}?\n\nIf correct, you win.\nIf wrong, you lose.`
    );

    if (!confirmed) {
        return;
    }

    const opponentSecret =
        currentTurn === 1 ? playerTwoSecret : playerOneSecret;

    const currentPlayerName =
        currentTurn === 1 ? playerOneName : playerTwoName;

    const opponentName =
        currentTurn === 1 ? playerTwoName : playerOneName;

    let resultText = "";

    if (characterName === opponentSecret) {
        resultText = `${currentPlayerName} guessed correctly and wins!`;
    } else {
        resultText = `${currentPlayerName} guessed wrong! ${opponentName} wins!`;
    }

    database.ref("rooms/" + currentRoomCode).update({
        gameOver: true,
        resultMessage: resultText
    });
}

function leaveRoom() {
    if (!currentRoomCode) return;

    if (isHost) {
        database.ref("rooms/" + currentRoomCode).remove();
    } else {
        database.ref("rooms/" + currentRoomCode).update({
            playerTwoName: "Waiting...",
            gameStarted: false,
            gameOver: false,
            resultMessage: "",
            chosenCharacters: null,
            playerTwoSecret: "",
            playerTwoFlippedCards: []
        });
    }

    currentRoomCode = "";
    isHost = false;

    lobbyPanel.classList.add("hidden");
    gamePanel.classList.add("hidden");
    resultsPanel.classList.add("hidden");
    entryPanel.classList.remove("hidden");
}

function playAgain() {
    if (!isHost) return;

    database.ref("rooms/" + currentRoomCode).update({
        gameStarted: false,
        gameOver: false,
        resultMessage: "",
        currentTurn: 1,
        chosenCharacters: null,
        playerOneSecret: "",
        playerTwoSecret: "",
        playerOneFlippedCards: [],
        playerTwoFlippedCards: []
    });
}

function returnToLobby() {
    database.ref("rooms/" + currentRoomCode).off();

    if (isHost) {
        database.ref("rooms/" + currentRoomCode).remove();
    } else {
        database.ref("rooms/" + currentRoomCode).update({
            playerTwoName: "Waiting...",
            gameStarted: false,
            gameOver: false,
            resultMessage: "",
            chosenCharacters: null,
            playerTwoSecret: "",
            playerTwoFlippedCards: []
        });
    }

    currentRoomCode = "";
    isHost = false;

    resultsPanel.classList.add("hidden");
    gamePanel.classList.add("hidden");
    lobbyPanel.classList.add("hidden");

    entryPanel.classList.remove("hidden");
}