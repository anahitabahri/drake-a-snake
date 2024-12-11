// Canvas and context setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gridSize = 15;  // Increased grid size
canvas.width = 400;   // Larger canvas width
canvas.height = 300;  // Larger canvas height
const tileCount = Math.floor(canvas.width / gridSize);

// Character image setup
const drakeHead = new Image();
drakeHead.src = 'otherAssets/drake.png';  
const headSize = gridSize * 2;  // Make head slightly larger than grid

const kendrickHead = new Image();
kendrickHead.src = 'otherAssets/kendrick.png';  

// Kendrick character setup and configuration
let kendrick = {x: 2, y: 2};  // Starting position
const KENDRICK_SPEED = 0.5;   // Movement speed (lower = slower)

// List of Drake win images
const DRAKE_WIN_IMAGES = [
    'drakeMemes/1.png',
    'drakeMemes/2.png',
    'drakeMemes/3.png',
    'drakeMemes/4.png',
    'drakeMemes/5.png',
    'drakeMemes/6.png',
    'drakeMemes/7.png',
    'drakeMemes/8.png',
    'drakeMemes/9.png',
    'drakeMemes/10.png',
    'drakeMemes/11.png',
    'drakeMemes/12.png'
];

// Keep track of used memes
let usedMemes = [];

// Game state variables
let foodCount = 0;        // Tracks collected CLOUT
let score = 0;           // Player score
let snake = [];          // Drake's body segments
let food = {x: 5, y: 5}; // CLOUT position
let dx = 0;             // Direction X
let dy = 0;             // Direction Y
let lastDirection = '';  // Prevents 180-degree turns
let gameSpeed = 100;     // Milliseconds between updates
let gameLoop = null;     // Game loop reference
let gameActive = false;  // Game state flag
let gameStarted = false;  // Tracks if game has been initiated
let isButtonHovered = false;  // Tracks button hover state
let backgroundMusic = new Audio('otherAssets/heyNow.mp3');
backgroundMusic.loop = true;
let isMusicPlaying = true;

let currentUser = null;
let leaderboard = [];

// Image error handling
drakeHead.onerror = () => console.error('Error loading Drake head image');
kendrickHead.onerror = () => console.error('Error loading Kendrick head image');

// Create username popup before game starts
function createUsernamePopup() {
    const popup = document.createElement('div');
    popup.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;

    const container = document.createElement('div');
    container.style.cssText = `
        background: #C7E392;
        padding: 30px;
        border-radius: 10px;
        border: 4px solid #4A5036;
        text-align: center;
    `;

    const title = document.createElement('h2');
    title.textContent = "ENTER UR NAME BESTIE";
    title.style.cssText = `
        color: #4A5036;
        margin-bottom: 20px;
        font-family: 'Courier New', monospace;
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.style.cssText = `
        padding: 10px;
        font-size: 16px;
        border: 2px solid #4A5036;
        border-radius: 5px;
        margin-bottom: 15px;
        width: 200px;
        font-family: 'Courier New', monospace;
    `;

    const button = document.createElement('button');
    button.textContent = "LETS GO";
    button.style.cssText = `
        background: #4A5036;
        color: #C7E392;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-family: 'Courier New', monospace;
        font-size: 16px;
    `;

    button.onclick = async () => {
        if (input.value.trim()) {
            const username = input.value.trim();
            try {
                const response = await fetch('/api/user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username })
                });
                currentUser = await response.json();
                popup.remove();
                createInstructionPopup();
                updateLeaderboard();
            } catch (error) {
                console.error('Error creating user:', error);
            }
        }
    };

    container.appendChild(title);
    container.appendChild(input);
    container.appendChild(document.createElement('br'));
    container.appendChild(button);
    popup.appendChild(container);
    document.body.appendChild(popup);
}

// Create and update leaderboard
function createLeaderboard() {
    const leaderboardDiv = document.createElement('div');
    leaderboardDiv.id = 'leaderboard';
    leaderboardDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #C7E392;
        padding: 15px;
        border-radius: 10px;
        border: 3px solid #4A5036;
        font-family: 'Courier New', monospace;
        min-width: 200px;
    `;
    document.body.appendChild(leaderboardDiv);
    updateLeaderboard();
}

