import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  TrendingUp,
  Users,
  Zap,
  ArrowRight,
  Search,
  KeyRound,
  Target,
  Trophy,
  Flame,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

const features = [
  {
    icon: Target,
    kicker: '01',
    title: 'Pinpoint predictions',
    description:
      'Predict exact scores, first scorer, assist-maker and cards. Every call is scored against reality.',
  },
  {
    icon: Trophy,
    kicker: '02',
    title: 'Private leagues',
    description:
      'Spin up a league in 30 seconds. Invite mates by code, set scoring rules, and race to the top.',
  },
  {
    icon: Flame,
    kicker: '03',
    title: 'Season-long stakes',
    description:
      'Commit to a champion, a top scorer, a golden boot — before the season turns. Bonus points for bravery.',
  },
  {
    icon: TrendingUp,
    kicker: '04',
    title: 'Live standings',
    description:
      'Rankings recalc the instant matches finish. Gameweek-by-gameweek receipts, all on one board.',
  },
  {
    icon: Users,
    kicker: '05',
    title: 'Built for rivals',
    description:
      'See every pick your rivals made. Gloat or grovel — either way, the receipts are public.',
  },
  {
    icon: Zap,
    kicker: '06',
    title: 'Deadline-locked',
    description:
      'Predictions lock the moment the whistle blows. No edits, no excuses, no revisionist history.',
  },
];

const competitions = [
  'PREMIER LEAGUE',
  'CHAMPIONS LEAGUE',
  'LA LIGA',
  'SERIE A',
  'BUNDESLIGA',
  'LIGUE 1',
  'EUROPA LEAGUE',
  'FA CUP',
];

