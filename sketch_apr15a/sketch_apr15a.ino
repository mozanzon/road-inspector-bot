// L298N zero-code-change wiring (keep sketch logic unchanged):
// D5  (LEFT_RPWM)  -> IN1
// D6  (LEFT_LPWM)  -> IN2
// D9  (RIGHT_RPWM) -> IN3
// D10 (RIGHT_LPWM) -> IN4
//
// Keep ENA/ENB enabled on the L298N module (jumpers on), so D7/D8/D11/D12
// can remain unused from a wiring perspective.
// Power notes: share GND between Arduino and L298N; motors to OUT1/OUT2 and
// OUT3/OUT4; provide suitable external motor supply to the driver.
//
// Serial test sequence:
//   SPD,120
//   F
//   S
//   B
//   S

// ── LEFT Motor (M1)
const int LEFT_RPWM = 5,  LEFT_LPWM = 6,  LEFT_R_EN = 7,  LEFT_L_EN = 8;

// ── RIGHT Motor (M2)
const int RIGHT_RPWM = 9, RIGHT_LPWM = 10, RIGHT_R_EN = 11, RIGHT_L_EN = 12;

// ── Encoder pins (quadrature, X1 encoding on channel A rising edge)
//     ENC2_B moved to pin 13 to avoid conflict with LEFT_RPWM (pin 5)
const int ENC1_A = 2;   // Interrupt pin (INT0)
const int ENC1_B = 4;
const int ENC2_A = 3;   // Interrupt pin (INT1)
const int ENC2_B = 13;  // Was pin 5 in draft — moved to avoid LEFT_RPWM conflict

int motorSpeed = 150;

void stopMotors() {
  analogWrite(LEFT_RPWM, 0);
  analogWrite(LEFT_LPWM, 0);
  analogWrite(RIGHT_RPWM, 0);
  analogWrite(RIGHT_LPWM, 0);
}

void moveForward(int speed) {
  analogWrite(LEFT_LPWM, 0);
  analogWrite(RIGHT_LPWM, 0);
  analogWrite(LEFT_RPWM, speed);
  analogWrite(RIGHT_RPWM, speed);
}

void moveBackward(int speed) {
  analogWrite(LEFT_RPWM, 0);
  analogWrite(RIGHT_RPWM, 0);
  analogWrite(LEFT_LPWM, speed);
  analogWrite(RIGHT_LPWM, speed);
}

void setup() {
  Serial.begin(115200);

  pinMode(LEFT_RPWM, OUTPUT);
  pinMode(LEFT_LPWM, OUTPUT);
  pinMode(LEFT_R_EN, OUTPUT);
  pinMode(LEFT_L_EN, OUTPUT);
  pinMode(RIGHT_RPWM, OUTPUT);
  pinMode(RIGHT_LPWM, OUTPUT);
  pinMode(RIGHT_R_EN, OUTPUT);
  pinMode(RIGHT_L_EN, OUTPUT);

  digitalWrite(LEFT_R_EN, HIGH);
  digitalWrite(LEFT_L_EN, HIGH);
  digitalWrite(RIGHT_R_EN, HIGH);
  digitalWrite(RIGHT_L_EN, HIGH);

  stopMotors();
  Serial.println("Ready. Use F, B, S, or SPD,<0-255>.");
}

void loop() {
  if (!Serial.available()) {
    return;
  }

  String cmd = Serial.readStringUntil('\n');
  cmd.trim();
  cmd.toUpperCase();

  if (cmd == "F") {
    moveForward(motorSpeed);
    Serial.println("Forward");
    return;
  }

  if (cmd == "B") {
    moveBackward(motorSpeed);
    Serial.println("Backward");
    return;
  }

  if (cmd == "S") {
    stopMotors();
    Serial.println("Stopped");
    return;
  }

  if (cmd.startsWith("SPD,")) {
    int speed = cmd.substring(4).toInt();
    if (speed < 0 || speed > 255) {
      Serial.println("ERROR: speed must be 0-255");
      return;
    }

    motorSpeed = speed;
    Serial.print("Speed set to ");
    Serial.println(motorSpeed);
    return;
  }

  Serial.println("Unknown command");
}
