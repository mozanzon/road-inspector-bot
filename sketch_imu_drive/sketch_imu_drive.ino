/*
 * Road Inspector Bot — Motor + IMU Sketch
 * =========================================
 *   L298N motor control (unchanged pinout)
 * + MPU9250 IMU via I2C (Mega: SDA=20, SCL=21)
 *
 * Library dependency: MPU9250  (install via Arduino Library Manager)
 *   by hideakitai — https://github.com/hideakitai/MPU9250
 *
 * Serial protocol (115200 baud):
 *   Commands IN  (from RPi / host):
 *     F [0-255]    forward (latched until S/new mode)
 *     B [0-255]    backward (latched until S/new mode)
 *     L [0-255]    one-shot 90° left turn using yaw PID, then stop
 *     R [0-255]    one-shot 90° right turn using yaw PID, then stop
 *     S            stop
 *     SPD <0-255>  set default speed
 *     IMU          print single IMU reading
 *     STREAM ON    start continuous telemetry (~20 Hz)
 *     STREAM OFF   stop continuous telemetry
 *     STATUS       print current state JSON
 *     HELP         list commands
 *
 *   Yaw PID (single PID controller):
 *     PID ON|OFF
 *     PID KP/KI/KD <val>
 *     PID STATUS
 *
 *   Data OUT (JSON lines):
 *     {"t":"imu","yaw":0.0,"pitch":0.0,"roll":0.0,"yaw_rate":0.0,"turn_dir":"NONE","ax":0.0,"ay":0.0,"az":0.0,"temp":0.0,"ms":12345}
 *     {"t":"ack","cmd":"F","spd":140}
 *     {"t":"status","spd":140,"stream":true,"imu_ok":true,"pid":true,"motion":"FWD","yaw_target":12.3}
 *     {"t":"pid","on":true,"kp":2.2,"ki":0.01,"kd":0.35,"yaw":10.3,"target":12.3,"err":2.0,"corr":8,"mode":"FWD"}
 *     {"t":"err","msg":"..."}
 */

#include <Wire.h>
#include "MPU9250.h"
#include <ctype.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <stdio.h>

// ── LEFT Motor (M1) ──────────────────────────────────────
const int LEFT_RPWM  = 5;
const int LEFT_LPWM  = 6;
const int LEFT_R_EN  = 7;
const int LEFT_L_EN  = 8;

// ── RIGHT Motor (M2) ─────────────────────────────────────
const int RIGHT_RPWM = 9;
const int RIGHT_LPWM = 10;
const int RIGHT_R_EN = 11;
const int RIGHT_L_EN = 12;

// ── Encoder pins (kept for layout compatibility) ─────────
const int ENC1_A = 2;
const int ENC1_B = 4;
const int ENC2_A = 3;
const int ENC2_B = 13;

enum MotionMode : uint8_t {
  MOTION_STOP = 0,
  MOTION_FORWARD,
  MOTION_BACKWARD,
  MOTION_TURN_LEFT,
  MOTION_TURN_RIGHT,
  MOTION_TURN_LEFT_MOVING,
  MOTION_TURN_RIGHT_MOVING
};

// ── State ────────────────────────────────────────────────
int       defaultSpeed      = 140;
int       motionSpeed       = 140;
int       turnCommandSpeed  = 140;
int       turnBaseSignedSpeed = 0;
bool      streamEnabled     = false;
bool      imuReady          = false;
MotionMode motionMode       = MOTION_STOP;

// ── Timing ───────────────────────────────────────────────
const unsigned long STREAM_INTERVAL_MS = 50;   // 20 Hz
const unsigned long CONTROL_INTERVAL_MS = 20;  // 50 Hz control loop
unsigned long lastStreamMs  = 0;
unsigned long lastControlMs = 0;

// Turn completion rules
const float TURN_TOLERANCE_DEG = 2.5f;
const uint8_t TURN_STABLE_COUNT = 5;     // 5 * 20ms = 100ms in tolerance
const unsigned long TURN_TIMEOUT_MS = 5000;
uint8_t turnStableSamples = 0;
unsigned long turnStartMs = 0;

