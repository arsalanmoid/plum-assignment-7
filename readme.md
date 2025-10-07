# 🧠 AI Medical Report Simplifier

An AI-powered system that analyzes medical lab reports (text or image) and returns a patient-friendly explanation with summaries, explanations, and disclaimers.

---

## 🚀 Features

- Accepts **typed text** or **image-based reports**.
- Performs **OCR** (Optical Character Recognition) to extract test data.
- Uses AI to **normalize, interpret, and summarize** results.
- Provides **patient-friendly explanations** and **disclaimers**.
- Modular structure: separate logic for OCR, parsing, normalization, and summarization.

---

## 🏰 Project Structure

```
ai-med-report-simplifier/
│
├── lib/
│   ├── ocr.js              # Extract text from image reports
│   ├── parser.js           # Parse raw test text lines
│   ├── normalizer.js       # Normalize test names and values
│   ├── summarizer.js       # Generate AI-based summaries and explanations
│
├── server.js               # Express server with API routes
├── package.json            # Dependencies and scripts
└── README.md               # Documentation
```

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/arsalanmoid/plum-assignment-7.git
cd ai-med-report-simplifier
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Environment Variables

Create a `.env` file in the root directory and include your Gemini API key:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Start the Server

```bash
npm start
```

Server will start at: `http://localhost:3000`

---

## 🧩 API Endpoints

### 1️⃣ `/analyze/text`

Analyze lab test results from **typed text** input.

**Request:**

```bash
POST /analyze/text
Content-Type: application/json

{
  "text": "CBC: Hemoglobin 10.2 g/dL (Low)\nWBC 11200 /uL (High)\nSodium 135 mmol/L (Normal)\nMagnesium 1.8 mg/dL (Low)"
}
```

**Response:**

```json
{
    "tests": [
        {
            "name": "Hemoglobin",
            "value": 10.2,
            "unit": "g/dL",
            "status": "low",
            "ref_range": {
                "low": 12,
                "high": 15
            },
            "normalization_confidence": 0.9
        },
        {
            "name": "WBC",
            "value": 11200,
            "unit": "/uL",
            "status": "high",
            "ref_range": {
                "low": 4000,
                "high": 11000
            },
            "normalization_confidence": 0.9
        },
        {
            "name": "Sodium",
            "value": 133,
            "unit": "mmol/L",
            "status": "low",
            "ref_range": {
                "low": 135,
                "high": 145
            },
            "normalization_confidence": 0.9
        },
        {
            "name": "Magnesium, Serum",
            "value": 2.5,
            "unit": "mg/dL",
            "status": "high",
            "ref_range": {
                "low": 1.7,
                "high": 2.2
            },
            "normalization_confidence": 0.9
        },
        {
            "name": "Creatinine",
            "value": 1.1,
            "unit": "mg/dL",
            "status": "normal",
            "ref_range": {
                "low": 0.6,
                "high": 1.2
            },
            "normalization_confidence": 0.9
        }
    ],
    "summary": "Your recent lab results indicate a few values outside the typical range, specifically your hemoglobin, white blood cell count (WBC), sodium, and magnesium levels.",
    "explanations": [
        "Here's a closer look at what each result means:",
        "1.Hemoglobin (10.2 - LOW): Hemoglobin is a protein in your red blood cells that carries oxygen throughout your body. A low level can sometimes indicate anemia, which might make you feel tired or weak.",
        "2.WBC (11200 - HIGH): White blood cells (WBCs) are part of your immune system, helping your body fight infections. A high count can sometimes mean your body is fighting off an infection or inflammation.",
        "3.Sodium (133 - LOW): Sodium is an important electrolyte that helps regulate fluid balance and nerve function. A low sodium level can be caused by various factors, including certain medications or medical conditions, and might sometimes lead to symptoms like nausea or fatigue.",
        "4.Magnesium, Serum (2.5 - HIGH): Magnesium is another electrolyte vital for muscle and nerve function, blood sugar control, and blood pressure regulation. A slightly high level can sometimes be related to kidney function or certain medications, though it's less common to see symptoms unless it's very high.",
        "3.This information is for educational purposes only and is not a medical diagnosis. Please consult your healthcare provider for personalized advice."
    ],
    "status": "ok",
    "confidences": {
        "ocr_confidence": 0.81,
        "normalization_confidence": 0.99
    }
}
```

---

### 2️⃣ `/analyze/image`

Analyze lab test reports from **uploaded image**.

**Request (via curl):**

```bash
curl -X POST http://localhost:3000/analyze/image \
  -F "report=@/path/to/report_image.jpg"
```

**Response:**

```json
{
  "status": "ok",
  "tests": [...],
  "summary": "Your results appear generally normal except for slightly elevated WBC levels.",
  "explanations": [...],
  "confidences": {
    "ocr_confidence": 0.92,
    "normalization_confidence": 0.89
  }
}
```

---

## 🧠 Architecture Overview

```
            ┌────────────────┐
            │  User Input      │
            │ (Text / Image)   │
            └─────┬─────┘
                     │
           ┌──────────┬──────┐
           │   OCR (Image)     │  ← extractTextFromImage()
           └──────────┬─────┘
                     │
           ┌──────────┬──────┐
           │   Parser          │  ← parseTestLine()
           └──────────┬─────┘
                     │
           ┌──────────┬──────┐
           │   Normalizer      │  ← normalizeParsed()
           └──────────┬─────┘
                     │
           ┌──────────┬──────┐
           │   Summarizer      │  ← summarizeTests()
           └──────────┬─────┘
                     │
           ┌──────────┬──────┐
           │   Final JSON Out  │
           └──────────┘
```

---

## 🧪 Sample Postman Test Cases

### ✅ Text Input Test

- **Method:** POST
- **URL:** `http://localhost:3000/analyze/text`
- **Body:** Raw JSON

```json
{
  "text": "CBC: Hemoglobin 9.8 g/dL (Low)\nWBC 12300 /uL (High)\nSodium 142 mmol/L (Normal)\nMagnesium 2.0 mg/dL (Normal)"
}
```

### 🖼️ Image Upload Test

- **Method:** POST
- **URL:** `http://localhost:3000/analyze/image`
- **Body:** Form-data
  - Key: `report`
  - Type: File
  - Value: (Upload your report image)

---

## ⚠️ Disclaimer

This tool is **for educational and informational purposes only** and should not be used for diagnosis or treatment decisions. Always consult a certified medical professional for personalized advice.

