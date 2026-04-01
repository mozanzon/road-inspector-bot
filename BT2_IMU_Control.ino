// ============================================================
//  BTS7960 Dual Motor Driver – Serial Command Control + MPU-9250
//  Target : Arduino Mega
//  Motor 1 = LEFT  | Motor 2 = RIGHT
//  IMU    : MPU-9250 on I2C (SDA=20, SCL=21 on Mega)
//
//  Commands (received over Serial @ 115200):
//    FORWARD <speed>       both motors forward
//    BACKWARD <speed>      both motors backward
//    ROTATE_LEFT <speed>   spin CCW until 180° reached (IMU-guided)
//    ROTATE_RIGHT <speed>  spin CW  until 180° reached (IMU-guided)
//    STOP                  smooth ramp-down
//    S                     EMERGENCY STOP
//    AUTO <speed>          fwd 2s → 180° spin → fwd 2s → stop
//
//  Serial output every loop:
//    STATUS,<yaw>,<roll>,<pitch>,<ax>,<ay>,<az>,<gx>,<gy>,<gz>,<dir>,<speed>
//
//  Libraries needed (install via Library Manager):
//    MPU9250_asukiaaa by asukiaaa
//    Wire (built-in)
// ============================================================

#include <Wire.h>
#include <MPU9250_asukiaaa.h>

// ── BTS7960 Pins ────────────────────────────────────────────
const int LEFT_RPWM  = 5,  LEFT_LPWM  = 6;
const int LEFT_R_EN  = 7,  LEFT_L_EN  = 8;
const int RIGHT_RPWM = 9,  RIGHT_LPWM = 10;
const int RIGHT_R_EN = 11, RIGHT_L_EN = 12;

// ── Ramp config ─────────────────────────────────────────────
const int           RAMP_STEPS = 50;
const unsigned long RAMP_TIME  = 800;   // ms

// ── IMU ─────────────────────────────────────────────────────
MPU9250_asukiaaa mpu;

// We store a gyroZ offset (deg/s) measured during calibration.
float gyroZ_offset = 0;    // calibrated zero offset for gyroZ (deg/s)
float yaw          = 0;    // integrated yaw in degrees
float roll         = 0;
float pitch        = 0;
unsigned long lastIMUTime = 0;

// ── Motor state ─────────────────────────────────────────────
int currentSpeed = 0;
int currentDir   = 0;   // 1=forward, -1=backward, 0=stopped

// ── Rotation state ──────────────────────────────────────────
bool  rotating      = false;
float yawTarget     = 0;
int   rotateDir     = 0;   // +1 = CW (right), -1 = CCW (left)
int   rotateSpeed   = 0;

// ── Status report timer ─────────────────────────────────────
unsigned long lastStatusMs = 0;
const unsigned long STATUS_INTERVAL = 50;  // 20Hz status reports

// ── Helper: read all 9 axes via MPU9250_asukiaaa ───────────
// Fills: ax,ay,az in [g]   gx,gy,gz in [deg/s]   mx,my,mz (unused)
void readIMURaw(float &ax, float &ay, float &az,
                float &gx, float &gy, float &gz) {
  mpu.accelUpdate();
  mpu.gyroUpdate();
  
  ax = mpu.accelX();
  ay = mpu.accelY();
  az = mpu.accelZ();
  
  gx = mpu.gyroX();
  gy = mpu.gyroY();
  gz = mpu.gyroZ();
}

// ============================================================
//  IMU CALIBRATION – average gyroZ at rest
// ============================================================
void calibrateIMU() {
  Serial.println("Calibrating IMU – keep robot still...");
  double sum = 0;
  const int samples = 500;
  for (int i = 0; i < samples; i++) {
    float ax, ay, az, gx, gy, gz;
    readIMURaw(ax, ay, az, gx, gy, gz);
    sum += gz;
    delay(2);
  }
  gyroZ_offset = (float)(sum / samples);
  yaw   = 0;
  roll  = 0;
  pitch = 0;
  Serial.print("Calibration done. gyroZ offset = ");
  Serial.println(gyroZ_offset);
}

