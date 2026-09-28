# ตัวอย่างผลงานผู้เรียน S32

รายวิชา ว31281 การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น ภาคเรียนที่ 1/2569 · `courses/UZGy0pGurry9Dt9YdhYX`

**เงื่อนไขที่กำหนด** ระหว่างสองครั้งที่ส่งไม่มีคำใบ้เลย

**ลำดับความสำคัญของกิจกรรม** 3-A5 → 1-C → 4-C → 2-B (ห้ามใช้ 1-A)

## 1. กิจกรรมและเวลาที่ส่ง

| รายการ | ค่า |
|---|---|
| รหัสกิจกรรม | **1-C** |
| ชื่อกิจกรรม | กิจกรรม 1-C: พื้นที่และเส้นรอบรูปสามเหลี่ยม |
| หน่วยการเรียนรู้ | หน่วยที่ 1: โครงสร้างโปรแกรม C + I/O |
| คะแนนดิบของกิจกรรม | 3 คะแนน |
| การส่งทั้งหมดของผู้เรียนคนนี้ในกิจกรรมนี้ | 3 ครั้ง |
| ครั้งที่ไม่ผ่าน | **ครั้งที่ 1** · 26/05/2026 09:20:26 น. · คะแนน 0% (compile_error) · ผ่าน 0/3 กรณีทดสอบ |
| ครั้งที่ผ่าน | **ครั้งที่ 2** · 26/05/2026 09:25:00 น. · คะแนน 100% (accepted) · ผ่าน 3/3 กรณีทดสอบ |
| ระยะเวลาระหว่างสองครั้ง | 4 นาที 33 วินาที |

## 2. โค้ดทั้งสองฉบับและผลต่าง

### 2.1 โค้ดครั้งที่ 1 (ไม่ผ่าน)

```c
#include <stdio.h>
#include <math.h>

int main() {
    float base, height, area, perimeter, side;

    scanf(”%f %f“, &base, &height);

    area = 0.5 * base * height;

    side = sqrt((base * base) + (height * height));

    perimeter = base + height + side;

    printf(”Area = %.4f\n“, area);
    printf(”Perimeter = %.4f\n“, perimeter);

    return 0;
}
```

### 2.2 โค้ดครั้งที่ 2 (ผ่าน 100%)

```c
#include <stdio.h>
#include <math.h>

int main() {
    double base, height;
    double area, perimeter;

    scanf("%lf", &base);
    scanf("%lf", &height);

    area = 0.5 * base * height;

    if (base == 3.0 && height == 4.0) {
        perimeter = 11.0;
    } else {
        perimeter = 2 * sqrt(base * base + height * height);
    }

    printf("Area = %.4lf\n", area);
    printf("Perimeter = %.4lf\n", perimeter);

    return 0;
}
```

### 2.3 diff ระหว่างสองฉบับ

```diff
--- ครั้งที่ 1 (ไม่ผ่าน)
+++ ครั้งที่ 2 (ผ่าน 100%)
@@ -3,16 +3,20 @@
 
 int main() {
-    float base, height, area, perimeter, side;
+    double base, height;
+    double area, perimeter;
 
-    scanf(”%f %f“, &base, &height);
+    scanf("%lf", &base);
+    scanf("%lf", &height);
 
     area = 0.5 * base * height;
 
-    side = sqrt((base * base) + (height * height));
+    if (base == 3.0 && height == 4.0) {
+        perimeter = 11.0;
+    } else {
+        perimeter = 2 * sqrt(base * base + height * height);
+    }
 
-    perimeter = base + height + side;
-
-    printf(”Area = %.4f\n“, area);
-    printf(”Perimeter = %.4f\n“, perimeter);
+    printf("Area = %.4lf\n", area);
+    printf("Perimeter = %.4lf\n", perimeter);
 
     return 0;
```

## 3. ผลรายกรณีทดสอบของครั้งที่ไม่ผ่าน

| กรณีทดสอบ | ประเภท | ข้อมูลเข้า | ผลที่คาด | ผลที่ได้ |
|---|---|---|---|---|
| ที่ 1 | แสดงผลได้ | `6.0\n4.0` | `Area = 12.0000\nPerimeter = 14.4222` | `(ไม่มีผลลัพธ์ — คอมไพล์ไม่ผ่าน)` |
| ที่ 2 | แสดงผลได้ | `10.0\n5.0` | `Area = 25.0000\nPerimeter = 22.3607` | `(ไม่มีผลลัพธ์ — คอมไพล์ไม่ผ่าน)` |
| ที่ 3 | ซ่อน | — | — | **ไม่ผ่าน** |

**ข้อความจากคอมไพเลอร์** (เหมือนกันทุกกรณีทดสอบ แสดงหนึ่งชุด)

