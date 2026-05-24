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

lobbyPlayerNameInput.addEventListener("input", updatePlayerName);

let playerOneName = "Player 1";
let playerTwoName = "Player 2";

let currentRoomCode = "";
let isHost = false;

let currentTurn = 1;

let gameOver = false;

let playerOneSecret = "";
let playerTwoSecret = "";

let chosenCharacters = [];
let playerOneFlippedCards = [];
let playerTwoFlippedCards = [];

createRoomButton.addEventListener("click", createRoom);
joinRoomButton.addEventListener("click", joinRoom);

endTurnButton.addEventListener("click", endTurn);

startGameButton.addEventListener("click", startGame);

//makeGuessButton.addEventListener("click", makeGuess);

returnToLobbyButton.addEventListener("click", returnToLobby);

function createRoom() {
    currentRoomCode = generateRoomCode();

    isHost = true;

    playerOneName = "Host";
    playerTwoName = "Waiting...";

    const roomData = {
        playerOneName: playerOneName,
        playerTwoName: playerTwoName,
        boardSize: 16,
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

    listenToRoom();
}

function listenToRoom() {
    database.ref("rooms/" + currentRoomCode).on("value", (snapshot) => {
        const roomData = snapshot.val();

        if (!roomData) {
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

        if (roomData.gameStarted && roomData.chosenCharacters) {
            chosenCharacters = roomData.chosenCharacters;
            playerOneSecret = roomData.playerOneSecret;
            playerTwoSecret = roomData.playerTwoSecret;
            currentTurn = roomData.currentTurn || 1;

            gameOver = roomData.gameOver || false;

            playerOneFlippedCards = roomData.playerOneFlippedCards || [];
            playerTwoFlippedCards = roomData.playerTwoFlippedCards || [];

            currentTurnText.textContent = currentTurn === 1 ? playerOneName : playerTwoName;

            secretCharacterText.textContent = isHost ? playerOneSecret : playerTwoSecret;

            setBoardColumns(roomData.boardSize);
            renderBoard();

            updateTurnControls();

            showGame();

            if (gameOver) {
                resultMessageText.textContent = roomData.resultMessage || "Game over.";
                gamePanel.classList.add("hidden");
                resultsPanel.classList.remove("hidden");
            }
        }
    });
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

    secretCharacterText.textContent = currentTurn === 1 ? playerOneSecret : playerTwoSecret;

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

function renderBoard() {
    boardElement.innerHTML = "";

    const myFlippedCards = isHost ? playerOneFlippedCards : playerTwoFlippedCards;

    chosenCharacters.forEach((characterName) => {
        const card = document.createElement("div");
        card.classList.add("card");
        
        if (myFlippedCards.includes(characterName)) {
            card.classList.add("flipped");
        }
        
        const nameText = document.createElement("div");
        nameText.textContent = characterName;
        card.appendChild(nameText);

        const actions = document.createElement("div");
        actions.classList.add("card-actions");

        const guessButton = document.createElement("button");
        guessButton.textContent = "Guess";
        guessButton.addEventListener("click", (event) => {
            event.stopPropagation();
            guessCharacter(characterName);
        });

        guessButton.disabled = !isMyTurn() || gameOver;
        
        const flipButton = document.createElement("button");
        
        flipButton.textContent = myFlippedCards.includes(characterName) ? "Restore" : "Cross Out";
        
        flipButton.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleFlippedCard(characterName);
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
    const shuffled = [...CHARACTERS].sort(() => Math.random() - 0.5);
    
    return shuffled.slice(0, amount);
}

function getRandomCharacterFromBoard(boardCharacters) {
    return boardCharacters[
        Math.floor(Math.random() * boardCharacters.length)
    ];
}

function setBoardColumns(boardSize) {
    const columns = Math.sqrt(boardSize);
    
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

function returnToLobby() {
    resultsPanel.classList.add("hidden");
    lobbyPanel.classList.remove("hidden");
}