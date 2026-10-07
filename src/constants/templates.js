// Các mẫu thư email soạn sẵn chuẩn HTML
export const EMAIL_TEMPLATES = [
  {
    id: 'student_info',
    name: 'Mẫu 1: Xác nhận thông tin sinh viên',
    subject: 'Thông báo xác nhận thông tin sinh viên - {Họ và tên} (MSSV: {mssv})',
    body: `<p>Kính gửi sinh viên <strong>{Họ và tên}</strong>,</p>
<p>Phòng Đào tạo xin gửi thông tin xác nhận hồ sơ của bạn như sau:</p>
<ul>
  <li><strong>Họ và tên:</strong> {Họ và tên}</li>
  <li><strong>Mã số sinh viên:</strong> {mssv}</li>
  <li><strong>Số điện thoại:</strong> {Số điện thoại}</li>
  <li><strong>Email nhận tin:</strong> {email}</li>
</ul>
<p>Vui lòng kiểm tra kỹ các thông tin trên. Nếu có bất kỳ sai sót nào, bạn vui lòng phản hồi lại email này để được hỗ trợ kịp thời.</p>
<p>Chúc bạn học tập tốt!</p>
<p><strong>Trân trọng,</strong><br><em>Phòng Đào tạo &amp; Quản lý Sinh viên</em></p>`
  },
  {
    id: 'tuition_fee',
    name: 'Mẫu 2: Nhắc nhở hoàn tất thủ tục / học phí',
    subject: 'Nhắc nhở hoàn tất thủ tục học tập - Sinh viên {Họ và tên} ({mssv})',
    body: `<p>Chào bạn <strong>{Họ và tên}</strong>,</p>
<p>Hệ thống ghi nhận bạn (MSSV: <strong>{mssv}</strong>) hiện còn một số thủ tục cần hoàn tất theo quy định của nhà trường.</p>
<p><strong>Thông tin liên hệ ghi nhận:</strong></p>
<ul>
  <li><strong>Số điện thoại:</strong> {Số điện thoại}</li>
  <li><strong>Email:</strong> {email}</li>
</ul>
<p>Đề nghị bạn liên hệ bộ phận phụ trách trước thời hạn quy định để không ảnh hưởng đến tiến độ học tập.</p>
<p>Trân trọng cảm ơn!</p>`
  },
  {
    id: 'exam_result',
    name: 'Mẫu 3: Thông báo kết quả / xét tốt nghiệp',
    subject: 'Thông báo xét duyệt kết quả học tập - {Họ và tên}',
    body: `<p>Thân gửi bạn <strong>{Họ và tên}</strong>,</p>
<p>Hội đồng xét duyệt xin gửi thông báo về kết quả rà soát hồ sơ học tập của sinh viên <strong>{Họ và tên}</strong> (MSSV: <strong>{mssv}</strong>).</p>
<p>Mọi thắc mắc và khiếu nại vui lòng gửi về email này trong vòng 03 ngày làm việc kể từ ngày nhận thông báo.</p>
<p>Chúc bạn gặt hái nhiều thành công trên con đường sắp tới!</p>
<p><em>Ban Giám Hiệu &amp; Phòng Khảo Thí</em></p>`
  }
];

export const DEFAULT_SAMPLE_DATA = {
  headers: ['Họ và tên', 'email', 'Số điện thoại', 'mssv'],
  records: [
    {
      'Họ và tên': 'Huỳnh A',
      'email': 'abc@gmail.com',
      'Số điện thoại': '98989899',
      'mssv': '213'
    },
    {
      'Họ và tên': 'Nguyễn Văn Bình',
      'email': 'binh.nguyen@example.com',
      'Số điện thoại': '0901234567',
      'mssv': '214'
    },
    {
      'Họ và tên': 'Trần Thị Cúc',
      'email': 'cuc.tran@example.com',
      'Số điện thoại': '0912345678',
      'mssv': '215'
    }
  ],
  rawText: `Họ và tên\temail\tSố điện thoại\tmssv\nHuỳnh A\tabc@gmail.com\t98989899\t213\nNguyễn Văn Bình\tbinh.nguyen@example.com\t0901234567\t214\nTrần Thị Cúc\tcuc.tran@example.com\t0912345678\t215`
};

