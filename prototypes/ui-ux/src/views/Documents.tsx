import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import {
  ArrowRight,
  Check,
  CheckCheck,
  FileText,
  Files,
  FolderOpen,
  ScanLine,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { type DocumentKind } from '../data/cases';
import { useStudio } from '../state/StudioContext';
import { Badge, Button, Callout, Modal, Panel, SectionTitle } from '../components/ui';
import { copy, productCopy } from '../lib/copy';
import { SourceDocument } from '../components/SourceDocument';

export function Documents() {
  const { record, design, data, upload, removeUpload, navigate, setNotice } = useStudio();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<DocumentKind | null>(null);
  const physicalFiles = [...new Set(record.documents.map((document) => document.physicalFile))];
  const files = data.uploads[record.id] ?? [];
  const acceptFiles = (list: FileList | null) => {
    if (!list) return;
    const accepted = Array.from(list).filter(
      (f) => /\.(pdf|png|jpe?g|xls|xlsx)$/i.test(f.name) && f.size <= 25 * 1024 * 1024,
    );
    if (accepted.length) upload(accepted.map((f) => f.name));
    else setNotice('Chọn PDF, PNG/JPG hoặc Excel không quá 25 MB.');
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    acceptFiles(e.dataTransfer.files);
  };
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    acceptFiles(e.target.files);
    e.target.value = '';
  };
  return (
    <div className="documents-layout">
      <div>
        <div
          className={`upload-zone ${dragging ? 'dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <span className="upload-icon">
            <UploadCloud size={27} strokeWidth={1.5} />
          </span>
          <div>
            <h2>Bắt đầu từ bộ chứng từ của bạn</h2>
            <p>Kéo thả file vào đây hoặc chọn từ máy tính</p>
            <small>PDF, ảnh, Excel · Tối đa 25 MB/file</small>
          </div>
          <Button variant="secondary" icon={UploadCloud} onClick={() => input.current?.click()}>
            Chọn chứng từ
          </Button>
          <input
            ref={input}
            className="sr-only"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.xls,.xlsx"
            multiple
            onChange={onChange}
            aria-label={productCopy.addDocuments}
          />
        </div>
        <p className="upload-disclaimer">
          <ScanLine size={14} />
          {productCopy.uploadNote}
        </p>
        <Panel>
          <SectionTitle
            title="Bộ chứng từ tham chiếu"
            eyebrow={`${record.documents.length} ${productCopy.documents}`}
          />
          {record.documents.length ? (
            <div className="document-list">
              {physicalFiles.map((filename) => (
                <section className="physical-document-group" key={filename}>
                  <div className="physical-document-heading">
                    <Files size={18} />
                    <strong>{filename}</strong>
                    <span>{copy.physicalFile}</span>
                  </div>
                  {record.documents
                    .filter((document) => document.physicalFile === filename)
                    .map((d, i) => (
                      <button
                        className="document-row"
                        key={d.id}
                        onClick={() => setPreview(d.kind)}
                      >
                        <span className="document-icon">
                          <FileText size={22} />
                          <small>PDF</small>
                        </span>
                        <div className="document-name">
                          <strong>{d.title}</strong>
                          <span>
                            {copy.logicalDocument} · {copy.page} {d.pageFrom}–{d.pageTo}
                          </span>
                          <small>{d.detail}</small>
                        </div>
                        <Badge tone={d.state === 'ready' ? 'success' : 'warning'}>
                          {d.state === 'ready' ? productCopy.dataAvailable : 'Cần rà soát'}
                        </Badge>
                        <span className="document-number">0{i + 1}</span>
                        <ArrowRight size={16} />
                      </button>
                    ))}
                </section>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Files size={30} />
              <strong>Tờ khai XLS tham chiếu</strong>
              <p>
                Excel lịch sử chỉ để tham chiếu, không thay thế chứng từ đầu vào.
                <br />
                Chưa có bộ chứng từ trước khai của lô hàng này.
              </p>
            </div>
          )}
          {files.length > 0 && (
            <div className="local-uploads">
              <span className="eyebrow">FILE BẠN VỪA THÊM · CHƯA XỬ LÝ</span>
              {files.map((name) => (
                <div key={name}>
                  <FileText size={17} />
                  <span>{name}</span>
                  <Badge>Chờ kết nối AI</Badge>
                  <button
                    aria-label={`Bỏ file ${name}`}
                    className="icon-button"
                    onClick={() => removeUpload(name)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="panel-bottom">
            <span>
              <FolderOpen size={16} />
              Hồ sơ {record.code}
            </span>
            <Button icon={ArrowRight} onClick={() => navigate('reconcile')}>
              {productCopy.reconcile}
            </Button>
          </div>
        </Panel>
      </div>
      <aside className="document-aside">
        <Panel>
          <SectionTitle title="Thông tin lô hàng" />
          <dl className="metadata-list">
            {[
              [
                'Loại hình',
                `${record.type} · ${record.type === 'B11' ? 'Xuất khẩu' : 'Nhập khẩu'}`,
              ],
              ['Invoice', record.invoice],
              ['B/L', record.bill],
              ['Container', record.container],
              ['Đóng gói', record.packages],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="shipment-route">
            <span>{record.route[0]}</span>
            <div>
              <span />
              <ArrowRight size={15} />
              <span />
            </div>
            <span>{record.route[1]}</span>
          </div>
        </Panel>
        <Panel className="checklist-panel">
          <SectionTitle title={design === 'harbor' ? 'Trước khi tiếp tục' : 'Checklist chứng từ'} />
          {[
            'Đúng lô hàng và bên giao dịch',
            'Đủ trang và phụ lục liên quan',
            'Thông tin rõ, đọc được số liệu',
          ].map((t) => (
            <div className="checklist-row" key={t}>
              <Check size={15} />
              <span>{t}</span>
            </div>
          ))}
          <Callout>
            C/O chỉ yêu cầu khi phù hợp hồ sơ. Chứng từ có dữ liệu chưa đồng nghĩa đã được xác nhận.
          </Callout>
        </Panel>
        <div className="subtle inline-icon">
          <CheckCheck size={16} />
          Dữ liệu nguồn luôn được giữ để đối chiếu.
        </div>
      </aside>
      {preview && (
        <Modal title={productCopy.excerptTitle} onClose={() => setPreview(null)} wide>
          <SourceDocument kind={preview} />
          <p className="subtle">{productCopy.excerptNote}</p>
        </Modal>
      )}
    </div>
  );
}
