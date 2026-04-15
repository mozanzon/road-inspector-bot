#include <ctype.h>
#include <stdlib.h>
#include <string.h>

// L298N test sketch (same pin layout retained)
// Direction pins:
// D5 -> IN1, D6 -> IN2, D9 -> IN3, D10 -> IN4
// Enable pins (no jumpers):
// Preferred: D7 -> ENA, D11 -> ENB
// Also forced HIGH in code: D8, D12 (safe fallback if wired there by mistake)

// ── LEFT Motor (M1)
const int LEFT_RPWM = 5, LEFT_LPWM = 6, LEFT_R_EN = 7, LEFT_L_EN = 8;

// ── RIGHT Motor (M2)
const int RIGHT_RPWM = 9, RIGHT_LPWM = 10, RIGHT_R_EN = 11, RIGHT_L_EN = 12;

// ── Encoder pins (kept for layout compatibility, unused in this test)
const int ENC1_A = 2;
const int ENC1_B = 4;
const int ENC2_A = 3;
const int ENC2_B = 13;

int defaultSpeed = 140;

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
  digitalWrite(LEFT_R_EN, HIGH);   // preferred ENA
  digitalWrite(RIGHT_R_EN, HIGH);  // preferred ENB
  digitalWrite(LEFT_L_EN, HIGH);   // fallback
  digitalWrite(RIGHT_L_EN, HIGH);  // fallback
}

void forwardMotion(int spd) { drive(spd, spd); }
void backwardMotion(int spd) { drive(-spd, -spd); }
void leftSpinMotion(int spd) { drive(-spd, spd); }
void rightSpinMotion(int spd) { drive(spd, -spd); }

void printHelp() {
  Serial.println("Commands: F [n], B [n], L [n], R [n], S, SPD n, HELP");
}

void setup() {
  Serial.begin(115200);

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
  Serial.println("L298N test ready.");
  printHelp();
}

void loop() {
  if (!Serial.available()) return;

  static char cmd[32];
  size_t n = Serial.readBytesUntil('\n', cmd, sizeof(cmd) - 1);
  cmd[n] = '\0';
  if (n == 0) return;

  while (n > 0 && (cmd[n - 1] == '\r' || cmd[n - 1] == ' ')) cmd[--n] = '\0';
  for (size_t i = 0; i < n; i++) cmd[i] = (char)toupper((unsigned char)cmd[i]);

  if (strcmp(cmd, "S") == 0) {
    drive(0, 0);
    Serial.println("Stopped");
    return;
  }

  if (strcmp(cmd, "HELP") == 0) {
    printHelp();
    return;
  }

  if (strncmp(cmd, "SPD ", 4) == 0) {
    int spd = 0;
    if (!parseByteValue(cmd + 4, spd)) {
      Serial.println("ERROR: SPD must be 0-255");
      return;
    }
    defaultSpeed = spd;
    Serial.print("Default speed = ");
    Serial.println(defaultSpeed);
    return;
  }

  char action = cmd[0];
  int spd = defaultSpeed;

  if (cmd[1] == ' ') {
    if (!parseByteValue(cmd + 2, spd)) {
      Serial.println("ERROR: speed must be 0-255");
      return;
    }
  } else if (cmd[1] != '\0') {
    Serial.println("Unknown command. Type HELP.");
    return;
  }

  switch (action) {
    case 'F':
      enableDriver();
      forwardMotion(spd);
      Serial.println("Forward");
      break;
    case 'B':
      enableDriver();
      backwardMotion(spd);
      Serial.println("Backward");
      break;
    case 'L':
      enableDriver();
      leftSpinMotion(spd);
      Serial.println("Left");
      break;
    case 'R':
      enableDriver();
      rightSpinMotion(spd);
      Serial.println("Right");
      break;
    default:
      Serial.println("Unknown command. Type HELP.");
      break;
  }
}
