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
 *     F [0-255]    forward at speed (default if omitted)
 *     B [0-255]    backward
 *     L [0-255]    spin left
 *     R [0-255]    spin right
 *     S            stop
 *     SPD <0-255>  set default speed
 *     IMU          print single IMU reading
 *     STREAM ON    start continuous telemetry (~20 Hz)
 *     STREAM OFF   stop continuous telemetry
 *     STATUS       print current state JSON
 *     HELP         list commands
 *
 *   Data OUT (JSON lines):
 *     {"t":"imu","yaw":0.0,"pitch":0.0,"roll":0.0,"ax":0.0,"ay":0.0,"az":0.0,"temp":0.0,"ms":12345}
 *     {"t":"ack","cmd":"F","spd":140}
 *     {"t":"err","msg":"..."}
 *     {"t":"status","spd":140,"stream":true,"imu_ok":true,"pid":true}
 *
 *   PID Auto-Balance:
 *     Corrects roll angle by adjusting differential motor speeds.
 *     PID ON — enable correction (default: OFF)
 *     PID KP/KI/KD <val> — tune gains
 *     PID STATUS — show PID settings + current roll
 */

#include <Wire.h>
#include "MPU9250.h"
#include <ctype.h>
#include <stdlib.h>
#include <string.h>

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

// ── State ────────────────────────────────────────────────
int  defaultSpeed   = 140;
bool streamEnabled  = false;
bool imuReady       = false;

// ── Telemetry timing ─────────────────────────────────────
const unsigned long STREAM_INTERVAL_MS = 50;   // 20 Hz
unsigned long lastStreamMs = 0;

// ── MPU9250 instance ─────────────────────────────────────
MPU9250 mpu;

// ═══════════════════════════════════════════════════════════
//  PID Controller (Roll Auto-Balance)
// ═══════════════════════════════════════════════════════════
struct PID {
  float Kp = 3.0f;       // Proportional gain
  float Ki = 0.05f;      // Integral gain
  float Kd = 1.0f;       // Derivative gain
  float setpoint = 0.0f; // Target roll (level = 0°)
  float integral = 0.0f;
  float prevError = 0.0f;
  unsigned long prevTimeMs = 0;
  bool enabled = false;
};

PID rollPID;

// Safety limits
const float ROLL_DEAD_ZONE   = 2.0f;  // Ignore tiny vibrations
const int   ROLL_CORR_MAX    = 50;    // Max ±PWM correction

float readRoll() {
  if (!imuReady) return 0.0f;
  mpu.update();
  return mpu.getRoll();
}

// Compute PID correction from current roll angle
// Returns: value to ADD to left motor, SUBTRACT from right motor
int computeRollCorrection() {
  if (!rollPID.enabled || !imuReady) return 0;

  float roll = readRoll();
  
  // Dead zone — ignore tiny angles from vibrations
  if (fabs(roll) < ROLL_DEAD_ZONE) {
    rollPID.integral = 0.0f;  // Reset integral to avoid windup
    rollPID.prevError = 0.0f;
    rollPID.prevTimeMs = millis();
    return 0;
  }

  unsigned long now = millis();
  float dt = (now - rollPID.prevTimeMs) / 1000.0f;
  if (dt < 0.001f) dt = 0.001f;  // Prevent division by zero

  float error = rollPID.setpoint - roll;  // positive error = leaning right

  // Integral (anti-windup clamped)
  rollPID.integral += error * dt;
  if (rollPID.integral > 100.0f) rollPID.integral = 100.0f;
  if (rollPID.integral < -100.0f) rollPID.integral = -100.0f;

  // Derivative
  float derivative = (error - rollPID.prevError) / dt;

  rollPID.prevError = error;
  rollPID.prevTimeMs = now;

  // PID output
  float output = (rollPID.Kp * error)
               + (rollPID.Ki * rollPID.integral)
               + (rollPID.Kd * derivative);

  // Clamp correction to safe range
  int correction = (int)constrain(output, -ROLL_CORR_MAX, ROLL_CORR_MAX);
  return correction;
}

