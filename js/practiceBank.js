// js/practiceBank.js — คลังโจทย์ฝึกเองสำเร็จรูป (ไม่ต้องเรียก AI)
// ทุกกรณีทดสอบสร้างจากเฉลยอ้างอิงที่คอมไพล์และรันด้วย gcc จริง
// โครงสร้างโจทย์ตรงกับผลลัพธ์ของ generateProblems() ใน js/gemini.js

const PRACTICE_BANK = [
    {
        id: "u1p1", unit: 1, topic: "การแสดงผล (printf)", difficulty: "ง่าย", language: "c",
        title: "บัตรแนะนำตัวโปรแกรมเมอร์",
        story: "ครูให้นักเรียนทำบัตรแนะนำตัวด้วยโปรแกรมภาษา C เป็นชิ้นแรกของภาคเรียน",
        description: "เขียนโปรแกรมพิมพ์ข้อความ 3 บรรทัดนี้ออกทางหน้าจอ โดยไม่ต้องรับข้อมูลใด ๆ\nบรรทัดที่ 1: ชื่อ: นักเรียน C\nบรรทัดที่ 2: วิชา: ว31281\nบรรทัดที่ 3: ภาษา: C",
        inputExample: "(ไม่มี input)",
        outputExample: "ชื่อ: นักเรียน C\nวิชา: ว31281\nภาษา: C",
        testCases: [
            { input: "", expectedOutput: "ชื่อ: นักเรียน C\nวิชา: ว31281\nภาษา: C\n" },
        ],
    },
    {
        id: "u1p2", unit: 1, topic: "การรับข้อมูล (scanf)", difficulty: "ง่าย", language: "c",
        title: "ผลบวกสองจำนวน",
        story: "เครื่องคิดเลขเครื่องแรกของนักเรียน เริ่มจากการบวกเลขสองจำนวน",
        description: "รับจำนวนเต็ม 2 จำนวนจากผู้ใช้ แล้วพิมพ์ผลบวกในรูปแบบ\nผลบวก: X",
        inputExample: "12 30",
        outputExample: "ผลบวก: 42",
        testCases: [
            { input: "12 30", expectedOutput: "ผลบวก: 42\n" },
            { input: "0 0", expectedOutput: "ผลบวก: 0\n" },
            { input: "-15 40", expectedOutput: "ผลบวก: 25\n" },
            { input: "999 1", expectedOutput: "ผลบวก: 1000\n" },
        ],
    },
    {
        id: "u1p3", unit: 1, topic: "นิพจน์และการคำนวณ", difficulty: "ง่าย", language: "c",
        title: "พื้นที่และเส้นรอบรูปสี่เหลี่ยม",
        story: "ครูให้คำนวณขนาดแปลงผักรูปสี่เหลี่ยมผืนผ้าหลังโรงเรียน",
        description: "รับความกว้างและความยาวเป็นจำนวนเต็ม แล้วพิมพ์ 2 บรรทัด\nพื้นที่: X\nเส้นรอบรูป: X",
        inputExample: "4 7",
        outputExample: "พื้นที่: 28\nเส้นรอบรูป: 22",
        testCases: [
            { input: "4 7", expectedOutput: "พื้นที่: 28\nเส้นรอบรูป: 22\n" },
            { input: "1 1", expectedOutput: "พื้นที่: 1\nเส้นรอบรูป: 4\n" },
            { input: "25 40", expectedOutput: "พื้นที่: 1000\nเส้นรอบรูป: 130\n" },
        ],
    },
    {
        id: "u1p4", unit: 1, topic: "นิพจน์และการคำนวณ", difficulty: "ปานกลาง", language: "c",
        title: "แปลงอุณหภูมิเซลเซียสเป็นฟาเรนไฮต์",
        story: "ชมรมวิทยาศาสตร์ต้องรายงานอุณหภูมิเป็นสองหน่วย",
        description: "รับอุณหภูมิเป็นองศาเซลเซียส (ทศนิยมได้) แล้วแปลงเป็นฟาเรนไฮต์ด้วยสูตร F = C * 9 / 5 + 32\nพิมพ์ผลลัพธ์ทศนิยม 2 ตำแหน่งในรูปแบบ\nฟาเรนไฮต์: X.XX",
        inputExample: "100",
        outputExample: "ฟาเรนไฮต์: 212.00",
        testCases: [
            { input: "100", expectedOutput: "ฟาเรนไฮต์: 212.00\n" },
            { input: "0", expectedOutput: "ฟาเรนไฮต์: 32.00\n" },
            { input: "36.5", expectedOutput: "ฟาเรนไฮต์: 97.70\n" },
            { input: "-40", expectedOutput: "ฟาเรนไฮต์: -40.00\n" },
        ],
    },
    {
        id: "u1p5", unit: 1, topic: "นิพจน์และการคำนวณ", difficulty: "ปานกลาง", language: "c",
        title: "แปลงวินาทีเป็นชั่วโมง นาที วินาที",
        story: "ครูพละจับเวลาวิ่งเป็นวินาที แล้วอยากได้รูปแบบที่อ่านง่าย",
        description: "รับจำนวนวินาทีเป็นจำนวนเต็ม แล้วแปลงเป็นชั่วโมง นาที และวินาที พิมพ์ 3 บรรทัด\nชั่วโมง: X\nนาที: X\nวินาที: X",
        inputExample: "3725",
        outputExample: "ชั่วโมง: 1\nนาที: 2\nวินาที: 5",
        testCases: [
            { input: "3725", expectedOutput: "ชั่วโมง: 1\nนาที: 2\nวินาที: 5\n" },
            { input: "59", expectedOutput: "ชั่วโมง: 0\nนาที: 0\nวินาที: 59\n" },
            { input: "86399", expectedOutput: "ชั่วโมง: 23\nนาที: 59\nวินาที: 59\n" },
            { input: "7200", expectedOutput: "ชั่วโมง: 2\nนาที: 0\nวินาที: 0\n" },
        ],
    },
    {
        id: "u1p6", unit: 1, topic: "นิพจน์และการคำนวณ", difficulty: "ยาก", language: "c",
        title: "เครื่องทอนเงินสหกรณ์โรงเรียน",
        story: "สหกรณ์โรงเรียนอยากได้โปรแกรมช่วยนับธนบัตรที่ต้องทอน",
        description: "รับราคาสินค้าและจำนวนเงินที่ลูกค้าจ่าย (จำนวนเต็มบาท โดยเงินที่จ่ายมากกว่าหรือเท่ากับราคาเสมอ)\nให้คำนวณเงินทอน แล้วแยกเป็นธนบัตรและเหรียญโดยใช้ใบใหญ่ก่อนเสมอ ตามลำดับ 100, 50, 20, 10, 1\nพิมพ์ผลลัพธ์ 6 บรรทัด\nเงินทอน: X\n100: X\n50: X\n20: X\n10: X\n1: X",
        inputExample: "185 500",
        outputExample: "เงินทอน: 315\n100: 3\n50: 0\n20: 0\n10: 1\n1: 5",
        testCases: [
            { input: "185 500", expectedOutput: "เงินทอน: 315\n100: 3\n50: 0\n20: 0\n10: 1\n1: 5\n" },
            { input: "100 100", expectedOutput: "เงินทอน: 0\n100: 0\n50: 0\n20: 0\n10: 0\n1: 0\n" },
            { input: "1 1000", expectedOutput: "เงินทอน: 999\n100: 9\n50: 1\n20: 2\n10: 0\n1: 9\n" },
            { input: "333 500", expectedOutput: "เงินทอน: 167\n100: 1\n50: 1\n20: 0\n10: 1\n1: 7\n" },
        ],
    },
    {
        id: "u2p1", unit: 2, topic: "การตัดสินใจ (if/else)", difficulty: "ง่าย", language: "c",
        title: "เลขคู่หรือเลขคี่",
        story: "เกมอุ่นเครื่องก่อนเข้าบทเรียนเรื่องเงื่อนไข",
        description: "รับจำนวนเต็ม 1 จำนวน ถ้าเป็นเลขคู่ให้พิมพ์ เลขคู่ ถ้าเป็นเลขคี่ให้พิมพ์ เลขคี่",
        inputExample: "8",
        outputExample: "เลขคู่",
        testCases: [
            { input: "8", expectedOutput: "เลขคู่\n" },
            { input: "7", expectedOutput: "เลขคี่\n" },
            { input: "0", expectedOutput: "เลขคู่\n" },
            { input: "-3", expectedOutput: "เลขคี่\n" },
        ],
    },
    {
        id: "u2p2", unit: 2, topic: "การตัดสินใจ (if/else)", difficulty: "ง่าย", language: "c",
        title: "หาค่ามากที่สุดจาก 3 จำนวน",
        story: "ครูอยากรู้ว่าคะแนนสอบย่อยสามครั้งของนักเรียน ครั้งไหนสูงสุด",
        description: "รับจำนวนเต็ม 3 จำนวน แล้วพิมพ์ค่าที่มากที่สุดในรูปแบบ\nมากที่สุด: X",
        inputExample: "12 45 30",
        outputExample: "มากที่สุด: 45",
        testCases: [
            { input: "12 45 30", expectedOutput: "มากที่สุด: 45\n" },
            { input: "5 5 5", expectedOutput: "มากที่สุด: 5\n" },
            { input: "-10 -20 -3", expectedOutput: "มากที่สุด: -3\n" },
            { input: "100 99 100", expectedOutput: "มากที่สุด: 100\n" },
        ],
    },
    {
        id: "u2p3", unit: 2, topic: "การตัดสินใจ (if/else)", difficulty: "ปานกลาง", language: "c",
        title: "ตัดเกรดจากคะแนนเต็ม 100",
        story: "ครูต้องตัดเกรดนักเรียนทั้งห้องให้เสร็จก่อนปิดภาคเรียน",
        description: "รับคะแนนเป็นจำนวนเต็ม 0-100 แล้วตัดเกรดตามเกณฑ์\n80 ขึ้นไปได้ A, 70-79 ได้ B, 60-69 ได้ C, 50-59 ได้ D, ต่ำกว่า 50 ได้ F\nพิมพ์ผลในรูปแบบ\nเกรด: X",
        inputExample: "85",
        outputExample: "เกรด: A",
        testCases: [
            { input: "85", expectedOutput: "เกรด: A\n" },
            { input: "70", expectedOutput: "เกรด: B\n" },
            { input: "60", expectedOutput: "เกรด: C\n" },
            { input: "49", expectedOutput: "เกรด: F\n" },
            { input: "100", expectedOutput: "เกรด: A\n" },
        ],
    },
    {
        id: "u2p4", unit: 2, topic: "switch-case", difficulty: "ปานกลาง", language: "c",
        title: "เครื่องคิดเลข 4 ฟังก์ชันด้วย switch",
        story: "นักเรียนได้รับโจทย์ให้เขียนเครื่องคิดเลขอย่างง่ายด้วยคำสั่ง switch",
        description: "รับเลขเมนู 1 ค่า ตามด้วยจำนวนเต็ม 2 จำนวน\n1 = บวก, 2 = ลบ, 3 = คูณ, 4 = หาร (หารแบบจำนวนเต็ม)\nถ้าเมนูไม่ใช่ 1-4 ให้พิมพ์ เมนูไม่ถูกต้อง\nถ้าเลือกหารและตัวหารเป็น 0 ให้พิมพ์ หารด้วยศูนย์ไม่ได้\nกรณีคำนวณได้ให้พิมพ์ในรูปแบบ\nผลลัพธ์: X",
        inputExample: "1 10 5",
        outputExample: "ผลลัพธ์: 15",
        testCases: [
            { input: "1 10 5", expectedOutput: "ผลลัพธ์: 15\n" },
            { input: "2 10 5", expectedOutput: "ผลลัพธ์: 5\n" },
            { input: "3 10 5", expectedOutput: "ผลลัพธ์: 50\n" },
            { input: "4 10 5", expectedOutput: "ผลลัพธ์: 2\n" },
            { input: "4 10 0", expectedOutput: "หารด้วยศูนย์ไม่ได้\n" },
            { input: "9 1 2", expectedOutput: "เมนูไม่ถูกต้อง\n" },
        ],
    },
    {
        id: "u2p5", unit: 2, topic: "การตัดสินใจ (if/else)", difficulty: "ปานกลาง", language: "c",
        title: "ตรวจปีอธิกสุรทิน",
        story: "ปฏิทินของชมรมคอมพิวเตอร์ต้องรู้ว่าปีไหนเดือนกุมภาพันธ์มี 29 วัน",
        description: "รับปี ค.ศ. เป็นจำนวนเต็ม แล้วตรวจว่าเป็นปีอธิกสุรทินหรือไม่\nเกณฑ์: หารด้วย 4 ลงตัว แต่ถ้าหารด้วย 100 ลงตัวต้องหารด้วย 400 ลงตัวด้วย\nถ้าใช่ให้พิมพ์ เป็นปีอธิกสุรทิน ถ้าไม่ใช่ให้พิมพ์ ไม่เป็นปีอธิกสุรทิน",
        inputExample: "2024",
        outputExample: "เป็นปีอธิกสุรทิน",
        testCases: [
            { input: "2024", expectedOutput: "เป็นปีอธิกสุรทิน\n" },
            { input: "1900", expectedOutput: "ไม่เป็นปีอธิกสุรทิน\n" },
            { input: "2000", expectedOutput: "เป็นปีอธิกสุรทิน\n" },
            { input: "2023", expectedOutput: "ไม่เป็นปีอธิกสุรทิน\n" },
        ],
    },
    {
        id: "u2p6", unit: 2, topic: "การตัดสินใจ (if/else)", difficulty: "ยาก", language: "c",
        title: "ค่าไฟฟ้าแบบขั้นบันได",
        story: "นักเรียนช่วยที่บ้านคำนวณค่าไฟจากหน่วยที่ใช้",
        description: "รับจำนวนหน่วยไฟฟ้าเป็นจำนวนเต็ม แล้วคิดค่าไฟแบบขั้นบันได\n150 หน่วยแรก หน่วยละ 3.20 บาท\nหน่วยที่ 151 ถึง 400 หน่วยละ 4.20 บาท\nหน่วยที่ 401 ขึ้นไป หน่วยละ 4.80 บาท\nคิดค่าบริการรายเดือนเพิ่มอีก 38.22 บาททุกกรณี\nพิมพ์ยอดรวมทศนิยม 2 ตำแหน่งในรูปแบบ\nค่าไฟ: X.XX",
        inputExample: "100",
        outputExample: "ค่าไฟ: 358.22",
        testCases: [
            { input: "100", expectedOutput: "ค่าไฟ: 358.22\n" },
            { input: "150", expectedOutput: "ค่าไฟ: 518.22\n" },
            { input: "300", expectedOutput: "ค่าไฟ: 1148.22\n" },
            { input: "500", expectedOutput: "ค่าไฟ: 2048.22\n" },
            { input: "0", expectedOutput: "ค่าไฟ: 38.22\n" },
        ],
    },
    {
        id: "u3p1", unit: 3, topic: "for loop", difficulty: "ง่าย", language: "c",
        title: "ผลรวม 1 ถึง N",
        story: "บทเรียนแรกของการวนซ้ำ เริ่มจากการบวกเลขต่อเนื่อง",
        description: "รับจำนวนเต็มบวก N แล้วหาผลรวมของเลข 1 ถึง N พิมพ์ในรูปแบบ\nผลรวม: X",
        inputExample: "10",
        outputExample: "ผลรวม: 55",
        testCases: [
            { input: "10", expectedOutput: "ผลรวม: 55\n" },
            { input: "1", expectedOutput: "ผลรวม: 1\n" },
            { input: "100", expectedOutput: "ผลรวม: 5050\n" },
            { input: "7", expectedOutput: "ผลรวม: 28\n" },
        ],
    },
    {
        id: "u3p2", unit: 3, topic: "for loop", difficulty: "ง่าย", language: "c",
        title: "สูตรคูณแม่ N",
        story: "น้อง ป.4 ขอให้พี่ ม.4 ช่วยทำโปรแกรมท่องสูตรคูณ",
        description: "รับจำนวนเต็ม N แล้วพิมพ์สูตรคูณแม่ N ตั้งแต่ N x 1 ถึง N x 12\nแต่ละบรรทัดอยู่ในรูปแบบ\nN x i = ผลคูณ\nเช่น 2 x 1 = 2",
        inputExample: "2",
        outputExample: "2 x 1 = 2\n2 x 2 = 4\n2 x 3 = 6\n2 x 4 = 8\n2 x 5 = 10\n2 x 6 = 12\n2 x 7 = 14\n2 x 8 = 16\n2 x 9 = 18\n2 x 10 = 20\n2 x 11 = 22\n2 x 12 = 24",
        testCases: [
            { input: "2", expectedOutput: "2 x 1 = 2\n2 x 2 = 4\n2 x 3 = 6\n2 x 4 = 8\n2 x 5 = 10\n2 x 6 = 12\n2 x 7 = 14\n2 x 8 = 16\n2 x 9 = 18\n2 x 10 = 20\n2 x 11 = 22\n2 x 12 = 24\n" },
            { input: "7", expectedOutput: "7 x 1 = 7\n7 x 2 = 14\n7 x 3 = 21\n7 x 4 = 28\n7 x 5 = 35\n7 x 6 = 42\n7 x 7 = 49\n7 x 8 = 56\n7 x 9 = 63\n7 x 10 = 70\n7 x 11 = 77\n7 x 12 = 84\n" },
            { input: "12", expectedOutput: "12 x 1 = 12\n12 x 2 = 24\n12 x 3 = 36\n12 x 4 = 48\n12 x 5 = 60\n12 x 6 = 72\n12 x 7 = 84\n12 x 8 = 96\n12 x 9 = 108\n12 x 10 = 120\n12 x 11 = 132\n12 x 12 = 144\n" },
        ],
    },
    {
        id: "u3p3", unit: 3, topic: "for loop", difficulty: "ปานกลาง", language: "c",
        title: "นับเลขคู่และเลขคี่",
        story: "ครูให้สำรวจตัวเลขชุดหนึ่งว่ามีเลขคู่กี่ตัว เลขคี่กี่ตัว",
        description: "รับจำนวนข้อมูล N ตามด้วยจำนวนเต็ม N ค่า\nให้นับว่ามีเลขคู่กี่จำนวน และเลขคี่กี่จำนวน พิมพ์ 2 บรรทัด\nเลขคู่: X\nเลขคี่: X",
        inputExample: "5\n1 2 3 4 6",
        outputExample: "เลขคู่: 3\nเลขคี่: 2",
        testCases: [
            { input: "5\n1 2 3 4 6", expectedOutput: "เลขคู่: 3\nเลขคี่: 2\n" },
            { input: "1\n7", expectedOutput: "เลขคู่: 0\nเลขคี่: 1\n" },
            { input: "6\n-2 -1 0 1 2 3", expectedOutput: "เลขคู่: 3\nเลขคี่: 3\n" },
        ],
    },
    {
        id: "u3p4", unit: 3, topic: "การทำซ้ำซ้อน (Nested Loop)", difficulty: "ปานกลาง", language: "c",
        title: "สามเหลี่ยมดาว",
        story: "กิจกรรมศิลปะกับโค้ด วาดรูปด้วยเครื่องหมายดอกจัน",
        description: "รับจำนวนเต็ม N แล้วพิมพ์สามเหลี่ยมดาว N บรรทัด\nบรรทัดที่ i มีดอกจัน i ตัวติดกัน ไม่มีช่องว่าง",
        inputExample: "4",
        outputExample: "*\n**\n***\n****",
        testCases: [
            { input: "4", expectedOutput: "*\n**\n***\n****\n" },
            { input: "1", expectedOutput: "*\n" },
            { input: "7", expectedOutput: "*\n**\n***\n****\n*****\n******\n*******\n" },
        ],
    },
    {
        id: "u3p5", unit: 3, topic: "while loop", difficulty: "ปานกลาง", language: "c",
        title: "หา ห.ร.ม. ด้วยวิธียูคลิด",
        story: "ครูคณิตศาสตร์ขอให้ช่วยตรวจ ห.ร.ม. ของการบ้านทั้งห้อง",
        description: "รับจำนวนเต็มบวก 2 จำนวน แล้วหาตัวหารร่วมมากด้วยวิธียูคลิด (นำตัวมากหารตัวน้อยแล้วใช้เศษวนต่อไป)\nพิมพ์ในรูปแบบ\nหรม: X",
        inputExample: "24 36",
        outputExample: "หรม: 12",
        testCases: [
            { input: "24 36", expectedOutput: "หรม: 12\n" },
            { input: "17 5", expectedOutput: "หรม: 1\n" },
            { input: "100 100", expectedOutput: "หรม: 100\n" },
            { input: "81 27", expectedOutput: "หรม: 27\n" },
        ],
    },
    {
        id: "u3p6", unit: 3, topic: "break และ continue", difficulty: "ยาก", language: "c",
        title: "นับจำนวนเฉพาะในช่วงที่กำหนด",
        story: "ชมรมคณิตศาสตร์อยากรู้ว่าในช่วงเลขที่กำหนดมีจำนวนเฉพาะกี่ตัว",
        description: "รับจำนวนเต็ม A และ B (A น้อยกว่าหรือเท่ากับ B) แล้วหาจำนวนเฉพาะทั้งหมดในช่วง A ถึง B\nพิมพ์ 2 บรรทัด\nจำนวนเฉพาะ: X\nผลรวม: X\nหมายเหตุ: 1 ไม่ใช่จำนวนเฉพาะ",
        inputExample: "1 10",
        outputExample: "จำนวนเฉพาะ: 4\nผลรวม: 17",
        testCases: [
            { input: "1 10", expectedOutput: "จำนวนเฉพาะ: 4\nผลรวม: 17\n" },
            { input: "10 20", expectedOutput: "จำนวนเฉพาะ: 4\nผลรวม: 60\n" },
            { input: "2 2", expectedOutput: "จำนวนเฉพาะ: 1\nผลรวม: 2\n" },
            { input: "90 100", expectedOutput: "จำนวนเฉพาะ: 1\nผลรวม: 97\n" },
        ],
    },
    {
        id: "u4p1", unit: 4, topic: "อาร์เรย์ 1 มิติ", difficulty: "ง่าย", language: "c",
        title: "ผลรวมและค่าเฉลี่ยของข้อมูล",
        story: "ครูต้องสรุปคะแนนสอบย่อยของนักเรียนกลุ่มหนึ่ง",
        description: "รับจำนวนข้อมูล N ตามด้วยจำนวนเต็ม N ค่า เก็บลงอาร์เรย์\nแล้วพิมพ์ 2 บรรทัด\nผลรวม: X\nเฉลี่ย: X.XX (ทศนิยม 2 ตำแหน่ง)",
        inputExample: "4\n10 20 30 40",
        outputExample: "ผลรวม: 100\nเฉลี่ย: 25.00",
        testCases: [
            { input: "4\n10 20 30 40", expectedOutput: "ผลรวม: 100\nเฉลี่ย: 25.00\n" },
            { input: "3\n1 2 2", expectedOutput: "ผลรวม: 5\nเฉลี่ย: 1.67\n" },
            { input: "1\n99", expectedOutput: "ผลรวม: 99\nเฉลี่ย: 99.00\n" },
        ],
    },
    {
        id: "u4p2", unit: 4, topic: "ฟังก์ชัน", difficulty: "ง่าย", language: "c",
        title: "ฟังก์ชันหาค่ามากที่สุดในอาร์เรย์",
        story: "บทเรียนเรื่องฟังก์ชัน เริ่มจากแยกงานออกมาเป็นฟังก์ชันของตัวเอง",
        description: "รับจำนวนข้อมูล N ตามด้วยจำนวนเต็ม N ค่า\nให้เขียนฟังก์ชันชื่อ findMax ที่รับอาร์เรย์และจำนวนสมาชิก แล้วคืนค่าที่มากที่สุด\nพิมพ์ผลในรูปแบบ\nค่ามากที่สุด: X",
        inputExample: "5\n3 18 7 18 2",
        outputExample: "ค่ามากที่สุด: 18",
        testCases: [
            { input: "5\n3 18 7 18 2", expectedOutput: "ค่ามากที่สุด: 18\n" },
            { input: "1\n-5", expectedOutput: "ค่ามากที่สุด: -5\n" },
            { input: "4\n-9 -3 -7 -1", expectedOutput: "ค่ามากที่สุด: -1\n" },
        ],
    },
    {
        id: "u4p3", unit: 4, topic: "Searching (การค้นหาข้อมูล)", difficulty: "ปานกลาง", language: "c",
        title: "ค้นหาตำแหน่งข้อมูลในอาร์เรย์",
        story: "ระบบค้นรหัสนักเรียนของห้องทะเบียน",
        description: "รับจำนวนข้อมูล N ตามด้วยจำนวนเต็ม N ค่า และค่าที่ต้องการค้นหา 1 ค่า\nให้ค้นหาแบบลำดับ (Linear Search) แล้วพิมพ์ตำแหน่งแรกที่พบ โดยนับตำแหน่งแรกเป็น 0\nถ้าไม่พบให้พิมพ์ -1 ในรูปแบบ\nตำแหน่ง: X",
        inputExample: "5\n4 8 15 16 23\n15",
        outputExample: "ตำแหน่ง: 2",
        testCases: [
            { input: "5\n4 8 15 16 23\n15", expectedOutput: "ตำแหน่ง: 2\n" },
            { input: "5\n4 8 15 16 23\n99", expectedOutput: "ตำแหน่ง: -1\n" },
            { input: "4\n7 7 7 7\n7", expectedOutput: "ตำแหน่ง: 0\n" },
        ],
    },
    {
        id: "u4p4", unit: 4, topic: "Sorting (การเรียงลำดับ)", difficulty: "ปานกลาง", language: "c",
        title: "เรียงคะแนนจากน้อยไปมากด้วย Bubble Sort",
        story: "ครูอยากเรียงคะแนนก่อนนำไปตัดเกรด",
        description: "รับจำนวนข้อมูล N ตามด้วยจำนวนเต็ม N ค่า\nให้เรียงข้อมูลจากน้อยไปมากด้วยวิธี Bubble Sort แล้วพิมพ์ผลในบรรทัดเดียว คั่นด้วยช่องว่าง 1 ตัว",
        inputExample: "5\n5 2 9 1 7",
        outputExample: "1 2 5 7 9",
        testCases: [
            { input: "5\n5 2 9 1 7", expectedOutput: "1 2 5 7 9\n" },
            { input: "1\n42", expectedOutput: "42\n" },
            { input: "6\n3 3 1 2 2 1", expectedOutput: "1 1 2 2 3 3\n" },
        ],
    },
    {
        id: "u4p5", unit: 4, topic: "ฟังก์ชัน Recursive", difficulty: "ปานกลาง", language: "c",
        title: "แฟกทอเรียลด้วยฟังก์ชันเรียกตัวเอง",
        story: "บทเรียนเรื่องฟังก์ชันเรียกตัวเอง เริ่มจากแฟกทอเรียล",
        description: "รับจำนวนเต็ม N (0 ถึง 12) แล้วหาค่า N แฟกทอเรียล ด้วยฟังก์ชันเรียกตัวเอง\nพิมพ์ในรูปแบบ\nแฟกทอเรียล: X\nหมายเหตุ: 0 แฟกทอเรียล เท่ากับ 1",
        inputExample: "5",
        outputExample: "แฟกทอเรียล: 120",
        testCases: [
            { input: "5", expectedOutput: "แฟกทอเรียล: 120\n" },
            { input: "0", expectedOutput: "แฟกทอเรียล: 1\n" },
            { input: "1", expectedOutput: "แฟกทอเรียล: 1\n" },
            { input: "12", expectedOutput: "แฟกทอเรียล: 479001600\n" },
        ],
    },
    {
        id: "u4p6", unit: 4, topic: "อาร์เรย์ 2 มิติ (Matrix)", difficulty: "ยาก", language: "c",
        title: "บวกเมทริกซ์สองชุด",
        story: "งานกลุ่มวิชาคณิตศาสตร์ ต้องบวกตารางตัวเลขสองตาราง",
        description: "รับจำนวนแถว R และจำนวนหลัก C ตามด้วยตัวเลขของเมทริกซ์ชุดที่ 1 จำนวน R x C ค่า และเมทริกซ์ชุดที่ 2 อีก R x C ค่า\nให้บวกสมาชิกตำแหน่งเดียวกัน แล้วพิมพ์ผลลัพธ์เป็นตาราง R บรรทัด แต่ละบรรทัดมี C ค่าคั่นด้วยช่องว่าง 1 ตัว",
        inputExample: "2 2\n1 2\n3 4\n5 6\n7 8",
        outputExample: "6 8\n10 12",
        testCases: [
            { input: "2 2\n1 2\n3 4\n5 6\n7 8", expectedOutput: "6 8\n10 12\n" },
            { input: "1 3\n1 1 1\n2 2 2", expectedOutput: "3 3 3\n" },
            { input: "2 3\n0 0 0\n0 0 0\n-1 -2 -3\n1 2 3", expectedOutput: "-1 -2 -3\n1 2 3\n" },
        ],
    },
    {
        id: "u5p1", unit: 5, topic: "อาร์เรย์ 1 มิติ", difficulty: "ง่าย", language: "c",
        title: "สรุปสถิติคะแนนของห้อง",
        story: "ครูต้องรายงานคะแนนสอบกลางภาคของห้องให้ฝ่ายวิชาการ",
        description: "รับจำนวนนักเรียน N ตามด้วยคะแนน N ค่า (จำนวนเต็ม 0-100)\nให้หาคะแนนสูงสุด ต่ำสุด และค่าเฉลี่ย พิมพ์ 3 บรรทัด\nสูงสุด: X\nต่ำสุด: X\nเฉลี่ย: X.XX (ทศนิยม 2 ตำแหน่ง)",
        inputExample: "5\n80 95 60 72 88",
        outputExample: "สูงสุด: 95\nต่ำสุด: 60\nเฉลี่ย: 79.00",
        testCases: [
            { input: "5\n80 95 60 72 88", expectedOutput: "สูงสุด: 95\nต่ำสุด: 60\nเฉลี่ย: 79.00\n" },
            { input: "1\n50", expectedOutput: "สูงสุด: 50\nต่ำสุด: 50\nเฉลี่ย: 50.00\n" },
            { input: "4\n100 100 0 0", expectedOutput: "สูงสุด: 100\nต่ำสุด: 0\nเฉลี่ย: 50.00\n" },
        ],
    },
    {
        id: "u5p2", unit: 5, topic: "ฟังก์ชัน", difficulty: "ปานกลาง", language: "c",
        title: "ใบเสร็จร้านค้าสหกรณ์",
        story: "สหกรณ์โรงเรียนอยากได้โปรแกรมออกใบเสร็จอย่างง่าย",
        description: "รับจำนวนรายการสินค้า N ตามด้วยข้อมูลสินค้าทีละรายการ แต่ละรายการมีราคาต่อชิ้น (จำนวนเต็ม) และจำนวนชิ้น (จำนวนเต็ม)\nให้คำนวณยอดรวม ถ้ายอดรวมเกิน 1000 บาท ให้ลด 10 เปอร์เซ็นต์\nพิมพ์ 2 บรรทัด\nยอดรวม: X\nยอดสุทธิ: X.XX (ทศนิยม 2 ตำแหน่ง)",
        inputExample: "2\n300 4\n50 2",
        outputExample: "ยอดรวม: 1300\nยอดสุทธิ: 1170.00",
        testCases: [
            { input: "2\n300 4\n50 2", expectedOutput: "ยอดรวม: 1300\nยอดสุทธิ: 1170.00\n" },
            { input: "1\n100 5", expectedOutput: "ยอดรวม: 500\nยอดสุทธิ: 500.00\n" },
            { input: "3\n10 1\n20 2\n30 3", expectedOutput: "ยอดรวม: 140\nยอดสุทธิ: 140.00\n" },
        ],
    },
    {
        id: "u5p3", unit: 5, topic: "การทำซ้ำซ้อน (Nested Loop)", difficulty: "ปานกลาง", language: "c",
        title: "ตารางสูตรคูณหลายแม่",
        story: "ครูอยากได้ตารางสูตรคูณไว้ติดผนังห้องเรียน",
        description: "รับจำนวนเต็ม A และ B (A น้อยกว่าหรือเท่ากับ B)\nให้พิมพ์สูตรคูณตั้งแต่แม่ A ถึงแม่ B โดยแต่ละแม่พิมพ์ตั้งแต่ x 1 ถึง x 5\nรูปแบบแต่ละบรรทัดคือ\nN x i = ผลคูณ\nเมื่อขึ้นแม่ใหม่ไม่ต้องเว้นบรรทัด",
        inputExample: "2 3",
        outputExample: "2 x 1 = 2\n2 x 2 = 4\n2 x 3 = 6\n2 x 4 = 8\n2 x 5 = 10\n3 x 1 = 3\n3 x 2 = 6\n3 x 3 = 9\n3 x 4 = 12\n3 x 5 = 15",
        testCases: [
            { input: "2 3", expectedOutput: "2 x 1 = 2\n2 x 2 = 4\n2 x 3 = 6\n2 x 4 = 8\n2 x 5 = 10\n3 x 1 = 3\n3 x 2 = 6\n3 x 3 = 9\n3 x 4 = 12\n3 x 5 = 15\n" },
            { input: "5 5", expectedOutput: "5 x 1 = 5\n5 x 2 = 10\n5 x 3 = 15\n5 x 4 = 20\n5 x 5 = 25\n" },
            { input: "9 11", expectedOutput: "9 x 1 = 9\n9 x 2 = 18\n9 x 3 = 27\n9 x 4 = 36\n9 x 5 = 45\n10 x 1 = 10\n10 x 2 = 20\n10 x 3 = 30\n10 x 4 = 40\n10 x 5 = 50\n11 x 1 = 11\n11 x 2 = 22\n11 x 3 = 33\n11 x 4 = 44\n11 x 5 = 55\n" },
        ],
    },
    {
        id: "u5p4", unit: 5, topic: "while loop", difficulty: "ปานกลาง", language: "c",
        title: "เก็บเงินให้ถึงเป้าหมาย",
        story: "นักเรียนวางแผนเก็บเงินซื้อคอมพิวเตอร์เครื่องแรก",
        description: "รับเงินเก็บต่อเดือน (จำนวนเต็มบาท) และเป้าหมายที่ต้องการ (จำนวนเต็มบาท)\nให้หาว่าต้องเก็บกี่เดือนจึงจะได้เงินครบหรือเกินเป้าหมาย และเมื่อถึงเดือนนั้นมีเงินเท่าไร\nพิมพ์ 2 บรรทัด\nจำนวนเดือน: X\nเงินสะสม: X",
        inputExample: "1500 10000",
        outputExample: "จำนวนเดือน: 7\nเงินสะสม: 10500",
        testCases: [
            { input: "1500 10000", expectedOutput: "จำนวนเดือน: 7\nเงินสะสม: 10500\n" },
            { input: "1000 1000", expectedOutput: "จำนวนเดือน: 1\nเงินสะสม: 1000\n" },
            { input: "300 1000", expectedOutput: "จำนวนเดือน: 4\nเงินสะสม: 1200\n" },
        ],
    },
    {
        id: "u5p5", unit: 5, topic: "อาร์เรย์ 1 มิติ", difficulty: "ยาก", language: "c",
        title: "จัดอันดับคะแนนสูงสุด 3 อันดับ",
        story: "ฝ่ายวิชาการต้องประกาศนักเรียนคะแนนสูงสุด 3 อันดับของห้อง",
        description: "รับจำนวนนักเรียน N (N มากกว่าหรือเท่ากับ 3) ตามด้วยคะแนน N ค่า\nให้เรียงคะแนนจากมากไปน้อย แล้วพิมพ์ 3 อันดับแรก บรรทัดละอันดับในรูปแบบ\nอันดับ 1: X\nอันดับ 2: X\nอันดับ 3: X\nหมายเหตุ: ถ้าคะแนนซ้ำกันให้แสดงซ้ำได้",
        inputExample: "5\n70 95 88 95 60",
        outputExample: "อันดับ 1: 95\nอันดับ 2: 95\nอันดับ 3: 88",
        testCases: [
            { input: "5\n70 95 88 95 60", expectedOutput: "อันดับ 1: 95\nอันดับ 2: 95\nอันดับ 3: 88\n" },
            { input: "3\n1 2 3", expectedOutput: "อันดับ 1: 3\nอันดับ 2: 2\nอันดับ 3: 1\n" },
            { input: "6\n50 50 50 50 50 50", expectedOutput: "อันดับ 1: 50\nอันดับ 2: 50\nอันดับ 3: 50\n" },
        ],
    },
    {
        id: "u5p6", unit: 5, topic: "ฟังก์ชัน", difficulty: "ยาก", language: "c",
        title: "ระบบคิดค่าส่งพัสดุ",
        story: "ร้านค้าออนไลน์ของชมรมต้องคิดค่าส่งตามน้ำหนักและพื้นที่",
        description: "รับน้ำหนักพัสดุเป็นกรัม (จำนวนเต็ม) และรหัสพื้นที่ 1 ตัว (1 = ในจังหวัด, 2 = ต่างจังหวัด)\nค่าส่งพื้นฐาน: น้ำหนักไม่เกิน 500 กรัม คิด 30 บาท, 501 ถึง 1000 กรัม คิด 45 บาท, เกิน 1000 กรัม คิด 45 บาท บวกกิโลกรัมละ 15 บาทสำหรับน้ำหนักส่วนที่เกิน 1000 กรัม โดยเศษของกิโลกรัมให้ปัดขึ้น\nถ้าเป็นต่างจังหวัดให้บวกเพิ่มอีก 20 บาท\nถ้ารหัสพื้นที่ไม่ใช่ 1 หรือ 2 ให้พิมพ์ รหัสพื้นที่ไม่ถูกต้อง\nกรณีคำนวณได้ให้พิมพ์\nค่าส่ง: X",
        inputExample: "2300 2",
        outputExample: "ค่าส่ง: 95",
        testCases: [
            { input: "2300 2", expectedOutput: "ค่าส่ง: 95\n" },
            { input: "500 1", expectedOutput: "ค่าส่ง: 30\n" },
            { input: "1000 2", expectedOutput: "ค่าส่ง: 65\n" },
            { input: "1200 1", expectedOutput: "ค่าส่ง: 60\n" },
            { input: "800 5", expectedOutput: "รหัสพื้นที่ไม่ถูกต้อง\n" },
        ],
    },
    {
        id: "u1p7", unit: 1, topic: "ตัวแปรและชนิดข้อมูล", difficulty: "ง่าย", language: "c",
        title: "คำนวณคะแนนเก็บรวม",
        story: "นักเรียนอยากรู้ว่าคะแนนเก็บสามส่วนของตัวเองรวมได้เท่าไร",
        description: "รับคะแนน 3 ส่วนเป็นจำนวนเต็ม แล้วพิมพ์ 2 บรรทัด\nรวม: X\nเฉลี่ย: X.XX (ทศนิยม 2 ตำแหน่ง)",
        inputExample: "18 15 20",
        outputExample: "รวม: 53\nเฉลี่ย: 17.67",
        testCases: [
            { input: "18 15 20", expectedOutput: "รวม: 53\nเฉลี่ย: 17.67\n" },
            { input: "0 0 0", expectedOutput: "รวม: 0\nเฉลี่ย: 0.00\n" },
            { input: "10 10 10", expectedOutput: "รวม: 30\nเฉลี่ย: 10.00\n" },
        ],
    },
    {
        id: "u3p7", unit: 3, topic: "do-while loop", difficulty: "ปานกลาง", language: "c",
        title: "นับจำนวนหลักของตัวเลข",
        story: "โปรแกรมตรวจรหัสนักเรียนต้องรู้ว่าเลขที่กรอกมามีกี่หลัก",
        description: "รับจำนวนเต็มไม่ติดลบ 1 จำนวน แล้วนับว่ามีกี่หลัก โดยใช้ do-while (เลข 0 นับเป็น 1 หลัก)\nพิมพ์ในรูปแบบ\nจำนวนหลัก: X",
        inputExample: "12345",
        outputExample: "จำนวนหลัก: 5",
        testCases: [
            { input: "12345", expectedOutput: "จำนวนหลัก: 5\n" },
            { input: "0", expectedOutput: "จำนวนหลัก: 1\n" },
            { input: "9", expectedOutput: "จำนวนหลัก: 1\n" },
            { input: "1000000", expectedOutput: "จำนวนหลัก: 7\n" },
        ],
    },
    {
        id: "u4p7", unit: 4, topic: "สตริง (string.h)", difficulty: "ปานกลาง", language: "c",
        title: "นับสระในข้อความภาษาอังกฤษ",
        story: "ชมรมภาษาอังกฤษอยากได้เครื่องมือวิเคราะห์คำศัพท์",
        description: "รับข้อความภาษาอังกฤษ 1 คำ (ไม่มีช่องว่าง ความยาวไม่เกิน 100 ตัวอักษร)\nให้นับจำนวนสระ a e i o u โดยนับทั้งตัวพิมพ์เล็กและพิมพ์ใหญ่ แล้วพิมพ์ 2 บรรทัด\nความยาว: X\nสระ: X",
        inputExample: "Programming",
        outputExample: "ความยาว: 11\nสระ: 3",
        testCases: [
            { input: "Programming", expectedOutput: "ความยาว: 11\nสระ: 3\n" },
            { input: "AEIOU", expectedOutput: "ความยาว: 5\nสระ: 5\n" },
            { input: "xyz", expectedOutput: "ความยาว: 3\nสระ: 0\n" },
        ],
    },
    {
        id: "u4p8", unit: 4, topic: "พอยน์เตอร์", difficulty: "ยาก", language: "c",
        title: "สลับค่าตัวแปรด้วยพอยน์เตอร์",
        story: "บทเรียนเรื่องพอยน์เตอร์ เริ่มจากฟังก์ชันสลับค่าที่ใช้ได้จริง",
        description: "รับจำนวนเต็ม 2 จำนวน แล้วเขียนฟังก์ชัน swap ที่รับพอยน์เตอร์ 2 ตัวเพื่อสลับค่าของตัวแปรทั้งสอง\nพิมพ์ค่าก่อนและหลังสลับ 2 บรรทัด\nก่อนสลับ: A B\nหลังสลับ: B A",
        inputExample: "3 9",
        outputExample: "ก่อนสลับ: 3 9\nหลังสลับ: 9 3",
        testCases: [
            { input: "3 9", expectedOutput: "ก่อนสลับ: 3 9\nหลังสลับ: 9 3\n" },
            { input: "5 5", expectedOutput: "ก่อนสลับ: 5 5\nหลังสลับ: 5 5\n" },
            { input: "-2 7", expectedOutput: "ก่อนสลับ: -2 7\nหลังสลับ: 7 -2\n" },
        ],
    },
];

