#include <Wire.h>
#include <QMC5883LCompass.h>
#include <TinyGPS++.h>

/*
  RoboScan Serial Monitor Controller

  Target board: Arduino Mega
  Serial Monitor: 115200 baud, Newline recommended

  Quick commands:
    W              forward using current speed
    X              backward using current speed
    A              spin left using current speed
    D              spin right using current speed
    S              stop
    SPEED 180      set current speed, 0-255
    F 200          forward at speed 200
    B 160          backward at speed 160
    L 150          spin left at speed 150
    R 150          spin right at speed 150
    STATUS         print one sensor packet
    STREAM ON      keep printing sensor packets
    STREAM OFF     stop continuous sensor packets
    HELP           show commands
*/

QMC5883LCompass compass;
TinyGPSPlus gps;

// Left motor driver
const int M1_RPWM = 5;
const int M1_LPWM = 6;
const int M1_R_EN = 7;
const int M1_L_EN = 8;

// Right motor driver
const int M2_RPWM = 44;
const int M2_LPWM = 45;
const int M2_R_EN = 46;
const int M2_L_EN = 47;

// Optional plotter/sprayer output, kept off in this manual sketch
const int PLOTTER_RPWM = 38;
const int PLOTTER_LPWM = 39;
const int PLOTTER_R_EN = 40;
const int PLOTTER_L_EN = 41;

// Encoder pins, matching the current RoboScan v2 sketch
const int ENC_LEFT_A = 2;
const int ENC_LEFT_B = 18;
const int ENC_RIGHT_A = 3;
const int ENC_RIGHT_B = 19;

const float WHEEL_RADIUS_M = 0.16;
const float WHEEL_CIRC_M = 2.0 * PI * WHEEL_RADIUS_M;
const float TICKS_PER_REV = 2400.0;

volatile long leftEncoderTicks = 0;
volatile long rightEncoderTicks = 0;

int currentSpeed = 160;
int leftMotorSpeed = 0;
int rightMotorSpeed = 0;
int leftMotorDir = 0;
int rightMotorDir = 0;

bool streamSensors = true;
unsigned long sensorIntervalMs = 500;
unsigned long lastSensorPrintMs = 0;
unsigned long lastSpeedSampleMs = 0;
long lastLeftSampleTicks = 0;
long lastRightSampleTicks = 0;
float leftSpeedMps = 0.0;
float rightSpeedMps = 0.0;

void onLeftA() {
  if (digitalRead(ENC_LEFT_A) != digitalRead(ENC_LEFT_B)) leftEncoderTicks++;
  else leftEncoderTicks--;
}

void onLeftB() {
  if (digitalRead(ENC_LEFT_A) == digitalRead(ENC_LEFT_B)) leftEncoderTicks++;
  else leftEncoderTicks--;
}

void onRightA() {
  if (digitalRead(ENC_RIGHT_A) != digitalRead(ENC_RIGHT_B)) rightEncoderTicks++;
  else rightEncoderTicks--;
}

void onRightB() {
  if (digitalRead(ENC_RIGHT_A) == digitalRead(ENC_RIGHT_B)) rightEncoderTicks++;
  else rightEncoderTicks--;
}

void writeDrivePwm(int leftForward, int leftBackward, int rightForward, int rightBackward) {
  analogWrite(M1_RPWM, constrain(leftForward, 0, 255));
  analogWrite(M1_LPWM, constrain(leftBackward, 0, 255));
  analogWrite(M2_RPWM, constrain(rightForward, 0, 255));
  analogWrite(M2_LPWM, constrain(rightBackward, 0, 255));
}

void stopRobot() {
  writeDrivePwm(0, 0, 0, 0);
  leftMotorSpeed = 0;
  rightMotorSpeed = 0;
  leftMotorDir = 0;
  rightMotorDir = 0;
  Serial.println("ACK:STOP");
}

void driveForward(int speed) {
  speed = constrain(speed, 0, 255);
  writeDrivePwm(speed, 0, speed, 0);
  leftMotorSpeed = speed;
  rightMotorSpeed = speed;
  leftMotorDir = speed > 0 ? 1 : 0;
  rightMotorDir = speed > 0 ? 1 : 0;
  Serial.print("ACK:FORWARD|speed=");
  Serial.println(speed);
}

void driveBackward(int speed) {
  speed = constrain(speed, 0, 255);
  writeDrivePwm(0, speed, 0, speed);
  leftMotorSpeed = speed;
  rightMotorSpeed = speed;
  leftMotorDir = speed > 0 ? -1 : 0;
  rightMotorDir = speed > 0 ? -1 : 0;
  Serial.print("ACK:BACKWARD|speed=");
  Serial.println(speed);
}

