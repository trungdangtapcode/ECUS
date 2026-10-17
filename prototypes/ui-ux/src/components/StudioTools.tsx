import { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Download,
  MessageSquare,
  RotateCcw,
  SlidersHorizontal,
  Star,
} from 'lucide-react';
import {
  designs,
  feedbackCriteria,
  getDesign,
  type DesignId,
  type ThemeTokens,
} from '../config/designs';
import { downloadText, useStudio } from '../state/StudioContext';
import { Button, Callout, Modal } from './ui';
import { SelectField } from './SelectField';
import { ColorField } from './ColorField';
import { landingCopy, productCopy } from '../lib/copy';

export type Overrides = Partial<Record<DesignId, Partial<ThemeTokens>>>;
export function StudioTools({
  overrides,
  onOverrides,
}: {
  overrides: Overrides;
  onOverrides: (value: Overrides) => void;
}) {
  const { design, screen, navigate, selectDesign, data, saveFeedback, reset } = useStudio();
  const [dialog, setDialog] = useState<'theme' | 'feedback' | 'reset' | null>(null);
  const [feedback, setFeedback] = useState({
    scores: {} as Record<string, number>,
    note: '',
    preferred: false,
  });
  if (!design) return null;
  const current = getDesign(design);
  const tokens = { ...current.tokens, ...overrides[design] };
  const update = (field: keyof ThemeTokens, value: string) =>
    onOverrides({ ...overrides, [design]: { ...overrides[design], [field]: value } });
  return (
    <>
      <div className="studio-bar">
        <button
          className="studio-back"
          aria-label="Về ba phương án"
          onClick={() => selectDesign(undefined)}
        >
          <ArrowLeft size={15} />
          <span>3 phương án</span>
        </button>
        <div className="studio-designs" aria-label="Chuyển phương án">
          {designs.map((d) => (
            <button
              key={d.id}
              className={d.id === design ? 'selected' : ''}
              aria-pressed={d.id === design}
              onClick={() => selectDesign(d.id)}
            >
              <span>{d.letter}</span>
              {d.name}
            </button>
          ))}
        </div>
        <span className="prototype-label">{productCopy.toolbar}</span>
        <div className="studio-actions">
          <button
            className="studio-surface-switch"
            onClick={() => navigate(screen === 'landing' ? 'overview' : 'landing')}
          >
            {screen === 'landing' ? landingCopy.workspace : landingCopy.landing}
          </button>
          <button aria-label="Tùy chỉnh" onClick={() => setDialog('theme')}>
            <SlidersHorizontal size={15} />
            <span>Tùy chỉnh</span>
          </button>
          <button
            aria-label="Góp ý"
            onClick={() => {
              setFeedback(data.feedback[design] ?? { scores: {}, note: '', preferred: false });
              setDialog('feedback');
            }}
          >
            <MessageSquare size={15} />
            <span>Góp ý</span>
          </button>
          <button
            title={productCopy.reset}
            aria-label={productCopy.reset}
            onClick={() => setDialog('reset')}
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
      {dialog === 'theme' && (
        <Modal title={`Tùy chỉnh theme ${current.name}`} onClose={() => setDialog(null)}>
          <p className="subtle">
            Thay đổi trực tiếp trên cả năm màn hình. Bố cục của phương án được giữ nguyên.
          </p>
          <div className="theme-editor">
            <ColorField
              label="Màu chủ đạo"
              value={tokens.accent}
              onChange={(value) => update('accent', value)}
              swatches={designs.map((d) => ({ value: d.tokens.accent, label: d.name }))}
            />
            <ColorField
              label="Nền ứng dụng"
              value={tokens.canvas}
              onChange={(value) => update('canvas', value)}
              swatches={designs.map((d) => ({ value: d.tokens.canvas, label: d.name }))}
            />
            <label>
              Mật độ nội dung
              <SelectField
                label="Mật độ nội dung"
                value={tokens.density}
                onValueChange={(value) => update('density', value)}
                options={[
                  { value: '9px', label: 'Cô đọng' },
                  { value: '12px', label: 'Cân bằng' },
                  { value: '16px', label: 'Thoáng' },
                ]}
              />
            </label>
            <label>
              Bo góc
              <SelectField
                label="Bo góc"
                value={tokens.radius}
                onValueChange={(value) => update('radius', value)}
                options={[
                  { value: '4px', label: 'Nhẹ · 4px' },
                  { value: '9px', label: 'Vừa · 9px' },
                  { value: '16px', label: 'Mềm · 16px' },
                ]}
              />
            </label>
            <label>
              Chữ tiêu đề
              <SelectField
                label="Chữ tiêu đề"
                value={tokens.headingFont}
                onValueChange={(value) => update('headingFont', value)}
                options={[
                  { value: '\"Be Vietnam Pro\", sans-serif', label: 'Be Vietnam Pro' },
                  { value: '\"Lora\", serif', label: 'Lora' },
                ]}
              />
            </label>
          </div>
          <Callout>
            Màu tùy chỉnh cần kiểm tra lại độ tương phản trước khi chốt. Các theme mặc định là điểm
            xuất phát để so sánh.
          </Callout>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => onOverrides({ ...overrides, [design]: {} })}>
              Về theme mặc định
            </Button>
            <Button icon={Check} onClick={() => setDialog(null)}>
              Xem giao diện
            </Button>
          </div>
        </Modal>
      )}
      {dialog === 'feedback' && (
        <Modal title={`Góp ý phương án ${current.name}`} onClose={() => setDialog(null)}>
          <p className="subtle">
            Đánh giá từ 1 (chưa phù hợp) đến 5 (rất phù hợp). Phản hồi chỉ lưu trên trình duyệt của
            bạn.
          </p>
          <div className="rating-list">
            {feedbackCriteria.map((c) => (
              <div key={c}>
                <span>{c}</span>
                <div role="group" aria-label={c}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      aria-label={`${c}: ${n} điểm`}
                      aria-pressed={feedback.scores[c] === n}
                      className={feedback.scores[c] === n ? 'active' : ''}
                      onClick={() =>
                        setFeedback((f) => ({ ...f, scores: { ...f.scores, [c]: n } }))
                      }
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <label className="field-label">
            Điều bạn muốn giữ hoặc thay đổi
            <textarea
              value={feedback.note}
              onChange={(e) => setFeedback((f) => ({ ...f, note: e.target.value }))}
              placeholder="Ví dụ: giữ cách đối chiếu của Control, dùng màu của Harbor…"
              rows={3}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={feedback.preferred}
              onChange={(e) => setFeedback((f) => ({ ...f, preferred: e.target.checked }))}
            />
            <Star size={16} />
            Đánh dấu là một hướng yêu thích
          </label>
          <div className="modal-actions">
            <Button
              variant="secondary"
              icon={Download}
              onClick={() =>
                downloadText(
                  'precheck-phan-hoi-ui.json',
                  JSON.stringify({ ...data.feedback, [design]: feedback }, null, 2),
                  'application/json',
                )
              }
            >
              Tải phản hồi
            </Button>
            <Button
              icon={Check}
              onClick={() => {
                saveFeedback(design, feedback);
                setDialog(null);
              }}
            >
              Lưu góp ý
            </Button>
          </div>
        </Modal>
      )}
      {dialog === 'reset' && (
        <Modal title={productCopy.resetTitle} onClose={() => setDialog(null)}>
          <p>
            Các chỉnh sửa nháp, ghi chú, tên file thêm vào và phản hồi trên trình duyệt này sẽ được
            đưa về trạng thái ban đầu. Cấu hình theme giữ nguyên.
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Giữ phiên hiện tại
            </Button>
            <Button
              onClick={() => {
                reset();
                setDialog(null);
              }}
            >
              {productCopy.reset}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