async function updateLeaderboard() {
    try {
        const response = await fetch('/api/leaderboard');
        if (!response.ok) {
            throw new Error('Failed to fetch leaderboard');
        }
        
        const leaderboard = await response.json();
        
        const leaderboardDiv = document.getElementById('leaderboard');
        if (leaderboardDiv) {
            leaderboardDiv.innerHTML = `
                <h3 style="margin: 0 0 10px 0; color: #4A5036;">TOP DRAKES</h3>
                ${leaderboard.map((user, index) => `
                    <div style="margin: 5px 0; ${user.username === currentUser?.username ? 'color: #4A5036; font-weight: bold;' : ''}">
                        ${index + 1}. ${user.username} - ${user.uniqueMemes}/12
                    </div>
                `).join('')}
            `;
        }
    } catch (error) {
        console.error('Error updating leaderboard:', error);
    }
}

// Call updateLeaderboard more frequently
function startLeaderboardUpdates() {
    // Update immediately
    updateLeaderboard();
    
    // Then update every 5 seconds
    setInterval(updateLeaderboard, 5000);
}

// Update win handling to include score submission
async function handleWin(memeId) {
    if (currentUser) {
        try {
            const response = await fetch('/api/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: currentUser.username,
                    memeId
                })
            });
            
            if (response.ok) {
                // Update leaderboard immediately after successful score update
                await updateLeaderboard();
            } else {
                console.error('Error updating score');
            }
        } catch (error) {
            console.error('Error updating score:', error);
        }
    }
}

function createMusicToggle() {
    // Remove ALL existing music toggles
    const existingToggles = document.querySelectorAll('#musicToggle');
    existingToggles.forEach(toggle => toggle.remove());
    
    const musicToggle = document.createElement('div');
    musicToggle.id = 'musicToggle';
    musicToggle.innerHTML = 'shut off this music';
    musicToggle.className = 'music-toggle';
    
    musicToggle.addEventListener('click', toggleMusic);
    
    // Add text toggle to game container
    document.getElementById('gameContainer').appendChild(musicToggle);
}


function toggleMusic() {
    const musicToggle = document.getElementById('musicToggle');
    if (isMusicPlaying) {
        backgroundMusic.pause();
        musicToggle.innerHTML = 'nvm, put that song back on';
    } else {
        backgroundMusic.play()
            .then(() => {
                musicToggle.innerHTML = 'shut off this music';
            })
            .catch(error => {
                console.error('Audio play failed:', error);
            });
    }
    isMusicPlaying = !isMusicPlaying;
}

// Create mobile controls
function createMobileControls() {
    const mobileControls = document.createElement('div');
    mobileControls.id = 'mobileControls';
    mobileControls.className = 'mobile-controls';
    
    // Create arrows for each direction
    const directions = ['up', 'down', 'left', 'right'];
    directions.forEach(direction => {
        const arrow = document.createElement('button');
        arrow.className = `arrow ${direction}`;
        arrow.innerHTML = getArrowSymbol(direction);
        
        // Add touch events
        arrow.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleMobileControl(direction);
        });
        
        mobileControls.appendChild(arrow);
    });
    
    document.getElementById('gameContainer').appendChild(mobileControls);
}

function getArrowSymbol(direction) {
    const symbols = {
        up: '⬆️',
        down: '⬇️',
        left: '⬅️',
        right: '➡️'
    };
    return symbols[direction];
}

function handleMobileControl(direction) {
    if (!gameActive) return;
    
    switch(direction) {
        case 'up':
            if (lastDirection !== 'down') {
                dx = 0;
                dy = -1;
                lastDirection = 'up';
            }
            break;
        case 'down':
            if (lastDirection !== 'up') {
                dx = 0;
                dy = 1;
                lastDirection = 'down';
            }
            break;
        case 'left':
            if (lastDirection !== 'right') {
                dx = -1;
                dy = 0;
                lastDirection = 'left';
            }
            break;
        case 'right':
            if (lastDirection !== 'left') {
                dx = 1;
                dy = 0;
                lastDirection = 'right';
            }
            break;
    }
}

