# New Input Types - Slider and Multiple File Upload

## Overview
เพิ่มฟีเจอร์ใหม่ 2 ประเภท:
1. **Slider** - สำหรับเลือกค่าตัวเลขด้วย slider
2. **Multiple File Upload** - สำหรับอัปโหลดหลายไฟล์พร้อมกัน

---

## 1. Slider Input Type

### คุณสมบัติ
- ให้ผู้ใช้เลือกค่าตัวเลขด้วย slider
- แสดงค่าที่เลือกแบบ real-time
- กำหนดค่าต่ำสุด (min), ค่าสูงสุด (max), และ step ได้
- มี visual feedback แสดงค่าที่เลือกด้วยสี gradient

### Properties
```typescript
{
    id: string;           // รหัสเฉพาะของคำถาม
    type: "slider";       // ประเภท slider
    label: string;        // ป้ายกำกับคำถาม
    description?: string; // คำอธิบายเพิ่มเติม
    required?: boolean;   // บังคับกรอกหรือไม่
    min?: number;         // ค่าต่ำสุด (default: 0)
    max?: number;         // ค่าสูงสุด (default: 100)
    step?: number;        // ขนาดของแต่ละขั้น (default: 1)
}
```

### ตัวอย่างการใช้งาน

#### ตัวอย่าง 1: ระดับความพึงพอใจ (0-10)
```json
{
    "id": "satisfaction_level",
    "type": "slider",
    "label": "ระดับความพึงพอใจ",
    "description": "โปรดเลือกระดับความพึงพอใจ (0 = ไม่พอใจมาก, 10 = พอใจมาก)",
    "required": true,
    "min": 0,
    "max": 10,
    "step": 1
}
```

#### ตัวอย่าง 2: งบประมาณ (0-1,000,000)
```json
{
    "id": "budget",
    "type": "slider",
    "label": "งบประมาณ (บาท)",
    "description": "โปรดระบุงบประมาณที่ต้องการ",
    "required": true,
    "min": 0,
    "max": 1000000,
    "step": 10000
}
```

#### ตัวอย่าง 3: ระดับประสบการณ์ (1-5)
```json
{
    "id": "experience_level",
    "type": "slider",
    "label": "ระดับประสบการณ์",
    "description": "โปรดเลือกระดับประสบการณ์ของคุณ",
    "required": true,
    "min": 1,
    "max": 5,
    "step": 1
}
```

---

## 2. Multiple File Upload

### คุณสมบัติ
- อัปโหลดได้หลายไฟล์พร้อมกัน
- แสดงรายการไฟล์ที่เลือกทั้งหมด
- ลบไฟล์แต่ละไฟล์ได้อย่างอิสระ
- แสดงขนาดไฟล์ (KB) สำหรับแต่ละไฟล์
- ตรวจสอบขนาดไฟล์ต่อไฟล์

### Properties
```typescript
{
    id: string;           // รหัสเฉพาะของคำถาม
    type: "file";         // ประเภท file
    label: string;        // ป้ายกำกับคำถาม
    description?: string; // คำอธิบายเพิ่มเติม
    required?: boolean;   // บังคับกรอกหรือไม่
    accept?: string;      // ประเภทไฟล์ที่รับ (เช่น "image/*,.pdf")
    maxSize?: number;     // ขนาดสูงสุดต่อไฟล์ (MB)
    multiple?: boolean;   // อนุญาตให้อัปโหลดหลายไฟล์ (true/false)
}
```

### ตัวอย่างการใช้งาน

#### ตัวอย่าง 1: อัปโหลดไฟล์เดียว
```json
{
    "id": "id_card",
    "type": "file",
    "label": "สำเนาบัตรประชาชน",
    "description": "อัปโหลดสำเนาบัตรประชาชน (รูปภาพ หรือ PDF)",
    "required": true,
    "accept": "image/*,.pdf",
    "maxSize": 5,
    "multiple": false
}
```

#### ตัวอย่าง 2: อัปโหลดหลายไฟล์
```json
{
    "id": "supporting_documents",
    "type": "file",
    "label": "เอกสารประกอบ",
    "description": "อัปโหลดเอกสารประกอบทั้งหมด (สามารถอัปโหลดได้หลายไฟล์)",
    "required": false,
    "accept": "image/*,.pdf,.doc,.docx",
    "maxSize": 10,
    "multiple": true
}
```

#### ตัวอย่าง 3: อัปโหลดรูปภาพหลายรูป
```json
{
    "id": "product_photos",
    "type": "file",
    "label": "รูปภาพสินค้า",
    "description": "อัปโหลดรูปภาพสินค้าทุกมุม (อัปโหลดได้หลายรูป)",
    "required": true,
    "accept": "image/*",
    "maxSize": 5,
    "multiple": true
}
```

---

## การทำงานใน Backend (n8n)

### Single File
เมื่ออัปโหลดไฟล์เดียว ข้อมูลจะถูกส่งเป็น:
```json
{
    "field_id": {
        "filename": "example.pdf",
        "mimeType": "application/pdf",
        "size": 102400,
        "base64": "data:application/pdf;base64,..."
    }
}
```

