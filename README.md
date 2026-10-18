# IoT-Based Automated Water Regulation for Fish Farming

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![ESP32](https://img.shields.io/badge/ESP32-Firmware-orange.svg)](https://www.espressif.com/)

## Overview

An intelligent IoT-based system for automated water quality monitoring and regulation in fish farming operations. The system provides real-time sensor data acquisition, automated actuator control, cloud-based data storage, and a web dashboard for remote monitoring and management.

## Live Demo

The dashboard is deployed on Vercel and runs a self-contained replay of the two-week (14-day) simulation, so it is fully interactive without a backend:

- **https://fish-farm-iot.vercel.app**

Switch between the two 1000-litre tanks (Pond A / Pond B) from the header, watch live readings in real time, view charts and alerts, and toggle actuators manually.

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
├── simulation/            # Two-week (14-day) simulation
│   ├── simulate.py        # Closed-loop control + pond model
│   ├── export_web_data.py # Exports dataset for the dashboard
│   ├── data/              # Time-series, daily, actuator & alert CSVs
│   ├── charts/            # Figures used in the thesis
│   └── output/            # summary.json / summary.txt
├── papers/                # 24 reviewed open-access papers (PDF + BibTeX)
├── reports/               # Thesis (chimanuel.docx/.odt/.pdf) + generator
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

## Two-Week Simulation

A fourteen-day (two-week) discrete-time simulation of the closed-loop system for two 1000-litre tanks is provided in `simulation/`. It models temperature, dissolved oxygen, pH, turbidity and water level at 5-minute resolution (8,064 samples), runs the same rule-based control logic as the firmware, and injects two actuator-fault scenarios to validate the alert subsystem.

```bash
cd simulation
python3 simulate.py          # run simulation, write CSVs + charts + summary
python3 export_web_data.py   # export dataset to frontend/src/data/simulation.json
```

### Key results (14 days)

| Metric | Manual baseline | Automated system |
|--------|-----------------|------------------|
| pH within safe range | 82 % | ~96 % |
| Dissolved oxygen ≥ 5 mg/L | 77 % | ~97 % |
| Temperature 24–30 °C | 90 % | ~93 % |
| Overall compliance | 68 % | **95.3 %** |
| Manual interventions/day | ≈ 6 | 0 |

189 alerts (181 warning, 8 critical) were generated after debouncing; both injected faults were detected and notified within one sampling cycle.

## Documentation & Thesis

The complete thesis is provided in `reports/` and at the repository root:

- `chimanuel.docx` – editable Word document
- `chimanuel.odt` – OpenDocument text
- `chimanuel.pdf` – 32-page A4 PDF

Regenerate with:

```bash
python3 reports/generate_thesis.py
libreoffice --headless --convert-to pdf --outdir reports reports/chimanuel.docx
libreoffice --headless --convert-to odt --outdir reports reports/chimanuel.docx
```

## Research Papers

`papers/` contains **24 open-access peer-reviewed papers** on IoT-based water-quality monitoring and aquaculture automation, downloaded with `papers/download_papers.py` (OpenAlex API). Metadata is in `papers/papers.json`, citations in `papers/references.bib` / `papers/references.md`, and the PDFs in `papers/pdf/`.

## Configuration

The dashboard runs in demo mode by default (bundled simulation). To connect it to the live backend, create `frontend/.env`:

```
VITE_DEMO_MODE=false
VITE_API_URL=https://your-backend.example.com/api
VITE_SOCKET_URL=https://your-backend.example.com
```

## Deployment

### Frontend (Vercel) — deployed

```bash
cd frontend
npm install
vercel --prod        # https://fish-farm-iot.vercel.app
```

### Backend (Railway/Render)

```bash
cd backend
# Push to GitHub and connect to Railway/Render, then set MQTT/DB env vars
```

## UML Diagrams

UML diagrams are in the `uml/` directory in PlantUML format:
- `use-case-diagram.puml` - System use cases
- `sequence-diagram.puml` - Data flow sequences
- `class-diagram.puml` - System class structure
- `component-diagram.puml` - Component architecture
- `deployment-diagram.puml` - Deployment topology
- `activity-diagram.puml` - Control flow activities

Rendered PNG and SVG versions are included in `uml/png/` and `uml/svg/`, and
the use-case, sequence, class, component, deployment and activity diagrams are
embedded in Chapter Three of the thesis.

### Rendering the diagrams

The diagrams are rendered with PlantUML (requires Java). The build uses a
user-local install (no root required) at `~/.local/opt/jdk` and
`~/.local/opt/plantuml` with launchers in `~/.local/bin`:

```bash
# install Java (JRE 21) + PlantUML into ~/.local
curl -sL "https://api.adoptium.net/v3/binary/latest/21/ga/linux/x64/jre/hotspot/normal/eclipse" -o /tmp/jre.tar.gz
mkdir -p ~/.local/opt/jdk && tar -xzf /tmp/jre.tar.gz -C ~/.local/opt/jdk --strip-components=1
mkdir -p ~/.local/opt/plantuml && curl -sL \
  "https://github.com/plantuml/plantuml/releases/download/v1.2026.8/plantuml.jar" \
  -o ~/.local/opt/plantuml/plantuml.jar

# render all diagrams (PNG + SVG)
plantuml -charset UTF-8 -tpng -o png uml/*.puml
plantuml -charset UTF-8 -tsvg -o svg uml/*.puml
```

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