// Create instruction popup
function createInstructionPopup() {
    const popup = document.createElement('div');
    popup.id = 'instructionPopup';
    popup.className = 'instruction-popup';
    
    const content = document.createElement('div');
    content.className = 'popup-content';
    
    const text = document.createElement('p');
    text.innerHTML = `use arrow keys (or buttons) to move!<br>press space to restart!<br><br>watch out for kendrick 👀`;
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = 'got it!';
    closeBtn.addEventListener('click', () => {
        popup.remove();
        drawStartScreen(); // Show start screen instead of starting game immediately
    });
    
    content.appendChild(text);
    content.appendChild(closeBtn);
    popup.appendChild(content);
    
    document.body.appendChild(popup);
}

// Check if user is on mobile
function isMobileDevice() {
    return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
}

// Update window load event listener
window.addEventListener('load', () => {
    createMusicToggle();
    drawStartScreen();
    createInstructionPopup();
    
    // Only create mobile controls if on a mobile device
    if (isMobileDevice()) {
        createMobileControls();
    }
    
    // Start playing music immediately
    backgroundMusic.play()
        .catch(error => console.error('Audio play failed:', error));
});

// Remove the old #controls element
const oldControls = document.getElementById('controls');
if (oldControls) {
    oldControls.remove();
}

function getRandomUnusedMeme() {
    // If we've used all memes, reset the tracking array
    if (usedMemes.length === DRAKE_WIN_IMAGES.length) {
        usedMemes = [];
    }
    
    // Get available memes (ones we haven't used yet)
    const availableMemes = DRAKE_WIN_IMAGES.filter(meme => !usedMemes.includes(meme));
    
    // Pick a random meme from available ones
    const randomIndex = Math.floor(Math.random() * availableMemes.length);
    const selectedMeme = availableMemes[randomIndex];
    
    // Add to used memes list
    usedMemes.push(selectedMeme);
    
    return selectedMeme;
}

function showGameEndPopup(isLoss = false) {
    const popup = document.createElement('div');
    popup.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        animation: fadeIn 0.5s;
    `;

    const container = document.createElement('div');
    container.style.cssText = `
        background: #C7E392;
        padding: 20px;
        border-radius: 10px;
        border: 4px solid #4A5036;
        animation: spinIn 1s;
        text-align: center;
        position: relative;
        cursor: pointer;
    `;

    if (isLoss) {
        const message = document.createElement('div');
        message.textContent = 'LOOOOOOSER!';
        message.style.cssText = `
            font-size: 36px;
            font-weight: bold;
            color: #4A5036;
            margin-bottom: 20px;
            font-family: 'Courier New', monospace;
        `;
        const gif = document.createElement('img');
        gif.src = 'otherAssets/kendrickgif.gif';
        gif.style.cssText = `
            max-width: 300px;
            border-radius: 10px;
            margin-top: 10px;
        `;
        container.appendChild(message);
        container.appendChild(gif);
    } else {
        // Win scenario - update score before showing meme
        const selectedMeme = getRandomUnusedMeme();
        const memeId = selectedMeme.replace('drakeMemes/', '').replace('.png', ''); // Convert filename to ID
        
        // Create and show the meme image
        const img = document.createElement('img');
        img.src = selectedMeme;
        img.style.cssText = `
            max-width: 400px;
            border-radius: 10px;
        `;
        container.appendChild(img);
        
        // Update server with the new meme discovery
        handleWin(memeId);
        
        // Optional: log remaining unused memes for debugging
        console.log(`Memes used: ${usedMemes.length}/12`);
    }

    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes spinIn {
            from { transform: rotate(0deg) scale(0); }
            to { transform: rotate(360deg) scale(1); }
        }
    `;
    document.head.appendChild(style);

    popup.addEventListener('click', () => {
        popup.remove();
        startGame();
    });

    popup.appendChild(container);
    document.body.appendChild(popup);
}

/**
 * Handles Kendrick's movement logic
 * The key aspects of Kendrick's chase behavior:
 * 1. Tracks Drake's position (snake[0])
 * 2. Moves either horizontally or vertically based on which distance is greater
 * 3. Uses KENDRICK_SPEED to create smooth movement
 * 4. Prevents moving outside canvas bounds
 */