// ── MPU9250 instance + yaw state ─────────────────────────
MPU9250 mpu;
float currentYawDeg = 0.0f;
float yawRateDegPerSec = 0.0f;
float lastYawSampleDeg = 0.0f;
unsigned long lastYawSampleMs = 0;
float rawYawUnwrappedDeg = 0.0f;
float lastRawYawWrappedDeg = 0.0f;
bool rawYawSeeded = false;

// Yaw drift calibration state
bool yawCalibrated = false;
float yawBiasRateDegPerSec = 0.0f;
unsigned long yawCalRefMs = 0;
float filteredYawDeg = 0.0f;
bool yawFilterSeeded = false;
float filtPitchDeg = 0.0f;
float filtRollDeg = 0.0f;
float filtAx = 0.0f;
float filtAy = 0.0f;
float filtAz = 0.0f;
float filtTempC = 0.0f;
bool telemFilterSeeded = false;

// ── Yaw PID (single PID controller) ──────────────────────
struct PID {
  float Kp = 2.2f;
  float Ki = 0.010f;
  float Kd = 0.35f;
  float setpoint = 0.0f;
  float integral = 0.0f;
  float prevError = 0.0f;
  unsigned long prevTimeMs = 0;
  bool enabled = true;
};

PID yawPID;
int lastYawPidOutput = 0;

// Safety limits
const float YAW_DEAD_ZONE      = 1.0f;   // ignore tiny heading noise
const float YAW_INTEGRAL_LIMIT = 120.0f;
const int   YAW_HOLD_CORR_MAX  = 70;     // ±PWM while driving F/B
const int   TURN_PID_OUT_MAX   = 220;    // ±PWM before min/max turn shaping
const int   TURN_MIN_PWM       = 85;     // enough to break static friction
const int   TURN_MAX_PWM       = 220;
const float TURN_DIR_RATE_THRESHOLD = 4.0f;
const unsigned long YAW_CAL_DURATION_MS = 1800;
const unsigned long YAW_CAL_SAMPLE_MS = 10;
const float YAW_FILTER_ALPHA = 0.25f;
const float IMU_TELEM_FILTER_ALPHA = 0.20f;

float wrapAngle180(float deg) {
  while (deg > 180.0f) deg -= 360.0f;
  while (deg <= -180.0f) deg += 360.0f;
  return deg;
}

float angleErrorDeg(float target, float current) {
  return wrapAngle180(target - current);
}

const char* motionModeToStr(MotionMode mode) {
  switch (mode) {
    case MOTION_FORWARD: return "FWD";
    case MOTION_BACKWARD: return "BWD";
    case MOTION_TURN_LEFT: return "TURN_L";
    case MOTION_TURN_RIGHT: return "TURN_R";
    case MOTION_TURN_LEFT_MOVING: return "TURN_L_MOV";
    case MOTION_TURN_RIGHT_MOVING: return "TURN_R_MOV";
    default: return "STOP";
  }
}

const char* turnDirFromRate(float yawRate) {
  if (yawRate > TURN_DIR_RATE_THRESHOLD) return "LEFT";
  if (yawRate < -TURN_DIR_RATE_THRESHOLD) return "RIGHT";
  return "NONE";
}

void resetYawPID() {
  yawPID.integral = 0.0f;
  yawPID.prevError = 0.0f;
  yawPID.prevTimeMs = millis();
  lastYawPidOutput = 0;
}

