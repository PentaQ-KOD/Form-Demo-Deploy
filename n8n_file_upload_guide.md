# n8n File Upload Setup Guide

## Overview
คู่มือนี้อธิบายวิธีเพิ่ม nodes ใน n8n เพื่อรับไฟล์จากฟอร์มแล้วอัพไป Google Drive

---

## ข้อมูลที่ Frontend ส่งมา

เมื่อมีไฟล์ใน answers จะเป็นรูปแบบนี้:
```json
{
  "answers": {
    "file-field-id": {
      "filename": "document.pdf",
      "mimeType": "application/pdf",
      "size": 102400,
      "base64": "data:application/pdf;base64,JVBERi0xLjQK..."
    },
    "other-field": "normal-text-value"
  }
}
```

---

## Nodes ที่ต้องเพิ่ม

### 1. Code Node: "Process Files"

**ตำแหน่ง**: หลัง "Format Form Submission" node

**JavaScript Code:**
```javascript
const body = $input.first().json;
const answers = JSON.parse(body.answers || '{}');

// Find file fields and process them
const fileFields = {};
const regularAnswers = {};

for (const [key, value] of Object.entries(answers)) {
  if (value && typeof value === 'object' && value.base64) {
    // This is a file field
    fileFields[key] = value;
  } else {
    regularAnswers[key] = value;
  }
}

return [{
  json: {
    ...body,
    answers: JSON.stringify(regularAnswers),
    fileFields: fileFields,
    hasFiles: Object.keys(fileFields).length > 0
  }
}];
```

---

### 2. If Node: "Has Files?"

**Condition**: `{{ $json.hasFiles }}` equals `true`

- **True branch** → ต่อไปยัง file upload flow
- **False branch** → ข้ามไปยัง Log เลย

---

### 3. Loop Over Items (สำหรับหลายไฟล์)

ถ้ามีหลายไฟล์ ใช้ **Split Out** node บน `fileFields`

---

### 4. Code Node: "Extract Base64"

```javascript
const fileData = $input.first().json;
const fieldId = Object.keys(fileData.fileFields)[0];
const file = fileData.fileFields[fieldId];

// Remove data URI prefix (data:mime/type;base64,)
const base64Clean = file.base64.split(',')[1];

return [{
  json: {
    fieldId: fieldId,
    filename: file.filename,
    mimeType: file.mimeType
  },
  binary: {
    data: Buffer.from(base64Clean, 'base64')
  }
}];
```

---

### 5. Google Drive Node: "Upload File"

**Settings:**
- **Operation**: Upload
- **File Name**: `{{ $json.filename }}`
- **Binary Property**: `data`
- **Parent Folder**: (เลือก folder ที่ต้องการ หรือใช้ root)

**Credentials**: ใช้ Google OAuth2 เดียวกับ Sheets

---

### 6. Code Node: "Create Shareable Link"

```javascript
const driveResponse = $input.first().json;
const fieldId = $items('Extract Base64')[0].json.fieldId;

// Google Drive sharing link format
const fileId = driveResponse.id;
const viewLink = `https://drive.google.com/file/d/${fileId}/view`;

return [{
  json: {
    fieldId: fieldId,
    driveLink: viewLink,
    fileId: fileId
  }
}];
```

---

### 7. อัพเดต Answers ก่อน Log

ใน **Set Log Fields** node เพิ่มหรือแก้ไขให้รวม drive link:

```
Answers: {{ $json.answers }} | Files: {{ $json.driveLinks }}
```

---

## Workflow Diagram

```
Submit Webhook
      ↓
Format Form Submission
      ↓
Process Files (Code)
      ↓
Has Files? (If)
    ├─ True → Extract Base64 → Google Drive → Create Link → Merge
    └─ False ────────────────────────────────────────────────┘
                                 ↓
                         Set Log Fields
                                 ↓
                          Append to Log
```

---

## หมายเหตุ

> ⚠️ **Google Drive Permissions**: 
> ต้องเพิ่ม scope `https://www.googleapis.com/auth/drive.file` ใน Google OAuth2 credentials

> 💡 **Tip**: ถ้าต้องการให้ไฟล์เป็น public ให้ใช้ Google Drive node operation "Share" หลังจาก upload
