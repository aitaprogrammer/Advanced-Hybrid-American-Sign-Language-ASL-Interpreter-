# [cite_start]🌟 Advanced Hybrid American Sign Language (ASL) Interpreter 🤟✨ [cite: 19, 83]

[cite_start]An accessible, multi-modal, and fail-safe ASL interpretation system that bridges the communication gap for the Deaf and Hard-of-Hearing (DHH) community 🤝👂[cite: 82, 83, 97]. 

[cite_start]This project solves the "Reliability Gap" in assistive tech by fusing physical kinematic data (via a custom smart glove) with spatial visual data (via browser-based computer vision) 🦾👁️[cite: 233, 236, 237]. [cite_start]The entire pipeline runs locally on edge devices and in the browser, ensuring data privacy and an operational latency of just milliseconds ⚡[cite: 324, 454].

## 🎥 System Demonstrations 🎬

[cite_start]Our system features a dynamic dashboard allowing users to switch between interpretation modes on the fly 🎛️[cite: 524, 526].

### 1. 🔄 Hybrid Mode (Cross-Verification) 🤝
*The core innovation of the project.* 💡 
[cite_start]This mode utilizes our **Hybrid Fusion Engine** to analyze data from both the Smart Glove and the Camera simultaneously 🧠💻[cite: 535, 536]. [cite_start]If the camera fails due to low light or self-occlusion, the system mathematically falls back to the deterministic glove data to ensure uninterrupted translation 🌤️➡️🌑[cite: 238, 490, 494].
> **[🎬 Insert `hybrid-mode.mp4` / GIF here]**

### 2. 📸 Camera Mode (Vision-Only) 👁️
[cite_start]A completely zero-installation experience 🌐[cite: 323, 528]. 
[cite_start]The React web app uses MediaPipe to extract 21 3D hand landmarks and feeds them into a custom Random Forest classifier transpiled entirely into JavaScript (`asl_model.js`) ✋🌲[cite: 326, 328, 531].
> **[🎬 Insert `camera-mode.mp4` / GIF here]**

### 3. 🧤 Glove Mode (Hardware-Only) ⚙️
[cite_start]For environments where a camera cannot be used 🚫📷[cite: 532]. 
[cite_start]The custom smart glove features 4 flex sensors and an onboard 6-axis IMU 📏🔋[cite: 289, 299]. [cite_start]It processes telemetry locally using an embedded Float32 TinyML Feedforward Neural Network running on the Seeed Studio XIAO nRF52840, sending drift-free predictions via BLE 🧠📻[cite: 85, 454].
> **[🎬 Insert `glove-mode.mp4` / GIF here]**

### 4. 🎮 Unity Gamified Learning Module 🏆
[cite_start]Beyond one-way translation, this system serves as an interactive educational platform 🏫📚[cite: 90, 373, 573]. 
[cite_start]A Node.js orchestration server streams real-time gesture recognition data via WebSockets into a Unity 3D environment, allowing hearing users to practice ASL characters, words, and full sentences 🕹️🗣️[cite: 384, 389, 391].
> **[🎬 Insert `game-mode.mp4` / GIF here]**

---

## 🧠 System Architecture 🏗️

[cite_start]The ecosystem operates across a highly affordable sub-30,000 PKR hardware footprint and a lightweight web stack 💰📉[cite: 135, 257].

1. [cite_start]**Hardware Layer (TinyML) 🧤:** Seeed Studio XIAO nRF52840 + Flex Sensors + IMU 🔌[cite: 85]. [cite_start]Inference is executed via a 64-32-10 MLP Neural Network 🧮[cite: 436].
2. [cite_start]**Vision Layer (Web) 🕸️:** Built with React, TypeScript, and Vite ⚛️[cite: 326]. [cite_start]The pipeline includes bounding-box origin alignment and a 100-tree Random Forest model 🌲🌲[cite: 327, 341].
3. [cite_start]**Fusion Layer 🌪️:** Node.js fallback arbitration logic dynamically trusts the subsystem with the highest confidence, mitigating mechanical hysteresis and optical occlusion ⚖️🛡️[cite: 483, 498].

*(📸 Recommended: Add Figure 3.1 High-Level System Architecture and Figure 3.3 Data Pipeline here from your docs folder)*

---
