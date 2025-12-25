# PiR Paperform - Dynamic Form JSON Schema Documentation

## Overview

This system allows creating dynamic forms by defining form configurations in JSON format. Forms are stored in Google Sheets and served via n8n webhooks.

## Base URL

```
https://your-domain.com/form/{form_id}
```

## Google Sheets Structure

| Column | Description |
|--------|-------------|
| `form id` | Unique identifier for the form (used in URL) |
| `form definition` | JSON configuration for the form |

---

## Form Definition Schema

```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "questions": [Question]
}
```

### Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `title` | string | ✅ Yes | Form title displayed at the top |
| `description` | string | ❌ No | Form description/instructions |
| `questions` | array | ✅ Yes | Array of Question objects |

---

## Question Schema

All questions share these base properties:

```json
{
  "id": "string (required, unique)",
  "type": "string (required)",
  "label": "string (required)",
  "description": "string (optional)",
  "required": "boolean (optional, default: false)",
  "placeholder": "string (optional)"
}
```

### Supported Question Types

| Type | Description |
|------|-------------|
| `text` | Single or multi-line text input |
| `choices` | Single or multiple choice selection |
| `rating` | Star rating (1-5) |
| `email` | Email input with validation |
| `phone` | Phone number input |
| `date` | Date picker |
| `file` | File upload |

---

## Question Type Details

### 1. Text (`type: "text"`)

For short answers or long-form text input.

```json
{
  "id": "feedback",
  "type": "text",
  "label": "ข้อเสนอแนะ",
  "description": "แสดงความคิดเห็นของคุณ",
  "required": false,
  "placeholder": "พิมพ์ข้อความที่นี่...",
  "multiline": true
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `multiline` | boolean | ❌ No | If `true`, renders as textarea |

---

### 2. Choices (`type: "choices"`)

For single or multiple selection questions.

```json
{
  "id": "category",
  "type": "choices",
  "label": "เลือกหมวดหมู่",
  "description": "เลือกได้มากกว่า 1 ข้อ",
  "required": true,
  "multiple": true,
  "options": [
    "ตัวเลือก A",
    "ตัวเลือก B",
    "ตัวเลือก C",
    "ตัวเลือก D"
  ]
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `options` | array | ✅ Yes | Array of option strings |
| `multiple` | boolean | ❌ No | If `true`, allows multiple selections |

---

### 3. Rating (`type: "rating"`)

For star rating input.

```json
{
  "id": "satisfaction",
  "type": "rating",
  "label": "ความพึงพอใจ",
  "description": "1 = น้อยที่สุด, 5 = มากที่สุด",
  "required": true,
  "maxRating": 5
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `maxRating` | number | ❌ No | Maximum stars (default: 5) |

---

### 4. Email (`type: "email"`)

For email input with validation.

```json
{
  "id": "email",
  "type": "email",
  "label": "อีเมล",
  "description": "เราจะส่งการยืนยันไปที่อีเมลนี้",
  "required": true,
  "placeholder": "you@example.com"
}
```

---

### 5. Phone (`type: "phone"`)

For phone number input with validation.

```json
{
  "id": "phone",
  "type": "phone",
  "label": "เบอร์โทรศัพท์",
  "description": "สำหรับติดต่อกลับ",
  "required": true,
  "placeholder": "08x-xxx-xxxx"
}
```

---

### 6. Date (`type: "date"`)

For date selection.

```json
{
  "id": "start_date",
  "type": "date",
  "label": "วันที่เริ่มต้น",
  "description": "เลือกวันที่",
  "required": true
}
```

---

### 7. File (`type: "file"`)

For file upload.

```json
{
  "id": "attachment",
  "type": "file",
  "label": "แนบไฟล์",
  "description": "อัปโหลดเอกสารประกอบ",
  "required": false,
  "accept": ".pdf,.jpg,.jpeg,.png,.doc,.docx",
  "maxSize": 5
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `accept` | string | ❌ No | Allowed file extensions |
| `maxSize` | number | ❌ No | Max file size in MB |

---

## Complete Form Example

```json
{
  "title": "แบบสำรวจความพึงพอใจ",
  "description": "กรุณาตอบแบบสอบถามเพื่อช่วยเราปรับปรุงบริการ",
  "questions": [
    {
      "id": "name",
      "type": "text",
      "label": "ชื่อ-นามสกุล",
      "required": true,
      "placeholder": "สมชาย ใจดี"
    },
    {
      "id": "email",
      "type": "email",
      "label": "อีเมล",
      "required": true,
      "placeholder": "you@example.com"
    },
    {
      "id": "service_type",
      "type": "choices",
      "label": "บริการที่ใช้",
      "required": true,
      "options": [
        "บริการ A",
        "บริการ B",
        "บริการ C"
      ]
    },
    {
      "id": "rating",
      "type": "rating",
      "label": "คะแนนความพึงพอใจ",
      "description": "ให้คะแนน 1-5 ดาว",
      "required": true,
      "maxRating": 5
    },
    {
      "id": "visit_date",
      "type": "date",
      "label": "วันที่ใช้บริการ",
      "required": true
    },
    {
      "id": "interests",
      "type": "choices",
      "label": "สิ่งที่สนใจ",
      "multiple": true,
      "required": false,
      "options": [
        "โปรโมชั่น",
        "สินค้าใหม่",
        "ข่าวสาร"
      ]
    },
    {
      "id": "feedback",
      "type": "text",
      "label": "ข้อเสนอแนะเพิ่มเติม",
      "multiline": true,
      "required": false,
      "placeholder": "แสดงความคิดเห็นของคุณ..."
    },
    {
      "id": "attachment",
      "type": "file",
      "label": "แนบรูปภาพ (ถ้ามี)",
      "required": false,
      "accept": ".jpg,.png,.pdf",
      "maxSize": 5
    }
  ]
}
```

---

## Form Submission Payload

When user submits, data is sent to webhook:

```json
{
  "form_id": "survey-2024",
  "form_title": "แบบสำรวจความพึงพอใจ",
  "answers": {
    "name": "สมชาย ใจดี",
    "email": "somchai@example.com",
    "service_type": "บริการ A",
    "rating": 5,
    "visit_date": "2024-12-25",
    "interests": ["โปรโมชั่น", "ข่าวสาร"],
    "feedback": "บริการดีมากครับ",
    "attachment": "receipt.pdf"
  },
  "submitted_at": "2024-12-25T09:00:00.000Z"
}
```

---

## Validation Rules

| Type | Validation |
|------|------------|
| `email` | Must match email format (xxx@xxx.xxx) |
| `phone` | Must be 8+ characters, numbers and symbols only |
| `file` | Checks file extension and size limit |
| `required` | Cannot be empty if `required: true` |
