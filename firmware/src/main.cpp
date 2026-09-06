// ============================================================
// Fish Farm IoT - ESP32 Firmware
// Automated Water Regulation System
// ============================================================
// Author: Eromosele Darlington Oscar
// Project: IoT-Based Automated Water Regulation for Fish Farming
// ============================================================

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <HTTPClient.h>
#include <Update.h>

// ============================================================
// PIN DEFINITIONS
// ============================================================
// Analog Sensors
#define PH_SENSOR_PIN        36    // ADC1_CH0 - pH sensor
#define DO_SENSOR_PIN        39    // ADC1_CH3 - Dissolved Oxygen
#define TURBIDITY_SENSOR_PIN 34    // ADC1_CH6 - Turbidity sensor
#define WATER_LEVEL_PIN      35    // ADC1_CH7 - Water level sensor
#define TEMP_SENSOR_PIN      32    // DS18B20 or NTC thermistor

// Digital Sensors
#define FLOW_SENSOR_PIN      25    // Water flow meter (pulse)

// Actuators
#define WATER_PUMP_PIN       26    // Water circulation pump (Relay 1)
#define AERATOR_PIN          27    // Aerator/Oxygen pump (Relay 2)
#define FEEDER_MOTOR_PIN     14    // Automatic feeder (Relay 3)
#define DRAIN_VALVE_PIN      12    // Drain solenoid valve (Relay 4)
#define INLET_VALVE_PIN      13    // Inlet solenoid valve (Relay 5)
#define HEATER_PIN           23    // Water heater (Relay 6)

// Status LEDs
#define LED_STATUS           2     // Built-in LED
#define LED_WIFI             15    // WiFi status LED
#define LED_MQTT             16    // MQTT status LED

// ============================================================
// CONFIGURATION
// ============================================================
// WiFi Configuration
const char* WIFI_SSID = "FISH_FARM_WIFI";
const char* WIFI_PASSWORD = "fishfarm2025";

// MQTT Configuration
const char* MQTT_BROKER = "broker.hivemq.com";
const int MQTT_PORT = 1883;
const char* MQTT_CLIENT_ID = "esp32_fishfarm_001";
const char* MQTT_TOPIC_DATA = "fishfarm/sensors/data";
const char* MQTT_TOPIC_COMMAND = "fishfarm/actuators/command";
const char* MQTT_TOPIC_STATUS = "fishfarm/system/status";
const char* MQTT_TOPIC_ALERT = "fishfarm/alerts";

// API Configuration
const char* API_SERVER = "http://192.168.1.100:5000";
const char* API_ENDPOINT = "/api/sensors";

// Sampling intervals (milliseconds)
const unsigned long SENSOR_READ_INTERVAL = 5000;    // 5 seconds
const unsigned long MQTT_PUBLISH_INTERVAL = 10000;  // 10 seconds
const unsigned long CONTROL_CHECK_INTERVAL = 2000;  // 2 seconds
const unsigned long HEARTBEAT_INTERVAL = 30000;     // 30 seconds

// ============================================================
// THRESHOLD PARAMETERS
// ============================================================
struct WaterParams {
    float ph_min = 6.5;
    float ph_max = 8.5;
    float do_min = 5.0;        // mg/L
    float do_max = 9.0;
    float temp_min = 24.0;     // °C
    float temp_max = 30.0;
    float turbidity_max = 50.0; // NTU
    float water_level_min = 0.3; // meters
    float water_level_max = 1.2;
};

WaterParams thresholds;

// ============================================================
// SENSOR DATA STRUCTURE
// ============================================================
struct SensorData {
    float ph;
    float dissolved_oxygen;
    float temperature;
    float turbidity;
    float water_level;
    float flow_rate;
    unsigned long timestamp;
    bool valid;
};

SensorData currentData;

// ============================================================
// ACTUATOR STATE
// ============================================================
struct ActuatorState {
    bool water_pump;
    bool aerator;
    bool feeder;
    bool drain_valve;
    bool inlet_valve;
    bool heater;
};

ActuatorState actuators;