// คืนรายการโจทย์ที่ตรงเงื่อนไข (ปล่อยว่าง = ไม่กรอง)
function filterPracticeBank({ topic, difficulty, unit } = {}) {
    return PRACTICE_BANK.filter(p =>
        (!topic      || p.topic === topic) &&
        (!difficulty || p.difficulty === difficulty) &&
        (!unit       || p.unit === unit)
    );
}

// สุ่มโจทย์ 1 ข้อจากคลัง โดยเลี่ยงข้อที่เพิ่งทำไป (excludeIds)
// ถ้าหัวข้อ+ระดับที่เลือกไม่มีในคลัง จะลดเงื่อนไขลงทีละขั้นแทนการคืนค่าว่าง
function pickPracticeBankProblem({ topic, difficulty, excludeIds = [] } = {}) {
    const tiers = [
        { topic, difficulty },
        { topic },
        { difficulty },
        {},
    ];
    for (const t of tiers) {
        const pool = filterPracticeBank(t);
        if (!pool.length) continue;
        const fresh = pool.filter(p => !excludeIds.includes(p.id));
        const use = fresh.length ? fresh : pool;
        return use[Math.floor(Math.random() * use.length)];
    }
    return null;
}

window.PRACTICE_BANK = PRACTICE_BANK;
window.filterPracticeBank = filterPracticeBank;
window.pickPracticeBankProblem = pickPracticeBankProblem;
