# Hướng dẫn sử dụng precheck

**Kiểm tra bộ chứng từ, xử lý chênh lệch và xuất Excel trước khai báo hải quan.**

Hướng dẫn này dành cho người xử lý hồ sơ trên giao diện tiếng Việt. Bạn chỉ cần trình duyệt và đường dẫn truy cập được cấp, không cần cài phần mềm hay chạy lệnh.

## Luồng làm việc

**Tạo hồ sơ → Chọn biểu mẫu → Tải PDF → Xử lý chứng từ → Đối chiếu và chọn giá trị → Kiểm tra dữ liệu tổng hợp → Xuất và tải Excel.**

AI chuẩn bị đề xuất để bạn kiểm tra. **“Xử lý xong” chưa có nghĩa là hồ sơ đã đúng hoặc đã được xác nhận hoàn tất.**

## 1. Mở app và tạo hồ sơ

1. Mở đường dẫn ứng dụng được cấp. Nếu trình duyệt hỏi tên đăng nhập và mật khẩu truy cập, dùng thông tin được cấp cùng đường dẫn.
2. Tại trang giới thiệu, bấm **Mở danh sách hồ sơ** hoặc **Vào không gian làm việc**.
3. Bấm **Tạo hồ sơ** và điền:

| Ô trên giao diện | Cách điền | Ví dụ |
| --- | --- | --- |
| **Mã hồ sơ** | Mã quản lý nội bộ, không trùng hồ sơ đã có. Dùng chữ không dấu, số, dấu chấm, gạch chéo hoặc gạch nối; không dùng khoảng trắng. | `XK-2026-001` |
| **Tên hồ sơ** | Mô tả ngắn để dễ tìm lại lô hàng. | `Lô hàng xuất khẩu - 1 container` |
| **Loại hình khai báo** | Chọn loại hình phù hợp với lô hàng trong danh sách. | `B11` nếu hồ sơ thuộc loại hình xuất kinh doanh; không mặc định mọi lô hàng đều là B11. |

4. Bấm **Tạo hồ sơ**, sau đó **Mở rà soát chứng từ**.

Nếu hồ sơ đã có, mở lại từ **Tổng quan hồ sơ**; không cần tạo thêm hồ sơ để làm tiếp.

## 2. Chọn biểu mẫu Excel

Trong **Bộ chứng từ**, tìm khung **Biểu mẫu Excel**:

1. Tại **Biểu mẫu đầu ra**, chọn **Biểu mẫu Excel V2** khi hồ sơ sử dụng form V2. Tên lựa chọn có thể kèm mã phiên bản.
2. Điền **Dòng hàng hóa** theo số dòng hàng cần lập và **Container** theo số container thực tế. Đây không phải số file PDF hoặc số trang chứng từ.
3. Điền **Lý do chọn hoặc điều chỉnh biểu mẫu**, ví dụ: `Lập hồ sơ theo biểu mẫu V2, gồm 1 dòng hàng và 1 container.`
4. Bấm **Sử dụng biểu mẫu**.

**Kiểm tra trước khi tiếp tục:** biểu mẫu và số dòng đã được lưu. Với hồ sơ đã chọn mẫu, nút có thể là **Cập nhật số dòng**.

Nếu thấy **Chưa có biểu mẫu trong thư viện**, nhờ người quản trị bổ sung biểu mẫu trước. Không tải form Excel vào khu vực tải chứng từ PDF.

Với hồ sơ cũ, chỉ chọn **Áp dụng định nghĩa trường của phiên bản form này và rà soát lại các giá trị bị ảnh hưởng** khi thực sự cần cập nhật định nghĩa trường. Sau khi đổi mẫu hoặc số dòng, kiểm tra lại dữ liệu bị ảnh hưởng.

## 3. Tải bộ chứng từ

### Chuẩn bị file

| Loại file | Cách xử lý |
| --- | --- |
| Chứng từ đầu vào dạng PDF: hóa đơn thương mại, vận đơn, packing list, booking, giấy đăng ký, biên lai… | Tải các file liên quan đến lô hàng lên cùng hồ sơ. |
| Chứng từ Word hoặc Excel | Xuất/chuyển sang PDF trước, kiểm tra đủ trang và đọc được. Đổi đuôi tên file thành `.pdf` không phải là chuyển đổi. |
| Tờ khai ECUS có tên như `ToKhaiHQ`, `tokhaiHQ`, `ToKhaiAMA`, tờ khai thông quan hoặc tờ khai sửa đổi | **Giữ riêng, không tải vào bộ đầu vào.** Có thể dùng để đối chiếu kết quả sau khi xuất. |
| Form Excel dùng làm đầu ra | Chọn trong **Biểu mẫu Excel**, không đưa vào nhóm chứng từ nguồn. |

