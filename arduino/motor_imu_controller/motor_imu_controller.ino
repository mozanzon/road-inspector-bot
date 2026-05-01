#include <Wire.h>
#include <FaBo9Axis_MPU9250.h>

// ── LEFT Motor (M1)
const int LEFT_RPWM = 5,  LEFT_LPWM = 6,  LEFT_R_EN = 7,  LEFT_L_EN = 8;

// ── RIGHT Motor (M2)
const int RIGHT_RPWM = 9, RIGHT_LPWM = 10, RIGHT_R_EN = 11, RIGHT_L_EN = 12;

const int RAMP_STEPS = 50;
const unsigned long RAMP_TIME = 800;

// ── Differential drive kinematics (for EKF Pure Pursuit CMD)
const float WHEEL_TRACK    = 0.60;  // meters between wheel contact patches
const float HALF_TRACK     = WHEEL_TRACK / 2.0;  // 0.30 m
const float MAX_LINEAR_MS  = 1.0;   // m/s at PWM=255 (calibrate per robot)
const float PWM_PER_MS     = 255.0 / MAX_LINEAR_MS;
const float WHEEL_DIAMETER_M = 0.32;  // wheel diameter in meters (32 cm, confirmed)
const float WHEEL_RADIUS_M = WHEEL_DIAMETER_M / 2.0;
const float TICKS_PER_REV  = 600.0; // encoder ticks per revolution (verify by measurement)

// Per-wheel trim factors to compensate hardware speed mismatch
// Calibrate: FORWARD 200, observe which wheel runs faster,
// reduce its trim via TRIM,left,right command (e.g. TRIM,1.0,0.92)
float leftTrim  = 1.0;
float rightTrim = 1.0;

// ── Wheel PID control (closed-loop speed control for CMD,v,omega)
const unsigned long PID_INTERVAL_MS = 20;  // 50 Hz
float pidKp = 200.0;
float pidKi = 35.0;
float pidKd = 2.5;
const float PID_INTEGRAL_LIMIT = 2.0;
const float PID_TARGET_DEADBAND_MS = 0.01;

// ── Heading PID for accurate turns (replaces bang-bang spin)
float turnKp = 3.0;
float turnKi = 0.05;
float turnKd = 0.8;
const float TURN_INTEGRAL_LIMIT = 50.0;
const int   TURN_MIN_PWM = 60;
const int   TURN_MAX_PWM = 180;

int currentSpeed = 0;
int currentDir   = 0; // 1=fwd, -1=back, 0=stop

// ── IMU streaming state
bool imuStreaming = false;
unsigned long imuInterval = 100;   // ms between IMU packets (default 10 Hz)
unsigned long lastImuTime  = 0;    // previous IMU packet timestamp (for dt_ms field)
unsigned long lastImuSchedule = 0; // scheduler timestamp for periodic streaming
const float IMU_FRAME_ROTATION_DEG = 90.0;  // +90° IMU->robot frame alignment

FaBo9Axis fabo_9axis;

// ── Encoder pins (quadrature, X1 encoding on channel A rising edge)
//     ENC2_B moved to pin 13 to avoid conflict with LEFT_RPWM (pin 5)
const int ENC1_A = 2;   // Interrupt pin (INT0)
const int ENC1_B = 4;
const int ENC2_A = 3;   // Interrupt pin (INT1)
const int ENC2_B = 13;  // Was pin 5 in draft — moved to avoid LEFT_RPWM conflict

volatile long encoder1_count = 0;
volatile long encoder2_count = 0;

// Snapshot values (read atomically in loop)
long enc1_snapshot = 0;
long enc2_snapshot = 0;
long enc1_delta    = 0;  // ticks since last stream packet
long enc2_delta    = 0;

// ── Non-blocking turn state machine
enum TurnState { TURN_IDLE, TURN_RAMP_DOWN, TURN_SETTLE, TURN_SPINNING, TURN_DONE };
TurnState turnState = TURN_IDLE;