function moveKendrick() {
    if (!gameActive) return;
    
    // Get Drake's current position (head of snake)
    const drakePos = snake[0];
    
    // Calculate distance to Drake in both directions
    const dx = drakePos.x - kendrick.x;
    const dy = drakePos.y - kendrick.y;
    
    // Move in the direction of greatest distance
    if (Math.abs(dx) > Math.abs(dy)) {
        // Move horizontally
        kendrick.x += dx > 0 ? KENDRICK_SPEED : -KENDRICK_SPEED;
    } else {
        // Move vertically
        kendrick.y += dy > 0 ? KENDRICK_SPEED : -KENDRICK_SPEED;
    }
    
    // Keep Kendrick within canvas bounds
    kendrick.x = Math.max(0, Math.min(tileCount - 1, kendrick.x));
    kendrick.y = Math.max(0, Math.min(tileCount - 1, kendrick.y));
    
    // Check if Kendrick caught Drake
    checkKendrickCollision();
}

/**
 * Draws Kendrick on the canvas
 */
function drawKendrick() {
    ctx.save();
    ctx.drawImage(
        kendrickHead,
        kendrick.x * gridSize,
        kendrick.y * gridSize,
        headSize,
        headSize
    );
    ctx.restore();
}

/**
 * Checks if Kendrick has caught Drake
 * Uses distance formula to determine collision
 */
function checkKendrickCollision() {
    const distance = Math.hypot(
        snake[0].x - kendrick.x,
        snake[0].y - kendrick.y
    );
    
    if (distance < 1) {
        gameActive = false;
        clearInterval(gameLoop);
        showGameEndPopup(true);  // true for loss scenario
    }
}

/**
 * Main game drawing function
 */
function drawGame() {
    if (!gameStarted) {
        drawStartScreen();
        return;
    }
    clearCanvas();
    moveSnake();
    moveKendrick();
    checkCollision();
    drawSnake();
    drawKendrick();
    drawFood();
    updateScore();
}

function drawStartScreen() {
    ctx.fillStyle = '#C7E392';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const buttonWidth = 200;
    const buttonHeight = 60;
    const buttonX = (canvas.width - buttonWidth) / 2;
    const buttonY = (canvas.height - buttonHeight) / 2;
    
    // Button background with hover effect
    ctx.fillStyle = isButtonHovered ? '#4A5036' : '#8B956D';
    
    // Add subtle shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 3;
    
    ctx.beginPath();
    ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
    ctx.fill();
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    // Button text with hover effect
    ctx.fillStyle = isButtonHovered ? '#C7E392' : '#4A5036';
    ctx.font = 'bold 24px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('START GAME', canvas.width/2, canvas.height/2);
    
}

/**
 * Clears the canvas for next frame
 */
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * Draws Drake (the snake) with rotating head based on direction
 */
function drawSnake() {
    snake.forEach((segment, index) => {
        if (index === 0) {
            // Draw Drake's head with rotation
            ctx.save();
            
            // Calculate rotation based on movement direction
            let rotation = 0;
            if (dx === 1) rotation = 0;       // Right
            if (dx === -1) rotation = Math.PI; // Left
            if (dy === 1) rotation = Math.PI/2;    // Down
            if (dy === -1) rotation = -Math.PI/2;  // Up
            
            // Position and rotate head
            ctx.translate(
                segment.x * gridSize + gridSize/2,
                segment.y * gridSize + gridSize/2
            );
            ctx.rotate(rotation);
            
            // Draw head image with new larger size
            ctx.drawImage(
                drakeHead,
                -headSize/2,
                -headSize/2,
                headSize,
                headSize
            );
            
            ctx.restore();
        } else {
            // Draw larger body segments
            ctx.fillStyle = '#4A5036';
            ctx.fillRect(
                segment.x * gridSize + 1,
                segment.y * gridSize + 1,
                gridSize - 2,
                gridSize - 2
            );
        }
    });
}

/**
 * Draws the CLOUT text that Drake collects
 */