// ============================================================
// ALERT STRUCTURE
// ============================================================
struct Alert {
    String type;
    String message;
    String severity;
    unsigned long timestamp;
};

// ============================================================
// GLOBAL OBJECTS
// ============================================================
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
Preferences preferences;

// Timing variables
unsigned long lastSensorRead = 0;
unsigned long lastMqttPublish = 0;
unsigned long lastControlCheck = 0;
unsigned long lastHeartbeat = 0;

// Calibration values (from factory calibration or field calibration)
float phOffset = 0.0;
float doOffset = 0.0;
float tempOffset = 0.0;
float turbidityOffset = 0.0;

// ============================================================
// FUNCTION DECLARATIONS
// ============================================================
void setupWiFi();
void setupMQTT();
void setupSensors();
void setupActuators();
void readSensors();
float readPH();
float readDissolvedOxygen();
float readTemperature();
float readTurbidity();
float readWaterLevel();
float readFlowRate();
void controlActuators();
void publishData();
void handleMQTTMessage(char* topic, byte* payload, unsigned int length);
void sendAlert(String type, String message, String severity);
void loadCalibration();
void saveCalibration();
void printSensorData();

// ============================================================
// SETUP
// ============================================================
void setup() {
    Serial.begin(115200);
    Serial.println("\n========================================");
    Serial.println("  Fish Farm IoT - Water Regulation System");
    Serial.println("  Firmware Version: 1.0.0");
    Serial.println("========================================\n");

    // Initialize preferences for NVS storage
    preferences.begin("fishfarm", false);

    // Setup components
    setupSensors();
    setupActuators();
    setupWiFi();
    setupMQTT();
    loadCalibration();

    Serial.println("\n[SYSTEM] Initialization complete!");
    Serial.println("[SYSTEM] Starting main loop...\n");
}

// ============================================================
// MAIN LOOP
// ============================================================
void loop() {
    unsigned long currentTime = millis();

    // Maintain MQTT connection
    if (!mqttClient.connected()) {
        setupMQTT();
    }
    mqttClient.loop();

    // Read sensors at defined interval
    if (currentTime - lastSensorRead >= SENSOR_READ_INTERVAL) {
        readSensors();
        printSensorData();
        lastSensorRead = currentTime;
    }

    // Publish data via MQTT
    if (currentTime - lastMqttPublish >= MQTT_PUBLISH_INTERVAL) {
        publishData();
        lastMqttPublish = currentTime;
    }

    // Run control logic
    if (currentTime - lastControlCheck >= CONTROL_CHECK_INTERVAL) {
        controlActuators();
        lastControlCheck = currentTime;
    }

    // Send heartbeat
    if (currentTime - lastHeartbeat >= HEARTBEAT_INTERVAL) {
        sendHeartbeat();
        lastHeartbeat = currentTime;
    }

    delay(10); // Small delay for stability
}

// ============================================================
// WIFI SETUP
// ============================================================
void setupWiFi() {
    Serial.print("[WIFI] Connecting to ");
    Serial.println(WIFI_SSID);

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n[WIFI] Connected!");
        Serial.print("[WIFI] IP Address: ");
        Serial.println(WiFi.localIP());
        digitalWrite(LED_WIFI, HIGH);
    } else {
        Serial.println("\n[WIFI] Connection failed! Using AP mode...");
        WiFi.mode(WIFI_AP);
        WiFi.softAP("FishFarm_Setup", "12345678");
        Serial.print("[WIFI] AP IP: ");
        Serial.println(WiFi.softAPIP());
    }
}

// ============================================================
// MQTT SETUP
// ============================================================
void setupMQTT() {
    mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
    mqttClient.setCallback(handleMQTTMessage);

    int retries = 0;
    while (!mqttClient.connected() && retries < 3) {
        Serial.print("[MQTT] Connecting to broker...");

        if (mqttClient.connect(MQTT_CLIENT_ID)) {
            Serial.println(" connected!");
            digitalWrite(LED_MQTT, HIGH);

            // Subscribe to command topic
            mqttClient.subscribe(MQTT_TOPIC_COMMAND);
            Serial.println("[MQTT] Subscribed to command topic");

            // Publish online status
            mqttClient.publish(MQTT_TOPIC_STATUS, "online");
        } else {
            Serial.print(" failed, rc=");
            Serial.println(mqttClient.state());
            delay(2000);
            retries++;
        }
    }
}

