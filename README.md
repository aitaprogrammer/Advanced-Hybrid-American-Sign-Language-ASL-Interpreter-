# 🌟 Advanced Hybrid American Sign Language (ASL) Interpreter + Game🤟✨

An accessible, multi-modal, and fail-safe ASL interpretation system that bridges the communication gap for the Deaf and Hard-of-Hearing (DHH) community. 

Current assistive technologies force a compromise: users must choose between expensive, mechanically fatiguing smart gloves or free, environmentally fragile computer vision apps. This project solves the "Reliability Gap" by fusing physical kinematic data with spatial visual data. Designed with strict cost constraints (sub-30,000 PKR), the entire pipeline runs locally on edge devices and in the browser, ensuring 100% data privacy and an operational latency of just milliseconds.

---

## 📑 Table of Contents
1. [System Demonstrations](#-system-demonstrations)
2. [Key Features](#-key-features)
3. [System Architecture](#-system-architecture)
4. [Performance & Benchmarks](#-performance--benchmarks)
5. [Getting Started](#-getting-started)
6. [Future Roadmap](#-future-roadmap)
7. [Team & Credits](#-team--credits)

---

## 🎥 System Demonstrations 🎬

### 1. 🔄 Hybrid Mode (Cross-Verification)
*The core innovation of the project.* This mode utilizes our **Hybrid Fusion Engine** to analyze data from both the Smart Glove and the Camera simultaneously. If the camera fails due to low light or self-occlusion, the system mathematically falls back to the deterministic glove data to ensure uninterrupted translation.


### 2. 📸 Camera Mode (Vision-Only)
A completely zero-installation experience. The React web app uses MediaPipe to extract 21 3D hand landmarks and feeds them into a custom Random Forest classifier transpiled entirely into JavaScript (`asl_model.js`).


https://github.com/user-attachments/assets/57f9ceb4-7855-4719-bc15-4aa07669732f



### 3. 🧤 Glove Mode (Hardware-Only)
For environments where a camera cannot be used. The custom smart glove features 4 flex sensors and an onboard 6-axis IMU. It processes telemetry locally using an embedded Float32 TinyML Feedforward Neural Network running on the Seeed Studio XIAO nRF52840, sending drift-free predictions via BLE.


https://github.com/user-attachments/assets/5e4aee28-f338-41d0-87b2-d361d8fe31d5



### 4. 🎮 Unity Gamified Learning Module
Beyond one-way translation, this system serves as an interactive educational platform. A Node.js orchestration server streams real-time gesture recognition data via WebSockets into a Unity 3D environment, allowing hearing users to practice ASL characters, words, and full sentences.

https://github.com/user-attachments/assets/9499d651-7b84-4b09-ace4-c180e6901f74



---

## ✨ Key Features

* **Sub-Millisecond Edge Inference:** Runs a Float32 Keras model directly on the microcontroller using only 3.4KB of RAM.
* **Zero-Dependency Web Vision:** Drops heavy frameworks like TensorFlow.js in favor of a transpiled 2.9MB pure JavaScript Random Forest model.
* **Dynamic Fallback Logic:** Automatically mitigates mechanical hysteresis from the glove and optical occlusion from the camera in real-time.
* **SDG Alignment:** Directly supports UN SDGs 3 (Good Health), 4 (Quality Education), 9 (Innovation), and 10 (Reduced Inequalities).

---

## 🧠 System Architecture 🏗️

The ecosystem is divided into three distinct but seamlessly integrated subsystems:

### 1. Hardware Layer: The Smart Glove 🧤
* **Microcontroller:** Seeed Studio XIAO nRF52840 (Selected to overcome ESP32 ADC/BLE concurrent transmission conflicts).
* **Sensors:** A network of 4 resistive flex sensors mapped via a 10k voltage divider, augmented by the nRF52840's internal 6-axis IMU.
<img width="590" height="337" alt="figure32" src="https://github.com/user-attachments/assets/89938d87-4cbd-41ca-9f65-b64b4611eca0" />

<img width="247" height="381" alt="figure41" src="https://github.com/user-attachments/assets/b9d3ab49-273e-44cc-a53c-81db8760297d" />

* **AI Model:** Multilayer Perceptron (MLP) Feedforward Neural Network (64-32-10 architecture with 3,483 parameters) deployed via TensorFlow Lite for Microcontrollers.
<img width="952" height="103" alt="figure42" src="https://github.com/user-attachments/assets/f6d90d3e-a28b-4cd1-9f67-a7ddb316c4a3" />

### 2. Software Layer : Computer Vision 🕸️
* **Stack:** React + TypeScript + Vite.
* **Vision Logic:** Extracts 21 3D hand landmarks in real-time through MediaPipe and then runs a transpiled Random Forest classifier over the spatial coordinates to identify the ASL gesture.
* **Preprocessing Pipeline:** Captures webcam feed → MediaPipe Hands (21 keypoints) → Pixel Mapping → Right-Hand Mirroring → Translation Normalization → Flat Feature Array.
* **Classification:** Scikit-learn Random Forest (100 trees) transpiled to pure JS using `m2cgen`. 
<img width="580" height="338" alt="Screenshot 2026-06-15 214946" src="https://github.com/user-attachments/assets/bad272aa-9bd1-4904-8575-ababccefa5b4" />

### 3. Orchestration & Learning: Hybrid Fusion Engine & Unity 🌪️
* **Fusion Logic:** A Node.js server evaluates predictions from the TinyML glove, , and a secondary MobileNetV2 CNN. It uses a confidence-based arbitration algorithm to output the final verified character.

<img width="580" height="338" alt="Screenshot 2026-05-17 223900" src="https://github.com/user-attachments/assets/769ec7e0-ae9d-45a2-b0c1-7ccbbc2fa293" />

* **Gamification:** Unity environment processes WebSocket streams to validate character inputs, synthesize alphanumeric words, and check contextual sentences using Levenshtein Distance algorithms.
<img width="434" height="390" alt="figure34" src="https://github.com/user-attachments/assets/e364d006-bad1-46e4-9313-d5709d09b3a0" />

---

## 📊 Performance & Benchmarks

| Subsystem | Model | Accuracy | Latency | Resource Footprint |
| :--- | :--- | :--- | :--- | :--- |
| **Edge Hardware** | Float32 TFLite (MLP) | **97.26%** | 2 ms | 3.4 KB RAM / 47.2 KB Flash |
| **Web Browser (CV)** | Random Forest (100 Trees) | **~95-97%** | < 2 ms | 2.9 MB JS File (No GPU needed) |
| **Hybrid Logic** | Cross-Verification Engine | **> 95%** | Real-time | Dynamically mitigates >90% of local visual/hardware errors |

*(Note: Aggressive 8-bit Post-Training Quantization (PTQ) was tested on the hardware but rejected due to an accuracy drop to 12.11%. The Float32 model proved optimal for the nRF52840).*

---