export function HomePage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeValue, setCodeValue] = useState('');

  const handleJoinByCode = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = codeValue.trim();
    if (!trimmed) return;
    navigate(`/leagues/join/${encodeURIComponent(trimmed)}`);
  };

  return (
    <div>
      {/* ============== HERO ============== */}
      <section className="relative overflow-hidden">
        {/* Stadium mesh backdrop */}
        <div
          aria-hidden
          className="absolute inset-0 stadium-mesh opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        />
        {/* Giant diagonal hatch in corner — brutalist accent */}
        <div
          aria-hidden
          className="hidden md:block absolute -right-20 top-0 bottom-0 w-[30rem] hatch opacity-80 rotate-[8deg]"
        />

        <div className="relative max-w-[88rem] mx-auto px-4 sm:px-6 lg:px-10 pt-12 sm:pt-20 pb-16 sm:pb-24">
          <div className="grid lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-8 animate-fade-up">
              {/* Eyebrow */}
              <div className="flex items-center gap-3 mb-8">
                <span className="w-10 h-[2px] bg-[color:var(--color-volt-200)]" />
                <span className="font-mono text-[0.7rem] tracking-[0.3em] text-[color:var(--color-volt-200)] uppercase">
                  Season 25/26 · Live
                </span>
                <span className="chip chip-win">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[color:var(--color-win-500)] animate-volt-pulse" />
                  Leagues open
                </span>
              </div>

              <h1 className="font-display text-[15vw] sm:text-[10vw] lg:text-[9rem] xl:text-[10.5rem] leading-[0.82] tracking-tight text-[color:var(--color-ink-50)]">
                PREDICT.
                <br />
                COMPETE.
                <br />
                <span className="relative inline-block">
                  <span className="text-[color:var(--color-volt-200)]">CONQUER.</span>
                  <svg
                    aria-hidden
                    className="absolute -bottom-2 left-0 w-full h-3 text-[color:var(--color-volt-200)]"
                    viewBox="0 0 300 12"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M2 8 Q 75 2 150 7 T 298 5"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>

              <p className="mt-8 max-w-xl text-base sm:text-lg text-[color:var(--color-ink-200)] leading-relaxed">
                The serious football prediction platform for people who actually
                watch the games. Build a league, lock in your calls, and let the
                final whistle do the talking.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row flex-wrap gap-3">
                {isAuthenticated ? (
                  <>
                    <Link to="/leagues/new">
                      <Button size="lg" icon={<ArrowRight />} iconPosition="right">
                        Create a league
                      </Button>
                    </Link>
                    <Link to="/leagues/browse">
                      <Button size="lg" variant="outline" icon={<Search />}>
                        Browse public leagues
                      </Button>
                    </Link>
                    <Link to="/dashboard">
                      <Button size="lg" variant="ghost">
                        Go to dashboard
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/register">
                      <Button size="lg" icon={<ArrowRight />} iconPosition="right">
                        Claim your spot
                      </Button>
                    </Link>
                    <Link to="/login">
                      <Button size="lg" variant="outline">
                        I already play
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              {isAuthenticated && (
                <div className="mt-6">
                  {showCodeInput ? (
                    <form
                      onSubmit={handleJoinByCode}
                      className="flex flex-col sm:flex-row gap-2 max-w-md"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={codeValue}
                        onChange={(e) => setCodeValue(e.target.value)}
                        placeholder="PASTE · JOIN · CODE"
                        className="flex-1 h-11 px-4 rounded-lg bg-[color:var(--color-ink-800)] border border-[color:var(--color-ink-700)] focus-within:border-[color:var(--color-volt-200)]/70 font-mono tracking-[0.15em] text-sm text-[color:var(--color-ink-50)] placeholder:text-[color:var(--color-ink-400)] outline-none"
                      />
                      <Button type="submit" size="md" disabled={codeValue.trim() === ''}>
                        Join
                      </Button>
                      <Button
                        type="button"
                        size="md"
                        variant="ghost"
                        onClick={() => {
                          setShowCodeInput(false);
                          setCodeValue('');
                        }}
                      >
                        Cancel
                      </Button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCodeInput(true)}
                      className="inline-flex items-center gap-2 text-sm font-mono tracking-[0.15em] uppercase text-[color:var(--color-ink-200)] hover:text-[color:var(--color-volt-200)] transition-colors"
                    >
                      <KeyRound className="w-4 h-4" />
                      Have an invite code?
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Scoreboard-style stat panel */}
            <div className="lg:col-span-4 animate-fade-up" style={{ animationDelay: '0.2s' }}>
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute -inset-1 bg-[color:var(--color-volt-200)]/20 blur-2xl rounded-2xl"
                />
                <div className="relative rounded-2xl border border-[color:var(--color-volt-200)]/30 bg-[color:var(--color-ink-850)]/90 backdrop-blur p-6 overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[color:var(--color-volt-200)] to-transparent" />
                  <div className="flex items-center justify-between mb-6">
                    <p className="font-mono text-[0.62rem] tracking-[0.25em] uppercase text-[color:var(--color-ink-300)]">
                      Live scorecard
                    </p>
                    <span className="inline-flex items-center gap-1.5 font-mono text-[0.6rem] tracking-widest uppercase text-[color:var(--color-win-500)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-win-500)] animate-volt-pulse" />
                      On air
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div>
                      <p className="font-mono text-[0.58rem] tracking-widest text-[color:var(--color-ink-300)] uppercase mb-1">Home</p>
                      <p className="font-display text-2xl tracking-wide text-[color:var(--color-ink-50)]">ARS</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[0.58rem] tracking-widest text-[color:var(--color-ink-300)] uppercase mb-1">Away</p>
                      <p className="font-display text-2xl tracking-wide text-[color:var(--color-ink-50)]">MCI</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-4 py-3 border-y border-[color:var(--color-ink-700)] mb-5">
                    <span className="scoreboard text-6xl text-[color:var(--color-ink-50)]">2</span>
                    <span className="font-mono text-[0.6rem] tracking-widest uppercase text-[color:var(--color-ink-400)]">FT</span>
                    <span className="scoreboard text-6xl text-[color:var(--color-volt-200)]">1</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono tracking-wider uppercase text-[color:var(--color-ink-300)]">Your call</span>
                      <span className="font-mono tabular-nums text-[color:var(--color-ink-50)]">2 – 1</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono tracking-wider uppercase text-[color:var(--color-ink-300)]">Outcome</span>
                      <span className="chip chip-win !text-[0.62rem]">Exact score · +10</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono tracking-wider uppercase text-[color:var(--color-ink-300)]">Streak</span>
                      <span className="font-mono tabular-nums text-[color:var(--color-volt-200)]">×3</span>
                    </div>
                  </div>

                  <div className="tick-divider my-5" />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-[0.58rem] tracking-widest uppercase text-[color:var(--color-ink-300)]">This gameweek</p>
                      <p className="font-display text-3xl text-[color:var(--color-ink-50)] mt-1">+34 PTS</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[0.58rem] tracking-widest uppercase text-[color:var(--color-ink-300)]">Rank Δ</p>
                      <p className="font-display text-3xl text-[color:var(--color-volt-200)] mt-1">↑ 4</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Marquee competitions ribbon */}
        <div className="relative border-y border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/60 py-4 overflow-hidden">
          <div className="flex gap-10 animate-marquee w-max">
            {[...competitions, ...competitions, ...competitions].map((c, i) => (
              <span
                key={i}
                className="font-display text-2xl tracking-[0.25em] text-[color:var(--color-ink-300)] flex items-center gap-10"
              >
                {c}
                <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-volt-200)]" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============== FEATURES ============== */}
      <section className="relative py-20 sm:py-28">
        <div className="max-w-[88rem] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="mb-14 grid lg:grid-cols-12 gap-6 items-end">
            <div className="lg:col-span-6">
              <p className="font-mono text-[0.7rem] tracking-[0.3em] text-[color:var(--color-volt-200)] uppercase mb-4">
                /01 — The playbook
              </p>
              <h2 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[0.9] text-[color:var(--color-ink-50)]">
                Six systems.
                <br />
                One league table.
              </h2>
            </div>
            <div className="lg:col-span-5 lg:col-start-8">
              <p className="text-[color:var(--color-ink-200)] text-base leading-relaxed">
                Every feature exists for one reason — to reward the sharper
                football brain. No filler, no gimmicks, no freemium paywalls
                hiding in the fixture list.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-[color:var(--color-ink-700)] border border-[color:var(--color-ink-700)] rounded-2xl overflow-hidden stagger">
            {features.map((f) => (
              <div
                key={f.title}
                className="group relative bg-[color:var(--color-ink-900)] p-7 sm:p-9 transition-colors duration-300 hover:bg-[color:var(--color-ink-850)]"
              >
                <div className="flex items-start justify-between mb-8">
                  <span className="font-mono text-[0.7rem] tracking-[0.3em] text-[color:var(--color-ink-400)]">
                    {f.kicker}
                  </span>
                  <div
                    aria-hidden
                    className="w-10 h-10 rounded-lg border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-800)] grid place-items-center text-[color:var(--color-ink-200)] transition-all duration-300 group-hover:border-[color:var(--color-volt-200)]/60 group-hover:text-[color:var(--color-volt-200)] group-hover:shadow-[0_0_24px_-8px_rgba(215,255,61,0.6)]"
                  >
                    <f.icon className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                </div>
                <h3 className="font-display text-3xl text-[color:var(--color-ink-50)] mb-3 tracking-wide">
                  {f.title}
                </h3>
                <p className="text-sm text-[color:var(--color-ink-200)] leading-relaxed">
                  {f.description}
                </p>
                <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-[color:var(--color-volt-200)] transition-all duration-500 group-hover:w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== HOW IT WORKS ============== */}
      <section className="relative py-20 sm:py-28 border-t border-[color:var(--color-ink-700)]">
        <div className="max-w-[88rem] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="mb-14">
            <p className="font-mono text-[0.7rem] tracking-[0.3em] text-[color:var(--color-volt-200)] uppercase mb-4">
              /02 — Three whistles
            </p>
            <h2 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[0.9] text-[color:var(--color-ink-50)] max-w-3xl">
              From kickoff
              <br />
              to top of the table.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5 stagger">
            {[
              {
                n: '01',
                title: 'Build the league',
                body: 'Pick a competition, invite by code or keep it public. Tune scoring so goals matter more than clean sheets — or vice versa.',
              },
              {
                n: '02',
                title: 'Lock your calls',
                body: 'Score, first scorer, assist, cards, season-long champion. Deadlines auto-lock at kickoff. No late edits.',
              },
              {
                n: '03',
                title: 'Climb the table',
                body: 'The final whistle scores your predictions. Rivals see every pick. Standings shift in real-time.',
              },
            ].map((s) => (
              <div
                key={s.n}
                className="relative rounded-2xl border border-[color:var(--color-ink-700)] bg-[color:var(--color-ink-850)]/60 p-8 overflow-hidden"
              >
                <div className="absolute top-0 right-0 font-display text-[8rem] leading-none text-[color:var(--color-ink-800)] select-none pointer-events-none">
                  {s.n}
                </div>
                <div className="relative">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="w-6 h-[2px] bg-[color:var(--color-volt-200)]" />
                    <span className="font-mono text-[0.65rem] tracking-[0.25em] uppercase text-[color:var(--color-volt-200)]">
                      Step {s.n}
                    </span>
                  </div>
                  <h3 className="font-display text-4xl text-[color:var(--color-ink-50)] tracking-wide mb-4">
                    {s.title}
                  </h3>
                  <p className="text-sm text-[color:var(--color-ink-200)] leading-relaxed">
                    {s.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== CTA ============== */}
      <section className="relative py-24 border-t border-[color:var(--color-ink-700)]">
        <div
          aria-hidden
          className="absolute inset-0 stadium-mesh opacity-40"
        />
        <div className="relative max-w-[88rem] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="rounded-3xl border border-[color:var(--color-volt-200)]/30 bg-gradient-to-br from-[color:var(--color-ink-850)] via-[color:var(--color-ink-900)] to-[color:var(--color-ink-900)] p-8 sm:p-14 lg:p-20 overflow-hidden relative">
            <div
              aria-hidden
              className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-[color:var(--color-volt-200)]/20 blur-3xl"
            />
            <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
              <div className="max-w-2xl">
                <p className="font-mono text-[0.7rem] tracking-[0.3em] text-[color:var(--color-volt-200)] uppercase mb-4">
                  /03 — The whistle
                </p>
                <h2 className="font-display text-5xl sm:text-7xl leading-[0.9] text-[color:var(--color-ink-50)]">
                  Talk is cheap.
                  <br />
                  <span className="text-[color:var(--color-volt-200)]">Predict already.</span>
                </h2>
                <p className="mt-6 text-[color:var(--color-ink-200)] text-base max-w-lg">
                  Free to join. No credit card. No ads mid-gameweek. Just you,
                  the fixtures, and the bragging rights.
                </p>
              </div>
              {!isAuthenticated && (
                <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                  <Link to="/register">
                    <Button size="lg" icon={<ArrowRight />} iconPosition="right">
                      Create free account
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button size="lg" variant="outline">
                      Sign in
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============== FOOTER ============== */}
      <footer className="relative border-t border-[color:var(--color-ink-700)] py-10">
        <div className="max-w-[88rem] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[color:var(--color-volt-200)] text-[color:var(--color-ink-950)] grid place-items-center">
                <Trophy className="w-4 h-4" strokeWidth={2.4} />
              </div>
              <span className="font-display text-lg tracking-[0.08em] text-[color:var(--color-ink-50)]">
                MATCH/<span className="text-[color:var(--color-volt-200)]">PREDICTOR</span>
              </span>
            </div>
            <p className="font-mono text-[0.65rem] tracking-[0.25em] uppercase text-[color:var(--color-ink-400)]">
              © {new Date().getFullYear()} Match Predictor · All rights reserved
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