function drawFood() {
    ctx.fillStyle = '#4A5036';
    ctx.font = 'bold 16px Arial';  // Made text larger and bold
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const x = food.x * gridSize + gridSize/2;
    const y = food.y * gridSize + gridSize/2;
    
    // Draw background highlight to make CLOUT more visible
    ctx.save();
    ctx.fillStyle = 'rgba(199, 227, 146, 0.6)';
    ctx.beginPath();
    ctx.arc(x, y, gridSize/1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Draw CLOUT text
    ctx.fillStyle = '#4A5036';
    ctx.fillText('CLOUT', x, y);
}


/**
 * Handles snake movement and CLOUT collection
 */
function moveSnake() {
    // Calculate new head position
    const newHead = {
        x: snake[0].x + dx,
        y: snake[0].y + dy
    };

    // Wrap around screen edges
    const verticalTiles = Math.floor(canvas.height / gridSize);
    
    // Horizontal wrapping
if (newHead.x >= tileCount) newHead.x = 0;
if (newHead.x < 0) newHead.x = tileCount - 1;
    
    // Vertical wrapping
    if (newHead.y >= verticalTiles) newHead.y = 0;
    if (newHead.y < 0) newHead.y = verticalTiles - 1;

    snake.unshift(newHead);

    // Calculate center points of Drake's head and CLOUT
    const drakeCenter = {
        x: newHead.x * gridSize + headSize/2,
        y: newHead.y * gridSize + headSize/2
    };
    
    const cloutCenter = {
        x: food.x * gridSize + gridSize/2,
        y: food.y * gridSize + gridSize/2
    };
    
    // Calculate distance between centers
    const distanceToClout = Math.hypot(
        drakeCenter.x - cloutCenter.x,
        drakeCenter.y - cloutCenter.y
    );
    
    // Check if any part of Drake's head overlaps with CLOUT
    // Using headSize/2 + gridSize as the collision radius to be more forgiving
    if (distanceToClout < (headSize/2 + gridSize)) {
        score += 10;
        foodCount++;
        
        // Check win condition (5 CLOUT collected)
        if (foodCount === 5) {
            gameActive = false;
            clearInterval(gameLoop);
            showGameEndPopup(false);  // false for win scenario
        } else {
            generateFood();
            increaseSpeed();
        }
    } else {
        snake.pop();  // Remove tail if no food eaten
    }
}

/**
 * Checks for collision with snake body
 */
function checkCollision() {
    for (let i = 1; i < snake.length; i++) {
        if (snake[i].x === snake[0].x && snake[i].y === snake[0].y) {
            gameOver();
        }
    }
}

/**
 * Generates new CLOUT position
 */
function generateFood() {
    let newFood;
    // Calculate maximum valid positions based on actual canvas size
    const maxX = Math.floor((canvas.width - gridSize * 2) / gridSize);  // Leave 2 grid space on each side
    const maxY = Math.floor((canvas.height - gridSize * 2) / gridSize);
    const minX = 2;  // Minimum 2 grid spaces from left
    const minY = 2;  // Minimum 2 grid spaces from top
    
    do {
        newFood = {
            x: Math.floor(Math.random() * (maxX - minX)) + minX,
            y: Math.floor(Math.random() * (maxY - minY)) + minY
        };
    } while (
        // Check if food would spawn on snake
        snake.some(segment => 
            Math.abs(segment.x - newFood.x) < 2 && 
            Math.abs(segment.y - newFood.y) < 2) ||
        // Check if food would spawn too close to Kendrick
        Math.abs(newFood.x - kendrick.x) < 2 && 
        Math.abs(newFood.y - kendrick.y) < 2
    );
    
    food = newFood;
    console.log('New CLOUT position:', food, 'Canvas bounds:', {maxX, maxY, minX, minY});
}


/**
 * Updates score display
 */
function updateScore() {
    document.getElementById('score').textContent = `score: ${score}`;
}

/**
 * Increases game speed after collecting CLOUT
 */
function increaseSpeed() {
    if (gameSpeed > 50) {  // Minimum speed limit
        gameSpeed -= 2;
        clearInterval(gameLoop);
        gameLoop = setInterval(drawGame, gameSpeed);
    }
}

/**
 * Handles game over state
 */
function gameOver() {
    gameActive = false;
    clearInterval(gameLoop);
    gameLoop = null;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#C7E392';
    ctx.font = '24px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('ha! game over babez!', canvas.width/2, canvas.height/2);
    ctx.font = '14px Courier New';
    ctx.fillText('hit that spacebar to restart', canvas.width/2, canvas.height/2 + 30);
}

/**
 * Initializes/restarts the game
 */
function startGame() {
    if (!gameStarted) return;  
    
    kendrick = {x: 2, y: 2};
    foodCount = 0;
    snake = [{x: 10, y: 10}];
    score = 0;
    dx = 1;
    dy = 0;
    lastDirection = 'right';
    gameSpeed = 100;
    gameActive = true;

    if (gameLoop !== null) {
        clearInterval(gameLoop);
    }

    generateFood();
    clearCanvas();
    gameLoop = setInterval(drawGame, gameSpeed);
    
    // Add this new code at the end of startGame
    if (isMusicPlaying) {
        try {
            backgroundMusic.play()
                .catch(error => console.error('Audio play failed:', error));
        } catch (error) {
            console.error('Audio play failed:', error);
        }
    }
}

// Handle clicks on the start button
canvas.addEventListener('click', function(e) {
    if (!gameStarted) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const buttonWidth = 200;
        const buttonHeight = 60;
        const buttonX = (canvas.width - buttonWidth) / 2;
        const buttonY = (canvas.height - buttonHeight) / 2;
        
        if (x >= buttonX && x <= buttonX + buttonWidth &&
            y >= buttonY && y <= buttonY + buttonHeight) {
            gameStarted = true;
            startGame();
        }
    }
});

