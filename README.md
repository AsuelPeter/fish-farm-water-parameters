# IoT-Based Automated Water Regulation for Fish Farming

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![ESP32](https://img.shields.io/badge/ESP32-Firmware-orange.svg)](https://www.espressif.com/)

## Overview

An intelligent IoT-based system for automated water quality monitoring and regulation in fish farming operations. The system provides real-time sensor data acquisition, automated actuator control, cloud-based data storage, and a web dashboard for remote monitoring and management.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│              React Dashboard (Vercel-hosted)                 │
│    ┌──────────┬──────────┬──────────┬──────────┐            │
│    │Dashboard │ Sensors  │ Alerts   │ Settings │            │
│    └──────────┴──────────┴──────────┴──────────┘            │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API + WebSocket
┌──────────────────────────┴──────────────────────────────────┐
│                      Cloud Layer                             │
│    ┌──────────┬──────────┬──────────┬──────────┐            │
│    │ MQTT     │ Node.js  │ MongoDB  │ InfluxDB │            │
│    │ Broker   │ Backend  │ (Docs)   │ (TS)     │            │
│    └──────────┴──────────┴──────────┴──────────┘            │
└──────────────────────────┬──────────────────────────────────┘
                           │ MQTT Protocol
┌──────────────────────────┴──────────────────────────────────┐
│                       Edge Layer                             │
│              ESP32 Microcontroller                           │
│    ┌──────────┬──────────┬──────────┬──────────┐            │
│    │ Sensors  │ Control  │ MQTT     │ WiFi     │            │
│    │ Reader   │ Logic    │ Client   │ Manager  │            │
│    └──────────┴──────────┴──────────┴──────────┘            │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                    Sensing Layer                              │
│  ┌─────┬─────┬─────┬─────┬─────┐                           │
│  │ pH  │ DO  │Temp │Turb │Level│                           │
│  └─────┴─────┴─────┴─────┴─────┘                           │
└─────────────────────────────────────────────────────────────┘
```

## Features

- **Real-time Monitoring**: pH, dissolved oxygen, temperature, turbidity, water level
- **Automated Control**: Water pump, aerator, heater, inlet/drain valves
- **Cloud Dashboard**: Live charts, historical data, actuator controls
- **Alert System**: Email and SMS notifications for critical conditions
- **Remote Access**: Monitor and control from anywhere via web browser
- **Low Cost**: Total hardware cost ~$55 USD

## Project Structure

```
fish-farm-iot/
├── firmware/              # ESP32 Arduino firmware
│   ├── src/main.cpp       # Main firmware code
│   └── platformio.ini     # PlatformIO configuration
├── backend/               # Node.js backend server
│   └── src/
│       ├── server.js      # Express server entry point
│       ├── config/        # Database configuration
│       ├── models/        # MongoDB models
│       ├── routes/        # API routes
│       ├── services/      # MQTT, alert services
│       └── middleware/     # Error handling
├── frontend/              # React dashboard
│   └── src/
│       ├── App.js         # Main app component
│       ├── pages/         # Dashboard pages
│       ├── components/    # UI components
│       ├── hooks/         # Custom React hooks
│       └── services/      # API client
├── uml/                   # UML diagrams (PlantUML)
└── reports/               # Dissertation reports
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.8+
- Arduino IDE or PlatformIO
- MongoDB
- InfluxDB

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env    # Configure environment variables
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm start
```

### 3. Firmware Setup

1. Install PlatformIO IDE
2. Connect ESP32 via USB
3. Configure WiFi credentials in `firmware/src/main.cpp`
4. Upload firmware

### 4. Database Setup

```bash
# MongoDB
mongod --dbpath /data/db

# InfluxDB
influxd
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/sensors/latest | Get latest sensor reading |
| GET | /api/sensors/history | Get historical data |
| GET | /api/sensors/stats | Get statistics |
| POST | /api/actuators/command | Send actuator command |
| POST | /api/actuators/thresholds | Update thresholds |
| GET | /api/alerts | Get alerts list |
| PUT | /api/alerts/:id/acknowledge | Acknowledge alert |
| GET | /api/dashboard/overview | Get dashboard overview |

## MQTT Topics

| Topic | Direction | Description |
|-------|-----------|-------------|
| fishfarm/sensors/data | Device → Cloud | Sensor readings |
| fishfarm/actuators/command | Cloud → Device | Actuator commands |
| fishfarm/system/status | Device → Cloud | System status |
| fishfarm/alerts | Device → Cloud | Alert notifications |

## Hardware Requirements

| Component | Model | Quantity | Approx. Cost |
|-----------|-------|----------|--------------|
| Microcontroller | ESP32 DevKit V1 | 1 | $5 |
| pH Sensor | pH-4502C | 1 | $15 |
| DO Sensor | DS-E5168 | 1 | $20 |
| Temperature | NTC 10K Thermistor | 1 | $2 |
| Turbidity | TSW-30 | 1 | $10 |
| Water Level | Pressure Sensor | 1 | $8 |
| Relay Module | 6-Channel | 1 | $5 |
| Water Pump | 12V DC | 1 | $10 |
| Aerator | 12V Air Pump | 1 | $8 |
| Heater | 100W Aquarium | 1 | $10 |
| Solenoid Valves | 12V NC | 2 | $15 |
| Power Supply | 12V 5A | 1 | $8 |

## Deployment

### Frontend (Vercel)

```bash
cd frontend
npm run build
vercel deploy --prod
```

### Backend (Railway/Render)

```bash
cd backend
# Push to GitHub and connect to Railway/Render
```

## UML Diagrams

UML diagrams are in the `uml/` directory in PlantUML format:
- `use-case-diagram.puml` - System use cases
- `sequence-diagram.puml` - Data flow sequences
- `class-diagram.puml` - System class structure
- `component-diagram.puml` - Component architecture
- `deployment-diagram.puml` - Deployment topology
- `activity-diagram.puml` - Control flow activities

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

**Eromosele Darlington Oscar**
- Registration: G2025/MENG/ELG/FT/005
- Department: Electrical and Electronic Engineering
- University: University of Port Harcourt
- Supervisor: Engr. Ezeofor

## Acknowledgments

- University of Port Harcourt, Department of Electrical and Electronic Engineering
- Supervisor: Engr. Ezeofor
- Open-source communities: Arduino, ESP32, Node.js, React, Material-UI