// ============================================================
// SENSOR SETUP
// ============================================================
void setupSensors() {
    // Configure ADC resolution
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);

    // Configure flow sensor
    pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);

    // Configure status LEDs
    pinMode(LED_STATUS, OUTPUT);
    pinMode(LED_WIFI, OUTPUT);
    pinMode(LED_MQTT, OUTPUT);

    digitalWrite(LED_STATUS, HIGH);
    Serial.println("[SENSOR] Sensors initialized");
}

// ============================================================
// ACTUATOR SETUP
// ============================================================
void setupActuators() {
    // Configure relay pins
    pinMode(WATER_PUMP_PIN, OUTPUT);
    pinMode(AERATOR_PIN, OUTPUT);
    pinMode(FEEDER_MOTOR_PIN, OUTPUT);
    pinMode(DRAIN_VALVE_PIN, OUTPUT);
    pinMode(INLET_VALVE_PIN, OUTPUT);
    pinMode(HEATER_PIN, OUTPUT);

    // Initialize all actuators to OFF (relay active low typically)
    digitalWrite(WATER_PUMP_PIN, HIGH);   // HIGH = OFF for active-low relays
    digitalWrite(AERATOR_PIN, HIGH);
    digitalWrite(FEEDER_MOTOR_PIN, HIGH);
    digitalWrite(DRAIN_VALVE_PIN, HIGH);
    digitalWrite(INLET_VALVE_PIN, HIGH);
    digitalWrite(HEATER_PIN, HIGH);

    // Initialize state
    actuators.water_pump = false;
    actuators.aerator = false;
    actuators.feeder = false;
    actuators.drain_valve = false;
    actuators.inlet_valve = false;
    actuators.heater = false;

    Serial.println("[ACTUATOR] All actuators initialized to OFF");
}

// ============================================================
// SENSOR READING FUNCTIONS
// ============================================================
void readSensors() {
    currentData.ph = readPH();
    currentData.dissolved_oxygen = readDissolvedOxygen();
    currentData.temperature = readTemperature();
    currentData.turbidity = readTurbidity();
    currentData.water_level = readWaterLevel();
    currentData.flow_rate = readFlowRate();
    currentData.timestamp = millis();
    currentData.valid = true;

    // Validate readings
    if (isnan(currentData.ph) || isnan(currentData.temperature)) {
        currentData.valid = false;
        Serial.println("[SENSOR] Warning: Invalid sensor reading detected");
    }
}

float readPH() {
    // Read analog value from pH sensor
    int rawValue = analogRead(PH_SENSOR_PIN);
    float voltage = (rawValue / 4095.0) * 3.3;

    // Convert voltage to pH (typical pH sensor: 0V = pH 14, 3.3V = pH 0)
    // Adjust based on your specific sensor calibration
    float phValue = 7.0 + ((2.5 - voltage) / 0.18);  // Slope: 0.18 pH/V

    // Apply calibration offset
    phValue += phOffset;

    // Constrain to valid range
    return constrain(phValue, 0.0, 14.0);
}

float readDissolvedOxygen() {
    // Read analog value from DO sensor (e.g., DS-E5168 or similar)
    int rawValue = analogRead(DO_SENSOR_PIN);
    float voltage = (rawValue / 4095.0) * 3.3;

    // Convert voltage to DO (mg/L)
    // Calibration: 0% DO at ~0.5V, 100% DO at ~2.5V (at 25°C)
    float saturationDO = 8.0 + (25.0 - currentData.temperature) * 0.2; // Approximate
    float doValue = (voltage / 2.5) * saturationDO;

    doValue += doOffset;
    return constrain(doValue, 0.0, 20.0);
}