bool refreshIMUState() {
  if (!imuReady) return false;

  mpu.update();
  const float rawYawWrapped = wrapAngle180(mpu.getYaw());
  const unsigned long now = millis();

  if (!rawYawSeeded) {
    rawYawSeeded = true;
    rawYawUnwrappedDeg = rawYawWrapped;
    lastRawYawWrappedDeg = rawYawWrapped;
  } else {
    rawYawUnwrappedDeg += wrapAngle180(rawYawWrapped - lastRawYawWrappedDeg);
    lastRawYawWrappedDeg = rawYawWrapped;
  }

  float yawNow = rawYawUnwrappedDeg;
  if (yawCalibrated) {
    float elapsed = (now - yawCalRefMs) / 1000.0f;
    yawNow = rawYawUnwrappedDeg - (yawBiasRateDegPerSec * elapsed);
  }
  yawNow = wrapAngle180(yawNow);

  if (!yawFilterSeeded) {
    filteredYawDeg = yawNow;
    yawFilterSeeded = true;
  } else {
    filteredYawDeg = wrapAngle180(filteredYawDeg + (YAW_FILTER_ALPHA * angleErrorDeg(yawNow, filteredYawDeg)));
  }

  const float pitchRaw = mpu.getPitch();
  const float rollRaw = mpu.getRoll();
  const float axRaw = mpu.getAccX();
  const float ayRaw = mpu.getAccY();
  const float azRaw = mpu.getAccZ();
  const float tempRaw = mpu.getTemperature();

  if (!telemFilterSeeded) {
    filtPitchDeg = pitchRaw;
    filtRollDeg = rollRaw;
    filtAx = axRaw;
    filtAy = ayRaw;
    filtAz = azRaw;
    filtTempC = tempRaw;
    telemFilterSeeded = true;
  } else {
    filtPitchDeg = (1.0f - IMU_TELEM_FILTER_ALPHA) * filtPitchDeg + IMU_TELEM_FILTER_ALPHA * pitchRaw;
    filtRollDeg = (1.0f - IMU_TELEM_FILTER_ALPHA) * filtRollDeg + IMU_TELEM_FILTER_ALPHA * rollRaw;
    filtAx = (1.0f - IMU_TELEM_FILTER_ALPHA) * filtAx + IMU_TELEM_FILTER_ALPHA * axRaw;
    filtAy = (1.0f - IMU_TELEM_FILTER_ALPHA) * filtAy + IMU_TELEM_FILTER_ALPHA * ayRaw;
    filtAz = (1.0f - IMU_TELEM_FILTER_ALPHA) * filtAz + IMU_TELEM_FILTER_ALPHA * azRaw;
    filtTempC = (1.0f - IMU_TELEM_FILTER_ALPHA) * filtTempC + IMU_TELEM_FILTER_ALPHA * tempRaw;
  }

  if (lastYawSampleMs != 0) {
    float dt = (now - lastYawSampleMs) / 1000.0f;
    if (dt > 0.001f) {
      float dy = wrapAngle180(filteredYawDeg - lastYawSampleDeg);
      float rawRate = dy / dt;
      // light smoothing for UI readability
      yawRateDegPerSec = (0.7f * yawRateDegPerSec) + (0.3f * rawRate);
    }
  }

  currentYawDeg = filteredYawDeg;
  lastYawSampleDeg = filteredYawDeg;
  lastYawSampleMs = now;
  return true;
}

bool runYawCalibration(bool fromCommand) {
  if (!imuReady) {
    sendError("IMU not available");
    return false;
  }

  if (fromCommand && motionMode != MOTION_STOP) {
    sendError("YAW CAL requires STOP");
    return false;
  }

  if (fromCommand) sendInfo("YAW calibration started; keep robot still");

  float sumDelta = 0.0f;
  float prevRaw = 0.0f;
  bool havePrev = false;
  const unsigned long startMs = millis();
  unsigned long samples = 0;

  while ((millis() - startMs) < YAW_CAL_DURATION_MS) {
    mpu.update();
    float raw = wrapAngle180(mpu.getYaw());
    if (havePrev) {
      sumDelta += wrapAngle180(raw - prevRaw);
      samples++;
    } else {
      havePrev = true;
    }
    prevRaw = raw;
    delay(YAW_CAL_SAMPLE_MS);
  }

  const float durationSec = (millis() - startMs) / 1000.0f;
  if (durationSec <= 0.2f || samples < 20) {
    sendError("YAW CAL failed");
    return false;
  }

  yawBiasRateDegPerSec = sumDelta / durationSec;

  rawYawSeeded = false;
  yawFilterSeeded = false;
  telemFilterSeeded = false;
  refreshIMUState();
  yawCalRefMs = millis();
  yawCalibrated = true;

  resetYawPID();
  yawPID.setpoint = currentYawDeg;

  if (fromCommand) {
    char msg[64];
    snprintf(msg, sizeof(msg), "YAW CAL done bias=%.3f deg/s", yawBiasRateDegPerSec);
    sendInfo(msg);
  }
  return true;
}