// Turn parameters (set when a turn command starts)
int    turnDir       = 0;      // +1=cw, -1=ccw
int    turnSpeed     = 0;
float  turnTargetDeg = 0.0;
float  turnRequestedDeg = 90.0;
float  turnProgressDeg = 0.0;
float  turnLastHeadingDeg = 0.0;
bool   turnProgressValid = false;
int    turnRampStep  = 0;
unsigned long turnStepStart    = 0;   // for ramp-down settle timing
unsigned long turnSpinStart    = 0;   // absolute start of spinning (for timeout)
unsigned long turnLastCheck    = 0;   // last heading check time (for 10ms interval)
unsigned long turnTimeout      = 10000;
const float TURN_HEADING_TOL = 2.0;  // tightened for PID-controlled turns
float turnIntegral  = 0.0;
float turnPrevError = 0.0;
const unsigned long TURN_MIN_SPIN_MS = 80;

// ── Non-blocking ramp state machine (for FORWARD/BACKWARD)
enum RampState { RAMP_IDLE, RAMP_RAMPING };
RampState rampState = RAMP_IDLE;
int       rampDir   = 0;
int       rampTargetSpeed = 0;
int       rampStep  = 0;
unsigned long rampStepStart = 0;

struct WheelPidState {
  float integral;
  float prevError;
};

WheelPidState pidLeft = {0.0, 0.0};
WheelPidState pidRight = {0.0, 0.0};
bool pidEnabled = false;
float targetLeftMs = 0.0;
float targetRightMs = 0.0;
unsigned long lastPidTick = 0;
long pidPrevEnc1 = 0;
long pidPrevEnc2 = 0;

void disablePidControl();
void setPidTargets(float leftMs, float rightMs);
bool pidTick();

// ---------- Encoder ISRs ----------
void ISR_encoder1() {
  if (digitalRead(ENC1_B) == HIGH) { encoder1_count++; }
  else { encoder1_count--; }
}

void ISR_encoder2() {
  if (digitalRead(ENC2_B) == HIGH) { encoder2_count++; }
  else { encoder2_count--; }
}

// ---------- Motor primitives ----------
void emergencyStop() {
  disablePidControl();
  analogWrite(LEFT_RPWM, 0);  analogWrite(LEFT_LPWM, 0);
  analogWrite(RIGHT_RPWM, 0); analogWrite(RIGHT_LPWM, 0);
  currentSpeed = 0;
  currentDir = 0;
  // Reset all state machines
  turnState = TURN_IDLE;
  rampState = RAMP_IDLE;
  turnProgressDeg = 0.0;
  turnProgressValid = false;
  Serial.println("!! EMERGENCY STOP !!");
}

void stopMotors() {
  disablePidControl();
  analogWrite(LEFT_RPWM, 0);  analogWrite(LEFT_LPWM, 0);
  analogWrite(RIGHT_RPWM, 0); analogWrite(RIGHT_LPWM, 0);
  currentSpeed = 0;
  currentDir = 0;
  turnState = TURN_IDLE;
  rampState = RAMP_IDLE;
  turnProgressDeg = 0.0;
  turnProgressValid = false;
  Serial.println("Motors stopped.");
}

void cancelTurnAndRampForDriveCommand() {
  if (turnState != TURN_IDLE || rampState != RAMP_IDLE) {
    stopMotors();
  }
  turnState = TURN_IDLE;
  rampState = RAMP_IDLE;
  turnProgressDeg = 0.0;
  turnProgressValid = false;
}

void setForward(int speed) {
  int leftPwm  = constrain((int)(speed * leftTrim + 0.5), 0, 255);
  int rightPwm = constrain((int)(speed * rightTrim + 0.5), 0, 255);
  analogWrite(LEFT_LPWM, 0);        analogWrite(RIGHT_LPWM, 0);
  analogWrite(LEFT_RPWM, leftPwm);  analogWrite(RIGHT_RPWM, rightPwm);
}

void setBackward(int speed) {
  int leftPwm  = constrain((int)(speed * leftTrim + 0.5), 0, 255);
  int rightPwm = constrain((int)(speed * rightTrim + 0.5), 0, 255);
  analogWrite(LEFT_RPWM, 0);        analogWrite(RIGHT_RPWM, 0);
  analogWrite(LEFT_LPWM, leftPwm);  analogWrite(RIGHT_LPWM, rightPwm);
}

// Independent wheel control for differential drive (EKF Pure Pursuit)
void setForwardDiff(int leftSpeed, int rightSpeed) {
  leftSpeed  = constrain(leftSpeed, 0, 255);
  rightSpeed = constrain(rightSpeed, 0, 255);
  analogWrite(LEFT_LPWM, 0);       analogWrite(RIGHT_LPWM, 0);
  analogWrite(LEFT_RPWM, leftSpeed);  analogWrite(RIGHT_RPWM, rightSpeed);
}

