let ws = null;

const ipAddressInput = document.getElementById('ipAddress');
const connectBtn = document.getElementById('connectBtn');
const statusIndicator = document.getElementById('statusIndicator');

const valYaw = document.getElementById('valYaw');
const valPitch = document.getElementById('valPitch');
const valRoll = document.getElementById('valRoll');

const horizonGroup = document.getElementById('horizonGroup');
const hudYawValue = document.getElementById('hudYawValue');
const compassDial = document.getElementById('compassDial');

// Initialize Compass Dial
const dialInner = document.createElement('div');
dialInner.className = 'compass-dial-inner';
// We generate 360 ticks. Each tick is 30px wide
const TICK_WIDTH = 30;
for (let i = 0; i < 360; i++) {
    const tick = document.createElement('div');
    tick.className = 'compass-tick';
    if (i % 10 === 0) {
        tick.classList.add('major');
        const label = document.createElement('div');
        label.className = 'tick-label';
        // Add NSEW labels if needed
        if(i === 0) label.innerText = 'N';
        else if (i === 90) label.innerText = 'E';
        else if (i === 180) label.innerText = 'S';
        else if (i === 270) label.innerText = 'W';
        else label.innerText = i.toString().padStart(3, '0');
        tick.appendChild(label);
    }
    const line = document.createElement('div');
    line.className = 'tick-line';
    tick.appendChild(line);
    dialInner.appendChild(tick);
}

// To allow seamless wrapping, we add an extra set of ticks
const compassDialWidth = 360 * TICK_WIDTH;
// Clone another set for continuous scrolling wrapping
dialInner.innerHTML += dialInner.innerHTML;
compassDial.appendChild(dialInner);


function connectWebSocket() {
    if (ws) {
        ws.close();
    }

    const ip = ipAddressInput.value.trim();
    if (!ip) return;

    statusIndicator.innerText = "Connecting...";
    statusIndicator.className = "";
    
    // Default WS port from python server is 8765
    ws = new WebSocket(`ws://${ip}:8765`);

    ws.onopen = () => {
        statusIndicator.innerText = "Connected";
        statusIndicator.className = "connected";
    };

    ws.onclose = () => {
        statusIndicator.innerText = "Disconnected";
        statusIndicator.className = "";
        ws = null;
    };

    ws.onerror = (error) => {
        console.error("WebSocket Error: ", error);
        statusIndicator.innerText = "Error";
        statusIndicator.className = "";
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            updateUI(data.yaw, data.pitch, data.roll);
        } catch (e) {
            console.error("Parse Error: ", e);
        }
    };
}

function updateUI(yaw, pitch, roll) {
    if(yaw == undefined) yaw = 0;
    if(pitch == undefined) pitch = 0;
    if(roll == undefined) roll = 0;

    // Update Text Data Box
    valYaw.innerText = yaw.toFixed(2) + '°';
    valPitch.innerText = pitch.toFixed(2) + '°';
    valRoll.innerText = roll.toFixed(2) + '°';

    // Update HUD Text
    hudYawValue.innerText = yaw.toFixed(2).padStart(6, '0');

    // Update Artificial Horizon
    // Pitch moves the horizon up and down (e.g. 1 degree = 2 pixels)
    const pitchTranslate = pitch * 4; 
    // Roll rotates the whole group
    horizonGroup.style.transform = `rotate(${-roll}deg) translateY(${pitchTranslate}px)`;

    // Update Compass Dial
    // We want the current 'yaw' tick to be in the center
    // dial width is 400px. center is 200px.
    // 0 yaw means left edge is at center -> need to offset by center.
    // the total width of one 360 loop is compassDialWidth.
    const centerOffset = 400 / 2; 
    let translateX = centerOffset - (yaw * TICK_WIDTH) - (TICK_WIDTH/2);
    
    dialInner.style.transform = `translateX(${translateX}px)`;
}

connectBtn.addEventListener('click', connectWebSocket);

// Initialize with 0
updateUI(0, 0, 0);