int computeYawPID(float yawNow, int maxAbsOutput) {
  if (!yawPID.enabled || !imuReady) {
    lastYawPidOutput = 0;
    return 0;
  }

  const unsigned long now = millis();
  float dt = (now - yawPID.prevTimeMs) / 1000.0f;
  if (dt < 0.001f) dt = 0.001f;

  const float error = angleErrorDeg(yawPID.setpoint, yawNow);

  if (fabs(error) < YAW_DEAD_ZONE) {
    yawPID.integral = 0.0f;
  } else {
    yawPID.integral += error * dt;
    if (yawPID.integral > YAW_INTEGRAL_LIMIT) yawPID.integral = YAW_INTEGRAL_LIMIT;
    if (yawPID.integral < -YAW_INTEGRAL_LIMIT) yawPID.integral = -YAW_INTEGRAL_LIMIT;
  }

  const float derivative = (error - yawPID.prevError) / dt;
  yawPID.prevError = error;
  yawPID.prevTimeMs = now;

  const float output = (yawPID.Kp * error)
                     + (yawPID.Ki * yawPID.integral)
                     + (yawPID.Kd * derivative);

  lastYawPidOutput = (int)constrain(output, -maxAbsOutput, maxAbsOutput);
  return lastYawPidOutput;
}

// ═══════════════════════════════════════════════════════════
//  Utility: parse byte value from string
// ═══════════════════════════════════════════════════════════
bool parseByteValue(const char* text, int& out) {
  while (*text == ' ') text++;
  if (*text == '\0') return false;
  char* endPtr = nullptr;
  long value = strtol(text, &endPtr, 10);
  while (*endPtr == ' ') endPtr++;
  if (*endPtr != '\0' || value < 0 || value > 255) return false;
  out = (int)value;
  return true;
}

// ═══════════════════════════════════════════════════════════
//  Motor helpers
// ═══════════════════════════════════════════════════════════
void setMotor(int forwardPin, int backwardPin, int signedSpeed) {
  signedSpeed = constrain(signedSpeed, -255, 255);
  if (signedSpeed > 0) {
    analogWrite(forwardPin, signedSpeed);
    analogWrite(backwardPin, 0);
  } else if (signedSpeed < 0) {
    analogWrite(forwardPin, 0);
    analogWrite(backwardPin, -signedSpeed);
  } else {
    analogWrite(forwardPin, 0);
    analogWrite(backwardPin, 0);
  }
}

void drive(int left, int right) {
  setMotor(LEFT_RPWM, LEFT_LPWM, left);
  setMotor(RIGHT_RPWM, RIGHT_LPWM, right);
}

void enableDriver() {
  digitalWrite(LEFT_R_EN,  HIGH);
  digitalWrite(RIGHT_R_EN, HIGH);
  digitalWrite(LEFT_L_EN,  HIGH);
  digitalWrite(RIGHT_L_EN, HIGH);
}

void sendAck(const char* cmd, int spd) {
  Serial.print(F("{\"t\":\"ack\",\"cmd\":\""));
  Serial.print(cmd);
  Serial.print(F("\",\"spd\":"));
  Serial.print(spd);
  Serial.println(F("}"));
}

void sendInfo(const char* msg) {
  Serial.print(F("{\"t\":\"info\",\"msg\":\""));
  Serial.print(msg);
  Serial.println(F("\"}"));
}

void sendError(const char* msg) {
  Serial.print(F("{\"t\":\"err\",\"msg\":\""));
  Serial.print(msg);
  Serial.println(F("\"}"));
}

