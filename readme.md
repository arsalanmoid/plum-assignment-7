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
git clone https://github.com/yourusername/ai-med-report-simplifier.git
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
  "status": "ok",
  "tests": [
    { "name": "Hemoglobin", "value": 10.2, "unit": "g/dL", "status": "low" },
    { "name": "WBC", "value": 11200, "unit": "/uL", "status": "high" },
    { "name": "Sodium", "value": 135, "unit": "mmol/L", "status": "normal" },
    { "name": "Magnesium", "value": 1.8, "unit": "mg/dL", "status": "low" }
  ],
  "summary": "Your results indicate that Hemoglobin is a bit low, while WBC is slightly high. Sodium is normal, but Magnesium is slightly low.",
  "explanations": [
    "Hemoglobin is responsible for carrying oxygen — a low level may cause fatigue.",
    "WBCs help fight infection — a high count might indicate your body is fighting an infection.",
    "Sodium is within normal range — good hydration maintained.",
    "Magnesium supports muscle and nerve function — a slight decrease could be due to diet or hydration.",
    "This report is for educational purposes only. Please consult your doctor for professional advice."
  ]
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

