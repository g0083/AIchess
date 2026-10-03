/**
 * Meta page: statistics, achievements and the game archive.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon, ICONS, Segmented } from '../../components/ui';
import { useProgress, solvedToday } from '../../store/progress';
import { useArchive } from '../../store/archive';
import { ACHIEVEMENTS } from '../../content/achievements';
import { useSettings, playerName } from '../../store/settings';

type Tab = 'stats' | 'awards' | 'archive';

export function MetaPage(): React.JSX.Element {
  const loc = useLocation();
  const initialTab = (loc.state as { tab?: Tab })?.tab ?? 'stats';
  const [tab, setTab] = useState<Tab>(initialTab);
  const name = useSettings((s) => s.displayName);
  const me = playerName(name);
  const progress = useProgress();
  const games = useArchive((a) => a.games);
  const hydrateProgress = useProgress((p) => p.hydrate);
  const hydrateArchive = useArchive((a) => a.hydrate);

  useEffect(() => {
    void hydrateProgress();
    void hydrateArchive();
  }, [hydrateProgress, hydrateArchive]);

  let wins = 0;
  let losses = 0;
  let draws = 0;
  for (const g of games) {
    if (g.result === '1/2-1/2') {
      draws++;
    } else if (g.won !== undefined) {
      if (g.won) wins++;
      else losses++;
    } else if (g.mode === 'p2p') {
      const isWhite = g.white === me;
      const isBlack = g.black === me;
      if (isWhite) {
        if (g.result === '1-0') wins++;
        else if (g.result === '0-1') losses++;
      } else if (isBlack) {
        if (g.result === '0-1') wins++;
        else if (g.result === '1-0') losses++;
      }
    }
  }

  return (
    <div className="page page--narrow">
      <div className="page__head">
        <h1 className="page__title">実績</h1>
        <p className="page__lede">記録、称号、そして保存された棋譜です。</p>
      </div>

      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <Segmented
          value={tab}
          onChange={setTab}
          label="表示切り替え"
          options={[
            { value: 'stats', label: '記録' },
            { value: 'awards', label: '称号' },
            { value: 'archive', label: '棋譜' },
          ]}
        />
      </div>

      {tab === 'stats' ? (
        <section className="card card--pad">
          <h2 className="card__title">記録</h2>
          <div className="kv">
            <span className="kv__k">AIラダー評価</span>
            <span className="num">{progress.aiRating}</span>
          </div>
          <div className="kv">
            <span className="kv__k">パズル評価</span>
            <span className="num">{progress.puzzleRating}</span>
          </div>
          <div className="kv">
            <span className="kv__k">連続学習日数</span>
            <span className="num">{progress.streak}</span>
          </div>
          <div className="kv">
            <span className="kv__k">今日の解答数</span>
            <span className="num">{solvedToday(progress)}</span>
          </div>
          <div className="kv">
            <span className="kv__k">勝 / 分 / 敗</span>
            <span className="num">
              {wins} / {draws} / {losses}
            </span>
          </div>
          <div className="kv">
            <span className="kv__k">保存棋譜</span>
            <span className="num">{games.length}</span>
          </div>
        </section>
      ) : null}

      {tab === 'awards' ? (
        <ul className="list">
          {ACHIEVEMENTS.map((a) => {
            const got = progress.achievements.includes(a.id);
            return (
              <li key={a.id} className={`card card--pad${got ? '' : ' class-card--locked'}`}>
                <div className="class-card__head">
                  <span className="class-card__title">
                    <Icon path={got ? ICONS.trophy : ICONS.info} size={15} /> {a.name}
                  </span>
                  <span className={`badge ${got ? 'badge--brass' : ''}`}>
                    {got ? '獲得' : '未獲得'}
                  </span>
                </div>
                <p className="class-card__goal">{a.description}</p>
                {!got ? <p className="dim">{a.hint}</p> : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {tab === 'archive' ? <ArchiveList /> : null}
    </div>
  );
}
function ArchiveList(): React.JSX.Element {
  const games = useArchive((a) => a.games);
  const toggleFavourite = useArchive((a) => a.toggleFavourite);
  const remove = useArchive((a) => a.remove);
  const [q, setQ] = useState('');

  const list = useMemo(
    () =>
      games.filter(
        (g) => !q || g.white.includes(q) || g.black.includes(q) || g.moves.some((m) => m.includes(q)),
      ),
    [games, q],
  );

  if (games.length === 0) {
    return (
      <div className="card card--pad">
        <p>まだ棋譜がありません。対戦をはじめましょう。</p>
        <Link className="btn btn--primary" to="/play">
          対戦をはじめる
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="row-inline" style={{ marginBottom: 'var(--sp-3)' }}>
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="棋譜を検索（相手の名前や指し手）"
          aria-label="棋譜を検索"
        />
      </div>
      <ul className="list">
        {list.map((g) => (
          <li key={g.id} className="card card--pad">
            <div className="class-card__head">
              <span className="class-card__title">
                {g.white} — {g.black}
              </span>
              <span className="badge badge--brass num">{g.result}</span>
            </div>
            <p className="dim mono" style={{ fontSize: '0.8rem' }}>
              {g.moves.slice(0, 18).join(' ')}
              {g.moves.length > 18 ? ' …' : ''}
            </p>
            <div className="board-tools">
              <button className="btn btn--sm" onClick={() => toggleFavourite(g.id)}>
                {g.favourite ? '★' : '☆'}
              </button>
              <button
                className="btn btn--sm"
                onClick={() => {
                  void navigator.clipboard?.writeText(g.pgn);
                }}
              >
                <Icon path={ICONS.copy} size={15} />
                PGNをコピー
              </button>
              <button className="btn btn--sm btn--danger" onClick={() => remove(g.id)}>
                <Icon path={ICONS.trash} size={15} />
                削除
              </button>
            </div>
          </li>
        ))}
        {list.length === 0 ? <li className="empty">該当なし</li> : null}
      </ul>
    </div>
  );
}