void sendIMU() {
  if (!imuReady) {
    sendError("IMU not available");
    return;
  }
  refreshIMUState();

  Serial.print(F("{\"t\":\"imu\",\"yaw\":"));
  Serial.print(currentYawDeg, 2);
  Serial.print(F(",\"pitch\":"));
  Serial.print(filtPitchDeg, 2);
  Serial.print(F(",\"roll\":"));
  Serial.print(filtRollDeg, 2);
  Serial.print(F(",\"yaw_rate\":"));
  Serial.print(yawRateDegPerSec, 2);
  Serial.print(F(",\"turn_dir\":\""));
  Serial.print(turnDirFromRate(yawRateDegPerSec));
  Serial.print(F("\",\"ax\":"));
  Serial.print(filtAx, 3);
  Serial.print(F(",\"ay\":"));
  Serial.print(filtAy, 3);
  Serial.print(F(",\"az\":"));
  Serial.print(filtAz, 3);
  Serial.print(F(",\"temp\":"));
  Serial.print(filtTempC, 1);
  Serial.print(F(",\"ms\":"));
  Serial.print(millis());
  Serial.println(F("}"));
}

void sendStatus() {
  Serial.print(F("{\"t\":\"status\",\"spd\":"));
  Serial.print(defaultSpeed);
  Serial.print(F(",\"stream\":"));
  Serial.print(streamEnabled ? F("true") : F("false"));
  Serial.print(F(",\"imu_ok\":"));
  Serial.print(imuReady ? F("true") : F("false"));
  Serial.print(F(",\"pid\":"));
  Serial.print(yawPID.enabled ? F("true") : F("false"));
  Serial.print(F(",\"motion\":\""));
  Serial.print(motionModeToStr(motionMode));
  Serial.print(F("\",\"yaw_target\":"));
  Serial.print(yawPID.setpoint, 2);
  Serial.print(F(",\"yaw_cal\":"));
  Serial.print(yawCalibrated ? F("true") : F("false"));
  Serial.print(F(",\"yaw_bias\":"));
  Serial.print(yawBiasRateDegPerSec, 4);
  Serial.println(F("}"));
}

void printHelp() {
  Serial.println(F("Commands: F [n], B [n], L [n], R [n], S, SPD n"));
  Serial.println(F("  F/B are latched heading-hold modes"));
  Serial.println(F("  L/R are one-shot 90deg turns; while moving, keep motion until target"));
  Serial.println(F("          IMU, STREAM ON|OFF, STATUS, HELP"));
  Serial.println(F("          PID ON|OFF, PID KP/KI/KD <val>, PID STATUS"));
  Serial.println(F("          YAW CAL   (recalibrate bias while stopped)"));
}

void setMotionStop(bool resetPidState) {
  motionMode = MOTION_STOP;
  turnBaseSignedSpeed = 0;
  drive(0, 0);
  turnStableSamples = 0;
  if (resetPidState) resetYawPID();
}

void setHeadingHold(MotionMode mode, int spd) {
  motionMode = mode;
  motionSpeed = constrain(spd, 0, 255);
  turnStableSamples = 0;

  if (!imuReady) {
    sendError("IMU not available; running open-loop");
    return;
  }
  if (!yawPID.enabled) {
    sendInfo("PID OFF; heading hold disabled");
    return;
  }

  if (refreshIMUState()) {
    yawPID.setpoint = currentYawDeg;
    resetYawPID();
  }
}

bool beginTurn90(MotionMode mode, int spd) {
  if (!imuReady) {
    sendError("IMU not available for turn");
    return false;
  }
  if (!yawPID.enabled) {
    sendError("PID is OFF; turn requires PID ON");
    return false;
  }
  if (!refreshIMUState()) {
    sendError("IMU update failed");
    return false;
  }

  const bool fromForward = (motionMode == MOTION_FORWARD);
  const bool fromBackward = (motionMode == MOTION_BACKWARD);
  const bool fromMoving = fromForward || fromBackward;
  turnBaseSignedSpeed = fromForward ? motionSpeed : (fromBackward ? -motionSpeed : 0);

  if (mode == MOTION_TURN_LEFT) {
    motionMode = fromMoving ? MOTION_TURN_LEFT_MOVING : MOTION_TURN_LEFT;
  } else {
    motionMode = fromMoving ? MOTION_TURN_RIGHT_MOVING : MOTION_TURN_RIGHT;
  }
  turnCommandSpeed = constrain(spd, 0, 255);
  turnStartMs = millis();
  turnStableSamples = 0;

  const float delta = (mode == MOTION_TURN_RIGHT) ? -90.0f : 90.0f;
  yawPID.setpoint = wrapAngle180(currentYawDeg + delta);
  resetYawPID();
  return true;
}

