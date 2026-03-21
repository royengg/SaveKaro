import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  User,
  ArrowLeft,
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import { cn } from "@/lib/utils";
import Header from "@/components/layout/Header";

interface LeaderboardEntry {
  id: string;
  reputationScore: number;
  weeklyUpvotes: number;
  weeklyDeals: number;
  userId: string;
  user: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

export function Leaderboard() {
  const { user } = useAuthStore();
  const { resetFilters } = useFilterStore();
  const [topHunters, setTopHunters] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const softPanelClass = "surface-liquid-subtle rounded-[28px] p-4 md:p-5";

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await api.getLeaderboard();
      if ((res as any).success) {
        setTopHunters((res as any).data);

        // Find current user rank
        if (user) {
          const rank = (res as any).data.findIndex(
            (entry: any) => entry.userId === user.id,
          );
          if (rank !== -1) setUserRank(rank + 1);
        }
      }
    } catch (error) {
      console.error("Failed to load leaderboard", error);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-amber-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-slate-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-700" />;
      default:
        return (
          <span className="w-6 text-center text-base font-bold">{index + 1}</span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.13),transparent_24%),radial-gradient(circle_at_top_right,rgba(244,114,182,0.1),transparent_26%),linear-gradient(180deg,#fff_0%,#fcfcfd_38%,#f8fafc_100%)]">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-5 pb-24 md:pb-10">
        <Link
          to="/"
          onClick={resetFilters}
          className="surface-liquid-chip inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-muted-foreground transition-[transform,color,background-color] duration-200 hover:-translate-y-[1px] hover:text-foreground active:scale-[0.98]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Deals
        </Link>

        <section className="surface-liquid-glass mt-4 rounded-[30px] p-5 md:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.12),transparent_34%)]" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="surface-liquid-chip flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px]">
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h1 className="text-[1.9rem] font-bold tracking-[-0.03em] text-foreground">
                  Leaderboard
                </h1>
                <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                  Weekly momentum, strongest community hunters, and the people
                  surfacing the sharpest deals.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="surface-liquid-chip inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium text-foreground/80">
                    {topHunters.length} ranked hunters
                  </span>
                  {userRank ? (
                    <span className="surface-liquid-chip inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium text-foreground/80">
                      Your rank: #{userRank}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <span className="surface-liquid-chip inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-medium text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                Weekly refresh
              </span>
            </div>
          </div>
        </section>

        <Tabs defaultValue="hunters" className="mt-5 w-full">
          <TabsList className="surface-liquid-chip grid h-auto w-full grid-cols-2 rounded-full p-1">
            <TabsTrigger
              value="hunters"
              className="min-h-10 rounded-full px-4 text-[13px] font-medium data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-[0_14px_24px_-22px_rgba(15,23,42,0.34)]"
            >
              Top Hunters
            </TabsTrigger>
            <TabsTrigger
              value="value"
              className="min-h-10 rounded-full px-4 text-[13px] font-medium data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-[0_14px_24px_-22px_rgba(15,23,42,0.34)]"
            >
              Best Value Finds
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hunters" className="mt-4">
            <section className={softPanelClass}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.02em]">
                    Weekly Top Hunters
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ranked by reputation score built from upvotes, posting
                    quality, and weekly consistency.
                  </p>
                </div>
                <span className="surface-liquid-chip inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium text-foreground/80">
                  Updated weekly
                </span>
              </div>

              <div className="space-y-3">
                {topHunters.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "rounded-[24px] border p-3 shadow-[0_16px_30px_-26px_rgba(15,23,42,0.24)] backdrop-blur-md md:p-4",
                      index === 0
                        ? "border-amber-200/80 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.86),rgba(255,250,235,0.78))]"
                        : index === 1
                          ? "border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.84),rgba(248,250,252,0.78))]"
                          : index === 2
                            ? "border-amber-100/80 bg-[radial-gradient(circle_at_top_right,rgba(217,119,6,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,247,237,0.78))]"
                            : "border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(255,255,255,0.62))]",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="surface-liquid-chip flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px]">
                        {getRankIcon(index)}
                      </div>

                      <Avatar className="h-11 w-11 ring-4 ring-white/70 shadow-[0_16px_26px_-22px_rgba(15,23,42,0.24)]">
                        <AvatarImage src={entry.user.avatarUrl || ""} />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[15px] font-semibold tracking-[-0.01em]">
                          {entry.user.name || "Anonymous User"}
                        </h3>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <span className="surface-liquid-chip inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium text-foreground/75">
                            <TrendingUp className="h-3 w-3" />
                            {entry.weeklyUpvotes} upvotes
                          </span>
                          <span className="surface-liquid-chip inline-flex h-7 items-center rounded-full px-2.5 text-[11px] font-medium text-foreground/75">
                            {entry.weeklyDeals} deals
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-2xl font-bold tracking-[-0.03em] text-foreground">
                          {entry.reputationScore}
                        </div>
                        <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                          points
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {topHunters.length === 0 ? (
                  <div className="surface-liquid-glass rounded-[26px] px-5 py-10 text-center text-muted-foreground">
                    No rankings yet this week. Start posting deals!
                  </div>
                ) : null}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="value" className="mt-4">
            <section className="surface-liquid-glass rounded-[28px] px-6 py-12 text-center">
              <div className="surface-liquid-chip mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[20px]">
                <Award className="h-6 w-6 text-amber-500" />
              </div>
              <h3 className="mb-2 text-xl font-semibold tracking-[-0.02em]">
                Coming Soon
              </h3>
              <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">
                We're crunching the numbers to find the absolute best value
                deals.
              </p>
            </section>
          </TabsContent>
        </Tabs>

        {user && userRank && userRank > 10 && (
          <div className="surface-liquid-glass fixed inset-x-4 bottom-[calc(4.25rem+env(safe-area-inset-bottom)+10px)] z-40 rounded-[22px] px-4 py-3 md:inset-x-auto md:right-8 md:w-[320px]">
            <div className="flex items-center gap-3">
              <div className="surface-liquid-chip flex h-10 w-10 items-center justify-center rounded-[16px]">
                <span className="text-sm font-bold">#{userRank}</span>
              </div>
              <Avatar className="h-9 w-9">
                  <AvatarImage src={user.avatarUrl || ""} />
                  <AvatarFallback>You</AvatarFallback>
                </Avatar>
              <div>
                <p className="text-[14px] font-semibold">You are climbing</p>
                <p className="text-[12px] text-muted-foreground">
                  Current weekly rank: #{userRank}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Leaderboard;
