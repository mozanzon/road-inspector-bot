#include <Wire.h>
#include <FaBo9Axis_MPU9250.h>

// ── LEFT Motor (M1)
const int LEFT_RPWM = 5,  LEFT_LPWM = 6,  LEFT_R_EN = 7,  LEFT_L_EN = 8;

// ── RIGHT Motor (M2)
const int RIGHT_RPWM = 9, RIGHT_LPWM = 10, RIGHT_R_EN = 11, RIGHT_L_EN = 12;

const int RAMP_STEPS = 50;
const unsigned long RAMP_TIME = 800;

int currentSpeed = 0;
int currentDir   = 0; // 1=fwd, -1=back, 0=stop

// ── IMU streaming state
bool imuStreaming = false;
unsigned long imuInterval = 100;   // ms between IMU packets (default 10 Hz)
unsigned long lastImuTime  = 0;

// ── Straight-line heading correction (active during FORWARD / BACKWARD)
const float STRAIGHT_HEADING  = 90.0;  // target compass heading when going straight
const float STRAIGHT_TOL      = 5.0;   // ± dead-band in degrees
const int   CORRECTION_DIFF   = 30;    // PWM reduction applied to the drifting side
bool        straightCorrection = true; // enable / disable at runtime via command
unsigned long lastCorrectionMs = 0;

// ── Turn target: both TURN_LEFT and TURN_RIGHT stop here via shortest path
const float TURN_TARGET     = 270.0;
const float HEADING_TOL     =   5.0;
const int   DEFAULT_TURN_SPEED = 120; // fallback speed when caller passes 0
const unsigned long TURN_TIMEOUT_MS = 10000; // max time for a single turn

FaBo9Axis fabo_9axis;

// ── Forward declarations
void sendImuPacket();
float readHeadingDeg();
float angleDiffDeg(float fromDeg, float toDeg);

// ---------- Motor primitives ----------
void emergencyStop() {
  analogWrite(LEFT_RPWM, 0);  analogWrite(LEFT_LPWM, 0);
  analogWrite(RIGHT_RPWM, 0); analogWrite(RIGHT_LPWM, 0);
  currentSpeed = 0;
  currentDir = 0;
  Serial.println("!! EMERGENCY STOP !!");
}

void stopMotors() {
  analogWrite(LEFT_RPWM, 0);  analogWrite(LEFT_LPWM, 0);
  analogWrite(RIGHT_RPWM, 0); analogWrite(RIGHT_LPWM, 0);
  currentSpeed = 0;
  currentDir = 0;
  Serial.println("Motors stopped.");
}

void setForward(int speed) {
  analogWrite(LEFT_LPWM, 0);      analogWrite(RIGHT_LPWM, 0);
  analogWrite(LEFT_RPWM, speed);  analogWrite(RIGHT_RPWM, speed);
}

void setBackward(int speed) {
  analogWrite(LEFT_RPWM, 0);      analogWrite(RIGHT_RPWM, 0);
  analogWrite(LEFT_LPWM, speed);  analogWrite(RIGHT_LPWM, speed);
}

void spinRight(int speed) {
  analogWrite(LEFT_LPWM, 0);     analogWrite(LEFT_RPWM, speed);
  analogWrite(RIGHT_RPWM, 0);    analogWrite(RIGHT_LPWM, speed);
}

void spinLeft(int speed) {
  analogWrite(LEFT_RPWM, 0);     analogWrite(LEFT_LPWM, speed);
  analogWrite(RIGHT_LPWM, 0);    analogWrite(RIGHT_RPWM, speed);
}

// ---------- Ramp helpers (stream IMU during ramp) ----------
void rampDown() {
  if (currentDir == 0) return;
  unsigned long stepDelay = RAMP_TIME / RAMP_STEPS;
  for (int i = RAMP_STEPS; i >= 0; i--) {
    int speed = (i * currentSpeed) / RAMP_STEPS;
    if (currentDir == 1) setForward(speed);
    else                 setBackward(speed);

    unsigned long now = millis();
    if (now - lastImuTime >= imuInterval) {
      lastImuTime = now;
      sendImuPacket();
    }
    delay(stepDelay);
  }
  stopMotors();
}

void rampTo(int dir, int targetSpeed) {
  unsigned long stepDelay = RAMP_TIME / RAMP_STEPS;

  if (currentDir != 0 && currentDir != dir) {
    rampDown();
    delay(200);
  }

  for (int i = 0; i <= RAMP_STEPS; i++) {
    int speed = (i * targetSpeed) / RAMP_STEPS;
    if (dir == 1) setForward(speed);
    else          setBackward(speed);

    unsigned long now = millis();
    if (now - lastImuTime >= imuInterval) {
      lastImuTime = now;
      sendImuPacket();
    }
    delay(stepDelay);
  }

  currentSpeed = targetSpeed;
  currentDir = dir;
}

