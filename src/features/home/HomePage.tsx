import { Link } from 'react-router-dom';
import { useSettings, playerName, initialOf } from '../../store/settings';
import { Icon, ICONS } from '../../components/ui';
import { InstallCard } from '../../components/InstallCard';
import { useProgress, solvedToday, dailyDone as isDailyDone } from '../../store/progress';

export function HomePage(): React.JSX.Element {
  const name = useSettings((s) => s.displayName);
  const progress = useProgress();
  const streak = progress.streak;
  const puzzleRating = progress.puzzleRating;
  const aiRating = progress.aiRating;
  const solved = solvedToday(progress);
  const dailyDone = isDailyDone(progress);

  return (
    <div className="page">
      <div className="home-hero">
        <p className="eyebrow">{greeting()}</p>
        <h1 className="home-hero__title">
          <span className="home-hero__avatar">{initialOf(name)}</span>
          {playerName(name)}さん
        </h1>
        <p className="home-hero__sub">{'対戦も、学習も。オフラインでも続きから。'}</p>
      </div>

      <div className="stat-row">
        <Stat label="連続学習" value={`${streak}`} unit="日" icon={ICONS.bolt} />
        <Stat label="パズル評価" value={`${puzzleRating}`} unit="" icon={ICONS.puzzle} />
        <Stat label="AIラダー" value={`${aiRating}`} unit="" icon={ICONS.trophy} />
        <Stat label="今日の解答" value={`${solved}`} unit="問" icon={ICONS.check} />
      </div>

      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <InstallCard />
      </div>

      <div className="quick-grid">
        <QuickCard
          to="/play/ai"
          icon={ICONS.bolt}
          title="AI対戦"
          desc="難易度と性格を選んで、すぐに始めます。"
        />
        <QuickCard
          to="/play/local"
          icon={ICONS.people}
          title="オフライン2人"
          desc="同じ端末で二人。通信は不要です。"
        />
        <QuickCard
          to="/play/online"
          icon={ICONS.scan}
          title="QRで対戦"
          desc="QRを読み取るだけで対戦が始まります。"
        />
        <QuickCard
          to="/learn"
          icon={ICONS.learn}
          title="学習モード"
          desc="初心者から上級者まで9段階で学べます。"
        />
      </div>

      <section className="card card--pad home-daily">
        <h2 className="card__title">
          <Icon path={ICONS.cloud} size={18} />
          今日の課題
        </h2>
        <p className="dim" style={{ marginBottom: 'var(--sp-3)' }}>
          全世界のプレイヤーと同じ問題に挑戦します。
        </p>
        <Link
          className={dailyDone ? 'btn btn--block' : 'btn btn--primary btn--block'}
          to="/learn/daily"
        >
          {dailyDone ? '今日は完了しました（見直す）' : '今日の問題を解く'}
        </Link>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  icon,
}: {
  label: string;
  value: string;
  unit: string;
  icon: string;
}): React.JSX.Element {
  return (
    <div className="stat">
      <span className="stat__icon">
        <Icon path={icon} size={16} />
      </span>
      <span className="stat__value num">
        {value}
        {unit ? <span className="stat__unit">{unit}</span> : null}
      </span>
      <span className="stat__label">{label}</span>
    </div>
  );
}

function QuickCard({
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
    <Link className="quick-card" to={to}>
      <span className="quick-card__icon">
        <Icon path={icon} size={22} />
      </span>
      <span className="quick-card__body">
        <span className="quick-card__title">{title}</span>
        <span className="quick-card__desc">{desc}</span>
      </span>
    </Link>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return '夜遅く';
  if (h < 11) return 'おはようございます';
  if (h < 17) return 'こんにちは';
  return 'こんばんは';
}