### Thao tác tải lên

1. Bấm **Tải PDF lên** và chọn nhiều file cùng lúc; hoặc kéo thả các **file PDF** vào khung **Bộ chứng từ**. Không kéo nguyên thư mục vào khung.
2. Chờ danh sách file cập nhật, đối chiếu tên và số lượng với bộ chứng từ đã chuẩn bị.
3. Bấm tên file để kiểm tra đúng tài liệu và đủ trang.

Số file tùy từng lô hàng, không có yêu cầu chung là mọi bộ phải đủ 15 file. Nếu tải nhiều file mà gặp lỗi giữa chừng, kiểm tra danh sách đã lưu rồi chỉ bổ sung những file còn thiếu.

## 4. Xử lý bộ chứng từ

1. Tại khung **Xử lý bộ chứng từ**, chọn **Hóa đơn để xác định thứ tự dòng hàng**.
   Chọn hóa đơn thương mại của lô hàng; không nhầm với hóa đơn VAT nội địa hoặc đề nghị thanh toán. Nếu chỉ có một hóa đơn phù hợp, có thể dùng lựa chọn tự xác định.
2. Bấm **Xử lý bộ chứng từ** một lần và chờ tiến trình hoàn tất.
3. Đọc kết quả về giá trị có nguồn, trang được nhận dạng và đề xuất đã bị loại. Số đề xuất bị loại không đồng nghĩa với số lỗi trên chứng từ.
4. Trong **Phân loại chứng từ**, kiểm tra tên file, loại chứng từ và phạm vi trang. Chỉ bấm **Xác nhận loại chứng từ** khi thông tin đúng với PDF. Nếu phân loại sai, chưa xác nhận; nhờ người phụ trách cấu hình kiểm tra lại.
5. Bấm **Rà soát kết quả** để sang **Đối chiếu dữ liệu**.

Không cần chạy lại cả bộ sau mỗi lần chọn hoặc sửa một giá trị. Nút **Lưu và kiểm tra lại** ở bước sau sẽ kiểm tra lại dữ liệu đã chỉnh. Chỉ dùng **Xử lý lại bộ chứng từ hiện tại** khi cần trích xuất lại; thao tác xử lý chứng từ có gọi AI.

## 5. Đối chiếu và xử lý từng điểm cần rà soát

Trong **Đối chiếu dữ liệu**, dùng **Tìm trường dữ liệu hoặc dòng hàng** để tìm theo tên trường, ví dụ `Số kiện`, `Tên người nhập khẩu` hoặc `Tổng trị giá hóa đơn`.

| Bộ lọc | Dùng khi nào |
| --- | --- |
| **Cần xử lý** | Bắt đầu với các giá trị đã có nhưng còn cần quyết định hoặc xác minh. |
| **Cùng ý nghĩa** | Xem nhóm cách viết được AI nhận định là tương đương, nếu đã chạy đối chiếu AI. |
| **Chưa có giá trị** | Tìm các trường chưa có giá trị nguồn hoặc giá trị tổng hợp. |
| **Đã xử lý** | Kiểm tra lại các quyết định đã lưu. |
| **Tất cả** | Xem toàn bộ trường, kể cả trường chưa có dữ liệu. |

### A. Đọc nguồn và PDF bên phải

1. Chọn trường cần kiểm tra ở danh sách bên trái.
2. Trong khung **Nguồn của…** bên phải, bấm từng giá trị để xem đúng file và trang tương ứng. Nếu có nhiều nguồn, cuộn trong danh sách nguồn.
3. Đọc phần được đánh dấu trên PDF và nội dung xung quanh. Cuộn trong khung PDF để xem phần còn lại; có thể mở PDF gốc bằng biểu tượng mũi tên.

Nếu trường chỉ có một nguồn, PDF được mở trực tiếp và không có danh sách chuyển giữa nhiều nguồn.

### B. Chọn nhanh một giá trị có sẵn — không phải gõ lại

Ví dụ minh họa: hóa đơn ghi **1.000 kiện**, packing list ghi **990 kiện**.