float readTemperature() {
    // Read NTC thermistor or DS18B20
    int rawValue = analogRead(TEMP_SENSOR_PIN);
    float voltage = (rawValue / 4095.0) * 3.3;

    // NTC Thermistor (10k at 25°C, Beta=3950)
    float resistance = 10000.0 * voltage / (3.3 - voltage);
    float tempValue = 1.0 / (1.0 / 298.15 + (1.0 / 3950.0) * log(resistance / 10000.0)) - 273.15;

    tempValue += tempOffset;
    return constrain(tempValue, 0.0, 50.0);
}

float readTurbidity() {
    // Read turbidity sensor (0-5V output, mapped to NTU)
    int rawValue = analogRead(TURBIDITY_SENSOR_PIN);
    float voltage = (rawValue / 4095.0) * 3.3;

    // Convert voltage to NTU (calibrate with NTU standards)
    // Typical: 4.2V = 0 NTU, 2.5V = 3000 NTU
    float ntuValue = (4.2 - voltage) * (3000.0 / 1.7);

    ntuValue += turbidityOffset;
    return constrain(ntuValue, 0.0, 3000.0);
}

float readWaterLevel() {
    // Ultrasonic or pressure sensor
    int rawValue = analogRead(WATER_LEVEL_PIN);
    float voltage = (rawValue / 4095.0) * 3.3;

    // Convert to meters (example: 0-10V = 0-2m)
    float levelValue = voltage * (2.0 / 3.3);
    return constrain(levelValue, 0.0, 2.0);
}

float readFlowRate() {
    // Count pulses from flow sensor (e.g., YF-S201)
    static unsigned long pulseCount = 0;
    static unsigned long lastFlowCheck = 0;

    unsigned long currentTime = millis();
    if (currentTime - lastFlowCheck >= 1000) {
        // YF-S201: 7.5 pulses per liter
        float flowRate = pulseCount / 7.5; // liters per second
        pulseCount = 0;
        lastFlowCheck = currentTime;
        return flowRate * 60.0; // Convert to L/min
    }

    // Count pulses
    if (digitalRead(FLOW_SENSOR_PIN) == HIGH) {
        pulseCount++;
    }

    return 0.0;
}