void setBackwardDiff(int leftSpeed, int rightSpeed) {
  leftSpeed  = constrain(leftSpeed, 0, 255);
  rightSpeed = constrain(rightSpeed, 0, 255);
  analogWrite(LEFT_RPWM, 0);       analogWrite(RIGHT_RPWM, 0);
  analogWrite(LEFT_LPWM, leftSpeed);  analogWrite(RIGHT_LPWM, rightSpeed);
}

void spinRight(int speed) {
  analogWrite(LEFT_LPWM, 0);     analogWrite(LEFT_RPWM, speed);
  analogWrite(RIGHT_RPWM, 0);    analogWrite(RIGHT_LPWM, speed);
}

void spinLeft(int speed) {
  analogWrite(LEFT_RPWM, 0);     analogWrite(LEFT_LPWM, speed);
  analogWrite(RIGHT_LPWM, 0);    analogWrite(RIGHT_RPWM, speed);
}

// ---------- Wheel PID helpers ----------
void resetPidState() {
  pidLeft.integral = 0.0;
  pidLeft.prevError = 0.0;
  pidRight.integral = 0.0;
  pidRight.prevError = 0.0;
}

void disablePidControl() {
  pidEnabled = false;
  targetLeftMs = 0.0;
  targetRightMs = 0.0;
  resetPidState();
}

void setPidTargets(float leftMs, float rightMs) {
  if (leftMs > MAX_LINEAR_MS) leftMs = MAX_LINEAR_MS;
  if (leftMs < -MAX_LINEAR_MS) leftMs = -MAX_LINEAR_MS;
  if (rightMs > MAX_LINEAR_MS) rightMs = MAX_LINEAR_MS;
  if (rightMs < -MAX_LINEAR_MS) rightMs = -MAX_LINEAR_MS;

  bool resetNeeded = !pidEnabled;
  if (!resetNeeded) {
    if ((leftMs >= 0.0 && targetLeftMs < 0.0) || (leftMs < 0.0 && targetLeftMs >= 0.0)) resetNeeded = true;
    if ((rightMs >= 0.0 && targetRightMs < 0.0) || (rightMs < 0.0 && targetRightMs >= 0.0)) resetNeeded = true;
  }

  targetLeftMs = leftMs;
  targetRightMs = rightMs;

  if (resetNeeded) {
    noInterrupts();
    pidPrevEnc1 = encoder1_count;
    pidPrevEnc2 = encoder2_count;
    interrupts();
    lastPidTick = millis();
    resetPidState();
  }

  pidEnabled = true;
}

int computePidPwm(WheelPidState &pid, float targetAbsMs, float measuredAbsMs, float dtSec) {
  if (targetAbsMs <= PID_TARGET_DEADBAND_MS || dtSec <= 0.0) {
    pid.integral = 0.0;
    pid.prevError = 0.0;
    return 0;
  }

  float error = targetAbsMs - measuredAbsMs;
  pid.integral += error * dtSec;
  if (pid.integral > PID_INTEGRAL_LIMIT) pid.integral = PID_INTEGRAL_LIMIT;
  if (pid.integral < -PID_INTEGRAL_LIMIT) pid.integral = -PID_INTEGRAL_LIMIT;

  float derivative = (error - pid.prevError) / dtSec;
  float control = (pidKp * error) + (pidKi * pid.integral) + (pidKd * derivative);
  if (control < 0.0) control = 0.0;
  if (control > 255.0) control = 255.0;

  pid.prevError = error;
  return (int)(control + 0.5);
}

void applySignedWheelPwm(int leftPwm, int rightPwm, bool leftForward, bool rightForward) {
  if (leftForward && rightForward) {
    setForwardDiff(leftPwm, rightPwm);
    currentDir = (leftPwm > 0 || rightPwm > 0) ? 1 : 0;
    return;
  }
  if (!leftForward && !rightForward) {
    setBackwardDiff(leftPwm, rightPwm);
    currentDir = (leftPwm > 0 || rightPwm > 0) ? -1 : 0;
    return;
  }

  if (leftForward && !rightForward) {
    analogWrite(LEFT_LPWM, 0);   analogWrite(LEFT_RPWM, leftPwm);
    analogWrite(RIGHT_RPWM, 0);  analogWrite(RIGHT_LPWM, rightPwm);
  } else {
    analogWrite(LEFT_RPWM, 0);   analogWrite(LEFT_LPWM, leftPwm);
    analogWrite(RIGHT_LPWM, 0);  analogWrite(RIGHT_RPWM, rightPwm);
  }
  currentDir = 0;
}