void updateMotionControl() {
  const unsigned long now = millis();
  if (now - lastControlMs < CONTROL_INTERVAL_MS) return;
  lastControlMs = now;

  if (imuReady) refreshIMUState();

  switch (motionMode) {
    case MOTION_STOP:
      drive(0, 0);
      break;

    case MOTION_FORWARD: {
      if (imuReady && yawPID.enabled) {
        const int corr = computeYawPID(currentYawDeg, YAW_HOLD_CORR_MAX);
        const int left = constrain(motionSpeed + corr, -255, 255);
        const int right = constrain(motionSpeed - corr, -255, 255);
        drive(left, right);
      } else {
        drive(motionSpeed, motionSpeed);
      }
      break;
    }

    case MOTION_BACKWARD: {
      if (imuReady && yawPID.enabled) {
        const int corr = computeYawPID(currentYawDeg, YAW_HOLD_CORR_MAX);
        // Sign mapping keeps correction direction consistent with forward mode.
        const int left = constrain(-motionSpeed + corr, -255, 255);
        const int right = constrain(-motionSpeed - corr, -255, 255);
        drive(left, right);
      } else {
        drive(-motionSpeed, -motionSpeed);
      }
      break;
    }

    case MOTION_TURN_LEFT:
    case MOTION_TURN_RIGHT:
    case MOTION_TURN_LEFT_MOVING:
    case MOTION_TURN_RIGHT_MOVING: {
      if (!imuReady || !yawPID.enabled) {
        sendError("Turn aborted: IMU/PID unavailable");
        setMotionStop(true);
        break;
      }

      const float err = angleErrorDeg(yawPID.setpoint, currentYawDeg);
      const int pidOut = computeYawPID(currentYawDeg, TURN_PID_OUT_MAX);
      int pwm = abs(pidOut);

      const int maxTurnPwm = constrain(turnCommandSpeed, TURN_MIN_PWM, TURN_MAX_PWM);
      if (pwm > maxTurnPwm) pwm = maxTurnPwm;
      if (pwm < TURN_MIN_PWM) pwm = TURN_MIN_PWM;

      const int signedSpin = (pidOut >= 0) ? pwm : -pwm;
      const bool movingTurn = (motionMode == MOTION_TURN_LEFT_MOVING || motionMode == MOTION_TURN_RIGHT_MOVING);
      if (movingTurn) {
        const int left = constrain(turnBaseSignedSpeed + signedSpin, -255, 255);
        const int right = constrain(turnBaseSignedSpeed - signedSpin, -255, 255);
        drive(left, right);
      } else {
        drive(signedSpin, -signedSpin);
      }

      if (fabs(err) <= TURN_TOLERANCE_DEG) {
        if (turnStableSamples < 255) turnStableSamples++;
      } else {
        turnStableSamples = 0;
      }

      if (turnStableSamples >= TURN_STABLE_COUNT) {
        const bool wasLeft = (motionMode == MOTION_TURN_LEFT || motionMode == MOTION_TURN_LEFT_MOVING);
        setMotionStop(true);
        sendAck(wasLeft ? "L90 DONE" : "R90 DONE", 0);
      } else if ((now - turnStartMs) > TURN_TIMEOUT_MS) {
        setMotionStop(true);
        sendError("Turn timeout");
      }
      break;
    }
  }
}