// ============================================================
// CONTROL LOGIC
// ============================================================
void controlActuators() {
    bool alertNeeded = false;
    String alertMsg = "";

    // pH Control
    if (currentData.ph < thresholds.ph_min) {
        // pH too low - could add buffer solution
        sendAlert("PH_LOW", "pH level below minimum: " + String(currentData.ph, 2), "warning");
    } else if (currentData.ph > thresholds.ph_max) {
        // pH too high - could add acid buffer or increase aeration
        sendAlert("PH_HIGH", "pH level above maximum: " + String(currentData.ph, 2), "warning");
    }

    // Dissolved Oxygen Control
    if (currentData.dissolved_oxygen < thresholds.do_min) {
        // Turn on aerator
        if (!actuators.aerator) {
            actuators.aerator = true;
            digitalWrite(AERATOR_PIN, LOW); // LOW = ON for active-low relay
            Serial.println("[CONTROL] Aerator turned ON - DO low");
            sendAlert("DO_LOW", "Dissolved oxygen critical: " + String(currentData.dissolved_oxygen, 2) + " mg/L", "critical");
        }
    } else if (currentData.dissolved_oxygen > thresholds.do_max) {
        // Turn off aerator
        if (actuators.aerator) {
            actuators.aerator = false;
            digitalWrite(AERATOR_PIN, HIGH);
            Serial.println("[CONTROL] Aerator turned OFF - DO adequate");
        }
    }

    // Temperature Control
    if (currentData.temperature < thresholds.temp_min) {
        // Turn on heater
        if (!actuators.heater) {
            actuators.heater = true;
            digitalWrite(HEATER_PIN, LOW);
            Serial.println("[CONTROL] Heater turned ON - temperature low");
            sendAlert("TEMP_LOW", "Temperature below minimum: " + String(currentData.temperature, 1) + "°C", "warning");
        }
    } else if (currentData.temperature > thresholds.temp_max) {
        // Turn off heater, increase aeration
        if (actuators.heater) {
            actuators.heater = false;
            digitalWrite(HEATER_PIN, HIGH);
            Serial.println("[CONTROL] Heater turned OFF - temperature high");
            sendAlert("TEMP_HIGH", "Temperature above maximum: " + String(currentData.temperature, 1) + "°C", "critical");
        }
    }

    // Water Level Control
    if (currentData.water_level < thresholds.water_level_min) {
        // Open inlet valve
        if (!actuators.inlet_valve) {
            actuators.inlet_valve = true;
            digitalWrite(INLET_VALVE_PIN, LOW);
            Serial.println("[CONTROL] Inlet valve OPENED - water level low");
            sendAlert("LEVEL_LOW", "Water level critically low: " + String(currentData.water_level, 2) + "m", "critical");
        }
    } else if (currentData.water_level > thresholds.water_level_max) {
        // Close inlet valve, open drain
        if (actuators.inlet_valve) {
            actuators.inlet_valve = false;
            digitalWrite(INLET_VALVE_PIN, HIGH);
        }
        if (!actuators.drain_valve) {
            actuators.drain_valve = true;
            digitalWrite(DRAIN_VALVE_PIN, LOW);
            Serial.println("[CONTROL] Drain valve OPENED - water level high");
        }
    } else {
        // Water level normal
        if (actuators.drain_valve) {
            actuators.drain_valve = false;
            digitalWrite(DRAIN_VALVE_PIN, HIGH);
        }
    }

    // Turbidity Control
    if (currentData.turbidity > thresholds.turbidity_max) {
        // Increase water circulation
        if (!actuators.water_pump) {
            actuators.water_pump = true;
            digitalWrite(WATER_PUMP_PIN, LOW);
            Serial.println("[CONTROL] Water pump turned ON - turbidity high");
            sendAlert("TURBIDITY_HIGH", "Turbidity above threshold: " + String(currentData.turbidity, 1) + " NTU", "warning");
        }
    } else {
        // Normal turbidity - pump can run on schedule
        if (actuators.water_pump && currentData.turbidity < thresholds.turbidity_max * 0.7) {
            // Turn off pump when turbidity is well below threshold
            actuators.water_pump = false;
            digitalWrite(WATER_PUMP_PIN, HIGH);
            Serial.println("[CONTROL] Water pump turned OFF - turbidity normal");
        }
    }
}

// ============================================================
// MQTT PUBLISH
// ============================================================
void publishData() {
    if (!mqttClient.connected()) return;

    // Create JSON document
    StaticJsonDocument<512> doc;
    doc["device_id"] = MQTT_CLIENT_ID;
    doc["timestamp"] = millis();
    doc["ph"] = round(currentData.ph * 100) / 100.0;
    doc["dissolved_oxygen"] = round(currentData.dissolved_oxygen * 100) / 100.0;
    doc["temperature"] = round(currentData.temperature * 100) / 100.0;
    doc["turbidity"] = round(currentData.turbidity * 100) / 100.0;
    doc["water_level"] = round(currentData.water_level * 100) / 100.0;
    doc["flow_rate"] = round(currentData.flow_rate * 100) / 100.0;

    // Actuator states
    JsonObject actuatorsObj = doc.createNestedObject("actuators");
    actuatorsObj["water_pump"] = actuators.water_pump;
    actuatorsObj["aerator"] = actuators.aerator;
    actuatorsObj["heater"] = actuators.heater;
    actuatorsObj["inlet_valve"] = actuators.inlet_valve;
    actuatorsObj["drain_valve"] = actuators.drain_valve;

    // System info
    JsonObject sysObj = doc.createNestedObject("system");
    sysObj["wifi_rssi"] = WiFi.RSSI();
    sysObj["free_heap"] = ESP.getFreeHeap();
    sysObj["uptime"] = millis() / 1000;

    // Serialize and publish
    char buffer[512];
    serializeJson(doc, buffer);

    mqttClient.publish(MQTT_TOPIC_DATA, buffer);
    Serial.println("[MQTT] Data published to topic: " + String(MQTT_TOPIC_DATA));
}