// Handle hover effects on the start button
canvas.addEventListener('mousemove', function(e) {
    if (!gameStarted) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const buttonWidth = 200;
        const buttonHeight = 60;
        const buttonX = (canvas.width - buttonWidth) / 2;
        const buttonY = (canvas.height - buttonHeight) / 2;
        
        const wasHovered = isButtonHovered;
        isButtonHovered = (x >= buttonX && x <= buttonX + buttonWidth &&
                          y >= buttonY && y <= buttonY + buttonHeight);
        
        if (wasHovered !== isButtonHovered) {
            drawStartScreen();
        }
    }
});

// Controls
document.addEventListener('keydown', (e) => {
    // Prevent default scrolling behavior for arrow keys and space
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
        e.key === 'ArrowLeft' || e.key === 'ArrowRight' || 
        e.key === ' ') {
        e.preventDefault();
    }

    if (e.key === ' ') {
        startGame();
        return;
    }

    if (!gameActive) return;

    switch(e.key) {
        case 'ArrowUp':
            if (lastDirection !== 'down') {
                dx = 0;
                dy = -1;
                lastDirection = 'up';
            }
            break;
        case 'ArrowDown':
            if (lastDirection !== 'up') {
                dx = 0;
                dy = 1;
                lastDirection = 'down';
            }
            break;
        case 'ArrowLeft':
            if (lastDirection !== 'right') {
                dx = -1;
                dy = 0;
                lastDirection = 'left';
            }
            break;
        case 'ArrowRight':
            if (lastDirection !== 'left') {
                dx = 1;
                dy = 0;
                lastDirection = 'right';
            }
            break;
    }
});

window.addEventListener('load', () => {
    // Clean up any existing elements first (keep this cleanup)
    const existingPopups = document.querySelectorAll('#instructionPopup');
    existingPopups.forEach(popup => popup.remove());
    
    const existingToggles = document.querySelectorAll('#musicToggle');
    existingToggles.forEach(toggle => toggle.remove());
    
    // Create elements in the correct order
    createMusicToggle();
    createLeaderboard();
    startLeaderboardUpdates(); // Add leaderboard update interval
    
    // Start with username popup only
    createUsernamePopup();
    
    // Only create mobile controls if on a mobile device
    if (isMobileDevice()) {
        createMobileControls();
    }
    
    // Start playing music immediately
    backgroundMusic.play()
        .catch(error => console.error('Audio play failed:', error));
});

// show the start screen
// drawStartScreen();