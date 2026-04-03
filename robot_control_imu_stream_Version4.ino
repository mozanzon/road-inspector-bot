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

FaBo9Axis fabo_9axis;

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

void spinRight(int speed) { // clockwise
  analogWrite(LEFT_LPWM, 0);     analogWrite(LEFT_RPWM, speed);
  analogWrite(RIGHT_RPWM, 0);    analogWrite(RIGHT_LPWM, speed);
}

void spinLeft(int speed) { // counter-clockwise
  analogWrite(LEFT_RPWM, 0);     analogWrite(LEFT_LPWM, speed);
  analogWrite(RIGHT_LPWM, 0);    analogWrite(RIGHT_RPWM, speed);
}

void rampDown() {
  if (currentDir == 0) return;
  unsigned long stepDelay = RAMP_TIME / RAMP_STEPS;
  for (int i = RAMP_STEPS; i >= 0; i--) {
    int speed = (i * currentSpeed) / RAMP_STEPS;
    if (currentDir == 1) setForward(speed);
    else setBackward(speed);
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
    else setBackward(speed);
    delay(stepDelay);
  }

  currentSpeed = targetSpeed;
  currentDir = dir;
}

// ---------- IMU helpers (magnetometer heading) ----------
float readHeadingDeg() {
  float mx, my, mz;
  fabo_9axis.readMagnetXYZ(&mx, &my, &mz);

  float heading = atan2(my, mx) * 180.0 / PI;
  if (heading < 0) heading += 360.0;
  return heading;
}

float angleDiffDeg(float fromDeg, float toDeg) {
  float d = toDeg - fromDeg;
  while (d > 180.0) d -= 360.0;
  while (d < -180.0) d += 360.0;
  return d;
}

// dir: +1 right(cw), -1 left(ccw)
void turn180WithIMU(int dir, int speed) {
  if (speed < 1) speed = 120;

  if (currentDir != 0) rampDown();
  delay(150);

  float start = readHeadingDeg();
  Serial.print("Turn start heading: "); Serial.println(start);

  unsigned long tStart = millis();
  const unsigned long TIMEOUT_MS = 6000;

  while (true) {
    float nowH = readHeadingDeg();
    float delta = angleDiffDeg(start, nowH);
    float turned = abs(delta);

    if (turned >= 175.0) break;

    if (dir == 1) spinRight(speed);
    else spinLeft(speed);

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
    return;
  }

  if (cmd.startsWith("TURN_LEFT_180 ")) {
    int speed = cmd.substring(14).toInt();
    if (speed < 1 || speed > 255) {
      Serial.println("ERROR: Speed must be 1-255.");
      return;
    }
    turn180WithIMU(-1, speed);
    return;
  }

  if (cmd.startsWith("TURN_RIGHT_180 ")) {
    int speed = cmd.substring(15).toInt();
    if (speed < 1 || speed > 255) {
      Serial.println("ERROR: Speed must be 1-255.");
      return;
    }
    turn180WithIMU(1, speed);
    return;
  }

  Serial.println("Unknown command.");
  Serial.println("FORWARD <0-255>");
  Serial.println("BACKWARD <0-255>");
  Serial.println("TURN_LEFT_180 <1-255>");
  Serial.println("TURN_RIGHT_180 <1-255>");
  Serial.println("STOP");
  Serial.println("S");
}

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(100); // FIX: was 10000ms — that long a timeout blocks readStringUntil()
                          // and causes commands to queue up silently. 100ms is plenty.

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
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    handleCommand(cmd);
  }
}