// ============================================================
// MQTT CALLBACK
// ============================================================
void handleMQTTMessage(char* topic, byte* payload, unsigned int length) {
    // Convert payload to string
    char message[length + 1];
    for (unsigned int i = 0; i < length; i++) {
        message[i] = (char)payload[i];
    }
    message[length] = '\0';

    Serial.println("[MQTT] Received message on topic: " + String(topic));
    Serial.println("[MQTT] Message: " + String(message));

    // Parse JSON command
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, message);

    if (error) {
        Serial.print("[MQTT] JSON parse error: ");
        Serial.println(error.c_str());
        return;
    }

    // Handle commands
    const char* command = doc["command"];

    if (strcmp(command, "set_thresholds") == 0) {
        // Update thresholds
        if (doc.containsKey("ph_min")) thresholds.ph_min = doc["ph_min"];
        if (doc.containsKey("ph_max")) thresholds.ph_max = doc["ph_max"];
        if (doc.containsKey("do_min")) thresholds.do_min = doc["do_min"];
        if (doc.containsKey("do_max")) thresholds.do_max = doc["do_max"];
        if (doc.containsKey("temp_min")) thresholds.temp_min = doc["temp_min"];
        if (doc.containsKey("temp_max")) thresholds.temp_max = doc["temp_max"];
        if (doc.containsKey("turbidity_max")) thresholds.turbidity_max = doc["turbidity_max"];

        Serial.println("[MQTT] Thresholds updated");
    }
    else if (strcmp(command, "pump_on") == 0) {
        actuators.water_pump = true;
        digitalWrite(WATER_PUMP_PIN, LOW);
        Serial.println("[COMMAND] Water pump turned ON");
    }
    else if (strcmp(command, "pump_off") == 0) {
        actuators.water_pump = false;
        digitalWrite(WATER_PUMP_PIN, HIGH);
        Serial.println("[COMMAND] Water pump turned OFF");
    }
    else if (strcmp(command, "aerator_on") == 0) {
        actuators.aerator = true;
        digitalWrite(AERATOR_PIN, LOW);
        Serial.println("[COMMAND] Aerator turned ON");
    }
    else if (strcmp(command, "aerator_off") == 0) {
        actuators.aerator = false;
        digitalWrite(AERATOR_PIN, HIGH);
        Serial.println("[COMMAND] Aerator turned OFF");
    }
    else if (strcmp(command, "heater_on") == 0) {
        actuators.heater = true;
        digitalWrite(HEATER_PIN, LOW);
        Serial.println("[COMMAND] Heater turned ON");
    }
    else if (strcmp(command, "heater_off") == 0) {
        actuators.heater = false;
        digitalWrite(HEATER_PIN, HIGH);
        Serial.println("[COMMAND] Heater turned OFF");
    }
    else if (strcmp(command, "feed") == 0) {
        // Activate feeder for specified duration
        int duration = doc.containsKey("duration") ? doc["duration"] : 5;
        actuators.feeder = true;
        digitalWrite(FEEDER_MOTOR_PIN, LOW);
        delay(duration * 1000);
        actuators.feeder = false;
        digitalWrite(FEEDER_MOTOR_PIN, HIGH);
        Serial.println("[COMMAND] Feeder activated for " + String(duration) + " seconds");
    }
    else if (strcmp(command, "drain_on") == 0) {
        actuators.drain_valve = true;
        digitalWrite(DRAIN_VALVE_PIN, LOW);
        Serial.println("[COMMAND] Drain valve OPENED");
    }
    else if (strcmp(command, "drain_off") == 0) {
        actuators.drain_valve = false;
        digitalWrite(DRAIN_VALVE_PIN, HIGH);
        Serial.println("[COMMAND] Drain valve CLOSED");
    }
    else if (strcmp(command, "status") == 0) {
        publishData();
    }

    // Publish status after command execution
    publishStatus();
}