bool pidTick() {
  if (!pidEnabled) return false;

  unsigned long now = millis();
  if (now - lastPidTick < PID_INTERVAL_MS) return true;

  float dtSec = (now - lastPidTick) / 1000.0;
  if (dtSec <= 0.0) return true;
  lastPidTick = now;

  noInterrupts();
  long c1 = encoder1_count;
  long c2 = encoder2_count;
  interrupts();

  long d1 = c1 - pidPrevEnc1;
  long d2 = c2 - pidPrevEnc2;
  pidPrevEnc1 = c1;
  pidPrevEnc2 = c2;

  float wheelCirc = 2.0 * PI * WHEEL_RADIUS_M;
  long d1Abs = (d1 >= 0) ? d1 : -d1;
  long d2Abs = (d2 >= 0) ? d2 : -d2;
  float leftMeasuredAbsMs = ((float)d1Abs / TICKS_PER_REV) * wheelCirc / dtSec;
  float rightMeasuredAbsMs = ((float)d2Abs / TICKS_PER_REV) * wheelCirc / dtSec;

  float leftTargetAbs = (targetLeftMs >= 0.0) ? targetLeftMs : -targetLeftMs;
  float rightTargetAbs = (targetRightMs >= 0.0) ? targetRightMs : -targetRightMs;

  int leftPwm = computePidPwm(pidLeft, leftTargetAbs, leftMeasuredAbsMs, dtSec);
  int rightPwm = computePidPwm(pidRight, rightTargetAbs, rightMeasuredAbsMs, dtSec);

  bool leftForward = targetLeftMs >= 0.0;
  bool rightForward = targetRightMs >= 0.0;
  applySignedWheelPwm(leftPwm, rightPwm, leftForward, rightForward);
  currentSpeed = max(leftPwm, rightPwm);
  return true;
}

// ---------- IMU helpers ----------
void rotateImuFrameXY(float &x, float &y) {
  const float rotRad = IMU_FRAME_ROTATION_DEG * PI / 180.0;
  const float xRot = x * cos(rotRad) - y * sin(rotRad);
  const float yRot = x * sin(rotRad) + y * cos(rotRad);
  x = xRot;
  y = yRot;
}