void resetPID() {
  rollPID.integral = 0.0f;
  rollPID.prevError = 0.0f;
  rollPID.prevTimeMs = millis();
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
//  Motor helpers (identical to sketch_l298n_test)
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

void forwardMotion(int spd) {
  int corr = computeRollCorrection();
  drive(spd + corr, spd - corr);
}

void backwardMotion(int spd) {
  int corr = computeRollCorrection();
  drive(-spd - corr, -spd + corr);
}

void leftSpinMotion(int spd)  { drive(-spd,  spd); }
void rightSpinMotion(int spd) { drive( spd, -spd); }

// ═══════════════════════════════════════════════════════════
//  JSON output helpers
// ═══════════════════════════════════════════════════════════
void sendIMU() {
  mpu.update();
  Serial.print(F("{\"t\":\"imu\",\"yaw\":"));
  Serial.print(mpu.getYaw(), 2);
  Serial.print(F(",\"pitch\":"));
  Serial.print(mpu.getPitch(), 2);
  Serial.print(F(",\"roll\":"));
  Serial.print(mpu.getRoll(), 2);
  Serial.print(F(",\"ax\":"));
  Serial.print(mpu.getAccX(), 3);
  Serial.print(F(",\"ay\":"));
  Serial.print(mpu.getAccY(), 3);
  Serial.print(F(",\"az\":"));
  Serial.print(mpu.getAccZ(), 3);
  Serial.print(F(",\"temp\":"));
  Serial.print(mpu.getTemperature(), 1);
  Serial.print(F(",\"ms\":"));
  Serial.print(millis());
  Serial.println(F("}"));
}

void sendAck(const char* cmd, int spd) {
  Serial.print(F("{\"t\":\"ack\",\"cmd\":\""));
  Serial.print(cmd);
  Serial.print(F("\",\"spd\":"));
  Serial.print(spd);
  Serial.println(F("}"));
}

void sendError(const char* msg) {
  Serial.print(F("{\"t\":\"err\",\"msg\":\""));
  Serial.print(msg);
  Serial.println(F("\"}"));
}

void sendStatus() {
  Serial.print(F("{\"t\":\"status\",\"spd\":"));
  Serial.print(defaultSpeed);
  Serial.print(F(",\"stream\":"));
  Serial.print(streamEnabled ? F("true") : F("false"));
  Serial.print(F(",\"imu_ok\":"));
  Serial.print(imuReady ? F("true") : F("false"));
  Serial.print(F(",\"pid\":"));
  Serial.print(rollPID.enabled ? F("true") : F("false"));
  Serial.println(F("}"));
}

void printHelp() {
  Serial.println(F("Commands: F [n], B [n], L [n], R [n], S, SPD n"));
  Serial.println(F("          IMU, STREAM ON|OFF, STATUS, HELP"));
  Serial.println(F("          PID ON|OFF, PID KP/KI/KD <val>, PID STATUS"));
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

  static char cmd[32];
  size_t n = Serial.readBytesUntil('\n', cmd, sizeof(cmd) - 1);
  cmd[n] = '\0';
  if (n == 0) return;

  // Trim trailing whitespace/CR
  while (n > 0 && (cmd[n - 1] == '\r' || cmd[n - 1] == ' ')) cmd[--n] = '\0';
  // Uppercase
  for (size_t i = 0; i < n; i++) cmd[i] = (char)toupper((unsigned char)cmd[i]);

  // ── STOP ──
  if (strcmp(cmd, "S") == 0) {
    drive(0, 0);
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
    if (!imuReady) { sendError("IMU not available"); return; }
    sendIMU();
    return;
  }

  // ── STREAM ON / OFF ──
  if (strncmp(cmd, "STREAM ", 7) == 0) {
    if (strcmp(cmd + 7, "ON") == 0) {
      if (!imuReady) { sendError("IMU not available"); return; }
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
    resetPID();  // Reset PID when speed changes
    sendAck("SPD", spd);
    return;
  }

  // ── PID commands ──
  if (strncmp(cmd, "PID ", 4) == 0) {
    const char* sub = cmd + 4;
    if (strcmp(sub, "ON") == 0) {
      rollPID.enabled = true;
      resetPID();
      sendAck("PID ON", 0);
      return;
    }
    if (strcmp(sub, "OFF") == 0) {
      rollPID.enabled = false;
      sendAck("PID OFF", 0);
      return;
    }
    if (strncmp(sub, "STATUS", 6) == 0) {
      float roll = readRoll();
      Serial.print(F("{\"t\":\"pid\",\"on\":"));
      Serial.print(rollPID.enabled ? F("true") : F("false"));
      Serial.print(F(",\"kp\":")); Serial.print(rollPID.Kp, 2);
      Serial.print(F(",\"ki\":")); Serial.print(rollPID.Ki, 3);
      Serial.print(F(",\"kd\":")); Serial.print(rollPID.Kd, 2);
      Serial.print(F(",\"roll\":")); Serial.print(roll, 2);
      Serial.print(F(",\"corr\":")); Serial.print(computeRollCorrection());
      Serial.println(F("}"));
      return;
    }
    // PID KP/KI/KD <value>
    char param[4];
    strncpy(param, sub, 3);
    param[3] = '\0';
    // Trim trailing space
    if (param[2] == ' ') param[2] = '\0';

    const char* valStr = sub;
    while (*valStr && *valStr != ' ') valStr++;
    if (*valStr == ' ') valStr++;

    float v;
    char* endP = nullptr;
    v = strtof(valStr, &endP);
    if (endP == valStr) { sendError("PID: invalid value"); return; }

    if (strcmp(param, "KP") == 0) {
      rollPID.Kp = v;
      resetPID();
      Serial.print(F("{\"t\":\"ack\",\"cmd\":\"PID KP\",\"val\":")); Serial.print(v, 2); Serial.println(F("}"));
    } else if (strcmp(param, "KI") == 0) {
      rollPID.Ki = v;
      resetPID();
      Serial.print(F("{\"t\":\"ack\",\"cmd\":\"PID KI\",\"val\":")); Serial.print(v, 3); Serial.println(F("}"));
    } else if (strcmp(param, "KD") == 0) {
      rollPID.Kd = v;
      resetPID();
      Serial.print(F("{\"t\":\"ack\",\"cmd\":\"PID KD\",\"val\":")); Serial.print(v, 2); Serial.println(F("}"));
    } else {
      sendError("PID: use KP, KI, KD, ON, OFF, or STATUS");
    }
    return;
  }

  // ── Single-char motion commands ──
  char action = cmd[0];
  int  spd    = defaultSpeed;

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
      enableDriver(); forwardMotion(spd);   sendAck("F", spd); break;
    case 'B':
      enableDriver(); backwardMotion(spd);  sendAck("B", spd); break;
    case 'L':
      enableDriver(); leftSpinMotion(spd);  sendAck("L", spd); break;
    case 'R':
      enableDriver(); rightSpinMotion(spd); sendAck("R", spd); break;
    default:
      sendError("Unknown command. Type HELP.");
      break;
  }
}
