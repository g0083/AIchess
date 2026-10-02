/**
 * Learn mode home: the nine classes, the puzzle trainer and the glossary.
 */
import { useMemo, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { Icon, ICONS, Segmented } from '../../components/ui';
import { CLASSES, LESSONS } from '../../content/lessons';
import { GLOSSARY, GLOSSARY_CATEGORIES, type GlossCategory } from '../../content/glossary';
import { PUZZLES } from '../../content/puzzles';
import { useProgress, dueCards } from '../../store/progress';
import { PuzzBoard } from './PuzzBoard';
import { LessonPlayer } from './LessonPlayer';

export function LearnHomePage(): React.JSX.Element {
  return (
    <Routes>
      <Route index element={<LearnIndex />} />
      <Route path="lesson/:id" element={<LessonRoute />} />
      <Route path="puzzles" element={<PuzzlesRoute />} />
      <Route path="daily" element={<PuzzlesRoute daily />} />
      <Route path="glossary" element={<GlossaryPage />} />
      <Route path="openings" element={<OpeningsPage />} />
    </Routes>
  );
}

function LearnIndex(): React.JSX.Element {
  const progress = useProgress();
  const [tab, setTab] = useState<'classes' | 'train'>('classes');
  const done = Object.values(progress.lessons).filter(Boolean).length;

  return (
    <div className="page page--narrow">
      <div className="page__head">
        <h1 className="page__title">学習モード</h1>
        <p className="page__lede">初心者から上級者まで9段階で、順に学べます。</p>
      </div>

      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <Segmented
          value={tab}
          onChange={setTab}
          label="表示切り替え"
          options={[
            { value: 'classes', label: 'クラス' },
            { value: 'train', label: '練習' },
          ]}
        />
      </div>

      {tab === 'classes' ? (
        <>
          <p className="dim" style={{ marginBottom: 'var(--sp-3)' }}>
            完了したレッスン: {done} / {LESSONS.length}
          </p>
          <ul className="list">
            {CLASSES.map((c) => {
              const locked = c.level > progress.unlockedClass;
              const lessons = LESSONS.filter((l) => l.classLevel === c.level);
              return (
                <li key={c.level} className={`class-card${locked ? ' class-card--locked' : ''}`}>
                  <div className="class-card__head">
                    <span className="class-card__title">{c.title}</span>
                    <span className="class-card__sub">{c.subtitle}</span>
                    {locked ? <span className="badge">未解放</span> : null}
                  </div>
                  <p className="class-card__goal">{c.goal}</p>
                  {locked ? null : (
                    <div className="board-tools board-tools--wrap">
                      {lessons.map((l) => (
                        <Link key={l.id} className="btn btn--sm" to={`/learn/lesson/${l.id}`}>
                          {l.title}
                          {progress.lessons[l.id] ? <Icon path={ICONS.check} size={13} /> : null}
                        </Link>
                      ))}
                      {lessons.length === 0 ? (
                        <span className="dim">このクラスのレッスンは準備中です。</span>
                      ) : null}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <ul className="list">
          <TrainCard
            to="/learn/puzzles"
            icon={ICONS.puzzle}
            title="戦術パズル"
            desc={`${PUZZLES.length}問。間隔反復で定着させます。`}
          />
          <TrainCard
            to="/learn/daily"
            icon={ICONS.cloud}
            title="今日の課題"
            desc="日付で決まる問題セットです。"
          />
          <TrainCard
            to="/learn/openings"
            icon={ICONS.info}
            title="定石トレーナー"
            desc="手順を穴あけして覺えていきます。"
          />
          <TrainCard
            to="/learn/glossary"
            icon={ICONS.info}
            title="用語集"
            desc="戦術用語をゼロから。レッスンと同じ言葉を使います。"
          />
        </ul>
      )}
    </div>
  );
}

function TrainCard({
  to,
  icon,
  title,
  desc,
}: {
  to: string;
  icon: string;
  title: string;
  desc: string;
}): React.JSX.Element {
  return (
    <li>
      <Link className="quick-card" to={to}>
        <span className="quick-card__icon">
          <Icon path={icon} size={22} />
        </span>
        <span className="quick-card__body">
          <span className="quick-card__title">{title}</span>
          <span className="quick-card__desc">{desc}</span>
        </span>
      </Link>
    </li>
  );
}

function LessonRoute(): React.JSX.Element {
  const { id } = useParams();
  const lesson = LESSONS.find((l) => l.id === id);
  if (!lesson) return <NotFound />;
  return <LessonPlayer lesson={lesson} />;
}

function NotFound(): React.JSX.Element {
  return (
    <div className="page page--narrow">
      <p>レッスンが見つかりません。</p>
      <Link className="btn" to="/learn">
        学習モードへ戻る
      </Link>
    </div>
  );
}

function PuzzlesRoute({ daily = false }: { daily?: boolean }): React.JSX.Element {
  const cards = useProgress((s) => s.cards);
  const rating = useProgress((s) => s.puzzleRating);
  const due = useMemo(() => dueCards(cards).length, [cards]);

  // The daily set is chosen from the date so every player gets the same one.
  const list = useMemo(() => {
    if (!daily || PUZZLES.length === 0) return PUZZLES;
    const seed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
    return [...PUZZLES].sort(
      (a, b) => (a.id.charCodeAt(2) + seed) % 7 - (b.id.charCodeAt(2) + seed) % 7,
    );
  }, [daily]);

  return (
    <div className="page page--narrow">
      <div className="page__head">
        <h1 className="page__title">{daily ? '今日の課題' : '戦術パズル'}</h1>
        <p className="page__lede">
          評価 {rating}　/　復習差不多的なものは {due} 問
        </p>
      </div>
      {list.length === 0 ? (
        <div className="card card--pad">
          <p>この種の問題は準備中です。他の練習をお試しください。</p>
          <Link className="btn btn--primary" to="/learn">
            クラスへ戻る
          </Link>
        </div>
      ) : (
        <PuzzBoard puzzles={list} daily={daily} />
      )}
    </div>
  );
}

function GlossaryPage(): React.JSX.Element {
  const [cat, setCat] = useState<GlossCategory | 'all'>('all');
  const [q, setQ] = useState('');
  const nav = useNavigate();

  const list = useMemo(
    () =>
      GLOSSARY.filter(
        (g) =>
          (cat === 'all' || g.category === cat) &&
          (!q ||
            g.term.includes(q) ||
            g.short.includes(q) ||
            g.en.toLowerCase().includes(q.toLowerCase())),
      ),
    [cat, q],
  );

  return (
    <div className="page page--narrow">
      <div className="page__head">
        <h1 className="page__title">用語集</h1>
        <p className="page__lede">レッスンとパズルの説明で使う言葉を、1か所にまとめています。</p>
      </div>

      <div className="row-inline" style={{ marginBottom: 'var(--sp-3)' }}>
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="検索"
          aria-label="用語を検索"
        />
      </div>

      <div style={{ marginBottom: 'var(--sp-3)' }}>
        <Segmented
          value={cat}
          onChange={setCat}
          label="分類"
          options={[
            { value: 'all' as const, label: 'すべて' },
            ...GLOSSARY_CATEGORIES.map((c) => ({ value: c, label: c })),
          ]}
        />
      </div>

      <ul className="list">
        {list.map((g) => (
          <li key={g.term} className="card card--pad">
            <div className="class-card__head">
              <span className="class-card__title">{g.term}</span>
              <span className="badge">{g.category}</span>
            </div>
            <p className="dim mono" style={{ fontSize: '0.75rem', margin: '2px 0 6px' }}>
              {g.en}
            </p>
            <p style={{ marginBottom: 'var(--sp-2)' }}>{g.short}</p>
            <ul className="prose" style={{ paddingLeft: '1.2em', margin: 0 }}>
              {g.points.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
            {g.example ? (
              <div className="board-tools">
                <button
                  className="btn btn--sm"
                  onClick={() => nav(`/play/analysis?fen=${encodeURIComponent(g.example!.fen)}`)}
                >
                  この局面を検討する
                </button>
                <span className="badge badge--brass">{g.example.solution}</span>
              </div>
            ) : null}
          </li>
        ))}
        {list.length === 0 ? <li className="empty">該当なし</li> : null}
      </ul>
    </div>
  );
}

function OpeningsPage(): React.JSX.Element {
  return (
    <div className="page page--narrow">
      <div className="page__head">
        <h1 className="page__title">定石トレーナー</h1>
        <p className="page__lede">自分の定石を2〜3本に絞って覚えるのがコツです。</p>
      </div>
      <div className="card card--pad">
        <p>定石の内容は準備中です。理屈ではなく指し手として覚えるのがコツです。</p>
        <Link className="btn btn--primary" to="/learn">
          クラスへ戻る
        </Link>
      </div>
    </div>
  );
}