// ═══════════════════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(2000);  // Give Serial Monitor time to connect after reset
  Serial.println(F("Road Inspector Bot starting..."));

  // Motor pins
  pinMode(LEFT_RPWM, OUTPUT);
  pinMode(LEFT_LPWM, OUTPUT);
  pinMode(RIGHT_RPWM, OUTPUT);
  pinMode(RIGHT_LPWM, OUTPUT);
  pinMode(LEFT_R_EN, OUTPUT);
  pinMode(LEFT_L_EN, OUTPUT);
  pinMode(RIGHT_R_EN, OUTPUT);
  pinMode(RIGHT_L_EN, OUTPUT);
  enableDriver();
  drive(0, 0);
  Serial.println(F("Motors initialized."));

  // IMU init
  Serial.println(F("Detecting MPU9250 on I2C (Mega pins 20/21)..."));
  Wire.begin();
  Wire.beginTransmission(0x68);
  byte error = Wire.endTransmission();
  if (error != 0) {
    Serial.print(F("MPU9250 not found! I2C error code: "));
    Serial.println(error);
    Serial.println(F("Check wiring: SDA=20, SCL=21, VCC=3.3V"));
    sendError("MPU9250 not detected on I2C");
    imuReady = false;
  } else {
    Serial.println(F("MPU9250 detected. Initializing..."));
    if (!mpu.setup(0x68)) {
      sendError("MPU9250 setup failed");
      imuReady = false;
    } else {
      Serial.println(F("Calibrating IMU... keep still (5 sec)"));
      delay(5000);
      mpu.calibrateAccelGyro();
      imuReady = true;
      if (!runYawCalibration(false)) {
        sendError("Startup YAW CAL failed");
      }
      refreshIMUState();
      yawPID.setpoint = currentYawDeg;
      resetYawPID();
      Serial.println(F("IMU ready!"));
    }
  }

  sendStatus();
  printHelp();
}