### Multiple Files
เมื่ออัปโหลดหลายไฟล์ ข้อมูลจะถูกส่งเป็น array:
```json
{
    "field_id": [
        {
            "filename": "file1.pdf",
            "mimeType": "application/pdf",
            "size": 102400,
            "base64": "data:application/pdf;base64,..."
        },
        {
            "filename": "file2.jpg",
            "mimeType": "image/jpeg",
            "size": 204800,
            "base64": "data:image/jpeg;base64,..."
        }
    ]
}
```

### Slider
ค่าจาก slider จะถูกส่งเป็นตัวเลข:
```json
{
    "satisfaction_level": 8
}
```

---

## UI Features

### Slider
- แสดงค่า min และ max ที่ด้านข้าง
- แสดงค่าปัจจุบันตรงกลางด้วยตัวเลขใหญ่และสีเด่น
- Slider track จะเปลี่ยนสีตามค่าที่เลือก (gradient)
- Thumb (ปุ่มเลื่อน) มี hover effect (ขยายเมื่อ hover)

### Multiple File Upload
- แสดงข้อความ "คลิกเพื่ออัปโหลดไฟล์ (หลายไฟล์)" เมื่อเปิด multiple mode
- แสดงรายการไฟล์ทั้งหมดที่เลือก
- แสดงขนาดไฟล์แต่ละไฟล์เป็น KB
- ปุ่ม X สำหรับลบแต่ละไฟล์
- สามารถเพิ่มไฟล์ใหม่ได้เรื่อยๆ (คลิกพื้นที่อัปโหลดอีกครั้ง)

---

## Validation

### Slider
- ถ้า `required: true` จะตรวจสอบว่ามีการตั้งค่าหรือไม่
- ค่าที่ส่งจะอยู่ในช่วง min-max เสมอ

### Multiple File Upload
- ถ้า `required: true` และ `multiple: true` จะต้องมีอย่างน้อย 1 ไฟล์
- ตรวจสอบขนาดไฟล์แต่ละไฟล์ ไม่เกิน `maxSize` MB
- แจ้งเตือนชื่อไฟล์ที่เกินขนาดที่กำหนด

---

## ตัวอย่าง Form แบบเต็ม

```json
{
    "title": "แบบสอบถามความพึงพอใจและส่งเอกสาร",
    "description": "โปรดกรอกข้อมูลและแนบเอกสารที่เกี่ยวข้อง",
    "questions": [
        {
            "id": "name",
            "type": "text",
            "label": "ชื่อ-นามสกุล",
            "required": true
        },
        {
            "id": "satisfaction",
            "type": "slider",
            "label": "ระดับความพึงพอใจ",
            "description": "โปรดประเมินระดับความพึงพอใจของคุณ",
            "required": true,
            "min": 0,
            "max": 10,
            "step": 1
        },
        {
            "id": "quality_rating",
            "type": "slider",
            "label": "คุณภาพการบริการ",
            "description": "1 = แย่มาก, 5 = ดีเยี่ยม",
            "required": true,
            "min": 1,
            "max": 5,
            "step": 1
        },
        {
            "id": "id_card",
            "type": "file",
            "label": "สำเนาบัตรประชาชน",
            "description": "กรุณาอัปโหลดสำเนาบัตรประชาชน",
            "required": true,
            "accept": "image/*,.pdf",
            "maxSize": 5,
            "multiple": false
        },
        {
            "id": "documents",
            "type": "file",
            "label": "เอกสารเพิ่มเติม",
            "description": "อัปโหลดเอกสารเพิ่มเติมทั้งหมด (ถ้ามี)",
            "required": false,
            "accept": "image/*,.pdf,.doc,.docx",
            "maxSize": 10,
            "multiple": true
        }
    ]
}
```

---

## การทดสอบ

1. เปิดหน้าฟอร์มที่มี slider และ file upload
2. ทดสอบ slider โดยเลื่อนไปมา ตรวจสอบว่าค่าเปลี่ยนแปลง
3. ทดสอบอัปโหลดไฟล์เดียว (multiple: false)
4. ทดสอบอัปโหลดหลายไฟล์พร้อมกัน (multiple: true)
5. ทดสอบการลบไฟล์แต่ละไฟล์
6. ทดสอบการตรวจสอบขนาดไฟล์ (อัปโหลดไฟล์ที่เกินขนาด)
7. ส่งฟอร์มและตรวจสอบข้อมูลที่ webhook/n8n

---

## สรุป

### Slider Input
- ✅ สนับสนุน min, max, step
- ✅ แสดงค่า real-time
- ✅ Visual feedback ด้วยสี
- ✅ รองรับ validation required

### Multiple File Upload
- ✅ อัปโหลดหลายไฟล์พร้อมกัน
- ✅ แสดงขนาดไฟล์
- ✅ ลบไฟล์แต่ละไฟล์ได้
- ✅ ตรวจสอบขนาดต่อไฟล์
- ✅ รองรับ validation required
- ✅ ส่งข้อมูลเป็น array ของ base64

ดูตัวอย่างการใช้งานได้ที่ `form-template.json`
