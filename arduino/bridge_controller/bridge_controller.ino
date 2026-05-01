#include <Wire.h>
#include <FaBo9Axis_MPU9250.h>

// ── LEFT Motor (M1)
const int LEFT_RPWM = 5,  LEFT_LPWM = 6,  LEFT_R_EN = 7,  LEFT_L_EN = 8;
// ── RIGHT Motor (M2)
const int RIGHT_RPWM = 9, RIGHT_LPWM = 10, RIGHT_R_EN = 11, RIGHT_L_EN = 12;

// ── Paint Mechanism (Solenoid / Relay)
const int PAINT_PIN = A0;

// ── Encoder pins
const int ENC1_A = 2;   // INT0
const int ENC1_B = 4;
const int ENC2_A = 3;   // INT1
const int ENC2_B = 13;

FaBo9Axis fabo_9axis;

volatile long encoder1_count = 0;
volatile long encoder2_count = 0;

int currentSpeed = 150;
bool isPainting = false;

unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 500; // 500ms for app updates

// Encoder ISRs
void ISR_encoder1() {
  if (digitalRead(ENC1_B) == HIGH) { encoder1_count++; } else { encoder1_count--; }
}

void ISR_encoder2() {
  if (digitalRead(ENC2_B) == HIGH) { encoder2_count++; } else { encoder2_count--; }
}

void setup() {
  Serial.begin(115200);
  
  pinMode(LEFT_RPWM, OUTPUT);  pinMode(LEFT_LPWM, OUTPUT);
  pinMode(LEFT_R_EN, OUTPUT);  pinMode(LEFT_L_EN, OUTPUT);
  pinMode(RIGHT_RPWM, OUTPUT); pinMode(RIGHT_LPWM, OUTPUT);
  pinMode(RIGHT_R_EN, OUTPUT); pinMode(RIGHT_L_EN, OUTPUT);
  
  pinMode(PAINT_PIN, OUTPUT);
  digitalWrite(PAINT_PIN, LOW);

  digitalWrite(LEFT_R_EN, HIGH);  digitalWrite(LEFT_L_EN, HIGH);
  digitalWrite(RIGHT_R_EN, HIGH); digitalWrite(RIGHT_L_EN, HIGH);

  pinMode(ENC1_A, INPUT_PULLUP); pinMode(ENC1_B, INPUT_PULLUP);
  pinMode(ENC2_A, INPUT_PULLUP); pinMode(ENC2_B, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(ENC1_A), ISR_encoder1, RISING);
  attachInterrupt(digitalPinToInterrupt(ENC2_A), ISR_encoder2, RISING);

  Wire.begin();
  if (fabo_9axis.begin()) {
    // Configured IMU
  }
}

void setMotors(int leftPwm, int rightPwm) {
  if (leftPwm >= 0) {
    analogWrite(LEFT_LPWM, 0); analogWrite(LEFT_RPWM, leftPwm);
  } else {
    analogWrite(LEFT_RPWM, 0); analogWrite(LEFT_LPWM, -leftPwm);
  }
  if (rightPwm >= 0) {
    analogWrite(RIGHT_LPWM, 0); analogWrite(RIGHT_RPWM, rightPwm);
  } else {
    analogWrite(RIGHT_RPWM, 0); analogWrite(RIGHT_LPWM, -rightPwm);
  }
}

void stopMotors() { setMotors(0, 0); }

void handleCommand(String cmd) {
  cmd.trim();
  cmd.toUpperCase();
  
  if (cmd == "FORWARD") { setMotors(currentSpeed, currentSpeed); }
  else if (cmd == "BACKWARD") { setMotors(-currentSpeed, -currentSpeed); }
  else if (cmd == "LEFT") { setMotors(-currentSpeed, currentSpeed); }
  else if (cmd == "RIGHT") { setMotors(currentSpeed, -currentSpeed); }
  else if (cmd == "STOP" || cmd == "S") { stopMotors(); }
  else if (cmd.startsWith("SET_SPEED")) {
    int spaceIdx = cmd.indexOf(' ');
    if (spaceIdx > 0) {
      currentSpeed = cmd.substring(spaceIdx + 1).toInt();
      currentSpeed = constrain(currentSpeed, 0, 255);
    }
  }
  else if (cmd == "PAINT_ON") {
    isPainting = true;
    digitalWrite(PAINT_PIN, HIGH);
  }
  else if (cmd == "PAINT_OFF") {
    isPainting = false;
    digitalWrite(PAINT_PIN, LOW);
  }
}

void loop() {
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    handleCommand(cmd);
  }

  unsigned long now = millis();
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = now;
    
    // Read IMU
    float ax, ay, az, gx, gy, gz, mx, my, mz;
    fabo_9axis.readAccelXYZ(&ax, &ay, &az);
    fabo_9axis.readGyroXYZ(&gx, &gy, &gz);
    fabo_9axis.readMagnetXYZ(&mx, &my, &mz);
    
    // Calculate basic heading (for telemetry)
    float heading = atan2(my, mx) * 180.0 / PI;
    if (heading < 0) heading += 360.0;
    float pitch = atan2(ay, sqrt(ax * ax + az * az)) * 180.0 / PI;
    float roll = atan2(-ax, az) * 180.0 / PI;

    noInterrupts();
    long c1 = encoder1_count;
    long c2 = encoder2_count;
    interrupts();

    // Send JSON telemetry (matches server parser format)
    Serial.print("{\"type\":\"telemetry\"");
    Serial.print(",\"encL\":"); Serial.print(c1);
    Serial.print(",\"encR\":"); Serial.print(c2);
    Serial.print(",\"pitch\":"); Serial.print(pitch, 2);
    Serial.print(",\"roll\":"); Serial.print(roll, 2);
    Serial.print(",\"yaw\":"); Serial.print(heading, 2);
    Serial.print(",\"compass\":"); Serial.print(heading, 2);
    Serial.print(",\"battery\":"); Serial.print(random(80, 100)); // Simulated battery
    Serial.println("}");
  }
}
