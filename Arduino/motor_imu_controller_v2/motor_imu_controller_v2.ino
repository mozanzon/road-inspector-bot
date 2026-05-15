#include <Wire.h>
#include <QMC5883LCompass.h> // Default compass library
#include <TinyGPS++.h>

// ── Compass Pins (I2C on Mega)
const int COMPASS_SDA = 20;
const int COMPASS_SCL = 21;
QMC5883LCompass compass;

// ── GPS Pins (Serial2 on Mega)
// Moved to Serial2 to free pins 18/19 for hardware interrupts
const int GPS_RX = 17;
const int GPS_TX = 16;
TinyGPSPlus gps;

// LEFT MOTOR
const int M1_RPWM = 5;
const int M1_LPWM = 6;
const int M1_R_EN = 7;
const int M1_L_EN = 8;

// ── RIGHT Motor (M2) - uses PWM pins on Mega for speed control
const int RIGHT_RPWM = 44;
const int RIGHT_LPWM = 45;
const int RIGHT_R_EN = 46;
const int RIGHT_L_EN = 47;

// ── PLOTTER Motor (M3) - max-speed on/off only
const int PLOTTER_RPWM = 38;
const int PLOTTER_LPWM = 39;
const int PLOTTER_R_EN = 40;
const int PLOTTER_L_EN = 41;

const int RAMP_STEPS = 50;
const unsigned long RAMP_TIME = 800;

// ── Differential drive kinematics (for EKF Pure Pursuit CMD)
const float WHEEL_TRACK    = 0.57;  // meters between wheel contact patches
const float HALF_TRACK     = WHEEL_TRACK / 2.0;  // 0.285 m
const float MAX_LINEAR_MS  = 1.0;   // m/s at PWM=255 (calibrate per robot)
const float PWM_PER_MS     = 255.0 / MAX_LINEAR_MS;
const float WHEEL_RADIUS_M = 0.16;  // 32 cm wheel diameter
const float WHEEL_CIRC_M   = 2.0 * PI * WHEEL_RADIUS_M;
const float TICKS_PER_REV  = 2400.0; // encoder ticks per revolution (verify by measurement)

// ── Heading Correction PID (Encoder-based)
float headingKp = 50.0;
float headingKi = 0.5;
float headingKd = 1.0;
float headingMaxCorrection = 50.0;

bool headingCorrectionEnabled = false;
unsigned long lastHeadingTick = 0;
const unsigned long HEADING_INTERVAL_MS = 20;

float headingTargetRad = 0.0;
float headingIntegral = 0.0;
float headingPrevError = 0.0;
int headingPwmCorrection = 0;

long headingStartEnc1 = 0;
long headingStartEnc2 = 0;

void enableHeadingCorrection(float targetRad = 0.0);
void disableHeadingCorrection();

// ── Wheel PID control (closed-loop speed control for CMD,v,omega)
const unsigned long PID_INTERVAL_MS = 20;  // 50 Hz
const float PID_KP = 200.0;
const float PID_KI = 35.0;
const float PID_KD = 2.5;
const float PID_INTEGRAL_LIMIT = 2.0;
const float PID_TARGET_DEADBAND_MS = 0.01;

int currentSpeed = 0;
int currentDir   = 0; // 1=fwd, -1=back, 0=stop

// ── Telemetry streaming state
bool telemetryStreaming = false;
unsigned long telemetryInterval = 100;   // ms between packets
unsigned long lastTelemetryTime  = 0;
unsigned long lastTelemetrySchedule = 0;

// Odometry & Fusion state
float odom_x = 0.0;
float odom_y = 0.0;
float odom_theta = 0.0;
long odom_prev_enc1 = 0;
long odom_prev_enc2 = 0;

bool fusion_initialized = false;
bool gps_origin_set = false;
double gps_origin_lat = 0.0;
double gps_origin_lon = 0.0;

void odometryTick();

// ── Encoder pins (X4 Decoding)
const int ENC_LEFT_A  = 2;
const int ENC_LEFT_B  = 18;

const int ENC_RIGHT_A = 3;
const int ENC_RIGHT_B = 19;

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
long   turnStartEnc1 = 0;
long   turnStartEnc2 = 0;
int    turnRampStep  = 0;
unsigned long turnStepStart    = 0;   // for ramp-down settle timing
unsigned long turnSpinStart    = 0;   // absolute start of spinning (for timeout)
unsigned long turnLastCheck    = 0;   // last heading check time (for 10ms interval)
unsigned long turnTimeout      = 10000;
const float TURN_HEADING_TOL = 5.0;

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

