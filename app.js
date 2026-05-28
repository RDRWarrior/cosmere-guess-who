firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const createRoomButton = document.getElementById("createRoomButton");
const joinRoomButton = document.getElementById("joinRoomButton");
const roomCodeInput = document.getElementById("roomCodeInput");

const boardElement = document.getElementById("board");
const gamePanel = document.getElementById("gamePanel");
const secretCharacterText = document.getElementById("secretCharacter");
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

lobbyPlayerNameInput.addEventListener("input", updatePlayerName);

playAgainButton.addEventListener("click", playAgain);

closeInfoButton.addEventListener("click", closeCharacterInfo);

let playerOneName = "Player 1";
let playerTwoName = "Player 2";

let currentRoomCode = "";
let isHost = false;

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
        playerTwoName = "Guest";

        database.ref("rooms/" + currentRoomCode).update({
            playerTwoName: playerTwoName
        });

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

    lobbyPlayerNameInput.value =
        isHost ? playerOneName : playerTwoName;

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

            secretCharacterText.textContent = getCharacterDisplayNameById(isHost ? playerOneSecret : playerTwoSecret);

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
    endTurnButton.disabled = !isMyTurn() || gameOver;

    if (isMyTurn()) {
        endTurnButton.textContent = "End Turn";
    } else {
        endTurnButton.textContent = "Waiting for opponent...";
    }
}

function updatePlayerName() {
    const newName = lobbyPlayerNameInput.value.trim();

    if (!newName) {
        return;
    }

    if (isHost) {
        database.ref("rooms/" + currentRoomCode).update({
            playerOneName: newName
        });
    } else {
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

function updateBoardSize() {
    if (!isHost) return;

    database.ref("rooms/" + currentRoomCode).update({
        boardSize: parseInt(lobbyBoardSizeSelect.value)
    });
}

function startGame() {
    boardElement.innerHTML = "";

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

    secretCharacterText.textContent = getCharacterDisplayNameById(currentTurn === 1 ? playerOneSecret : playerTwoSecret);

    setBoardColumns(boardSize);

    renderBoard();

    showGame();
}

function showGame() {
    lobbyPanel.classList.add("hidden");
    resultsPanel.classList.add("hidden");
    gamePanel.classList.remove("hidden");
}

function getMyPlayerNumber() {
    return isHost ? 1 : 2;
}

function isMyTurn() {
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

function renderBoard() {
    boardElement.innerHTML = "";

    const myFlippedCards = isHost ? playerOneFlippedCards : playerTwoFlippedCards;

    chosenCharacters.forEach((character) => {
        const characterId = character.id;
        const characterName = character.displayName;

        const card = document.createElement("div");
        card.classList.add("card");
        
        if (myFlippedCards.includes(characterId)) {
            card.classList.add("flipped");
        }
        
        const nameText = document.createElement("button");
        nameText.classList.add("card-name-button");
        nameText.textContent = characterName;

        nameText.addEventListener("click", (event) => {
            event.stopPropagation();
            showCharacterInfo(character);
        });

        card.appendChild(nameText);

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

        guessButton.disabled = !isMyTurn() || gameOver;
        
        const flipButton = document.createElement("button");
        flipButton.textContent = myFlippedCards.includes(characterId)
            ? "Restore"
            : "Cross Out";
        
        flipButton.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleFlippedCard(characterId);
        });

        flipButton.disabled = !isMyTurn() || gameOver;

        
        
        actions.appendChild(guessButton);
        actions.appendChild(flipButton);
        
        card.appendChild(actions);
        boardElement.appendChild(card);
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
    const eligibleCharacters = CHARACTERS
        .map((character) => {
            const matchingDecks = selectedDecks.filter((deck) =>
                character.namesByDeck[deck]
            );

            if (matchingDecks.length === 0) {
                return null;
            }

            const randomDeck =
                matchingDecks[Math.floor(Math.random() * matchingDecks.length)];

            return {
                id: character.id,
                displayName: character.namesByDeck[randomDeck],
                sourceDeck: randomDeck,
                image: character.imagesByDeck?.[randomDeck] || character.image || "images/placeholder.png",
                wikiPage: character.wikiPage || null
            };
        })
        .filter((character) => character !== null);

    const maxAmount = Math.min(amount, eligibleCharacters.length);

    const shuffled = [...eligibleCharacters].sort(() => Math.random() - 0.5);

    return shuffled.slice(0, maxAmount);
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