// ---------- IMU helpers ----------
float readHeadingDeg() {
  float mx, my, mz;
  fabo_9axis.readMagnetXYZ(&mx, &my, &mz);
  float heading = atan2(my, mx) * 180.0 / PI;
  if (heading < 0) heading += 360.0;
  return heading;
}

// Returns signed shortest-arc difference: positive = CW, negative = CCW
float angleDiffDeg(float fromDeg, float toDeg) {
  float d = toDeg - fromDeg;
  while (d >  180.0) d -= 360.0;
  while (d < -180.0) d += 360.0;
  return d;
}

// Send one IMU packet: IMU,ax,ay,az,gx,gy,gz,heading
void sendImuPacket() {
  float ax, ay, az, gx, gy, gz;
  fabo_9axis.readAccelXYZ(&ax, &ay, &az);
  fabo_9axis.readGyroXYZ(&gx, &gy, &gz);
  float heading = readHeadingDeg();

  Serial.print("IMU,");
  Serial.print(ax, 3); Serial.print(",");
  Serial.print(ay, 3); Serial.print(",");
  Serial.print(az, 3); Serial.print(",");
  Serial.print(gx, 3); Serial.print(",");
  Serial.print(gy, 3); Serial.print(",");
  Serial.print(gz, 3); Serial.print(",");
  Serial.println(heading, 2);
}

// ---------- Turn to heading (shortest path, no extra spins) ----------
// Spins until heading is within HEADING_TOL of targetDeg.
// Direction is chosen each iteration to guarantee the shortest arc —
// this prevents "3-spin" overshoots that occur when a fixed direction
// is used and the robot starts near or past the target.
void turnToHeading(int speed, float targetDeg) {
  if (speed < 1) speed = DEFAULT_TURN_SPEED;

  const unsigned long TIMEOUT_MS = TURN_TIMEOUT_MS;

  if (currentDir != 0) rampDown();
  delay(150);

  float startH = readHeadingDeg();
  Serial.print("Turn start heading: "); Serial.println(startH);
  Serial.print("Turn target heading: "); Serial.println(targetDeg);

  unsigned long tStart = millis();

  while (true) {
    float nowH = readHeadingDeg();
    float diff = angleDiffDeg(nowH, targetDeg); // + → CW, - → CCW

    if (abs(diff) <= HEADING_TOL) break;

    // Always take the shorter arc — prevents over-rotation
    if (diff > 0) spinRight(speed);
    else          spinLeft(speed);

    // Stream IMU live during the turn
    unsigned long now = millis();
    if (now - lastImuTime >= imuInterval) {
      lastImuTime = now;
      sendImuPacket();
    }

    if (millis() - tStart > TIMEOUT_MS) {
      Serial.println("Turn timeout.");
      break;
    }
    delay(10);
  }

  stopMotors();
  delay(100);

  float endH = readHeadingDeg();
  Serial.print("Turn end heading: "); Serial.println(endH);
}