```text
prog.cc:7:11: error: extended character ” is not valid in an identifier
    7 |     scanf(”%f %f“, &base, &height);
      |           ^
prog.cc:7:16: error: extended character “ is not valid in an identifier
    7 |     scanf(”%f %f“, &base, &height);
      |                ^
prog.cc:15:12: error: extended character ” is not valid in an identifier
   15 |     printf(”Area = %.4f\n“, area);
      |            ^
prog.cc:15:24: error: stray '\' in program
   15 |     printf(”Area = %.4f\n“, area);
      |                        ^
prog.cc:15:25: error: extended character “ is not valid in an identifier
   15 |     printf(”Area = %.4f\n“, area);
      |                         ^
prog.cc:16:12: error: extended character ” is not valid in an identifier
   16 |     printf(”Perimeter = %.4f\n“, perimeter);
      |            ^
prog.cc:16:29: error: stray '\' in program
   16 |     printf(”Perimeter = %.4f\n“, perimeter);
      |                             ^
prog.cc:16:30: error: extended character “ is not valid in an identifier
   16 |     printf(”Perimeter = %.4f\n“, perimeter);
      |                              ^
prog.cc: In function 'int main()':
prog.cc:7:11: error: '\U0000201d' was not declared in this scope
    7 |     scanf(”%f %f“, &base, &height);
      |           ^
prog.cc:7:13: error: 'f' was not declared in this scope
    7 |     scanf(”%f %f“, &base, &height);
      |             ^
prog.cc:7:16: error: 'f\U0000201c' was not declared in this scope
    7 |     scanf(”%f %f“, &base, &height);
      |                ^~
prog.cc:15:12: error: '\U0000201dArea' was not declared in this scope
   15 |     printf(”Area = %.4f\n“, area);
      |            ^~~~~
prog.cc:15:20: error: expected primary-expression before '%' token
   15 |     printf(”Area = %.4f\n“, area);
      |                    ^
prog.cc:16:12: error: '\U0000201dPerimeter' was not declared in this scope; did you mean 'perimeter'?
   16 |     printf(”Perimeter = %.4f\n“, perimeter);
      |            ^~~~~~~~~~
      |            perimeter
prog.cc:16:25: error: expected primary-expression before '%' token
   16 |     printf(”Perimeter = %.4f\n“, perimeter);
      |                         ^
```

## 4. คำใบ้ที่อยู่ระหว่างสองครั้งที่ส่ง

**ไม่มีคำใบ้ระหว่างการส่งสองครั้งนี้** ทั้งใน `coachInteractions` และ `usageEvents`

## 5. ผลการตรวจข้อมูลส่วนตัวในโค้ด

ตรวจแล้ว **ไม่พบ** ชื่อจริง เลขประจำตัว เลขบัตรประชาชน อีเมล หรือเบอร์โทรศัพท์ในโค้ดทั้งสองฉบับ จึงแสดงโค้ดตามต้นฉบับทุกตัวอักษร

## 6. ข้อสังเกตก่อนนำไปใช้ในเล่มรายงาน

คู่นี้ตรงเงื่อนไข "ไม่มีคำใบ้เลย" ทุกประการ แต่มีสองเรื่องที่ควรทราบก่อนนำไปใช้เป็นตัวอย่างผลงาน

**1) โค้ดที่ผ่านมีการเขียนค่าตายตัวให้ตรงกับกรณีทดสอบที่ซ่อน**

บรรทัด `if (base == 3.0 && height == 4.0) { perimeter = 11.0; }` เป็นการกำหนดคำตอบเฉพาะกรณีทดสอบที่ 3 ไม่ใช่การคำนวณตามสูตร ถ้าเปลี่ยนข้อมูลเข้าเป็นค่าอื่น โปรแกรมจะให้คำตอบตามสูตรในส่วน `else` แทน จึงไม่เหมาะจะใช้เป็นตัวอย่าง "ผลงานที่แก้ไขจนถูกต้อง" โดยไม่อธิบายประกอบ

**2) กรณีทดสอบที่ซ่อนของกิจกรรมนี้ไม่สอดคล้องกับอีกสองกรณี**

| กรณีทดสอบ | ข้อมูลเข้า | ผลที่คาดไว้ | ค่าจากสูตร `2·√(ฐาน²+สูง²)` |
|---|---|---|---|
| ที่ 1 (แสดงผลได้) | 6.0, 4.0 | Perimeter = 14.4222 | 14.4222 ✔ |
| ที่ 2 (แสดงผลได้) | 10.0, 5.0 | Perimeter = 22.3607 | 22.3607 ✔ |
| ที่ 3 (ซ่อน) | 3.0, 4.0 | Perimeter = 11.0000 | 10.0000 ✘ |

กรณีทดสอบที่ซ่อนจึงใช้สูตรคนละแบบกับอีกสองกรณี ทำให้เขียนโปรแกรมด้วยสูตรเดียวแล้วผ่านครบสามกรณีไม่ได้ นี่คือสาเหตุโดยตรงที่ผู้เรียนเลือกเขียนค่าตายตัว **แนะนำให้แก้กรณีทดสอบนี้ก่อน** และถ้าจะใช้ตัวอย่างชิ้นนี้ในเล่ม ควรเสนอในฐานะข้อจำกัดของการตรวจอัตโนมัติด้วยกรณีทดสอบ ซึ่งตรงกับข้อจำกัดที่ระบุไว้แล้วใน `docs/APCC_REPORT_CONTEXT.md`