// ---------- Plotting Mechanism ----------
enum PlottingMode { PLOT_CONTINUOUS, PLOT_DASHED, PLOT_DISTANCE_DASHED };
PlottingMode plottingMode = PLOT_CONTINUOUS;
bool plottingMotorsOn = true;
unsigned long lastPlottingToggle = 0;
const unsigned long PLOTTING_TOGGLE_MS = 2000;

// Spray Dash variables
float sprayOnDistanceCm = 0.0;
float sprayOffDistanceCm = 0.0;
bool isSprayingNow = false;
long sprayStartEnc1 = 0;
long sprayStartEnc2 = 0;
float lastMeasuredDashCm = 0.0;
float lastMeasuredGapCm = 0.0;

float compassOffsetX = 0.0;
float compassOffsetY = 0.0;
float compassOffsetZ = 0.0;
float compassScaleX = 1.0;
float compassScaleY = 1.0;
float compassScaleZ = 1.0;

int latched_L_LPWM = 0, latched_L_RPWM = 0;
int latched_R_LPWM = 0, latched_R_RPWM = 0;

void applyPwmToHardware(int l_l, int l_r, int r_l, int r_r) {
  int final_l_l = l_l;
  int final_l_r = l_r;
  int final_r_l = r_l;
  int final_r_r = r_r;

  if (headingCorrectionEnabled) {
    bool isForward = (l_r > 0 || r_r > 0) && (l_l == 0 && r_l == 0);
    bool isBackward = (l_l > 0 || r_l > 0) && (l_r == 0 && r_r == 0);

    if (isForward) {
      final_l_r = constrain(l_r - headingPwmCorrection, 0, 255);
      final_r_r = constrain(r_r + headingPwmCorrection, 0, 255);
    } else if (isBackward) {
      final_l_l = constrain(l_l + headingPwmCorrection, 0, 255);
      final_r_l = constrain(r_l - headingPwmCorrection, 0, 255);
    }
  }

  analogWrite(M1_LPWM, final_l_l);
  analogWrite(M1_RPWM, final_l_r);
  analogWrite(RIGHT_LPWM, final_r_l);
  analogWrite(RIGHT_RPWM, final_r_r);
}

// Wrapper for drive motors handling the plotting mode dashed logic
void setMotorPwm(int l_l, int l_r, int r_l, int r_r) {
  latched_L_LPWM = l_l;
  latched_L_RPWM = l_r;
  latched_R_LPWM = r_l;
  latched_R_RPWM = r_r;

  applyPwmToHardware(l_l, l_r, r_l, r_r);
}

// Wrapper for the independent plotting mechanism actuator.
// The plotter driver only needs max-speed on/off, so these pins are digital.
void setPlotterOn(bool on) {
  digitalWrite(PLOTTER_LPWM, LOW);
  digitalWrite(PLOTTER_RPWM, on ? HIGH : LOW);
}

void plottingTick() {
  bool isMoving = (latched_L_LPWM > 0 || latched_L_RPWM > 0 || latched_R_LPWM > 0 || latched_R_RPWM > 0);

  if (plottingMode == PLOT_CONTINUOUS) {
    if (!plottingMotorsOn) {
      plottingMotorsOn = true;
      applyPwmToHardware(latched_L_LPWM, latched_L_RPWM, latched_R_LPWM, latched_R_RPWM);
    }
    // Plotter only sprays when robot is physically directed to move
    setPlotterOn(isMoving);
    return;
  }
  
  if (plottingMode == PLOT_DASHED) {
    unsigned long now = millis();
    if (now - lastPlottingToggle >= PLOTTING_TOGGLE_MS) {
      lastPlottingToggle = now;
      plottingMotorsOn = !plottingMotorsOn;
    }
    // Dashed plotting toggles the plotter only. Drive motors keep moving.
    setPlotterOn(plottingMotorsOn && isMoving);
    return;
  }

  if (plottingMode == PLOT_DISTANCE_DASHED) {
    // Keep motors running normally without stopping
    if (!plottingMotorsOn) {
      plottingMotorsOn = true;
      applyPwmToHardware(latched_L_LPWM, latched_L_RPWM, latched_R_LPWM, latched_R_RPWM);
    }
    
    noInterrupts();
    long c1 = encoder1_count;
    long c2 = encoder2_count;
    interrupts();
    
    long d1 = abs(c1 - sprayStartEnc1);
    long d2 = abs(c2 - sprayStartEnc2);
    
    // Average wheel distance in cm
    float dist_cm = ((d1 + d2) / 2.0) * ((WHEEL_CIRC_M * 100.0) / TICKS_PER_REV);
    
    if (isSprayingNow) {
      if (dist_cm >= sprayOnDistanceCm) {
        lastMeasuredDashCm = dist_cm;
        isSprayingNow = false;
        sprayStartEnc1 = c1;
        sprayStartEnc2 = c2;
      }
    } else {
      if (dist_cm >= sprayOffDistanceCm) {
        lastMeasuredGapCm = dist_cm;
        isSprayingNow = true;
        sprayStartEnc1 = c1;
        sprayStartEnc2 = c2;
      }
    }
    
    setPlotterOn(isSprayingNow && isMoving);
  }
}

