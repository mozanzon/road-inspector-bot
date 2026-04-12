// ============================================================
//  Dual Quadrature Encoder Test – Arduino Uno
//  Encoders: YT06-OP-600B-2M  (600 PPR)
// ============================================================
//
//  Wiring summary:
//    Encoder 1 – A → pin 2 (INT0)   B → pin 4 (digital in)
//    Encoder 2 – A → pin 3 (INT1)   B → pin 5 (digital in)
//
//  Quadrature direction logic (X1 encoding on channel A):
//    When a RISING edge is detected on A:
//      – If B is HIGH  → channels are in-phase  → CW  → count++
//      – If B is LOW   → channels are out-of-phase → CCW → count--
//    This is the standard single-edge (X1) quadrature decode.
//    For 600 PPR encoders this gives 600 counts per revolution.
//    Full X4 decoding (all edges on both A and B) would give
//    2400 counts/rev but requires digitalRead inside every ISR,
//    which is slower on the Uno — X1 is reliable at this PPR.
//
//  Serial output: every 100 ms at 115200 baud
// ============================================================

// ── Pin definitions ─────────────────────────────────────────

// Encoder 1
const int ENC1_A = 2;   // Interrupt pin (INT0) – RISING edge triggers ISR
const int ENC1_B = 4;   // Digital input  – read inside ISR to get direction

// Encoder 2
const int ENC2_A = 3;   // Interrupt pin (INT1) – RISING edge triggers ISR
const int ENC2_B = 5;   // Digital input  – read inside ISR to get direction


// ── Shared variables (written in ISR, read in loop) ─────────
//  'volatile' tells the compiler these can change at any time
//  outside the normal program flow (i.e. inside an interrupt).
//  Without volatile the compiler may cache the value in a
//  register and loop() would never see the updated count.

volatile long encoder1_count = 0;
volatile long encoder2_count = 0;

volatile bool encoder1_cw = true;   // true = CW, false = CCW
volatile bool encoder2_cw = true;


// ── Timing ──────────────────────────────────────────────────
const unsigned long PRINT_INTERVAL = 100;   // ms
unsigned long lastPrintTime = 0;


// ============================================================
//  ISR – Encoder 1  (fires on every RISING edge of pin 2 / A)
//
//  At the moment A goes HIGH we sample B:
//    B HIGH → A leads B → Clockwise       → increment
//    B LOW  → B leads A → Counter-clockwise → decrement
// ============================================================
void ISR_encoder1() {
  if (digitalRead(ENC1_B) == HIGH) {
    encoder1_count++;
    encoder1_cw = true;
  } else {
    encoder1_count--;
    encoder1_cw = false;
  }
}


// ============================================================
//  ISR – Encoder 2  (fires on every RISING edge of pin 3 / A)
//
//  Identical logic applied to encoder 2's channels.
// ============================================================
void ISR_encoder2() {
  if (digitalRead(ENC2_B) == HIGH) {
    encoder2_count++;
    encoder2_cw = true;
  } else {
    encoder2_count--;
    encoder2_cw = false;
  }
}


// ============================================================
//  setup()
// ============================================================
void setup() {
  Serial.begin(115200);
  Serial.println("=== Dual Encoder Test – YT06-OP-600B-2M (600 PPR) ===");
  Serial.println("Rotate each encoder to verify count and direction.");
  Serial.println("------------------------------------------------------");

  // ── Configure encoder pins ───────────────────────────────
  // Channel A pins are inputs with the internal pull-up enabled.
  // The YT06 is an open-collector output encoder, so the pull-up
  // ensures the pin sits HIGH when no pulse is active.
  pinMode(ENC1_A, INPUT_PULLUP);
  pinMode(ENC1_B, INPUT_PULLUP);
  pinMode(ENC2_A, INPUT_PULLUP);
  pinMode(ENC2_B, INPUT_PULLUP);

  // ── Attach interrupts ────────────────────────────────────
  // attachInterrupt(digitalPinToInterrupt(pin), ISR, mode)
  //   digitalPinToInterrupt() converts a pin number to the
  //   correct interrupt number (safer than hard-coding 0/1).
  //   RISING: ISR fires when pin transitions LOW → HIGH.
  attachInterrupt(digitalPinToInterrupt(ENC1_A), ISR_encoder1, RISING);
  attachInterrupt(digitalPinToInterrupt(ENC2_A), ISR_encoder2, RISING);
}


// ============================================================
//  loop() – print encoder state every 100 ms
//
//  We snapshot the volatile counters with interrupts briefly
//  disabled to prevent a half-updated read if an ISR fires
//  in the middle of copying a multi-byte long value.
// ============================================================
void loop() {
  unsigned long now = millis();

  if (now - lastPrintTime >= PRINT_INTERVAL) {
    lastPrintTime = now;

    // ── Atomic snapshot ──────────────────────────────────
    // 'long' is 4 bytes on the Uno. An ISR could update the
    // counter between byte reads, corrupting the snapshot.
    // Disabling interrupts for the copy makes it atomic.
    noInterrupts();
    long count1 = encoder1_count;
    long count2 = encoder2_count;
    bool  cw1   = encoder1_cw;
    bool  cw2   = encoder2_cw;
    interrupts();

    // ── Print results ────────────────────────────────────
    Serial.print("ENC1 | Count: ");
    Serial.print(count1);
    Serial.print("\tDir: ");
    Serial.print(cw1 ? "CW " : "CCW");

    Serial.print("    ||    ENC2 | Count: ");
    Serial.print(count2);
    Serial.print("\tDir: ");
    Serial.println(cw2 ? "CW " : "CCW");
  }
}

