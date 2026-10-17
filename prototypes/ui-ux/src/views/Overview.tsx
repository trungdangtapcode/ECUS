import { useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { cases, type CaseRecord } from '../data/cases';
import { useStudio } from '../state/StudioContext';
import { Button } from '../components/ui';
import { ShipmentCover } from '../components/ShipmentCover';
import { productCopy } from '../lib/copy';
import { comparisonsFor, requiresReview } from '../domain/comparison';

function CaseStatus({ record }: { record: CaseRecord }) {
  const { data } = useStudio();
  const tone = data.approvals[record.id]
    ? 'complete'
    : record.type === 'B11'
      ? 'reference'
      : 'review';
  return (
    <span className="register-status" data-tone={tone}>
      {tone === 'complete'
        ? productCopy.completed
        : tone === 'reference'
          ? 'Tham chiếu lịch sử'
          : 'Cần rà soát'}
    </span>
  );
}

export function Overview() {
  const { design, record, selectCase, navigate, data } = useStudio();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const filtered = cases.filter(
    (c) =>
      `${c.customer} ${c.code} ${c.invoice} ${c.bill}`
        .toLocaleLowerCase('vi')
        .includes(query.toLocaleLowerCase('vi')) &&
      (filter === 'all' || (filter === 'import' ? c.type !== 'B11' : c.type === 'B11')),
  );
  const approved = cases.filter((c) => data.approvals[c.id]).length;
  const pendingIssues = (c: CaseRecord) =>
    comparisonsFor(c).filter(
      (i) => requiresReview(i) && data.decisions[i.id]?.status !== 'confirmed',
    );
  const openIssues = cases.reduce((total, c) => total + pendingIssues(c).length, 0);
  const stats = [
    { label: 'Hồ sơ đang theo dõi', value: cases.length },
    { label: 'Vấn đề cần xử lý', value: openIssues },
    { label: 'Chứng từ tham chiếu', value: cases.reduce((n, c) => n + c.documents.length, 0) },
    { label: productCopy.completed, value: approved },
  ];
  const priority = cases.filter((c) => c.type !== 'B11' && pendingIssues(c).length > 0);

  return (
    <div className="overview-register">
      <ShipmentCover />
      <dl className="register-totals">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div className="register-body">
        <section className="case-register" aria-labelledby="case-register-heading">
          <header className="register-heading">
            <h2 id="case-register-heading">
              Hồ sơ của bạn <span>{cases.length}</span>
            </h2>
            <button className="register-link" onClick={() => navigate('documents')}>
              Bộ chứng từ <ArrowRight size={15} />
            </button>
          </header>
          <div className="register-tools">
            <div className="register-filters" role="group" aria-label="Lọc hồ sơ">
              {[
                { id: 'all', text: 'Tất cả' },
                { id: 'import', text: 'Nhập khẩu' },
                { id: 'export', text: 'Xuất khẩu' },
              ].map((f) => (
                <button key={f.id} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                  {f.text}
                </button>
              ))}
            </div>
            <label className="register-search">
              <Search size={16} />
              <input
                aria-label="Tìm hồ sơ"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm hồ sơ, invoice, B/L…"
              />
            </label>
          </div>
          <div className="register-scroll">
            <table className="case-table register-table">
              <thead>
                <tr>
                  <th scope="col">Hồ sơ / doanh nghiệp</th>
                  <th scope="col">Loại hình</th>
                  <th scope="col">Lô hàng</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} data-current={c.id === record.id}>
                    <td>
                      <button
                        className="register-case-name"
                        onClick={() => selectCase(c.id, 'documents')}
                      >
                        <strong>{c.customer}</strong>
                        <span>{c.code}</span>
                      </button>
                    </td>
                    <td className="register-procedure">{c.type}</td>
                    <td>
                      <span className="register-goods">{c.goods}</span>
                      <small>{c.route.join(' → ')}</small>
                    </td>
                    <td>
                      <CaseStatus record={c} />
                    </td>
                    <td>
                      <button
                        className="register-open"
                        aria-label={`Mở hồ sơ ${c.customer}`}
                        onClick={() => selectCase(c.id, 'reconcile')}
                      >
                        <ArrowRight size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <div className="empty-state">
                <strong>Không có hồ sơ phù hợp</strong>
                <p>{productCopy.searchHint}</p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery('');
                    setFilter('all');
                  }}
                >
                  Xóa bộ lọc
                </Button>
              </div>
            )}
          </div>
          <footer className="register-footer">
            <span>
              {filtered.length} / {cases.length} {productCopy.records}
            </span>
            <span>{productCopy.recordRegister}</span>
          </footer>
        </section>
        {design !== 'ledger' && (
          <aside className="review-agenda" aria-labelledby="review-agenda-heading">
            <header className="register-heading">
              <h2 id="review-agenda-heading">Cần bạn kiểm tra</h2>
            </header>
            <ol>
              {priority.map((c, index) => (
                <li key={c.id}>
                  <button onClick={() => selectCase(c.id, 'reconcile')}>
                    <span className="agenda-index">{String(index + 1).padStart(2, '0')}</span>
                    <span className="agenda-copy">
                      <small>{c.customer}</small>
                      <strong>{pendingIssues(c)[0].title}</strong>
                      <span>
                        {pendingIssues(c).length} vấn đề đang mở <ArrowRight size={13} />
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            {!priority.length && <p className="agenda-clear">{productCopy.completed}</p>}
            <p className="agenda-note">
              Cảnh báo trong ứng dụng là kết quả kiểm tra nội bộ, không phải luồng hải quan.
            </p>
          </aside>
        )}
      </div>
    </div>
  );
}