// ============================================================
//  IMU UPDATE – call as fast as possible in loop
// ============================================================
void updateIMU() {
  unsigned long now = micros();
  float dt = (now - lastIMUTime) / 1e6f;
  lastIMUTime = now;
  if (dt <= 0 || dt > 0.5) return;  // skip bad dt

  float fax, fay, faz, fgx, fgy, fgz;
  readIMURaw(fax, fay, faz, fgx, fgy, fgz);
  // fax/fay/faz are already in [g]; fgx/fgy/fgz already in [deg/s]

  // ── Remove gyroZ bias ──────────────────────────────────
  float gz_dps = fgz - gyroZ_offset;

  // ── Integrate yaw ──────────────────────────────────────
  yaw += gz_dps * dt;

  // ── Complementary filter for roll/pitch ────────────────
  float accRoll  =  atan2(fay, faz)                            * RAD_TO_DEG;
  float accPitch = -atan2(fax, sqrt(fay*fay + faz*faz))        * RAD_TO_DEG;
  roll  = 0.98f * (roll  + fgx * dt) + 0.02f * accRoll;
  pitch = 0.98f * (pitch + fgy * dt) + 0.02f * accPitch;

  // ── Check if rotation target reached ───────────────────
  if (rotating) {
    float delta = yaw - yawTarget;
    // Normalise delta to -180..180
    while (delta >  180) delta -= 360;
    while (delta < -180) delta += 360;

    bool done = (rotateDir == 1  && delta >= 0)
             || (rotateDir == -1 && delta <= 0);

    if (done) {
      stopMotors();
      rotating  = false;
      rotateDir = 0;
      Serial.println("ROTATE_DONE");
    }
  }
}

// ============================================================
//  MOTOR PRIMITIVES
// ============================================================
void emergencyStop() {
  analogWrite(LEFT_RPWM,  0); analogWrite(LEFT_LPWM,  0);
  analogWrite(RIGHT_RPWM, 0); analogWrite(RIGHT_LPWM, 0);
  currentSpeed = 0; currentDir = 0;
  rotating     = false;
  Serial.println("!! EMERGENCY STOP !!");
}

void stopMotors() {
  analogWrite(LEFT_RPWM,  0); analogWrite(LEFT_LPWM,  0);
  analogWrite(RIGHT_RPWM, 0); analogWrite(RIGHT_LPWM, 0);
  currentSpeed = 0; currentDir = 0;
  rotating     = false;
  Serial.println("STOPPED");
}

void setForward(int spd) {
  analogWrite(LEFT_LPWM,  0); analogWrite(RIGHT_LPWM, 0);
  analogWrite(LEFT_RPWM,  spd); analogWrite(RIGHT_RPWM, spd);
}

void setBackward(int spd) {
  analogWrite(LEFT_RPWM,  0); analogWrite(RIGHT_RPWM, 0);
  analogWrite(LEFT_LPWM,  spd); analogWrite(RIGHT_LPWM, spd);
}

// spinRight → left motor fwd, right motor bwd (CW from above)
void spinRight(int spd) {
  analogWrite(LEFT_LPWM,  0);   analogWrite(LEFT_RPWM,  spd);
  analogWrite(RIGHT_RPWM, 0);   analogWrite(RIGHT_LPWM, spd);
}

// spinLeft → left motor bwd, right motor fwd (CCW from above)
void spinLeft(int spd) {
  analogWrite(LEFT_RPWM,  0);   analogWrite(LEFT_LPWM,  spd);
  analogWrite(RIGHT_LPWM, 0);   analogWrite(RIGHT_RPWM, spd);
}

// ============================================================
//  RAMP
// ============================================================
void rampDown() {
  if (currentDir == 0) return;
  unsigned long stepDelay = RAMP_TIME / RAMP_STEPS;
  for (int i = RAMP_STEPS; i >= 0; i--) {
    int spd = (i * currentSpeed) / RAMP_STEPS;
    if (currentDir == 1) setForward(spd);
    else                 setBackward(spd);
    delay(stepDelay);
  }
  stopMotors();
}

void rampTo(int dir, int targetSpeed) {
  unsigned long stepDelay = RAMP_TIME / RAMP_STEPS;
  if (currentDir != 0 && currentDir != dir) {
    rampDown();
    delay(300);
  }
  for (int i = 0; i <= RAMP_STEPS; i++) {
    int spd = (i * targetSpeed) / RAMP_STEPS;
    if (dir == 1) setForward(spd);
    else          setBackward(spd);
    delay(stepDelay);
  }
  currentSpeed = targetSpeed;
  currentDir   = dir;
  Serial.println("RUNNING");
}

// ============================================================
//  IMU-GUIDED 180° ROTATION
//  Sets a yaw target ±180° from current yaw, then lets
//  updateIMU() stop the motors when the target is reached.
// ============================================================
void startRotate(int dir, int spd) {
  // dir: +1 = rotate right (CW), -1 = rotate left (CCW)
  rotating     = true;
  rotateDir    = dir;
  rotateSpeed  = spd;
  yawTarget    = yaw + (dir * 180.0f);

  Serial.print("ROTATING ");
  Serial.print(dir == 1 ? "RIGHT" : "LEFT");
  Serial.print(" | target yaw = ");
  Serial.println(yawTarget);

  if (dir == 1) spinRight(spd);
  else          spinLeft(spd);
}