// ---------- Encoder ISRs (X4 Decoding) ----------
void ISR_Left_A() {
  if (digitalRead(ENC_LEFT_A) != digitalRead(ENC_LEFT_B)) { encoder1_count++; }
  else { encoder1_count--; }
}

void ISR_Left_B() {
  if (digitalRead(ENC_LEFT_A) == digitalRead(ENC_LEFT_B)) { encoder1_count++; }
  else { encoder1_count--; }
}

void ISR_Right_A() {
  if (digitalRead(ENC_RIGHT_A) != digitalRead(ENC_RIGHT_B)) { encoder2_count++; }
  else { encoder2_count--; }
}

void ISR_Right_B() {
  if (digitalRead(ENC_RIGHT_A) == digitalRead(ENC_RIGHT_B)) { encoder2_count++; }
  else { encoder2_count--; }
}

// ---------- Motor primitives ----------
void emergencyStop() {
  disablePidControl();
  disableHeadingCorrection();
  setMotorPwm(0, 0, 0, 0);
  setPlotterOn(false);
  currentSpeed = 0;
  currentDir = 0;
  // Reset all state machines
  turnState = TURN_IDLE;
  rampState = RAMP_IDLE;
  Serial.println("!! EMERGENCY STOP !!");
}

void stopMotors() {
  disablePidControl();
  disableHeadingCorrection();
  setMotorPwm(0, 0, 0, 0);
  setPlotterOn(false);
  currentSpeed = 0;
  currentDir = 0;
  turnState = TURN_IDLE;
  rampState = RAMP_IDLE;
  Serial.println("Motors stopped.");
}

void setForward(int speed) {
  setMotorPwm(0, speed, 0, speed);
}

void setBackward(int speed) {
  setMotorPwm(speed, 0, speed, 0);
}

// Independent wheel control for differential drive (EKF Pure Pursuit)
void setForwardDiff(int leftSpeed, int rightSpeed) {
  leftSpeed  = constrain(leftSpeed, 0, 255);
  rightSpeed = constrain(rightSpeed, 0, 255);
  setMotorPwm(0, leftSpeed, 0, rightSpeed);
}

void setBackwardDiff(int leftSpeed, int rightSpeed) {
  leftSpeed  = constrain(leftSpeed, 0, 255);
  rightSpeed = constrain(rightSpeed, 0, 255);
  setMotorPwm(leftSpeed, 0, rightSpeed, 0);
}

void spinRight(int speed) {
  setMotorPwm(0, speed, speed, 0);
}