void spinLeft(int speed) {
  speed = constrain(speed, 0, 255);
  writeDrivePwm(0, speed, speed, 0);
  leftMotorSpeed = speed;
  rightMotorSpeed = speed;
  leftMotorDir = speed > 0 ? -1 : 0;
  rightMotorDir = speed > 0 ? 1 : 0;
  Serial.print("ACK:LEFT|speed=");
  Serial.println(speed);
}

void spinRight(int speed) {
  speed = constrain(speed, 0, 255);
  writeDrivePwm(speed, 0, 0, speed);
  leftMotorSpeed = speed;
  rightMotorSpeed = speed;
  leftMotorDir = speed > 0 ? 1 : 0;
  rightMotorDir = speed > 0 ? -1 : 0;
  Serial.print("ACK:RIGHT|speed=");
  Serial.println(speed);
}

void resetEncoders() {
  noInterrupts();
  leftEncoderTicks = 0;
  rightEncoderTicks = 0;
  interrupts();
  lastLeftSampleTicks = 0;
  lastRightSampleTicks = 0;
  Serial.println("ACK:ENC_RESET");
}

void sampleWheelSpeeds() {
  unsigned long now = millis();
  if (now - lastSpeedSampleMs < 200) return;

  long leftTicks;
  long rightTicks;
  noInterrupts();
  leftTicks = leftEncoderTicks;
  rightTicks = rightEncoderTicks;
  interrupts();

  unsigned long dtMs = now - lastSpeedSampleMs;
  if (dtMs > 0) {
    long dLeft = leftTicks - lastLeftSampleTicks;
    long dRight = rightTicks - lastRightSampleTicks;
    leftSpeedMps = ((abs(dLeft) / TICKS_PER_REV) * WHEEL_CIRC_M) / (dtMs / 1000.0);
    rightSpeedMps = ((abs(dRight) / TICKS_PER_REV) * WHEEL_CIRC_M) / (dtMs / 1000.0);
  }

  lastLeftSampleTicks = leftTicks;
  lastRightSampleTicks = rightTicks;
  lastSpeedSampleMs = now;
}

void printSensorData() {
  long leftTicks;
  long rightTicks;
  noInterrupts();
  leftTicks = leftEncoderTicks;
  rightTicks = rightEncoderTicks;
  interrupts();

  compass.read();
  float heading = compass.getAzimuth();

  Serial.print("DATA");
  Serial.print("|heading="); Serial.print(heading, 2);
  Serial.print("|left_ticks="); Serial.print(leftTicks);
  Serial.print("|right_ticks="); Serial.print(rightTicks);
  Serial.print("|left_mps="); Serial.print(leftSpeedMps, 3);
  Serial.print("|right_mps="); Serial.print(rightSpeedMps, 3);
  Serial.print("|left_pwm="); Serial.print(leftMotorSpeed * leftMotorDir);
  Serial.print("|right_pwm="); Serial.print(rightMotorSpeed * rightMotorDir);
  Serial.print("|gps_fix="); Serial.print(gps.location.isValid() ? 1 : 0);
  Serial.print("|satellites="); Serial.print(gps.satellites.isValid() ? gps.satellites.value() : 0);
  Serial.print("|lat="); Serial.print(gps.location.isValid() ? gps.location.lat() : 0.0, 6);
  Serial.print("|lng="); Serial.println(gps.location.isValid() ? gps.location.lng() : 0.0, 6);
}

int commandSpeedOrDefault(const String &cmd, int firstValueIndex) {
  if (cmd.length() <= firstValueIndex) return currentSpeed;
  int parsedSpeed = cmd.substring(firstValueIndex).toInt();
  return constrain(parsedSpeed, 0, 255);
}

void printHelp() {
  Serial.println();
  Serial.println("RoboScan Serial Monitor Commands");
  Serial.println("  W / X / A / D / S       forward / backward / left / right / stop");
  Serial.println("  SPEED <0-255>           set default speed");
  Serial.println("  F <0-255>               forward at speed");
  Serial.println("  B <0-255>               backward at speed");
  Serial.println("  L <0-255>               spin left at speed");
  Serial.println("  R <0-255>               spin right at speed");
  Serial.println("  STATUS                  print sensor data once");
  Serial.println("  STREAM ON               continuous sensor data");
  Serial.println("  STREAM OFF              stop continuous sensor data");
  Serial.println("  INTERVAL <ms>           sensor interval, 100-5000");
  Serial.println("  ENC_RESET               zero encoder counts");
  Serial.println("  HELP                    show this menu");
  Serial.println();
}