float readHeadingDeg() {
  float mx, my, mz;
  fabo_9axis.readMagnetXYZ(&mx, &my, &mz);
  rotateImuFrameXY(mx, my);
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

// Send combined IMU + Encoder packet over Serial as a single CSV line:
// IMU,ax,ay,az,gx,gy,gz,heading,enc1_delta,enc2_delta,dt_ms,enc1_total,enc2_total
void sendImuPacket() {
  float ax, ay, az, gx, gy, gz;
  fabo_9axis.readAccelXYZ(&ax, &ay, &az);
  rotateImuFrameXY(ax, ay);
  fabo_9axis.readGyroXYZ(&gx, &gy, &gz);
  rotateImuFrameXY(gx, gy);
  float heading = readHeadingDeg();

  // Atomic encoder snapshot + delta calculation
  noInterrupts();
  long c1 = encoder1_count;
  long c2 = encoder2_count;
  interrupts();
  enc1_delta = c1 - enc1_snapshot;
  enc2_delta = c2 - enc2_snapshot;
  enc1_snapshot = c1;
  enc2_snapshot = c2;

  unsigned long now = millis();
  unsigned long dtMs = now - lastImuTime;
  lastImuTime = now;

  Serial.print("IMU,");
  Serial.print(ax, 3); Serial.print(",");
  Serial.print(ay, 3); Serial.print(",");
  Serial.print(az, 3); Serial.print(",");
  Serial.print(gx, 3); Serial.print(",");
  Serial.print(gy, 3); Serial.print(",");
  Serial.print(gz, 3); Serial.print(",");
  Serial.print(heading, 2); Serial.print(",");
  Serial.print(enc1_delta); Serial.print(",");
  Serial.print(enc2_delta); Serial.print(",");
  Serial.print(dtMs); Serial.print(",");
  Serial.print(c1); Serial.print(",");
  Serial.println(c2);
}

void sendPidPacket() {
  Serial.print("PID,");
  Serial.print(pidKp, 4); Serial.print(",");
  Serial.print(pidKi, 4); Serial.print(",");
  Serial.println(pidKd, 4);
}

// ── Non-blocking turn state machine tick — call every loop()
// Returns true while a turn is in progress, false when idle.
bool turnTick() {
  unsigned long now = millis();
  unsigned long stepDelay = RAMP_TIME / RAMP_STEPS;

  switch (turnState) {

    case TURN_IDLE:
      return false;

    case TURN_RAMP_DOWN: {
      if (now - turnStepStart < stepDelay) return true;
      int speed = (turnRampStep * currentSpeed) / RAMP_STEPS;
      if (currentDir == 1) setForward(speed);
      else setBackward(speed);
      turnRampStep--;
      turnStepStart = now;
      if (turnRampStep < 0) {
        stopMotors();
        turnState = TURN_SETTLE;
        turnStepStart = now;
      }
      return true;
    }

    case TURN_SETTLE:
      if (now - turnStepStart >= 150) {
        float startH = readHeadingDeg();
        Serial.print("Turn start heading: "); Serial.println(startH);
        Serial.print("Turn target heading: "); Serial.println(turnTargetDeg);
        turnProgressDeg = 0.0;
        turnLastHeadingDeg = startH;
        turnProgressValid = true;
        turnIntegral  = 0.0;
        turnPrevError = turnRequestedDeg;
        turnState      = TURN_SPINNING;
        turnSpinStart  = millis();
        turnLastCheck  = millis();
      }
      return true;

    case TURN_SPINNING: {
      // Heading PID — check every ~10ms
      if (now - turnLastCheck < 10) return true;
      turnLastCheck = now;

      float nowH = readHeadingDeg();
      if (!turnProgressValid) {
        turnProgressDeg = 0.0;
        turnLastHeadingDeg = nowH;
        turnProgressValid = true;
      }
      float stepDeg = angleDiffDeg(turnLastHeadingDeg, nowH);
      turnLastHeadingDeg = nowH;
      turnProgressDeg += (-stepDeg * turnDir);
      if (turnProgressDeg < 0.0) turnProgressDeg = 0.0;

      float remainingDeg = turnRequestedDeg - turnProgressDeg;
      bool reachedTarget = turnProgressDeg >= turnRequestedDeg;
      bool withinTol = abs(remainingDeg) <= TURN_HEADING_TOL;

      if ((reachedTarget || withinTol) && (now - turnSpinStart >= TURN_MIN_SPIN_MS)) {
        stopMotors();
        turnIntegral = 0.0;
        turnPrevError = 0.0;
        Serial.print("Turn complete. End heading: "); Serial.println(nowH);
        Serial.print("Turn progress: "); Serial.print(turnProgressDeg, 1); Serial.println(" deg");
        turnState = TURN_DONE;
        return false;
      }

      if (now - turnSpinStart > turnTimeout) {
        stopMotors();
        turnIntegral = 0.0;
        turnPrevError = 0.0;
        Serial.println("Turn timeout.");
        turnState = TURN_DONE;
        return false;
      }

      // ── Heading PID: modulate spin speed from remaining degrees
      float dtSec = 0.01;
      float error = remainingDeg;
      turnIntegral += error * dtSec;
      if (turnIntegral > TURN_INTEGRAL_LIMIT) turnIntegral = TURN_INTEGRAL_LIMIT;
      if (turnIntegral < -TURN_INTEGRAL_LIMIT) turnIntegral = -TURN_INTEGRAL_LIMIT;
      float derivative = (error - turnPrevError) / dtSec;
      turnPrevError = error;
      float pidOut = (turnKp * error) + (turnKi * turnIntegral) + (turnKd * derivative);
      int spinPwm = constrain((int)(pidOut + 0.5), TURN_MIN_PWM, TURN_MAX_PWM);

      if (turnDir == 1) spinRight(spinPwm);
      else spinLeft(spinPwm);

      return true;
    }

    case TURN_DONE:
      turnState = TURN_IDLE;
      return false;
  }
  return false;
}

// ── Non-blocking ramp state machine tick — call every loop()
bool rampTick() {
  if (rampState == RAMP_IDLE) return false;

  unsigned long now = millis();
  unsigned long stepDelay = RAMP_TIME / RAMP_STEPS;

  if (now - rampStepStart < stepDelay) return true;

  int speed = (rampStep * rampTargetSpeed) / RAMP_STEPS;
  if (rampDir == 1) setForward(speed);
  else setBackward(speed);

  rampStep++;
  rampStepStart = now;

  if (rampStep > RAMP_STEPS) {
    currentSpeed = rampTargetSpeed;
    currentDir = rampDir;
    rampState = RAMP_IDLE;
    return false;
  }
  return true;
}

// ── Start a non-blocking turn — returns immediately
// dir: +1 right(cw), -1 left(ccw)
void startTurn(int dir, int speed) {
  disablePidControl();
  cancelTurnAndRampForDriveCommand();

  if (speed < 1) speed = 120;

  turnDir   = dir;
  turnSpeed = speed;
  turnRequestedDeg = 90.0;
  turnProgressDeg = 0.0;
  turnProgressValid = false;
  turnIntegral  = 0.0;
  turnPrevError = 0.0;

  // Calculate relative target heading: ±90° from current
  float currentH = readHeadingDeg();
  turnTargetDeg = currentH - (dir * turnRequestedDeg);
  if (turnTargetDeg >= 360.0) turnTargetDeg -= 360.0;
  if (turnTargetDeg < 0.0)    turnTargetDeg += 360.0;

  Serial.print("Turn from heading: "); Serial.println(currentH);
  Serial.print("Turn target heading: "); Serial.println(turnTargetDeg);

  if (currentDir != 0) {
    // Begin ramp-down phase
    turnRampStep  = RAMP_STEPS;
    turnStepStart = millis();
    turnState     = TURN_RAMP_DOWN;
  } else {
    // Skip ramp-down, go straight to settle then spin
    turnState     = TURN_SETTLE;
    turnStepStart = millis();
  }
}

// ---------- Command handling ----------
void handleCommand(String cmd) {
  cmd.trim();

  // CMD,v,omega — Pure Pursuit differential drive command
  // Must check BEFORE toUpperCase() because v/omega are floats
  if (cmd.startsWith("CMD") || cmd.startsWith("cmd")) {
    int firstComma = cmd.indexOf(',');
    int secondComma = cmd.indexOf(',', firstComma + 1);
    if (firstComma < 0 || secondComma < 0) {
      Serial.println("ERROR: CMD format is CMD,v,omega");
      return;
    }
    float v       = cmd.substring(firstComma + 1, secondComma).toFloat();
    float omega   = cmd.substring(secondComma + 1).toFloat();

    // Differential drive kinematics
    float v_left  = v - omega * HALF_TRACK;  // m/s
    float v_right = v + omega * HALF_TRACK;  // m/s

    // Cancel any active turn or ramp
    cancelTurnAndRampForDriveCommand();
    setPidTargets(v_left, v_right);
    return;
  }

  // PID_SET,kp,ki,kd — runtime PID tuning
  if (cmd.startsWith("PID_SET") || cmd.startsWith("pid_set")) {
    int firstComma = cmd.indexOf(',');
    int secondComma = cmd.indexOf(',', firstComma + 1);
    int thirdComma = cmd.indexOf(',', secondComma + 1);
    if (firstComma < 0 || secondComma < 0 || thirdComma < 0) {
      Serial.println("ERROR: PID_SET format is PID_SET,kp,ki,kd");
      return;
    }
    float newKp = cmd.substring(firstComma + 1, secondComma).toFloat();
    float newKi = cmd.substring(secondComma + 1, thirdComma).toFloat();
    float newKd = cmd.substring(thirdComma + 1).toFloat();
    if (newKp <= 0.0 || newKi < 0.0 || newKd < 0.0) {
      Serial.println("ERROR: PID requires kp>0, ki>=0, kd>=0");
      return;
    }
    pidKp = newKp;
    pidKi = newKi;
    pidKd = newKd;
    resetPidState();
    Serial.println("PID updated.");
    sendPidPacket();
    return;
  }

  // PID_GET — report current PID gains
  if (cmd == "PID_GET" || cmd == "pid_get") {
    sendPidPacket();
    return;
  }

  // TRIM,left,right — set per-wheel PWM trim factors
  if (cmd.startsWith("TRIM,") || cmd.startsWith("trim,")) {
    int c1 = cmd.indexOf(',');
    int c2 = cmd.indexOf(',', c1 + 1);
    if (c1 < 0 || c2 < 0) {
      Serial.println("ERROR: format is TRIM,left,right (e.g. TRIM,1.0,0.92)");
      return;
    }
    float newL = cmd.substring(c1 + 1, c2).toFloat();
    float newR = cmd.substring(c2 + 1).toFloat();
    if (newL < 0.5 || newL > 1.5 || newR < 0.5 || newR > 1.5) {
      Serial.println("ERROR: Trim must be 0.5–1.5");
      return;
    }
    leftTrim = newL;
    rightTrim = newR;
    Serial.print("TRIM,"); Serial.print(leftTrim, 3);
    Serial.print(","); Serial.println(rightTrim, 3);
    return;
  }

  // TRIM_GET — report current trim
  if (cmd == "TRIM_GET" || cmd == "trim_get") {
    Serial.print("TRIM,"); Serial.print(leftTrim, 3);
    Serial.print(","); Serial.println(rightTrim, 3);
    return;
  }

  // TURN_SET,kp,ki,kd — tune heading PID for turns
  if (cmd.startsWith("TURN_SET,") || cmd.startsWith("turn_set,")) {
    int c1 = cmd.indexOf(',');
    int c2 = cmd.indexOf(',', c1 + 1);
    int c3 = cmd.indexOf(',', c2 + 1);
    if (c1 < 0 || c2 < 0 || c3 < 0) {
      Serial.println("ERROR: TURN_SET,kp,ki,kd");
      return;
    }
    float nKp = cmd.substring(c1 + 1, c2).toFloat();
    float nKi = cmd.substring(c2 + 1, c3).toFloat();
    float nKd = cmd.substring(c3 + 1).toFloat();
    if (nKp <= 0.0 || nKi < 0.0 || nKd < 0.0) {
      Serial.println("ERROR: kp>0, ki>=0, kd>=0");
      return;
    }
    turnKp = nKp; turnKi = nKi; turnKd = nKd;
    turnIntegral = 0.0; turnPrevError = 0.0;
    Serial.print("TURN_PID,"); Serial.print(turnKp, 4);
    Serial.print(","); Serial.print(turnKi, 4);
    Serial.print(","); Serial.println(turnKd, 4);
    return;
  }

  // TURN_GET — report heading PID gains
  if (cmd == "TURN_GET" || cmd == "turn_get") {
    Serial.print("TURN_PID,"); Serial.print(turnKp, 4);
    Serial.print(","); Serial.print(turnKi, 4);
    Serial.print(","); Serial.println(turnKd, 4);
    return;
  }

  cmd.toUpperCase();

  // Emergency stop — always works, even mid-turn
  if (cmd == "S") {
    emergencyStop();
    return;
  }

  if (cmd == "STOP") {
    if (currentDir == 0 && turnState == TURN_IDLE) Serial.println("Already stopped.");
    else stopMotors();
    return;
  }

  // IMU_STREAM [interval_ms]  — start streaming IMU data
  if (cmd == "IMU_STREAM" || cmd.startsWith("IMU_STREAM ")) {
    if (cmd.length() > 11) {
      int ms = cmd.substring(11).toInt();
      if (ms >= 20 && ms <= 2000) imuInterval = ms;
    }
    unsigned long now = millis();
    lastImuSchedule = now;
    lastImuTime = now;
    imuStreaming = true;
    Serial.print("IMU streaming started @ ");
    Serial.print(imuInterval);
    Serial.println(" ms");
    return;
  }

  // IMU_STOP — stop streaming
  if (cmd == "IMU_STOP") {
    imuStreaming = false;
    Serial.println("IMU streaming stopped.");
    return;
  }

  // IMU_READ — single one-shot IMU read
  if (cmd == "IMU_READ") {
    sendImuPacket();
    return;
  }

  // ENC_RESET — zero encoder counters
  if (cmd == "ENC_RESET") {
    noInterrupts();
    encoder1_count = 0;
    encoder2_count = 0;
    enc1_snapshot  = 0;
    enc2_snapshot  = 0;
    interrupts();
    Serial.println("Encoder counters reset.");
    return;
  }

  // SET_SPEED <0-255> — update currentSpeed without changing direction
  if (cmd.startsWith("SET_SPEED ")) {
    disablePidControl();

    int speed = cmd.substring(10).toInt();
    if (speed < 0 || speed > 255) {
      Serial.println("ERROR: Speed must be 0-255.");
      return;
    }
    if (currentDir == 1) setForward(speed);
    else if (currentDir == -1) setBackward(speed);
    currentSpeed = speed;
    Serial.print("Speed set to "); Serial.println(speed);
    return;
  }

  // FORWARD / BACKWARD — start non-blocking ramp
  if (cmd.startsWith("FORWARD ") || cmd.startsWith("BACKWARD ")) {
    disablePidControl();
    cancelTurnAndRampForDriveCommand();

    int spaceIdx = cmd.indexOf(' ');
    String dirStr = cmd.substring(0, spaceIdx);
    int dir = (dirStr == "FORWARD") ? 1 : -1;
    int speed = cmd.substring(spaceIdx + 1).toInt();

    if (speed < 0 || speed > 255) {
      Serial.println("ERROR: Speed must be 0-255.");
      return;
    }

    rampDir   = dir;
    rampTargetSpeed = speed;
    rampStep  = 0;
    rampStepStart = millis();
    rampState = RAMP_RAMPING;
    return;
  }

  // TURN_LEFT_90 — turn left 90° relative to current heading
  if (cmd.startsWith("TURN_LEFT_90 ")) {
    int speed = cmd.substring(13).toInt();
    if (speed < 1 || speed > 255) {
      Serial.println("ERROR: Speed must be 1-255.");
      return;
    }
    startTurn(-1, speed);
    return;
  }

  // TURN_RIGHT_90 — turn right 90° relative to current heading
  if (cmd.startsWith("TURN_RIGHT_90 ")) {
    int speed = cmd.substring(14).toInt();
    if (speed < 1 || speed > 255) {
      Serial.println("ERROR: Speed must be 1-255.");
      return;
    }
    startTurn(1, speed);
    return;
  }

  Serial.println("Unknown command.");
  Serial.println("Commands:");
  Serial.println("  FORWARD <0-255>  | BACKWARD <0-255>");
  Serial.println("  SET_SPEED <0-255> | STOP | S");
  Serial.println("  TURN_LEFT_90 <1-255> | TURN_RIGHT_90 <1-255>");
  Serial.println("  CMD,<v>,<omega>   — differential drive");
  Serial.println("  TRIM,<left>,<right> | TRIM_GET");
  Serial.println("  PID_SET,<kp>,<ki>,<kd> | PID_GET");
  Serial.println("  TURN_SET,<kp>,<ki>,<kd> | TURN_GET");
  Serial.println("  IMU_STREAM [ms] | IMU_STOP | IMU_READ");
  Serial.println("  ENC_RESET");
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

  // ── Encoder pins
  pinMode(ENC1_A, INPUT_PULLUP);
  pinMode(ENC1_B, INPUT_PULLUP);
  pinMode(ENC2_A, INPUT_PULLUP);
  pinMode(ENC2_B, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(ENC1_A), ISR_encoder1, RISING);
  attachInterrupt(digitalPinToInterrupt(ENC2_A), ISR_encoder2, RISING);

  Wire.begin();
  Serial.println("configuring 9axis...");
  if (fabo_9axis.begin()) {
    Serial.println("configured FaBo 9Axis I2C Brick");
  } else {
    Serial.println("device error");
    while (1);
  }

  // ── Auto-start IMU streaming for autonomous/EKF operation
  imuStreaming = true;
  lastImuTime = millis();
  lastImuSchedule = lastImuTime;
  Serial.print("IMU streaming auto-started @ ");
  Serial.print(imuInterval);
  Serial.println(" ms");
  sendPidPacket();

  Serial.println("Ready.");
}

void loop() {
  // ── Non-blocking IMU streaming
  if (imuStreaming) {
    unsigned long now = millis();
    if (now - lastImuSchedule >= imuInterval) {
      lastImuSchedule = now;
      sendImuPacket();
    }
  }

  // ── Non-blocking ramp state machine
  rampTick();

  // ── Non-blocking turn state machine
  turnTick();

  // ── Wheel PID control (CMD,v,omega)
  pidTick();

  // ── Serial command handling (always runs — even during turns)
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    handleCommand(cmd);
  }
}