// ============================================================
//  AUTO SEQUENCE
// ============================================================
void autoSequence(int spd) {
  Serial.println("AUTO_START");
  rampTo(1, spd);
  delay(2000);
  rampDown();
  delay(200);
  startRotate(1, spd);
  // Wait for rotation to complete (blocking for AUTO mode)
  unsigned long t0 = millis();
  while (rotating && millis() - t0 < 5000) {
    updateIMU();
    delay(5);
  }
  delay(200);
  rampTo(1, spd);
  delay(2000);
  rampDown();
  Serial.println("AUTO_DONE");
}

// ============================================================
//  COMMAND PARSER
// ============================================================
void handleCommand(String cmd) {
  cmd.trim();
  cmd.toUpperCase();

  if (cmd == "S") {
    emergencyStop();

  } else if (cmd == "STOP") {
    if (currentDir == 0 && !rotating) Serial.println("Already stopped.");
    else { rotating = false; rampDown(); }

  } else if (cmd == "RECALIBRATE") {
    stopMotors();
    calibrateIMU();

  } else if (cmd.startsWith("ROTATE_LEFT ") || cmd.startsWith("ROTATE_RIGHT ")) {
    int   spaceIdx = cmd.indexOf(' ');
    int   spd      = cmd.substring(spaceIdx + 1).toInt();
    int   dir      = cmd.startsWith("ROTATE_LEFT") ? -1 : 1;
    if (spd < 1 || spd > 255) { Serial.println("ERROR: Speed 1-255"); return; }
    if (rotating) { stopMotors(); delay(100); }
    startRotate(dir, spd);

  } else if (cmd.startsWith("FORWARD ") || cmd.startsWith("BACKWARD ")) {
    rotating = false;
    int    spaceIdx = cmd.indexOf(' ');
    String dirStr   = cmd.substring(0, spaceIdx);
    int    spd      = cmd.substring(spaceIdx + 1).toInt();
    if (spd < 0 || spd > 255) { Serial.println("ERROR: Speed 0-255"); return; }
    int dir = (dirStr == "FORWARD") ? 1 : -1;
    rampTo(dir, spd);

  } else if (cmd.startsWith("AUTO ")) {
    int spd = cmd.substring(5).toInt();
    if (spd < 1 || spd > 255) { Serial.println("ERROR: Speed 1-255"); return; }
    autoSequence(spd);

  } else if (cmd.length() > 0) {
    Serial.println("UNKNOWN_CMD");
  }
}

// ============================================================
//  SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  Serial.setTimeout(100);

  // Motor pins
  pinMode(LEFT_RPWM,  OUTPUT); pinMode(LEFT_LPWM,  OUTPUT);
  pinMode(LEFT_R_EN,  OUTPUT); pinMode(LEFT_L_EN,  OUTPUT);
  pinMode(RIGHT_RPWM, OUTPUT); pinMode(RIGHT_LPWM, OUTPUT);
  pinMode(RIGHT_R_EN, OUTPUT); pinMode(RIGHT_L_EN, OUTPUT);

  digitalWrite(LEFT_R_EN,  HIGH); digitalWrite(LEFT_L_EN,  HIGH);
  digitalWrite(RIGHT_R_EN, HIGH); digitalWrite(RIGHT_L_EN, HIGH);
  stopMotors();

  // IMU – MPU9250_asukiaaa
  Wire.begin();
  mpu.setWire(&Wire);
  mpu.beginAccel();
  mpu.beginGyro();
  mpu.beginMag();
  
  Serial.println("IMU_OK");
  lastIMUTime = micros();
  calibrateIMU();

  Serial.println("READY");
  Serial.println("FORMAT: STATUS,yaw,roll,pitch,ax,ay,az,gx,gy,gz,dir,speed");
}

// ============================================================
//  LOOP
// ============================================================
void loop() {
  // ── IMU update (runs every loop, as fast as possible) ──
  updateIMU();

  // ── Serial command ─────────────────────────────────────
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    handleCommand(cmd);
  }

  // ── Status broadcast @ 20Hz ────────────────────────────
  unsigned long now = millis();
  if (now - lastStatusMs >= STATUS_INTERVAL) {
    lastStatusMs = now;

    float fax, fay, faz, fgx, fgy, fgz;
    readIMURaw(fax, fay, faz, fgx, fgy, fgz);
    // accel already in [g], gyro already in [deg/s]

    Serial.print("STATUS,");
    Serial.print(yaw,   2); Serial.print(",");
    Serial.print(roll,  2); Serial.print(",");
    Serial.print(pitch, 2); Serial.print(",");
    Serial.print(fax,   3); Serial.print(",");
    Serial.print(fay,   3); Serial.print(",");
    Serial.print(faz,   3); Serial.print(",");
    Serial.print(fgx,   2); Serial.print(",");
    Serial.print(fgy,   2); Serial.print(",");
    Serial.print(fgz,   2); Serial.print(",");
    Serial.print(currentDir);  Serial.print(",");
    Serial.println(currentSpeed);
  }
}
