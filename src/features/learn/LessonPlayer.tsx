/**
 * The lesson player: prose, a board task the learner must perform, and a quiz.
 * Text is Japanese; identifiers are ASCII.
 */
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Board } from '../../components/Board';
import { Icon, ICONS } from '../../components/ui';
import type { Lesson } from '../../content/lessons';
import { useProgress } from '../../store/progress';
import type { Color } from '../../chess/rules';

type Phase = 'read' | 'task' | 'quiz' | 'done';

export function LessonPlayer({ lesson }: { lesson: Lesson }): React.JSX.Element {
  const nav = useNavigate();
  const markLesson = useProgress((s) => s.markLesson);
  const [phase, setPhase] = useState<Phase>('read');
  const [page, setPage] = useState(0);
  const [orientation, setOrientation] = useState<Color>('w');

  const task = lesson.task;
  const quiz = lesson.quiz ?? [];
  const [taskFen, setTaskFen] = useState(task?.fen ?? '');
  const [taskDone, setTaskDone] = useState(false);
  const [taskWrong, setTaskWrong] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const [qPicked, setQPicked] = useState<number | null>(null);

  const turn = useMemo(() => {
    try {
      return new Chess(taskFen).turn();
    } catch {
      return 'w';
    }
  }, [taskFen]);

  // Legal destinations, only while the task is active.
  const dests = useMemo(() => {
    if (phase !== 'task' || taskDone) return {};
    try {
      const c = new Chess(taskFen);
      const out: Record<string, string[]> = {};
      for (const m of c.moves({ verbose: true })) (out[m.from] ??= []).push(m.to);
      return out;
    } catch {
      return {};
    }
  }, [taskFen, phase, taskDone]);

  const step = lesson.steps[page];
  const question = quiz[qIndex];

  function complete() {
    markLesson(lesson.id);
    setPhase('done');
  }

  return (
    <div className="page page--narrow">
      <div className="page__head">
        <Link className="btn btn--sm btn--ghost" to="/learn">
          <Icon path={ICONS.back} size={15} />
          学習モードへ戻る
        </Link>
        <h1 className="page__title" style={{ marginTop: 'var(--sp-2)' }}>
          {lesson.title}
        </h1>
        <p className="page__lede">
          {lesson.summary}　/　所要 {lesson.minutes} 分
        </p>
      </div>

      {phase === 'read' && step ? (
        <section className="card card--pad">
          <h2 className="card__title">{step.heading}</h2>
          {step.lines?.length ? (
            <ul className="prose" style={{ paddingLeft: '1.2em', margin: 0 }}>
              {step.lines.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          ) : null}
          <div className="board-tools">
            <button
              className="btn btn--sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              前へ
            </button>
            <span className="board-tools__pos num">
              {page + 1} / {lesson.steps.length}
            </span>
            {page < lesson.steps.length - 1 ? (
              <button className="btn btn--sm" onClick={() => setPage((p) => p + 1)}>
                次へ
              </button>
            ) : (
              <button
                className="btn btn--sm btn--primary"
                onClick={() => setPhase(task ? 'task' : 'quiz')}
              >
                {task ? '練習へ' : '確認問題へ'}
              </button>
            )}
          </div>
        </section>
      ) : null}

      {phase === 'task' && task ? (
        <section>
          <div className="card card--pad" style={{ marginBottom: 'var(--sp-3)' }}>
            <h2 className="card__title">練習</h2>
            <p>{task.prompt}</p>
            {taskWrong ? <p className="scanner__error">もう一度考えてみましょう。</p> : null}
            {taskDone ? (
              <div className="ok-text">
                <p>{task.explain}</p>
                <button
                  className="btn btn--primary"
                  onClick={() => (quiz.length > 0 ? setPhase('quiz') : complete())}
                >
                  {quiz.length > 0 ? '確認問題へ' : '完了する'}
                </button>
              </div>
            ) : null}
          </div>
          <div className="board-col" style={{ justifyContent: 'center' }}>
            <Board
              fen={taskFen}
              turn={taskDone ? null : turn}
              orientation={orientation}
              dests={dests}
              viewOnly={taskDone}
              onMove={(from, to) => {
                const c = new Chess(taskFen);
                const legal = c.moves({ verbose: true }).find((m) => m.from === from && m.to === to);
                if (!legal) return;
                const mv = c.move({ from, to, promotion: legal.promotion });
                if (!mv) return;
                if (task.accept.includes(mv.san)) {
                  setTaskFen(c.fen());
                  setTaskDone(true);
                } else {
                  // Show the attempt briefly, then snap back.
                  const base = task.fen;
                  setTaskFen(c.fen());
                  setTaskWrong(true);
                  setTimeout(() => {
                    setTaskFen(base);
                    setTaskWrong(false);
                  }, 450);
                }
              }}
            />
          </div>
          <div className="board-tools">
            <button
              className="btn btn--sm"
              onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
            >
              <Icon path={ICONS.flip} size={15} />
              反転
            </button>
            <button
              className="btn btn--sm"
              onClick={() => {
                setTaskFen(task.fen);
                setTaskWrong(false);
              }}
            >
              <Icon path={ICONS.refresh} size={15} />
              やり直す
            </button>
          </div>
        </section>
      ) : null}

      {phase === 'quiz' && question ? (
        <section className="card card--pad">
          <h2 className="card__title">確認問題</h2>
          <p>{question.question}</p>
          <ul className="list" style={{ marginTop: 'var(--sp-3)' }}>
            {question.choices.map((c, i) => {
              const picked = qPicked === i;
              const right = i === question.answer;
              return (
                <li key={i}>
                  <button
                    className="btn btn--block"
                    onClick={() => setQPicked(i)}
                    disabled={qPicked !== null}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    {c}
                  </button>
                  {qPicked !== null && (picked || right) ? (
                    <p
                      className={right ? 'ok-text' : 'scanner__error'}
                      style={{ marginTop: 4, marginBottom: 0 }}
                    >
                      {question.explain}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <div className="board-tools">
            {qPicked === null ? null : qIndex < quiz.length - 1 ? (
              <button
                className="btn btn--primary btn--sm"
                onClick={() => {
                  setQIndex((i) => i + 1);
                  setQPicked(null);
                }}
              >
                次の問題
              </button>
            ) : (
              <button className="btn btn--primary btn--sm" onClick={complete}>
                完了する
              </button>
            )}
          </div>
        </section>
      ) : null}

      {phase === 'done' ? (
        <section className="card card--pad">
          <h2 className="card__title">おめでとう</h2>
          <p>このレッスンを完了しました。</p>
          <div className="board-tools">
            <button className="btn btn--primary" onClick={() => nav('/learn')}>
              クラス一覧へ
            </button>
            <button className="btn" onClick={() => nav('/learn/puzzles')}>
              パズルを解く
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