void spinLeft(int speed) {
  setMotorPwm(speed, 0, 0, speed);
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
  float control = (PID_KP * error) + (PID_KI * pid.integral) + (PID_KD * derivative);
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
    setMotorPwm(0, leftPwm, rightPwm, 0);
  } else {
    setMotorPwm(leftPwm, 0, 0, rightPwm);
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

  long d1Abs = (d1 >= 0) ? d1 : -d1;
  long d2Abs = (d2 >= 0) ? d2 : -d2;
  float leftMeasuredAbsMs = ((float)d1Abs / TICKS_PER_REV) * WHEEL_CIRC_M / dtSec;
  float rightMeasuredAbsMs = ((float)d2Abs / TICKS_PER_REV) * WHEEL_CIRC_M / dtSec;

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

// ---------- Heading PID functions ----------
void enableHeadingCorrection(float targetRad) {
  noInterrupts();
  headingStartEnc1 = encoder1_count;
  headingStartEnc2 = encoder2_count;
  interrupts();
  headingTargetRad = targetRad;
  headingIntegral = 0.0;
  headingPrevError = 0.0;
  headingPwmCorrection = 0;
  lastHeadingTick = millis();
  headingCorrectionEnabled = true;
  Serial.println("Heading correction enabled.");
}

void disableHeadingCorrection() {
  headingCorrectionEnabled = false;
  headingPwmCorrection = 0;
}

void headingCorrectionTick() {
  if (!headingCorrectionEnabled) return;
  
  unsigned long now = millis();
  if (now - lastHeadingTick < HEADING_INTERVAL_MS) return;
  float dtSec = (now - lastHeadingTick) / 1000.0;
  if (dtSec <= 0.0) return;
  lastHeadingTick = now;

  noInterrupts();
  long c1 = encoder1_count;
  long c2 = encoder2_count;
  interrupts();

  long ticks_L = c1 - headingStartEnc1;
  long ticks_R = c2 - headingStartEnc2;

  float SL = ((float)ticks_L / TICKS_PER_REV) * WHEEL_CIRC_M;
  float SR = ((float)ticks_R / TICKS_PER_REV) * WHEEL_CIRC_M;

  float currentDeviation = (SR - SL) / WHEEL_TRACK;
  float error = headingTargetRad - currentDeviation;

  headingIntegral += error * dtSec;
  if (headingIntegral > 5.0) headingIntegral = 5.0;
  if (headingIntegral < -5.0) headingIntegral = -5.0;

  float derivative = (error - headingPrevError) / dtSec;
  headingPrevError = error;

  float correction = (headingKp * error) + (headingKi * headingIntegral) + (headingKd * derivative);
  
  if (correction > headingMaxCorrection) correction = headingMaxCorrection;
  if (correction < -headingMaxCorrection) correction = -headingMaxCorrection;

  headingPwmCorrection = (int)correction;

  setMotorPwm(latched_L_LPWM, latched_L_RPWM, latched_R_LPWM, latched_R_RPWM);
}

// ---------- Encoder Heading helper ----------
float getEncoderHeadingDeg() {
  noInterrupts();
  long c1 = encoder1_count;
  long c2 = encoder2_count;
  interrupts();
  
  float SL = ((float)c1 / TICKS_PER_REV) * WHEEL_CIRC_M;
  float SR = ((float)c2 / TICKS_PER_REV) * WHEEL_CIRC_M;
  
  float rad = (SR - SL) / WHEEL_TRACK;
  float deg = rad * 180.0 / PI;
  
  while (deg < 0) deg += 360.0;
  while (deg >= 360.0) deg -= 360.0;
  
  return deg;
}

float getRelativeTurnDeg() {
  noInterrupts();
  long c1 = encoder1_count;
  long c2 = encoder2_count;
  interrupts();

  float distL = ((float)(c1 - turnStartEnc1) / TICKS_PER_REV) * WHEEL_CIRC_M;
  float distR = ((float)(c2 - turnStartEnc2) / TICKS_PER_REV) * WHEEL_CIRC_M;
  float angleRad = abs((distR - distL) / WHEEL_TRACK);
  return angleRad * 180.0 / PI;
}

// ---------- Compass & GPS helpers ----------
float readHeadingDeg() {
  compass.read();
  float heading = compass.getAzimuth();
  return heading;
}

void applyCompassCalibration() {
  compass.setCalibrationOffsets(compassOffsetX, compassOffsetY, compassOffsetZ);
  compass.setCalibrationScales(compassScaleX, compassScaleY, compassScaleZ);
}

float angleDiffDeg(float fromDeg, float toDeg) {
  float d = toDeg - fromDeg;
  while (d > 180.0) d -= 360.0;
  while (d < -180.0) d += 360.0;
  return d;
}

// ---------- Odometry & Sensor Fusion Update ----------
void odometryTick() {
  noInterrupts();
  long c1 = encoder1_count;
  long c2 = encoder2_count;
  interrupts();
  
  // Initialize heading with compass on first run
  if (!fusion_initialized) {
    odom_theta = readHeadingDeg() * PI / 180.0;
    odom_prev_enc1 = c1;
    odom_prev_enc2 = c2;
    fusion_initialized = true;
    return;
  }
  
  long d1 = c1 - odom_prev_enc1;
  long d2 = c2 - odom_prev_enc2;
  
  if (d1 != 0 || d2 != 0) {
    odom_prev_enc1 = c1;
    odom_prev_enc2 = c2;
    
    float dist_l = ((float)d1 / TICKS_PER_REV) * WHEEL_CIRC_M;
    float dist_r = ((float)d2 / TICKS_PER_REV) * WHEEL_CIRC_M;
    
    float delta_d = (dist_r + dist_l) / 2.0;
    float delta_theta = (dist_r - dist_l) / WHEEL_TRACK;
    
    float dx_local = 0.0;
    float dy_local = 0.0;
    
    if (abs(delta_theta) < 0.0001) {
      dx_local = delta_d;
      dy_local = 0.0;
    } else {
      float R = delta_d / delta_theta;
      dx_local = R * (1.0 - cos(delta_theta));
      dy_local = R * sin(delta_theta);
    }
    
    odom_x += dx_local * cos(odom_theta) - dy_local * sin(odom_theta);
    odom_y += dx_local * sin(odom_theta) + dy_local * cos(odom_theta);
    odom_theta += delta_theta;
  }
  
  // --- SENSOR FUSION ---
  
  // 1. Compass Heading Fusion (Complementary Filter)
  // Pull the encoder-based heading gently towards the absolute compass heading
  float compass_rad = readHeadingDeg() * PI / 180.0;
  float theta_diff = compass_rad - odom_theta;
  while(theta_diff > PI) theta_diff -= 2.0 * PI;
  while(theta_diff < -PI) theta_diff += 2.0 * PI;
  odom_theta += 0.02 * theta_diff; // 2% trust in compass per tick
  
  // Normalize theta
  while (odom_theta > PI) odom_theta -= 2.0 * PI;
  while (odom_theta < -PI) odom_theta += 2.0 * PI;
  
  // 2. GPS Position Fusion (Complementary Filter)
  if (gps.location.isValid() && gps.location.isUpdated()) {
    if (!gps_origin_set) {
      gps_origin_lat = gps.location.lat();
      gps_origin_lon = gps.location.lng();
      gps_origin_set = true;
    } else {
      // Convert GPS Lat/Lon to Local X/Y meters (East/North)
      double earth_radius = 6371000.0;
      double dLat = (gps.location.lat() - gps_origin_lat) * PI / 180.0;
      double dLon = (gps.location.lng() - gps_origin_lon) * PI / 180.0;
      double gps_x = earth_radius * dLon * cos(gps_origin_lat * PI / 180.0);
      double gps_y = earth_radius * dLat;
      
      // Pull the encoder-based position gently towards the GPS absolute position
      odom_x = 0.95 * odom_x + 0.05 * gps_x; // 5% trust in GPS per reading
      odom_y = 0.95 * odom_y + 0.05 * gps_y;
    }
  }
}

void sendTelemetryPacket() {
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
  unsigned long dtMs = now - lastTelemetryTime;
  lastTelemetryTime = now;

  // Calculate current speed mps from enc_delta and dtMs
  float dist_l = ((float)abs(enc1_delta) / TICKS_PER_REV) * WHEEL_CIRC_M;
  float dist_r = ((float)abs(enc2_delta) / TICKS_PER_REV) * WHEEL_CIRC_M;
  float speed_mps = 0.0;
  if (dtMs > 0) speed_mps = ((dist_l + dist_r) / 2.0) / (dtMs / 1000.0);

  Serial.print("STATUS");
  Serial.print("|heading="); Serial.print(heading, 2);
  Serial.print("|yaw="); Serial.print(heading, 2);
  Serial.print("|odom_x="); Serial.print(odom_x, 4);
  Serial.print("|odom_y="); Serial.print(odom_y, 4);
  Serial.print("|odom_theta="); Serial.print(odom_theta, 4);
  Serial.print("|lat="); Serial.print(gps.location.lat(), 6);
  Serial.print("|lng="); Serial.print(gps.location.lng(), 6);
  Serial.print("|fix="); Serial.print(gps.location.isValid() ? 1 : 0);
  Serial.print("|satellites="); Serial.print(gps.satellites.isValid() ? gps.satellites.value() : 0);
  Serial.print("|e1="); Serial.print(c1);
  Serial.print("|e2="); Serial.print(c2);
  Serial.print("|de1="); Serial.print(enc1_delta);
  Serial.print("|de2="); Serial.print(enc2_delta);
  Serial.print("|dt_ms="); Serial.print(dtMs);
  Serial.print("|speed="); Serial.print(speed_mps, 3);
  Serial.print("|lspeed="); Serial.print(currentDir == 0 ? 0 : currentSpeed * currentDir);
  Serial.print("|rspeed="); Serial.print(currentDir == 0 ? 0 : currentSpeed * currentDir);
  Serial.print("|battery=0");
  Serial.print("|plot_mode="); Serial.print((int)plottingMode);
  Serial.print("|spraying="); Serial.print((isSprayingNow || plottingMode == PLOT_CONTINUOUS) ? 1 : 0);
  Serial.print("|dash_cm="); Serial.print(lastMeasuredDashCm, 2);
  Serial.print("|gap_cm="); Serial.println(lastMeasuredGapCm, 2);
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
        noInterrupts();
        turnStartEnc1 = encoder1_count;
        turnStartEnc2 = encoder2_count;
        interrupts();
        Serial.print("Turn target relative deg: "); Serial.println(turnTargetDeg);
        turnState      = TURN_SPINNING;
        turnSpinStart  = millis();
        turnLastCheck  = millis();
        if (turnDir == 1) spinRight(turnSpeed);
        else spinLeft(turnSpeed);
      }
      return true;

    case TURN_SPINNING: {
      // Check heading every ~10ms
      if (now - turnLastCheck < 10) return true;
      turnLastCheck = now;

      float turnedDeg = getRelativeTurnDeg();
      if (turnedDeg >= (turnTargetDeg - TURN_HEADING_TOL)) {
        stopMotors();
        Serial.print("Turn complete. Relative deg (Enc): "); Serial.println(turnedDeg);
        turnState = TURN_DONE;
        return false;
      }

      // Timeout check against the original spin start time
      if (now - turnSpinStart > turnTimeout) {
        stopMotors();
        Serial.println("Turn timeout.");
        turnState = TURN_DONE;
        return false;
      }

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
  disableHeadingCorrection();

  if (speed < 1) speed = 120;

  turnDir   = dir;
  turnSpeed = speed;

  turnTargetDeg = 90.0;
  Serial.print("Turn direction: "); Serial.println(dir > 0 ? "RIGHT" : "LEFT");
  Serial.print("Turn target relative deg: "); Serial.println(turnTargetDeg);

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
    turnState = TURN_IDLE;
    rampState = RAMP_IDLE;
    disableHeadingCorrection();
    setPidTargets(v_left, v_right);
    return;
  }

  cmd.toUpperCase();

  // Plotting control
  if (cmd == "P0") {
    plottingMode = PLOT_CONTINUOUS;
    Serial.println("Plotting mode: CONTINUOUS");
    return;
  }
  if (cmd == "P1") {
    plottingMode = PLOT_DASHED;
    lastPlottingToggle = millis();
    plottingMotorsOn = true;
    Serial.println("Plotting mode: DASHED");
    return;
  }

  // SPRAY_DASH <on_cm> <off_cm>
  if (cmd.startsWith("SPRAY_DASH ")) {
    int firstSpace = cmd.indexOf(' ');
    int secondSpace = cmd.indexOf(' ', firstSpace + 1);
    if (firstSpace > 0 && secondSpace > 0) {
      sprayOnDistanceCm = cmd.substring(firstSpace + 1, secondSpace).toFloat();
      sprayOffDistanceCm = cmd.substring(secondSpace + 1).toFloat();
      plottingMode = PLOT_DISTANCE_DASHED;
      
      noInterrupts();
      sprayStartEnc1 = encoder1_count;
      sprayStartEnc2 = encoder2_count;
      interrupts();
      
      isSprayingNow = true;
      lastMeasuredDashCm = 0.0;
      lastMeasuredGapCm = 0.0;
      
      Serial.print("Plotting mode: DISTANCE DASHED ON=");
      Serial.print(sprayOnDistanceCm);
      Serial.print("cm OFF=");
      Serial.println(sprayOffDistanceCm);
    } else {
      Serial.println("ERROR: Format is SPRAY_DASH <on_cm> <off_cm>");
    }
    return;
  }

  // HEADING_ON
  if (cmd == "HEADING_ON") {
    enableHeadingCorrection(0.0);
    return;
  }
  
  // HEADING_OFF
  if (cmd == "HEADING_OFF") {
    disableHeadingCorrection();
    Serial.println("Heading correction disabled.");
    return;
  }

  // SET_HEADING_PID <kp> <ki> <kd> [max_correction]
  if (cmd.startsWith("SET_HEADING_PID ")) {
    int firstSpace = cmd.indexOf(' ');
    int secondSpace = cmd.indexOf(' ', firstSpace + 1);
    int thirdSpace = cmd.indexOf(' ', secondSpace + 1);
    int fourthSpace = cmd.indexOf(' ', thirdSpace + 1);
    
    if (firstSpace > 0 && secondSpace > 0 && thirdSpace > 0) {
      headingKp = cmd.substring(firstSpace + 1, secondSpace).toFloat();
      headingKi = cmd.substring(secondSpace + 1, thirdSpace).toFloat();
      
      if (fourthSpace > 0) {
        headingKd = cmd.substring(thirdSpace + 1, fourthSpace).toFloat();
        headingMaxCorrection = cmd.substring(fourthSpace + 1).toFloat();
      } else {
        headingKd = cmd.substring(thirdSpace + 1).toFloat();
      }
      
      Serial.print("Heading PID updated: Kp="); Serial.print(headingKp);
      Serial.print(" Ki="); Serial.print(headingKi);
      Serial.print(" Kd="); Serial.print(headingKd);
      Serial.print(" MaxCorr="); Serial.println(headingMaxCorrection);
    } else {
      Serial.println("ERROR: Format is SET_HEADING_PID <kp> <ki> <kd> [max_correction]");
    }
    return;
  }

  // SET_COMPASS_CAL <off_x> <off_y> <off_z> <scale_x> <scale_y> <scale_z>
  if (cmd.startsWith("SET_COMPASS_CAL ")) {
    float values[6];
    int start = 16;
    bool ok = true;
    for (int i = 0; i < 6; i++) {
      int nextSpace = cmd.indexOf(' ', start);
      String part = (nextSpace < 0) ? cmd.substring(start) : cmd.substring(start, nextSpace);
      if (part.length() == 0) {
        ok = false;
        break;
      }
      values[i] = part.toFloat();
      start = nextSpace + 1;
      if (nextSpace < 0 && i < 5) {
        ok = false;
        break;
      }
    }
    if (ok) {
      compassOffsetX = values[0];
      compassOffsetY = values[1];
      compassOffsetZ = values[2];
      compassScaleX = values[3];
      compassScaleY = values[4];
      compassScaleZ = values[5];
      applyCompassCalibration();
      Serial.println("Compass calibration updated.");
    } else {
      Serial.println("ERROR: Format is SET_COMPASS_CAL <off_x> <off_y> <off_z> <scale_x> <scale_y> <scale_z>");
    }
    return;
  }

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

  if (cmd == "STATUS") {
    sendTelemetryPacket();
    return;
  }

  // TELEMETRY_STREAM [interval_ms]  — start streaming Telemetry data
  if (cmd == "TELEMETRY_STREAM" || cmd.startsWith("TELEMETRY_STREAM ")) {
    if (cmd.length() > 17) {
      int ms = cmd.substring(17).toInt();
      if (ms >= 20 && ms <= 2000) telemetryInterval = ms;
    }
    unsigned long now = millis();
    lastTelemetrySchedule = now;
    lastTelemetryTime = now;
    telemetryStreaming = true;
    Serial.print("Telemetry streaming started @ ");
    Serial.print(telemetryInterval);
    Serial.println(" ms");
    return;
  }

  // TELEMETRY_STOP — stop streaming
  if (cmd == "TELEMETRY_STOP") {
    telemetryStreaming = false;
    Serial.println("Telemetry streaming stopped.");
    return;
  }

  // TELEMETRY_READ — single one-shot Telemetry read
  if (cmd == "TELEMETRY_READ") {
    sendTelemetryPacket();
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

    int spaceIdx = cmd.indexOf(' ');
    String dirStr = cmd.substring(0, spaceIdx);
    int dir = (dirStr == "FORWARD") ? 1 : -1;
    int speed = cmd.substring(spaceIdx + 1).toInt();

    if (speed < 0 || speed > 255) {
      Serial.println("ERROR: Speed must be 0-255.");
      return;
    }

    // Cancel any active turn
    if (turnState != TURN_IDLE) {
      turnState = TURN_IDLE;
      stopMotors();
    }

    rampDir   = dir;
    rampTargetSpeed = speed;
    rampStep  = 0;
    rampStepStart = millis();
    rampState = RAMP_RAMPING;
    
    enableHeadingCorrection(0.0);
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
  Serial.println("  FORWARD <0-255>");
  Serial.println("  BACKWARD <0-255>");
  Serial.println("  SET_SPEED <0-255>");
  Serial.println("  TURN_LEFT_90 <1-255>");
  Serial.println("  TURN_RIGHT_90 <1-255>");
  Serial.println("  HEADING_ON | HEADING_OFF");
  Serial.println("  SET_HEADING_PID <kp> <ki> <kd> [max_correction]");
  Serial.println("  SET_COMPASS_CAL <off_x> <off_y> <off_z> <scale_x> <scale_y> <scale_z>");
  Serial.println("  STOP | S");
  Serial.println("  STATUS");
  Serial.println("  CMD,<v_m/s>,<omega_rad/s>  — Pure Pursuit differential drive");
  Serial.println("  TELEMETRY_STREAM [interval_ms]");
  Serial.println("  TELEMETRY_STOP");
  Serial.println("  TELEMETRY_READ");
  Serial.println("  ENC_RESET");
}

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(100);

  pinMode(M1_RPWM, OUTPUT);  pinMode(M1_LPWM, OUTPUT);
  pinMode(M1_R_EN, OUTPUT);  pinMode(M1_L_EN, OUTPUT);
  pinMode(RIGHT_RPWM, OUTPUT); pinMode(RIGHT_LPWM, OUTPUT);
  pinMode(RIGHT_R_EN, OUTPUT); pinMode(RIGHT_L_EN, OUTPUT);
  pinMode(PLOTTER_RPWM, OUTPUT); pinMode(PLOTTER_LPWM, OUTPUT);
  pinMode(PLOTTER_R_EN, OUTPUT); pinMode(PLOTTER_L_EN, OUTPUT);

  stopMotors();

  digitalWrite(M1_R_EN, HIGH);  digitalWrite(M1_L_EN, HIGH);
  digitalWrite(RIGHT_R_EN, HIGH); digitalWrite(RIGHT_L_EN, HIGH);
  digitalWrite(PLOTTER_R_EN, HIGH); digitalWrite(PLOTTER_L_EN, HIGH);

  // ── Encoder pins (X4 Decoding)
  pinMode(ENC_LEFT_A, INPUT_PULLUP);
  pinMode(ENC_LEFT_B, INPUT_PULLUP);
  pinMode(ENC_RIGHT_A, INPUT_PULLUP);
  pinMode(ENC_RIGHT_B, INPUT_PULLUP);
  
  attachInterrupt(digitalPinToInterrupt(ENC_LEFT_A), ISR_Left_A, CHANGE);
  attachInterrupt(digitalPinToInterrupt(ENC_LEFT_B), ISR_Left_B, CHANGE);
  attachInterrupt(digitalPinToInterrupt(ENC_RIGHT_A), ISR_Right_A, CHANGE);
  attachInterrupt(digitalPinToInterrupt(ENC_RIGHT_B), ISR_Right_B, CHANGE);

  Wire.begin();
  
  // Initialize Compass
  compass.init();
  applyCompassCalibration();
  Serial.println("Configured QMC5883L Compass");
  
  // Initialize GPS on Serial2
  Serial2.begin(9600);
  Serial.println("Configured NEO-M8N GPS on Serial2");

  // ── Auto-start Telemetry streaming for autonomous/EKF operation
  telemetryStreaming = true;
  lastTelemetryTime = millis();
  lastTelemetrySchedule = lastTelemetryTime;
  Serial.print("Telemetry streaming auto-started @ ");
  Serial.print(telemetryInterval);
  Serial.println(" ms");

  Serial.println("Ready.");
}

void loop() {
  // Process GPS Data
  while (Serial2.available() > 0) {
    gps.encode(Serial2.read());
  }
  
  // Update Odometry
  odometryTick();

  // ── Plotting Mechanism update
  plottingTick();

  // ── Non-blocking Telemetry streaming
  if (telemetryStreaming) {
    unsigned long now = millis();
    if (now - lastTelemetrySchedule >= telemetryInterval) {
      lastTelemetrySchedule = now;
      sendTelemetryPacket();
    }
  }

  // ── Non-blocking ramp state machine
  rampTick();

  // ── Non-blocking turn state machine
  turnTick();

  // ── Wheel PID control (CMD,v,omega)
  pidTick();

  // ── Heading Correction PID (Encoder-based)
  headingCorrectionTick();

  // ── Serial command handling (always runs — even during turns)
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    handleCommand(cmd);
  }
}