// ═══════════════════════════════════════════════════════════
//  LOOP
// ═══════════════════════════════════════════════════════════
void loop() {
  updateMotionControl();

  // ── Continuous IMU streaming ──
  if (streamEnabled && imuReady) {
    unsigned long now = millis();
    if (now - lastStreamMs >= STREAM_INTERVAL_MS) {
      lastStreamMs = now;
      sendIMU();
    }
  }

  // ── Command processing ──
  if (!Serial.available()) return;

  static char cmd[48];
  size_t n = Serial.readBytesUntil('\n', cmd, sizeof(cmd) - 1);
  cmd[n] = '\0';
  if (n == 0) return;

  // Trim trailing whitespace/CR
  while (n > 0 && (cmd[n - 1] == '\r' || cmd[n - 1] == ' ')) cmd[--n] = '\0';
  // Uppercase
  for (size_t i = 0; i < n; i++) cmd[i] = (char)toupper((unsigned char)cmd[i]);

  // ── STOP ──
  if (strcmp(cmd, "S") == 0) {
    setMotionStop(true);
    sendAck("S", 0);
    return;
  }

  // ── HELP ──
  if (strcmp(cmd, "HELP") == 0) {
    printHelp();
    return;
  }

  // ── STATUS ──
  if (strcmp(cmd, "STATUS") == 0) {
    sendStatus();
    return;
  }

  // ── IMU single read ──
  if (strcmp(cmd, "IMU") == 0) {
    sendIMU();
    return;
  }

  // ── YAW CAL ──
  if (strcmp(cmd, "YAW CAL") == 0) {
    runYawCalibration(true);
    return;
  }

  // ── STREAM ON / OFF ──
  if (strncmp(cmd, "STREAM ", 7) == 0) {
    if (strcmp(cmd + 7, "ON") == 0) {
      if (!imuReady) {
        sendError("IMU not available");
        return;
      }
      streamEnabled = true;
      lastStreamMs = millis();
      sendAck("STREAM ON", 0);
    } else if (strcmp(cmd + 7, "OFF") == 0) {
      streamEnabled = false;
      sendAck("STREAM OFF", 0);
    } else {
      sendError("Use STREAM ON or STREAM OFF");
    }
    return;
  }

  // ── SPD <value> ──
  if (strncmp(cmd, "SPD ", 4) == 0) {
    int spd = 0;
    if (!parseByteValue(cmd + 4, spd)) {
      sendError("SPD must be 0-255");
      return;
    }
    defaultSpeed = spd;
    if (motionMode == MOTION_FORWARD || motionMode == MOTION_BACKWARD) {
      motionSpeed = spd;
    }
    sendAck("SPD", spd);
    return;
  }

  // ── PID commands ──
  if (strncmp(cmd, "PID ", 4) == 0) {
    const char* sub = cmd + 4;

    if (strcmp(sub, "ON") == 0) {
      yawPID.enabled = true;
      if (imuReady && refreshIMUState()) {
        yawPID.setpoint = currentYawDeg;
      }
      resetYawPID();
      sendAck("PID ON", 0);
      return;
    }

    if (strcmp(sub, "OFF") == 0) {
      yawPID.enabled = false;
      resetYawPID();
      sendAck("PID OFF", 0);
      return;
    }

    if (strncmp(sub, "STATUS", 6) == 0) {
      if (imuReady) refreshIMUState();
      const float err = angleErrorDeg(yawPID.setpoint, currentYawDeg);
      Serial.print(F("{\"t\":\"pid\",\"on\":"));
      Serial.print(yawPID.enabled ? F("true") : F("false"));
      Serial.print(F(",\"kp\":")); Serial.print(yawPID.Kp, 2);
      Serial.print(F(",\"ki\":")); Serial.print(yawPID.Ki, 3);
      Serial.print(F(",\"kd\":")); Serial.print(yawPID.Kd, 2);
      Serial.print(F(",\"yaw\":")); Serial.print(currentYawDeg, 2);
      Serial.print(F(",\"target\":")); Serial.print(yawPID.setpoint, 2);
      Serial.print(F(",\"err\":")); Serial.print(err, 2);
      Serial.print(F(",\"corr\":")); Serial.print(lastYawPidOutput);
      Serial.print(F(",\"yaw_cal\":")); Serial.print(yawCalibrated ? F("true") : F("false"));
      Serial.print(F(",\"yaw_bias\":")); Serial.print(yawBiasRateDegPerSec, 4);
      Serial.print(F(",\"mode\":\"")); Serial.print(motionModeToStr(motionMode)); Serial.print(F("\""));
      Serial.println(F("}"));
      return;
    }

    // PID KP/KI/KD <value>
    char param[4];
    strncpy(param, sub, 3);
    param[3] = '\0';
    if (param[2] == ' ') param[2] = '\0';

    const char* valStr = sub;
    while (*valStr && *valStr != ' ') valStr++;
    if (*valStr == ' ') valStr++;

    char* endP = nullptr;
    float v = strtof(valStr, &endP);
    if (endP == valStr) {
      sendError("PID: invalid value");
      return;
    }

    if (strcmp(param, "KP") == 0) {
      yawPID.Kp = v;
      resetYawPID();
      Serial.print(F("{\"t\":\"ack\",\"cmd\":\"PID KP\",\"val\":")); Serial.print(v, 2); Serial.println(F("}"));
    } else if (strcmp(param, "KI") == 0) {
      yawPID.Ki = v;
      resetYawPID();
      Serial.print(F("{\"t\":\"ack\",\"cmd\":\"PID KI\",\"val\":")); Serial.print(v, 3); Serial.println(F("}"));
    } else if (strcmp(param, "KD") == 0) {
      yawPID.Kd = v;
      resetYawPID();
      Serial.print(F("{\"t\":\"ack\",\"cmd\":\"PID KD\",\"val\":")); Serial.print(v, 2); Serial.println(F("}"));
    } else {
      sendError("PID: use KP, KI, KD, ON, OFF, or STATUS");
    }
    return;
  }

  // ── Single-char motion commands ──
  char action = cmd[0];
  int spd = defaultSpeed;

  if (cmd[1] == ' ') {
    if (!parseByteValue(cmd + 2, spd)) {
      sendError("speed must be 0-255");
      return;
    }
  } else if (cmd[1] != '\0') {
    sendError("Unknown command. Type HELP.");
    return;
  }

  switch (action) {
    case 'F':
      enableDriver();
      setHeadingHold(MOTION_FORWARD, spd);
      sendAck("F", spd);
      break;
    case 'B':
      enableDriver();
      setHeadingHold(MOTION_BACKWARD, spd);
      sendAck("B", spd);
      break;
    case 'L':
      enableDriver();
      if (beginTurn90(MOTION_TURN_LEFT, spd)) sendAck("L", spd);
      break;
    case 'R':
      enableDriver();
      if (beginTurn90(MOTION_TURN_RIGHT, spd)) sendAck("R", spd);
      break;
    default:
      sendError("Unknown command. Type HELP.");
      break;
  }
}