1. Trong **Chọn nhanh từ chứng từ**, bấm giá trị cần xem. PDF bên phải đổi sang cùng nguồn; chọn ở danh sách nguồn bên phải cũng cập nhật giá trị đang xem bên trái.
2. Kiểm tra **Giá trị từ nguồn đang xem** và PDF.
3. Nếu đây là giá trị cần dùng, bấm **Dùng giá trị này**.
4. Kiểm tra hoặc bổ sung **Lý do và căn cứ xử lý**.
5. Tích **Tôi đã kiểm tra căn cứ và xác nhận dùng giá trị này trong bản tổng hợp.**
6. Bấm **Lưu và kiểm tra lại**.

**Chỉ bấm xem nguồn chưa lưu giá trị.** Khi lưu thành công, giá trị tổng hợp được cập nhật và có nhãn **Đã dùng trong dữ liệu tổng hợp** ở nguồn đã chọn.

Chọn một giá trị là quyết định xử lý trên web, không sửa nội dung chứng từ gốc và không chứng minh rằng chứng từ còn lại đã được sửa đúng.

### C. Tự nhập hoặc chuẩn hóa một giá trị khác

Dùng khi các lựa chọn hiện có chưa đúng, hoặc chứng từ có thông tin nhưng AI chưa lấy được:

1. Bấm **Sửa giá trị**; nếu đã có quyết định trước đó, bấm **Rà lại / chỉnh sửa**.
2. Nhập **Giá trị tổng hợp** theo chứng từ đã kiểm tra.
3. Nếu là số, chọn đúng **Định dạng số**. Chẳng hạn `1,234.56` và `1.234,56` là hai cách viết khác nhau; có thể nhập số nguyên không dấu phân nhóm để tránh nhầm.
4. Ghi **Lý do và căn cứ xử lý**, nêu rõ file, trang và căn cứ sử dụng giá trị.
5. Tích ô xác nhận đã kiểm tra căn cứ, rồi bấm **Lưu và kiểm tra lại**.

Ô hiển thị giá trị hiện tại chỉ để xem. Muốn nhập tay, hãy bấm **Sửa giá trị** trước. Bản tổng hợp được cập nhật; PDF gốc và dữ liệu trích xuất được giữ lại.

### D. Xác nhận nhiều trường có giá trị thống nhất

Nếu xuất hiện khung **… trường có giá trị thống nhất**:

1. Kiểm tra giá trị và mở các liên kết nguồn để đọc bằng chứng.
2. Chọn từng trường đã kiểm tra, hoặc tích **Chọn các trường đang hiển thị sau khi kiểm tra** khi đã xem đủ cả nhóm.
3. Điền **Lý do rà soát**.
4. Bấm **Xác nhận … trường đã kiểm tra**.

Các nguồn thống nhất vẫn có thể cùng bị lấy sai vai trò. Ví dụ mã số thuế của bên bán không trở thành mã người nhập khẩu chỉ vì được lặp lại trên nhiều file.

### E. Nhờ AI phân biệt cách viết tương đương

Nếu có chênh lệch, khung **AI đối chiếu cách viết giữa các nguồn** có nút **Rà soát toàn bộ · 1 lần gọi AI**. Đây là bước hỗ trợ tùy chọn; bạn vẫn có thể tự chọn nguồn hoặc nhập giá trị.

1. Bấm nút và chờ kết quả.
2. Với nhóm tương đương, bấm **Xem nguồn** để kiểm tra, rồi **Rà soát … giá trị tương đương**. Điền lý do, tích xác nhận và **Lưu và kiểm tra lại**.
3. Với một đề xuất riêng, có thể bấm **Rà soát đề xuất này** nếu nút hiển thị. AI có thể đề xuất giá trị từ nguồn có sẵn hoặc cách viết chuẩn hóa khác.
4. Những điểm khác biệt thực chất hoặc chưa đủ căn cứ vẫn xử lý theo cách B hoặc C ở trên.

Kết quả được lưu lại khi nguồn và quy tắc chưa thay đổi. Xem nguồn, lưu quyết định hoặc tải Excel không tự gọi lại AI. AI đối chiếu không tự xác nhận hoàn tất hồ sơ.

### F. Loại một giá trị trích xuất sai vai trò

Nếu AI lấy nhầm mã bên bán cho người nhập khẩu, hoặc lấy thông tin từ một lô hàng khác:

1. Mở trường đó và đọc lại PDF để xác định đúng giá trị bị lấy nhầm.
2. Tại ô **Lý do rà soát** phía trên bảng nguồn, ghi rõ vì sao giá trị không thuộc trường/lô hàng này.
3. Bấm **Rút khỏi đối chiếu** ở đúng dòng nguồn sai.
4. Chọn nguồn phù hợp hoặc bổ sung giá trị tổng hợp nếu có căn cứ.

Thao tác này giữ lại bản gốc và lịch sử. Không rút một nguồn chỉ để làm biến mất chênh lệch có thật. Nếu cần sửa chính trích dẫn nguồn, dùng **Sửa dữ liệu** tại dòng đó; bản sửa cần được xác minh lại.

## 6. Kiểm tra Dữ liệu tổng hợp

Mở **Dữ liệu tổng hợp** để đọc các giá trị sẽ được dùng khi xuất Excel, cùng nguồn và lý do đã lưu. Có thể tìm trường, lọc và chuyển trang để xem tiếp.

Ưu tiên kiểm tra:

- Đúng bên xuất khẩu, bên nhập khẩu; không nhầm với đại lý, bên được thông báo hoặc bên mua trên hóa đơn nội địa.
- Đúng số hóa đơn, vận đơn, container; kiểm tra trực tiếp cả số seal trên các chứng từ liên quan.
- Đúng số lượng, đơn giá, thành tiền và tiền tệ. **Incoterm** và **đồng tiền hóa đơn** là các trường riêng.
- Phân biệt số kiện, trọng lượng tịnh và trọng lượng cả bì. Điền **Số lượng (2)** và đơn vị theo ý nghĩa của biểu mẫu và chứng từ, không tự sao chép từ **Số lượng (1)**.
- Không tự cộng những biên lai khác loại thành **Tổng số tiền lệ phí trên chứng từ** khi chưa có quy tắc và căn cứ cho con số tổng.

**Chưa có dữ liệu · ô Excel sẽ được tô đỏ** nghĩa là chưa có giá trị được xác nhận để điền. Điều này không chứng minh chứng từ thiếu thông tin. Nếu PDF có thông tin mà web còn trống, quay lại bổ sung và xác nhận.

Nếu thấy kiểm tra **số lượng × đơn giá** không khớp thành tiền, kiểm tra cả ba trường và đơn vị; chỉ sửa trường có căn cứ, rồi lưu để kiểm tra lại.

## 7. Tạo và tải Excel

Mở **Rà soát & xuất Excel**. Trước tiên xem **Trong file Excel sẽ có gì?** và **Xem trường chưa có giá trị và vị trí trong Excel** để biết ô nào đã có giá trị, đang chờ xử lý hoặc còn trống.

### Cần tải bản hiện tại để tiếp tục rà soát

1. Bấm **Xuất Excel để rà soát**.
2. Tìm bản vừa tạo ở đầu **Lịch sử xuất**, có nhãn **Mới nhất**.
3. Bấm nút **Tải Excel** trên chính thẻ file đó.

Bản này có nhãn **Bản rà soát · Chưa xác nhận hoàn tất**. Chỉ những giá trị đã rà soát mới được điền; các ô thiếu hoặc chưa xử lý để trống và tô đỏ. Việc tải được bản rà soát không có nghĩa là đã hết điều kiện chặn.

### Cần tạo bản xuất đã xác nhận

1. Nếu còn **Còn điều kiện cần xử lý**, đọc từng mục và quay lại xử lý đúng trường. Không xác nhận giá trị không có căn cứ để vượt qua bước này.
2. Khi hiển thị **Đã đạt kiểm tra dữ liệu**, kiểm tra lại các trường còn trống. Một số trường không bắt buộc có thể được để trống theo thiết lập biểu mẫu; không phải tất cả ô đều phải có dữ liệu.
3. Điền **Lý do rà soát**, rồi bấm **Xác nhận phiên bản hiện tại**.
4. Bấm **Tạo file Excel**.
5. Trong **Lịch sử xuất**, tìm bản có nhãn **Bản xuất đã xác nhận** và bấm **Tải Excel** trên thẻ đó.

Nếu thay đổi dữ liệu sau đó, rà soát và xác nhận lại phiên bản mới trước khi tạo bản xuất đã xác nhận tiếp theo. File đã tải trước đó không tự cập nhật; mỗi bản trong lịch sử là một file riêng.

