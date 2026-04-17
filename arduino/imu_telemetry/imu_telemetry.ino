#include <Wire.h>
#include <MPU9250.h> // Requires Bolder Flight Systems MPU9250 library or similar
// Also requires a Madgwick or Mahony filter library if you want custom filtering, 
// but often the MPU9250 libraries come with basic fusion or we can implement a simple one.

/*
 * NOTE: For maximum accuracy and speed, this code assumes you have the Bolder Flight Systems 
 * MPU9250 library installed in your Arduino IDE. 
 * Alternatively, you can use the "MadgwickAHRS" library.
 */

MPU9250 mpu(Wire, 0x68);
int status;

// Timing for the filter
unsigned long lastUpdate = 0;

void setup() {
  Serial.begin(115200);
  while (!Serial) {}

  Wire.begin();
  
  status = mpu.begin();
  if (status < 0) {
    Serial.println("{\"error\": \"IMU initialization unsuccessful\"}");
    while (1) {}
  }
  
  // Set parameters for fast response
  mpu.setSrd(4); // Sample rate divider. Higher number = lower speed. 4 ~ 200 Hz.
}

void loop() {
  mpu.readSensor();

  // The BolderFlight library handles the calibration and some internal filtering.
  // Alternatively, if you want raw quaternion/Madgwick, you feed mpu.getAccelX(), getGyroX(), getMagX() into it.
  // For the sake of simplicity and getting a high-speed accurate reading, we can output the calculated Euler angles if available,
  // or simple approximation.
  
  // Actually, let's use the standard accelerometer/magnetometer to Euler approach
  // Many MPU9250 libraries don't natively output Euler angles without the DMP (which MPU9250 doesn't fully support easily).
  // Assuming a generic approach where you might apply Madgwick externally or use a robust library:
  
  float ax = mpu.getAccelX_mss();
  float ay = mpu.getAccelY_mss();
  float az = mpu.getAccelZ_mss();
  
  float gx = mpu.getGyroX_rads();
  float gy = mpu.getGyroY_rads();
  float gz = mpu.getGyroZ_rads();

  float mx = mpu.getMagX_uT();
  float my = mpu.getMagY_uT();
  float mz = mpu.getMagZ_uT();

  // Note: To truly get an accurate heading (Yaw), you MUST calibrate the magnetometer.
  // For this template, we will simulate a fast filter update or just output raw/approximate if a filter isn't integrated.
  // Ideally, use a Madgwick filter object here: `filter.update(gx, gy, gz, ax, ay, az, mx, my, mz);`
  // `pitch = filter.getPitch(); roll = filter.getRoll(); yaw = filter.getYaw();`
  
  // Placeholder for filter output (replace with actual Madgwick filter for production):
  // We use a simple approximation for pitch and roll:
  float pitch = atan2(-ax, sqrt(ay * ay + az * az)) * 180.0 / PI;
  float roll = atan2(ay, az) * 180.0 / PI;
  
  // Simple heading from Magnetometer (Requires tilt compensation usually)
  float heading = atan2(-my, mx) * 180.0 / PI;
  if (heading < 0) {
    heading += 360.0;
  }

  // Print JSON
  Serial.print("{\"yaw\":");
  Serial.print(heading, 2);
  Serial.print(",\"pitch\":");
  Serial.print(pitch, 2);
  Serial.print(",\"roll\":");
  Serial.print(roll, 2);
  Serial.println("}");

  delay(20); // ~50Hz update rate
}
