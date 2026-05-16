// js/pages/PrivacyPolicy.js - PDPA Privacy Notice (Thai)

const PrivacyPolicy = () => {
    const isLoggedIn = !!(window._authUser);

    const Section = ({ title, children }) => (
        <div className="mb-8">
            <h2 className="text-lg font-bold mb-3" style={{ color: '#AD1457' }}>{title}</h2>
            <div className="text-gray-700 leading-relaxed space-y-2">{children}</div>
        </div>
    );

    const goBack = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.hash = '#/login';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #AD1457 0%, #EC407A 100%)', padding: '20px 0' }}>
                <div className="max-w-4xl mx-auto px-4 flex items-center gap-4">
                    <button onClick={goBack}
                        className="text-white hover:text-pink-200 transition-colors text-sm flex items-center gap-1">
                        ← กลับ
                    </button>
                    <div>
                        <h1 className="text-white text-xl font-bold">นโยบายความเป็นส่วนตัว</h1>
                        <p className="text-pink-200 text-xs">AI-Powered Coding Coach (APCC) · โรงเรียนเตรียมอุดมศึกษาภาคใต้</p>
                    </div>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 py-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

                    {/* Effective date banner */}
                    <div className="mb-8 p-4 rounded-xl text-sm" style={{ background: '#FFF0F5', border: '1px solid #FFB6C8', color: '#AD1457' }}>
                        <strong>ประกาศนโยบายความเป็นส่วนตัว (Privacy Notice)</strong><br/>
                        มีผลบังคับใช้ตั้งแต่วันที่ 16 พฤษภาคม 2568 | ปรับปรุงล่าสุด: 16 พฤษภาคม 2568<br/>
                        จัดทำตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
                    </div>

                    <Section title="1. ผู้ควบคุมข้อมูลส่วนบุคคล (Data Controller)">
                        <p><strong>ชื่อ:</strong> โรงเรียนเตรียมอุดมศึกษาภาคใต้</p>
                        <p><strong>ที่อยู่:</strong> โรงเรียนเตรียมอุดมศึกษาภาคใต้ จังหวัดสงขลา</p>
                        <p><strong>ระบบ:</strong> AI-Powered Coding Coach (APCC) — ระบบโค้ชโค้ดอัจฉริยะ ขับเคลื่อนด้วยปัญญาประดิษฐ์ สำหรับการเรียนการสอนวิชาวิทยาการคำนวณ</p>
                        <p><strong>ผู้รับผิดชอบระบบ:</strong> ครูผู้สอนกลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี</p>
                        <p><strong>ติดต่อ:</strong> อีเมลโรงเรียน @triamudomsouth.ac.th</p>
                    </Section>

                    <Section title="2. ข้อมูลส่วนบุคคลที่เก็บรวบรวม">
                        <p>ระบบ APCC เก็บรวบรวมข้อมูลส่วนบุคคลดังต่อไปนี้:</p>
                        <div className="overflow-x-auto mt-3">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr style={{ background: '#FFF0F5' }}>
                                        <th className="text-left p-3 border border-pink-200 font-semibold" style={{ color: '#AD1457' }}>ประเภทข้อมูล</th>
                                        <th className="text-left p-3 border border-pink-200 font-semibold" style={{ color: '#AD1457' }}>รายละเอียด</th>
                                        <th className="text-left p-3 border border-pink-200 font-semibold" style={{ color: '#AD1457' }}>วัตถุประสงค์</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        ['ข้อมูลระบุตัวตน', 'ชื่อ-นามสกุล, ชั้นเรียน, อีเมลโรงเรียน', 'สร้างบัญชีผู้ใช้และระบุตัวตนในระบบ'],
                                        ['ข้อมูลการเข้าสู่ระบบ', 'เวลาเข้าใช้งาน, อุปกรณ์, เบราว์เซอร์', 'ความปลอดภัยและการวิเคราะห์การใช้งาน'],
                                        ['ผลงานการเรียน', 'โค้ดที่ส่ง, คะแนน, ประวัติการส่งงาน, ผลทดสอบ', 'ประเมินผลและปรับปรุงการเรียนการสอน'],
                                        ['ข้อมูลพฤติกรรม', 'เวลาที่ใช้, จำนวนครั้งส่งงาน, คะแนนสะสม (XP), สถิติเกม', 'การวิจัยทางการศึกษาและการปรับปรุงระบบ'],
                                        ['บทสนทนา AI Coach', 'คำถามและคำตอบจาก AI Coach, ประวัติการขอคำใบ้', 'พัฒนาระบบโค้ชและวิเคราะห์ประสิทธิภาพ'],
                                        ['ข้อมูลความก้าวหน้า', 'บทเรียนที่เรียนจบ, ความสำเร็จ (Badge), อันดับ Leaderboard', 'แสดงผลความก้าวหน้าและกระตุ้นแรงจูงใจ'],
                                    ].map(([type, detail, purpose], i) => (
                                        <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                                            <td className="p-3 border border-gray-100 font-medium text-gray-800">{type}</td>
                                            <td className="p-3 border border-gray-100 text-gray-600">{detail}</td>
                                            <td className="p-3 border border-gray-100 text-gray-600">{purpose}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Section>

                    <Section title="3. วัตถุประสงค์และฐานทางกฎหมายในการประมวลผล">
                        <p>ระบบประมวลผลข้อมูลส่วนบุคคลภายใต้ฐานทางกฎหมายดังต่อไปนี้:</p>
                        <ul className="list-none space-y-3 mt-3">
                            {[
                                ['ฐานประโยชน์สาธารณะ / หน้าที่ตามกฎหมาย', 'การจัดการเรียนการสอนและประเมินผลตามหลักสูตรของกระทรวงศึกษาธิการ'],
                                ['ฐานผลประโยชน์อันชอบธรรม (Legitimate Interest)', 'การวิจัยทางการศึกษาเพื่อพัฒนาประสิทธิภาพการสอน ภายในโรงเรียน'],
                                ['ฐานความยินยอม (Consent)', 'การนำข้อมูลไปใช้ในงานวิจัยที่มีการเผยแพร่ภายนอก (ขอความยินยอมแยกต่างหาก)'],
                            ].map(([base, detail], i) => (
                                <li key={i} className="flex gap-3 p-3 rounded-lg" style={{ background: '#FFF8FC' }}>
                                    <span className="text-pink-500 font-bold mt-0.5">▸</span>
                                    <div>
                                        <div className="font-semibold text-gray-800">{base}</div>
                                        <div className="text-gray-600 text-sm mt-0.5">{detail}</div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Section>

                    <Section title="4. การเปิดเผยข้อมูลต่อบุคคลภายนอก">
                        <p>ระบบ APCC <strong>ไม่ขาย ไม่เช่า และไม่เปิดเผย</strong> ข้อมูลส่วนบุคคลต่อบุคคลภายนอกเพื่อวัตถุประสงค์เชิงพาณิชย์</p>
                        <p>ข้อมูลอาจถูกส่งถึงบุคคลเหล่านี้เพื่อให้บริการได้:</p>
                        <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
                            <li><strong>Google Firebase / Firestore</strong> — ผู้ให้บริการจัดเก็บฐานข้อมูลและการยืนยันตัวตน (ข้อมูลเก็บใน Google Cloud)</li>
                            <li><strong>Google Gemini API</strong> — ผู้ให้บริการ AI สำหรับ AI Coach และการวิเคราะห์โค้ด (ส่งเฉพาะโค้ดและคำถาม ไม่ส่งข้อมูลระบุตัวตน)</li>
                            <li><strong>Wandbox API</strong> — ผู้ให้บริการคอมไพล์โค้ดออนไลน์ (ส่งเฉพาะโค้ดที่นักเรียนเขียน)</li>
                        </ul>
                        <p className="mt-2 text-sm bg-blue-50 p-3 rounded-lg text-blue-800">ผู้ให้บริการเหล่านี้ได้รับข้อมูลเพื่อการดำเนินงานของระบบเท่านั้น และต้องปฏิบัติตามนโยบายความปลอดภัยของข้อมูลของตนเอง</p>
                    </Section>

                    <Section title="5. ระยะเวลาการเก็บรักษาข้อมูล">
                        <div className="space-y-2">
                            <p>• <strong>ข้อมูลบัญชีผู้ใช้และผลการเรียน:</strong> เก็บตลอดช่วงที่นักเรียนยังศึกษาอยู่ในโรงเรียน และลบออกเมื่อจบการศึกษาหรือตามคำขอ</p>
                            <p>• <strong>ข้อมูลเพื่อการวิจัย (anonymized):</strong> อาจเก็บในรูปแบบไม่ระบุตัวตนหลังจบการศึกษา เพื่อการศึกษาและพัฒนาการศึกษา</p>
                            <p>• <strong>Log การเข้าสู่ระบบ:</strong> เก็บไม่เกิน 1 ปีการศึกษา</p>
                            <p>• <strong>บทสนทนา AI Coach:</strong> เก็บตลอดช่วงภาคเรียนที่เรียน</p>
                        </div>
                    </Section>

                    <Section title="6. สิทธิของเจ้าของข้อมูลส่วนบุคคล">
                        <p>ผู้เรียนและผู้ปกครอง (กรณีผู้เยาว์) มีสิทธิดังต่อไปนี้ตาม PDPA:</p>
                        <div className="grid sm:grid-cols-2 gap-3 mt-3">
                            {[
                                ['👁️ สิทธิในการเข้าถึง', 'ขอดูข้อมูลส่วนบุคคลที่ระบบเก็บไว้'],
                                ['✏️ สิทธิในการแก้ไข', 'ขอแก้ไขข้อมูลที่ไม่ถูกต้องหรือไม่ครบถ้วน'],
                                ['🗑️ สิทธิในการลบ', 'ขอให้ลบหรือทำลายข้อมูลเมื่อสิ้นสุดวัตถุประสงค์'],
                                ['⛔ สิทธิในการคัดค้าน', 'คัดค้านการประมวลผลข้อมูลในบางกรณี'],
                                ['📦 สิทธิในการโอนย้ายข้อมูล', 'ขอรับข้อมูลในรูปแบบที่อ่านได้ด้วยเครื่อง'],
                                ['🔒 สิทธิในการจำกัดการใช้', 'ขอให้หยุดประมวลผลชั่วคราวในระหว่างตรวจสอบ'],
                                ['↩️ สิทธิถอนความยินยอม', 'ถอนความยินยอมได้ทุกเมื่อ (กรณีใช้ฐานความยินยอม)'],
                                ['📋 สิทธิในการร้องเรียน', 'ยื่นเรื่องต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล'],
                            ].map(([title, desc], i) => (
                                <div key={i} className="p-3 rounded-xl border border-pink-100" style={{ background: '#FFF8FC' }}>
                                    <div className="font-semibold text-sm" style={{ color: '#AD1457' }}>{title}</div>
                                    <div className="text-xs text-gray-600 mt-1">{desc}</div>
                                </div>
                            ))}
                        </div>
                        <p className="mt-4 text-sm bg-yellow-50 p-3 rounded-lg text-yellow-800 border border-yellow-200">
                            <strong>การใช้สิทธิ:</strong> ติดต่อครูผู้สอนหรือฝ่ายวิชาการของโรงเรียนผ่านอีเมล @triamudomsouth.ac.th ระบบจะดำเนินการภายใน 30 วัน
                        </p>
                    </Section>

                    <Section title="7. การรักษาความปลอดภัยของข้อมูล">
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>ข้อมูลทั้งหมดส่งผ่าน HTTPS (TLS encryption)</li>
                            <li>การยืนยันตัวตนผ่าน Firebase Authentication (email/password)</li>
                            <li>กฎการเข้าถึงข้อมูล (Firestore Security Rules) จำกัดให้แต่ละบัญชีเห็นเฉพาะข้อมูลของตน</li>
                            <li>ครูเห็นข้อมูลผลการเรียนของนักเรียนในชั้นเรียนที่รับผิดชอบเท่านั้น</li>
                            <li>Admin สามารถเข้าถึงข้อมูลระบบเพื่อการบริหารจัดการ</li>
                            <li>ไม่มีการจัดเก็บรหัสผ่านในรูปแบบ plain text</li>
                        </ul>
                    </Section>

                    <Section title="8. การใช้ข้อมูลเพื่อการวิจัย">
                        <p>ระบบ APCC พัฒนาขึ้นเพื่อประกอบงานวิจัยทางการศึกษา ข้อมูลที่เก็บรวบรวมอาจนำไปใช้ในงานวิจัยภายใต้หลักการดังนี้:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
                            <li>ข้อมูลในงานวิจัยใช้ในรูปแบบ <strong>익명 (Anonymized)</strong> ไม่ระบุชื่อหรือข้อมูลที่ระบุตัวตนได้</li>
                            <li>ผลวิจัยมุ่งพัฒนาการเรียนการสอนวิทยาการคำนวณ ไม่ใช่วัตถุประสงค์เชิงพาณิชย์</li>
                            <li>การเผยแพร่งานวิจัยภายนอกโรงเรียนต้องได้รับความยินยอมจากผู้เรียนและผู้ปกครอง</li>
                        </ul>
                    </Section>

                    <Section title="9. คุกกี้และการติดตาม">
                        <p>ระบบ APCC ใช้ <strong>Local Storage และ Session State ของ Firebase</strong> เพื่อรักษาสถานะการเข้าสู่ระบบเท่านั้น ไม่ใช้คุกกี้ติดตามพฤติกรรม (Tracking Cookies) และไม่มีโฆษณาในระบบ</p>
                    </Section>

                    <Section title="10. การเปลี่ยนแปลงนโยบาย">
                        <p>โรงเรียนอาจปรับปรุงนโยบายนี้เป็นครั้งคราว การเปลี่ยนแปลงสำคัญจะแจ้งให้ทราบผ่านระบบหรือครูผู้สอน วันที่มีผลบังคับใช้จะแสดงที่ส่วนหัวของเอกสารนี้</p>
                    </Section>

                    {/* Footer */}
                    <div className="mt-8 pt-6 border-t border-gray-100 text-center text-sm text-gray-500 space-y-1">
                        <p>หากมีข้อสงสัยเกี่ยวกับนโยบายนี้ กรุณาติดต่อครูผู้สอนหรือฝ่ายวิชาการ</p>
                        <p>© 2025 โรงเรียนเตรียมอุดมศึกษาภาคใต้ · AI-Powered Coding Coach (APCC)</p>
                        <p className="text-xs">จัดทำตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)</p>
                    </div>
                </div>
            </main>
        </div>
    );
};