Ứng dụng lập file theo biểu mẫu đã chọn; không tự gửi tờ khai đến hệ thống hải quan và không thay thế việc kiểm tra nghiệp vụ của người xử lý.

## 8. Kiểm tra file đã tải và làm tiếp khi cần

1. Mở file Excel vừa tải, kiểm tra đúng loại bản xuất, phiên bản, dòng hàng và container.
2. Dò các giá trị quan trọng với chứng từ. Nếu có tờ khai ECUS giữ riêng, dùng để tham khảo đối chiếu sau xuất. Tờ khai đó vẫn được giữ ngoài bộ chứng từ đầu vào.
3. Nếu cần chỉnh, sửa trên web, lưu và tạo bản xuất mới. Chỉnh trực tiếp file Excel đã tải không cập nhật dữ liệu trong app.
4. Có thể đóng trình duyệt rồi mở lại hồ sơ để làm tiếp. Các quyết định đã bấm lưu được giữ lại; phần đang gõ nhưng chưa lưu cần hoàn tất trước khi rời trang.

## Khi gặp vướng mắc

| Tình huống | Cách xử lý |
| --- | --- |
| Đường dẫn không mở được | Nhờ người phụ trách vận hành kiểm tra đường dẫn và trạng thái ứng dụng. Không cần tự chạy lệnh trên máy. |
| Nút xử lý chứng từ chưa bấm được | Kiểm tra đã chọn biểu mẫu, tải PDF và chờ thao tác lưu xong. Nếu app báo chưa cấu hình dịch vụ trích xuất, báo người quản trị. |
| App yêu cầu chọn hóa đơn chính | Chọn hóa đơn thương mại tại **Hóa đơn để xác định thứ tự dòng hàng** rồi bắt đầu xử lý. |
| File đã có trong hồ sơ | Kiểm tra danh sách và chỉ tải phần còn thiếu; không cần thêm bản sao cùng nội dung. |
| PDF đang đọc hoặc chưa hiện đánh dấu | Chờ tải xong, kiểm tra tên file và số trang. Nếu cần, mở **PDF gốc** để đọc; không xác nhận chỉ dựa vào dòng trích dẫn. |
| **Model không đề xuất** | AI chưa đưa ra giá trị cho trường trong lượt gọi đó. Đọc PDF; nếu có thông tin thì bổ sung bằng **Sửa giá trị**. Không hiểu thông báo này là chứng từ chắc chắn không có dữ liệu. |
| **Trích xuất chưa chắc chắn** | Mở trường để kiểm tra nguồn và vai trò, sau đó chọn hoặc sửa giá trị có căn cứ. Không phải lúc nào cũng cần chạy lại cả bộ. |
| Các nguồn có giá trị khác nhau | Đọc từng nguồn, phân biệt khác cách viết với khác số liệu, đơn vị, bên liên quan hoặc loại phí. Chọn giá trị theo căn cứ nghiệp vụ, không theo số đông. |
| Bấm xem nguồn nhưng ô tổng hợp chưa đổi | Bấm thêm **Dùng giá trị này**, tích xác nhận và **Lưu và kiểm tra lại**. |
| Nút **Tạo file Excel** chưa sáng | Xử lý điều kiện chặn và bấm **Xác nhận phiên bản hiện tại** trước; hoặc dùng **Xuất Excel để rà soát** nếu cần xem bản đang làm. |
| Hồ sơ đã thay đổi hoặc yêu cầu tải lại | Ghi lại phần chưa lưu, tải lại trang và kiểm tra phiên bản hiện tại trước khi làm tiếp. |

Khi báo lỗi, gửi **mã hồ sơ, tên trường hoặc file, bước vừa thao tác và ảnh chụp thông báo** để người hỗ trợ tìm đúng vấn đề. Không gửi mật khẩu truy cập kèm ảnh.

## Kiểm tra nhanh trước khi kết thúc

- [ ] Đã tải đủ chứng từ liên quan; giữ riêng tờ khai ECUS.
- [ ] Đúng biểu mẫu, loại hình, số dòng hàng và số container.
- [ ] Đã kiểm tra giá trị quan trọng với PDF, kể cả khi AI không báo chênh lệch.
- [ ] Các quyết định chọn/sửa giá trị có căn cứ và đã bấm lưu.
- [ ] Đã xem các ô còn trống và điều kiện chặn.
- [ ] Đã tải đúng file, đúng nhãn **bản rà soát** hoặc **bản xuất đã xác nhận**.