// ---------- Command handling ----------
void handleCommand(String cmd) {
  cmd.trim();
  cmd.toUpperCase();

  if (cmd == "S") {
    emergencyStop();
    return;
  }

  if (cmd == "STOP") {
    if (currentDir == 0) Serial.println("Already stopped.");
    else rampDown();
    return;
  }

  // IMU_STREAM [interval_ms]
  if (cmd == "IMU_STREAM" || cmd.startsWith("IMU_STREAM ")) {
    if (cmd.length() > 11) {
      int ms = cmd.substring(11).toInt();
      if (ms >= 20 && ms <= 2000) imuInterval = ms;
    }
    imuStreaming = true;
    Serial.print("IMU streaming started @ ");
    Serial.print(imuInterval);
    Serial.println(" ms");
    return;
  }

  if (cmd == "IMU_STOP") {
    imuStreaming = false;
    Serial.println("IMU streaming stopped.");
    return;
  }

  if (cmd == "IMU_READ") {
    sendImuPacket();
    return;
  }

  // SET_SPEED <0-255>
  if (cmd.startsWith("SET_SPEED ")) {
    int speed = cmd.substring(10).toInt();
    if (speed < 0 || speed > 255) {
      Serial.println("ERROR: Speed must be 0-255.");
      return;
    }
    if (currentDir == 1)      setForward(speed);
    else if (currentDir == -1) setBackward(speed);
    currentSpeed = speed;
    Serial.print("Speed set to "); Serial.println(speed);
    return;
  }

  // FORWARD <speed> / BACKWARD <speed>
  // After ramping, loop() applies continuous heading correction toward STRAIGHT_HEADING.
  if (cmd.startsWith("FORWARD ") || cmd.startsWith("BACKWARD ")) {
    int spaceIdx = cmd.indexOf(' ');
    String dirStr = cmd.substring(0, spaceIdx);
    int speed = cmd.substring(spaceIdx + 1).toInt();

    if (speed < 0 || speed > 255) {
      Serial.println("ERROR: Speed must be 0-255.");
      return;
    }

    int dir = (dirStr == "FORWARD") ? 1 : -1;
    rampTo(dir, speed);
    Serial.print(dirStr);
    Serial.print(" @ "); Serial.print(speed);
    Serial.print(" | straight="); Serial.print(STRAIGHT_HEADING); Serial.println("deg");
    return;
  }

  // TURN_LEFT <speed>  — stop at TURN_TARGET via shortest path
  if (cmd.startsWith("TURN_LEFT ")) {
    int speed = cmd.substring(10).toInt();
    if (speed < 1 || speed > 255) {
      Serial.println("ERROR: Speed must be 1-255.");
      return;
    }
    turnToHeading(speed, TURN_TARGET);
    return;
  }

  // TURN_RIGHT <speed> — stop at TURN_TARGET via shortest path
  if (cmd.startsWith("TURN_RIGHT ")) {
    int speed = cmd.substring(11).toInt();
    if (speed < 1 || speed > 255) {
      Serial.println("ERROR: Speed must be 1-255.");
      return;
    }
    turnToHeading(speed, TURN_TARGET);
    return;
  }

  Serial.println("Unknown command.");
  Serial.println("Commands:");
  Serial.println("  FORWARD <0-255>    (heading-corrected, target=90deg)");
  Serial.println("  BACKWARD <0-255>   (heading-corrected, target=90deg)");
  Serial.println("  SET_SPEED <0-255>");
  Serial.println("  TURN_LEFT <1-255>  (shortest path to 270deg)");
  Serial.println("  TURN_RIGHT <1-255> (shortest path to 270deg)");
  Serial.println("  STOP | S");
  Serial.println("  IMU_STREAM [interval_ms]");
  Serial.println("  IMU_STOP");
  Serial.println("  IMU_READ");
}

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(100);

  pinMode(LEFT_RPWM, OUTPUT);  pinMode(LEFT_LPWM, OUTPUT);
  pinMode(LEFT_R_EN, OUTPUT);  pinMode(LEFT_L_EN, OUTPUT);
  pinMode(RIGHT_RPWM, OUTPUT); pinMode(RIGHT_LPWM, OUTPUT);
  pinMode(RIGHT_R_EN, OUTPUT); pinMode(RIGHT_L_EN, OUTPUT);

  stopMotors();

  digitalWrite(LEFT_R_EN, HIGH);  digitalWrite(LEFT_L_EN, HIGH);
  digitalWrite(RIGHT_R_EN, HIGH); digitalWrite(RIGHT_L_EN, HIGH);

  Wire.begin();
  Serial.println("configuring 9axis...");
  if (fabo_9axis.begin()) {
    Serial.println("configured FaBo 9Axis I2C Brick");
  } else {
    Serial.println("device error");
    while (1);
  }

  Serial.println("Ready.");
}

void loop() {
  // ── Non-blocking background IMU stream
  if (imuStreaming) {
    unsigned long now = millis();
    if (now - lastImuTime >= imuInterval) {
      lastImuTime = now;
      sendImuPacket();
    }
  }

  // ── Non-blocking straight-line heading correction
  // Runs every 50 ms while a FORWARD or BACKWARD motion is active.
  // Reduces PWM on the drifting side to steer back to STRAIGHT_HEADING.
  if (straightCorrection && currentDir != 0) {
    unsigned long now = millis();
    if (now - lastCorrectionMs >= 50) {
      lastCorrectionMs = now;

      float heading = readHeadingDeg();
      // diff > 0: heading is CCW of target → steer CW (right) → slow right motor
      // diff < 0: heading is CW of target  → steer CCW (left) → slow left motor
      float err = angleDiffDeg(heading, STRAIGHT_HEADING);

      if (abs(err) > STRAIGHT_TOL) {
        int corrSpeed = max(0, currentSpeed - CORRECTION_DIFF);

        if (err > 0) {
          // Steer right: slow right motor
          if (currentDir == 1) {
            analogWrite(LEFT_LPWM,  0); analogWrite(LEFT_RPWM,  currentSpeed);
            analogWrite(RIGHT_LPWM, 0); analogWrite(RIGHT_RPWM, corrSpeed);
          } else {
            analogWrite(LEFT_RPWM,  0); analogWrite(LEFT_LPWM,  currentSpeed);
            analogWrite(RIGHT_RPWM, 0); analogWrite(RIGHT_LPWM, corrSpeed);
          }
        } else {
          // Steer left: slow left motor
          if (currentDir == 1) {
            analogWrite(LEFT_LPWM,  0); analogWrite(LEFT_RPWM,  corrSpeed);
            analogWrite(RIGHT_LPWM, 0); analogWrite(RIGHT_RPWM, currentSpeed);
          } else {
            analogWrite(LEFT_RPWM,  0); analogWrite(LEFT_LPWM,  corrSpeed);
            analogWrite(RIGHT_RPWM, 0); analogWrite(RIGHT_LPWM, currentSpeed);
          }
        }
      } else {
        // On course — restore equal speeds
        if (currentDir == 1) setForward(currentSpeed);
        else                  setBackward(currentSpeed);
      }
    }
  }

  // ── Serial command reader
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    handleCommand(cmd);
  }
}
