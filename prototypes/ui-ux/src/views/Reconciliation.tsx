import { useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  FileText,
  MessageSquare,
  Send,
} from 'lucide-react';
import { comparisonStatuses, type Comparison } from '../domain/comparison';
import { copy, productCopy } from '../lib/copy';
import { SelectField } from '../components/SelectField';
import { useStudio } from '../state/StudioContext';
import { Badge, Button, Callout, Panel, SectionTitle } from '../components/ui';
import { SourceDocument } from '../components/SourceDocument';

export function Reconciliation() {
  const { design, data, navigate, comparisons } = useStudio();
  const [selectedId, setSelectedId] = useState(comparisons[0]?.id);
  const [filter, setFilter] = useState<string>('all');
  const visible = comparisons.filter((issue) => filter === 'all' || issue.status === filter);
  const selected = visible.find((i) => i.id === selectedId) ?? visible[0];
  const issueList = (
    <div className="issue-list">
      {visible.map((i) => (
        <button
          key={i.id}
          className={`issue-list-item ${selected?.id === i.id ? 'active' : ''}`}
          aria-pressed={selected?.id === i.id}
          onClick={() => setSelectedId(i.id)}
        >
          <span
            className={`issue-icon ${data.decisions[i.id]?.status === 'confirmed' ? 'matched' : i.kind}`}
          >
            {i.kind === 'matched' || data.decisions[i.id]?.status === 'confirmed' ? (
              <Check size={16} />
            ) : (
              <CircleAlert size={16} />
            )}
          </span>
          <span>
            <small>{i.field}</small>
            <strong>{i.title}</strong>
          </span>
          <ChevronRight size={14} />
        </button>
      ))}
    </div>
  );
  return (
    <>
      <div className="reconcile-filter">
        <SelectField
          label="Lọc kết quả đối chiếu"
          value={filter}
          onValueChange={setFilter}
          options={[
            { value: 'all', label: copy.all },
            ...comparisonStatuses.map((status) => ({
              value: status,
              label: `${copy.statuses[status]} (${comparisons.filter((issue) => issue.status === status).length})`,
            })),
          ]}
        />
        <Button variant="secondary" icon={ArrowRight} onClick={() => navigate('consolidation')}>
          Mở dữ liệu tổng hợp
        </Button>
      </div>
      {!selected ? (
        <Panel>
          <div className="empty-state">
            <CheckCheck size={30} />
            <strong>Không có kết quả trong bộ lọc này</strong>
            <Button variant="secondary" onClick={() => setFilter('all')}>
              Xem tất cả kết quả
            </Button>
          </div>
        </Panel>
      ) : (
        <div className={`reconcile-layout reconcile-${design}`}>
          {design === 'control' ? (
            <>
              <Panel className="issue-navigation">
                <SectionTitle title="Vấn đề" />
                {issueList}
              </Panel>
              <SourceDocument kind={selected.document} highlight={selected.id} />
              <Panel className="issue-detail-panel">
                <IssueDetail key={selected.id} issue={selected} />
              </Panel>
            </>
          ) : design === 'ledger' ? (
            <>
              <Panel className="ledger-reconcile-table">
                <SectionTitle title="Bảng kiểm tra dữ liệu" />
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Trường dữ liệu</th>
                        <th>Nguồn thứ nhất</th>
                        <th>Nguồn đối chiếu</th>
                        <th>Kết quả</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((i) => (
                        <tr key={i.id} className={selected.id === i.id ? 'selected-row' : ''}>
                          <td>
                            <button className="text-button" onClick={() => setSelectedId(i.id)}>
                              {i.field}
                              <ArrowRight size={13} />
                            </button>
                          </td>
                          <td>{i.values[0]}</td>
                          <td>{i.values[1]}</td>
                          <td>
                            <Badge
                              tone={
                                i.kind === 'matched' || data.decisions[i.id]?.status === 'confirmed'
                                  ? 'success'
                                  : i.kind === 'error'
                                    ? 'error'
                                    : 'warning'
                              }
                            >
                              {copy.statuses[i.status]}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
              <div className="ledger-reconcile-bottom">
                <SourceDocument kind={selected.document} highlight={selected.id} />
                <Panel>
                  <IssueDetail key={selected.id} issue={selected} />
                </Panel>
              </div>
            </>
          ) : (
            <>
              <Panel className="reconcile-workbench">
                <div className="issue-navigation">
                  <SectionTitle title="Các điểm cần chú ý" />
                  {issueList}
                </div>
                <IssueDetail key={selected.id} issue={selected} />
              </Panel>
              <SourceDocument kind={selected.document} highlight={selected.id} />
            </>
          )}
        </div>
      )}
    </>
  );
}
function IssueDetail({ issue }: { issue: Comparison }) {
  const { data, decide } = useStudio();
  const prior = data.decisions[issue.id];
  const [note, setNote] = useState(prior?.note ?? '');
  const confirmed = prior?.status === 'confirmed';
  const matched = issue.status === 'MATCH' || issue.status === 'NOT_COMPARABLE';
  return (
    <div className="issue-detail">
      <div className="detail-eyebrow">
        <span className="issue-field">{issue.field}</span>
        <Badge
          tone={matched || confirmed ? 'success' : issue.kind === 'error' ? 'error' : 'warning'}
        >
          {copy.statuses[issue.status]}
        </Badge>
      </div>
      <h2>{issue.title}</h2>
      <div className="value-comparison">
        {issue.values.map((v, index) => (
          <div key={index}>
            <small>
              <FileText size={12} />
              {issue.labels[index]}
            </small>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <p className="issue-explanation">{issue.explanation}</p>
      <p className="subtle">{copy.meaning}</p>
      {matched ? (
        <Callout tone="success">
          {issue.status === 'NOT_COMPARABLE' ? copy.notComparableNote : issue.explanation}
        </Callout>
      ) : (
        <>
          <div className="issue-next">
            <p>{issue.action}. Giữ nguyên dữ liệu trên chứng từ cho đến khi có căn cứ.</p>
          </div>
          <label className="field-label">
            <MessageSquare size={14} />
            Ghi chú xác minh
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi rõ nguồn xác nhận, người kiểm tra và nội dung cần bổ sung…"
            />
          </label>
          {prior && (
            <div className="saved-note">
              <Check size={14} />
              {confirmed ? productCopy.confirmed : 'Yêu cầu đã lưu — vấn đề vẫn mở'}
            </div>
          )}
          <Button
            icon={issue.kind === 'error' ? Send : Check}
            disabled={!note.trim()}
            onClick={() =>
              decide(issue.id, {
                note,
                status: issue.status === 'NEEDS_REVIEW' ? 'confirmed' : 'requested',
              })
            }
          >
            {issue.status !== 'NEEDS_REVIEW' ? 'Lưu yêu cầu xác minh' : productCopy.confirm}
          </Button>
          {issue.kind === 'error' && (
            <p className="subtle">
              Ghi chú không tự đóng lỗi nguồn. Cần chứng từ điều chỉnh hoặc xác nhận hợp lệ.
            </p>
          )}
        </>
      )}
    </div>
  );
}
