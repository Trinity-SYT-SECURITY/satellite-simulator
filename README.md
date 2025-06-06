![image](https://github.com/user-attachments/assets/0297c2e8-778f-4a3f-b34f-04dfa3f8d9a3)

+ https://pmc.ncbi.nlm.nih.gov/articles/PMC11086249/

This project is a satellite simulation platform built with React and Three.js, designed to visualize satellite orbits, simulate communication attacks, and analyze their impacts. It provides a 3D visualization of satell

https://github.com/user-attachments/assets/a6cd0f83-68ae-4f71-bcd3-31e605edef3a

ites, ground stations, and attack effects, along with real-time telemetry and AI-driven attack analysis.

## Features

### 1. 3D Visualization
- **Satellite Orbits**: Visualizes satellite positions and orbits using TLE (Two-Line Element) data.
- **Ground Stations**: Displays attacker and defender ground stations on a 3D Earth model.
- **Attack Effects**: Renders attack effects such as energy beams, jamming signals, and wave disturbances using Three.js.

### 2. Attack Simulation
The platform supports various types of communication attacks on satellites, with customizable parameters.

#### Supported Attack Types
- **Power Jamming**: Overwhelms the target satellite's receiver with high-power noise.
- **Frequency Jamming**: Disrupts communication by targeting specific frequencies.
- **Spoofing**: Sends fake signals to deceive the satellite or ground station.
- **DoS (Denial of Service)**: Floods the satellite with excessive packets to disrupt communication.

#### Attack Parameters
- **EIRP (Effective Isotropic Radiated Power)**: Adjustable from -50 dBm to 200 dBm for both attacker and defender.
- **Frequency**: Configurable from 1 MHz to 30,000 MHz.
- **Bandwidth**: Adjustable from 0.1 MHz to 100 MHz (for frequency jamming).
- **Spoofing Signal Strength**: Adjustable from -50 dBm to 100 dBm.
- **DoS Packet Rate**: Configurable from 1 to 10,000 packets per second (pps).

#### Attack Effectiveness
- Effectiveness is calculated based on the Signal-to-Interference-plus-Noise Ratio (SINR) at the target:
  - SINR < 0 dB: 100% effectiveness (communication fully jammed).
  - SINR < 5 dB: 80% effectiveness.
  - SINR < 10 dB: 50% effectiveness.
  - SINR < 15 dB: 20% effectiveness.
  - SINR ≥ 15 dB: 0% effectiveness (communication unaffected).
- When defense mechanisms are active, attack effectiveness is reduced by 50%.

### 3. Defense Mechanisms
The platform includes automated defense strategies to mitigate attacks:
- **Power Jamming Defense**: Increases the defender's EIRP to counter the attack.
- **Frequency Jamming Defense**: Initiates frequency hopping to evade the jamming frequency.
- **Spoofing Defense**: Reduces spoofing signal strength by 50%.
- **DoS Defense**: Decreases the DoS packet rate by 30%.

Defense mechanisms are active for 10 seconds after an attack is launched, and their actions are logged in the defense history.

### 4. Real-Time Telemetry
- **Signal Strength**: Ranges from -120 dBm to -90 dBm, affected by attack intensity.
- **Frequency Offset**: Varies based on attack disturbance (±50 Hz max).
- **Bit Error Rate (BER)**: Increases with attack intensity (0.01 to 1).
- **Communication Status**:
  - Normal: SINR ≥ -10 dB and no significant disturbance.
  - Degraded: Attack disturbance factor > 0.3.
  - Jammed: Attack intensity > 50.
  - Disconnected: SINR < -10 dB.

### 5. AI-Driven Attack Analysis
- Utilizes Google Generative AI (Gemini 1.5 Flash model) to analyze attack events.
- Provides insights on:
  - Impact level on satellite communication.
  - Possible defensive measures.
  - Attack effectiveness evaluation.
  - Technical details of the attack.

### 6. Attack and Defense History
- Logs all attack and defense events with timestamps, parameters, and outcomes.
- Allows users to review past events and their AI analysis results.

### 7. Satellite Data Sources
- **Celestrak**: Fetches TLE data for active satellites, Starlink, and GPS constellations.
- **Local Cache**: Stores TLE data in `localStorage` for offline use.
- **Fallback**: Uses hardcoded TLE data if online and cached sources fail.

## Technical Details

### 1. Frontend Framework
- **React**: Used for building the user interface and managing state.
- **React-Bootstrap**: Provides pre-styled components for UI elements like buttons, forms, and cards.
- **React-Coordinate-Input**: Allows users to input geographic coordinates for ground stations.
- **React-Toastify**: Displays toast notifications for defense actions.

### 2. 3D Rendering
- **Three.js**: Handles 3D visualization of the Earth, satellites, and attack effects.
  - **Earth Model**: Uses a spherical geometry with a high-resolution texture (`earthmap-high.jpg`).
  - **Satellites**: Represented as sprites with customizable colors and sizes.
  - **Attack Effects**:
    - Energy beams: Rendered as `THREE.Line` objects with additive blending.
    - Wave disturbances: Created using `THREE.CircleGeometry` with animated scaling.
    - Jamming effects: Visualized with `THREE.SphereGeometry` and pulsing opacity.

### 3. Satellite Orbit Calculation
- **Satellite.js**: Computes satellite positions and orbits using TLE data.
- **TLE Parsing**: Custom utility (`tle.js`) parses TLE files into usable data.
- **Position Updates**: Satellites' positions are updated based on the simulation's current date and time.

### 4. Attack Simulation Logic

![image](https://github.com/user-attachments/assets/e36b169d-7728-4b9a-8e74-edaefba5a702)

+ https://www.mathworks.com/help/satcom/gs/satellite-link-budget.html

- **SINR Calculation**:
  ![image](https://github.com/user-attachments/assets/4a338c66-29a6-4199-a055-8e95a69982f7)

  \[
  \text{SINR (dB)} = 10 \cdot \log_{10}\left(\frac{P_{\text{signal}}}{P_{\text{interference}} + P_{\text{noise}}}\right)
  \]
  Where:
  - \(P_{\text{signal}}\) is the defender's power at the receiver.
  - \(P_{\text{interference}}\) is the attacker's power at the receiver.
  - \(P_{\text{noise}}\) is the noise floor (default: -90 dBm).

- **Power at Receiver**:
  ![image](https://github.com/user-attachments/assets/40a9bb5a-89c9-4f97-9851-1540fd96072a)

  \[
  P_{\text{Rx}} = \text{EIRP} + \text{FSPL} - 30 + \text{Atmospheric Loss}
  \]
  Where:
  - FSPL (Free Space Path Loss) is calculated as:
    ![image](https://github.com/user-attachments/assets/d0342806-f837-4be8-9d21-b8a4396256dc)

    \[
    \text{FSPL (dB)} = -10 \cdot \log_{10}\left(\left(\frac{4 \pi \cdot \text{range}}{\lambda}\right)^2\right)
    \]
  - \(\lambda = \frac{c}{f}\), with \(c = 299792458 \, \text{m/s}\) (speed of light) and \(f\) being the frequency in Hz.
    
    ![image](https://github.com/user-attachments/assets/6620be74-9a3b-4a9a-98cd-b0b9330b7951)

  - Atmospheric Loss is simulated as -10 to -12 dB.

### 5. Defense Strategy
- Implemented as a `DefenderStrategy` class that reacts to attacks based on their type and intensity.
- Frequency hopping changes the operating frequency every 2 seconds by ±250 MHz (randomized).

### 6. AI Integration
- **Google Generative AI**: Uses the Gemini 1.5 Flash model to generate attack analysis reports.
- Handles quota limits with retry logic (up to 3 attempts with 60-second delays).

### 7. Data Persistence
- **LocalStorage**: Caches Celestrak TLE data with timestamps.
- **Attack History**: Stored in memory as an array of events.

## Usage Guide

### 1. Launching the Application
- Run the project using:
  ```bash
  npm run start
  ```
- Access the app at `http://localhost:1234`.

### 2. Setting Up a Simulation
- **Select a Satellite**: Use the search bar to choose a target satellite from the available list.
- **Set Simulation Period**: Choose a start and end date using the `DateTimeRangePicker`.
- **Adjust Step Size**: Modify the simulation step size (1 to 1000 seconds) to control the speed of time progression.

### 3. Configuring Ground Stations
- **Attacker and Defender Coordinates**:
  - Input coordinates manually using the `CoordinateInput` component (e.g., `30° 00′ 00″ N 090° 00′ 00″ W`).
  - Or click "Select Map Location" and click on the 3D Earth to set the position.
- **EIRP Settings**: Adjust the EIRP for both attacker and defender using the sliders.

### 4. Launching an Attack
- **Choose Attack Type**: Select from Power Jamming, Frequency Jamming, Spoofing, or DoS.
- **Configure Parameters**:
  - For Frequency Jamming: Set frequency and bandwidth.
  - For Spoofing: Adjust signal strength.
  - For DoS: Set packet rate.
- **Launch Attack**: Click the "Launch Attack" button to initiate the attack.

### 5. Monitoring and Analysis
- **Communication Status**: Displays the current status (Normal, Degraded, Jammed, or Disconnected) along with SINR and attack effectiveness.
- **Signal Visualization**: Shows a graphical representation of the signal spectrum, including disturbances.
- **Attack History**: Lists all attack events with details and AI analysis.
- **Defense History**: Logs all defensive actions taken in response to attacks.


---
+ https://github.com/dsuarezv/satellite-tracker/tree/master

The original development project comes from, thanks to their contribution, based on their project, this project extends and develops more functions to present satellite attack situations
+ https://github.com/deptofdefense/satellite-jamming-simulator

![image](https://github.com/user-attachments/assets/c5da0971-4fa7-4505-bd04-e435631c4672)

Satellite data source https://celestrak.org/

---- 

Ref

+ https://www.youtube.com/watch?v=t_efCpd2PbM

----

## Running the App
This is a static client-side javascript implementation. Running it should just be a matter of:
```bash
npm install @google/genai
npm install dayjs\nnpm install dayjs/plugin/utc
npm install react-toastify
npm install three@latest
npm install chart.js react-chartjs-2
npm install react-markdown

npm install
npm run start
rm -rf .parcel-cache dist

```

creat .env
```
REACT_APP_GOOGLE_AI_API_KEY=AIXXXX
REACT_APP_GOOGLE_AI_MODEL=gemini-2.0-flash
```
+ get from https://aistudio.google.com/apikey
  + is free

This has been tested with `node v18.4.0`, your mileage may vary with other versions.

## Making Modifications
Most of the relevant physical modeling implementation is contained in `engine.js` or `tle.js`. Most of the UI is implemented directly in `App.js`.

## Future features

+ More realistic attack presentation
+ Add more attacks
+ Solve data retrieval issues
+ Add AI analysis features


## Troubleshooting

### 1. WebGL Context Creation Failure
- **Symptoms**: Error message `Failed to initialize Engine: Error: Error creating WebGL context`.
- **Solutions**:
  - Ensure your browser supports WebGL (check `chrome://gpu` in Chrome or `about:support` in Firefox).
  - Enable WebGL in browser settings.
  - Update your graphics drivers.
  - Try a different browser (e.g., latest Chrome or Firefox).

### 2. Satellite Data Loading Issues
- **Symptoms**: No satellites appear in the search bar.
- **Solutions**:
  - Check your internet connection (for Celestrak data fetching).
  - Verify that `/assets/active.txt` exists as a fallback.
  - Clear `localStorage` and reload the app to refresh cached data.

### 3. Attack Effects Not Visible
- **Symptoms**: No visual effects (e.g., beams, waves) appear during an attack.
- **Solutions**:
  - Ensure the attacker and target are within range and visible to each other.
  - Check the browser console for rendering errors.
  - Verify that `three.module.js` and related assets are loaded correctly.