void handleCommand(String cmd) {
  cmd.trim();
  if (cmd.length() == 0) return;
  cmd.toUpperCase();

  if (cmd == "W") {
    driveForward(currentSpeed);
  } else if (cmd == "X") {
    driveBackward(currentSpeed);
  } else if (cmd == "A") {
    spinLeft(currentSpeed);
  } else if (cmd == "D") {
    spinRight(currentSpeed);
  } else if (cmd == "S" || cmd == "STOP") {
    stopRobot();
  } else if (cmd == "STATUS") {
    printSensorData();
  } else if (cmd == "HELP" || cmd == "H" || cmd == "?") {
    printHelp();
  } else if (cmd == "STREAM ON") {
    streamSensors = true;
    Serial.println("ACK:STREAM|state=on");
  } else if (cmd == "STREAM OFF") {
    streamSensors = false;
    Serial.println("ACK:STREAM|state=off");
  } else if (cmd == "ENC_RESET") {
    resetEncoders();
  } else if (cmd.startsWith("SPEED ")) {
    currentSpeed = commandSpeedOrDefault(cmd, 6);
    Serial.print("ACK:SPEED|speed=");
    Serial.println(currentSpeed);
  } else if (cmd.startsWith("F ")) {
    driveForward(commandSpeedOrDefault(cmd, 2));
  } else if (cmd.startsWith("B ")) {
    driveBackward(commandSpeedOrDefault(cmd, 2));
  } else if (cmd.startsWith("L ")) {
    spinLeft(commandSpeedOrDefault(cmd, 2));
  } else if (cmd.startsWith("R ")) {
    spinRight(commandSpeedOrDefault(cmd, 2));
  } else if (cmd.startsWith("INTERVAL ")) {
    sensorIntervalMs = constrain(cmd.substring(9).toInt(), 100, 5000);
    Serial.print("ACK:INTERVAL|ms=");
    Serial.println(sensorIntervalMs);
  } else {
    Serial.print("ERROR:Unknown_command|cmd=");
    Serial.println(cmd);
    printHelp();
  }
}

void setup() {
  Serial.begin(115200);
  Serial.setTimeout(100);

  pinMode(M1_RPWM, OUTPUT);
  pinMode(M1_LPWM, OUTPUT);
  pinMode(M1_R_EN, OUTPUT);
  pinMode(M1_L_EN, OUTPUT);
  pinMode(M2_RPWM, OUTPUT);
  pinMode(M2_LPWM, OUTPUT);
  pinMode(M2_R_EN, OUTPUT);
  pinMode(M2_L_EN, OUTPUT);
  pinMode(PLOTTER_RPWM, OUTPUT);
  pinMode(PLOTTER_LPWM, OUTPUT);
  pinMode(PLOTTER_R_EN, OUTPUT);
  pinMode(PLOTTER_L_EN, OUTPUT);

  digitalWrite(M1_R_EN, HIGH);
  digitalWrite(M1_L_EN, HIGH);
  digitalWrite(M2_R_EN, HIGH);
  digitalWrite(M2_L_EN, HIGH);
  digitalWrite(PLOTTER_R_EN, HIGH);
  digitalWrite(PLOTTER_L_EN, HIGH);
  digitalWrite(PLOTTER_RPWM, LOW);
  digitalWrite(PLOTTER_LPWM, LOW);

  pinMode(ENC_LEFT_A, INPUT_PULLUP);
  pinMode(ENC_LEFT_B, INPUT_PULLUP);
  pinMode(ENC_RIGHT_A, INPUT_PULLUP);
  pinMode(ENC_RIGHT_B, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(ENC_LEFT_A), onLeftA, CHANGE);
  attachInterrupt(digitalPinToInterrupt(ENC_LEFT_B), onLeftB, CHANGE);
  attachInterrupt(digitalPinToInterrupt(ENC_RIGHT_A), onRightA, CHANGE);
  attachInterrupt(digitalPinToInterrupt(ENC_RIGHT_B), onRightB, CHANGE);

  Wire.begin();
  compass.init();

  Serial2.begin(9600);

  stopRobot();
  lastSensorPrintMs = millis();
  lastSpeedSampleMs = millis();

  Serial.println("READY:RoboScan_serial_monitor_controller");
  printHelp();
}

void loop() {
  while (Serial2.available() > 0) {
    gps.encode(Serial2.read());
  }

  sampleWheelSpeeds();

  if (streamSensors && millis() - lastSensorPrintMs >= sensorIntervalMs) {
    lastSensorPrintMs = millis();
    printSensorData();
  }

  if (Serial.available() > 0) {
    handleCommand(Serial.readStringUntil('\n'));
  }
}