// ============================================================
// ALERT SYSTEM
// ============================================================
void sendAlert(String type, String message, String severity) {
    if (!mqttClient.connected()) return;

    StaticJsonDocument<256> doc;
    doc["device_id"] = MQTT_CLIENT_ID;
    doc["type"] = type;
    doc["message"] = message;
    doc["severity"] = severity;
    doc["timestamp"] = millis();
    doc["readings"]["ph"] = currentData.ph;
    doc["readings"]["do"] = currentData.dissolved_oxygen;
    doc["readings"]["temp"] = currentData.temperature;
    doc["readings"]["turbidity"] = currentData.turbidity;
    doc["readings"]["water_level"] = currentData.water_level;

    char buffer[256];
    serializeJson(doc, buffer);

    mqttClient.publish(MQTT_TOPIC_ALERT, buffer);
    Serial.println("[ALERT] " + severity.toUpperCase() + ": " + message);
}

// ============================================================
// HEARTBEAT
// ============================================================
void sendHeartbeat() {
    if (!mqttClient.connected()) return;

    StaticJsonDocument<128> doc;
    doc["device_id"] = MQTT_CLIENT_ID;
    doc["status"] = "alive";
    doc["uptime"] = millis() / 1000;
    doc["free_heap"] = ESP.getFreeHeap();
    doc["wifi_rssi"] = WiFi.RSSI();

    char buffer[128];
    serializeJson(doc, buffer);

    mqttClient.publish(MQTT_TOPIC_STATUS, buffer);
}

// ============================================================
// PUBLISH STATUS
// ============================================================
void publishStatus() {
    if (!mqttClient.connected()) return;

    StaticJsonDocument<256> doc;
    doc["device_id"] = MQTT_CLIENT_ID;
    doc["actuators"]["water_pump"] = actuators.water_pump;
    doc["actuators"]["aerator"] = actuators.aerator;
    doc["actuators"]["heater"] = actuators.heater;
    doc["actuators"]["inlet_valve"] = actuators.inlet_valve;
    doc["actuators"]["drain_valve"] = actuators.drain_valve;

    char buffer[256];
    serializeJson(doc, buffer);

    mqttClient.publish(MQTT_TOPIC_STATUS, buffer);
}

// ============================================================
// CALIBRATION
// ============================================================
void loadCalibration() {
    phOffset = preferences.getFloat("ph_offset", 0.0);
    doOffset = preferences.getFloat("do_offset", 0.0);
    tempOffset = preferences.getFloat("temp_offset", 0.0);
    turbidityOffset = preferences.getFloat("turb_offset", 0.0);

    Serial.println("[CAL] Calibration loaded from NVS");
    Serial.println("[CAL] pH offset: " + String(phOffset, 3));
}

void saveCalibration() {
    preferences.putFloat("ph_offset", phOffset);
    preferences.putFloat("do_offset", doOffset);
    preferences.putFloat("temp_offset", tempOffset);
    preferences.putFloat("turb_offset", turbidityOffset);

    Serial.println("[CAL] Calibration saved to NVS");
}

// ============================================================
// SERIAL PRINT
// ============================================================
void printSensorData() {
    Serial.println("\n--- Sensor Readings ---");
    Serial.println("pH:              " + String(currentData.ph, 2));
    Serial.println("Dissolved O2:    " + String(currentData.dissolved_oxygen, 2) + " mg/L");
    Serial.println("Temperature:     " + String(currentData.temperature, 2) + " °C");
    Serial.println("Turbidity:       " + String(currentData.turbidity, 1) + " NTU");
    Serial.println("Water Level:     " + String(currentData.water_level, 3) + " m");
    Serial.println("Flow Rate:       " + String(currentData.flow_rate, 2) + " L/min");
    Serial.println("--- Actuator States ---");
    Serial.println("Pump:            " + String(actuators.water_pump ? "ON" : "OFF"));
    Serial.println("Aerator:         " + String(actuators.aerator ? "ON" : "OFF"));
    Serial.println("Heater:          " + String(actuators.heater ? "ON" : "OFF"));
    Serial.println("Inlet Valve:     " + String(actuators.inlet_valve ? "OPEN" : "CLOSED"));
    Serial.println("Drain Valve:     " + String(actuators.drain_valve ? "OPEN" : "CLOSED"));
    Serial.println("------------------------\n");
}
