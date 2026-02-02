import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Award, TrendingUp, User } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

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
  const [topHunters, setTopHunters] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);

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
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 1:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 2:
        return <Award className="h-6 w-6 text-amber-700" />;
      default:
        return (
          <span className="font-bold text-lg w-6 text-center">{index + 1}</span>
        );
    }
  };

  return (
    <div className="container py-8 max-w-4xl">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-500 to-amber-600 bg-clip-text text-transparent mb-2">
          DealHunt Leaderboards
        </h1>
        <p className="text-muted-foreground">
          Top hunters and best finds of the week
        </p>
      </div>

      <Tabs defaultValue="hunters" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="hunters">Top Hunters</TabsTrigger>
          <TabsTrigger value="value">Best Value Finds</TabsTrigger>
        </TabsList>

        <TabsContent value="hunters">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Top Hunters</CardTitle>
              <CardDescription>
                Ranked by reputation score (upvotes - downvotes - penalties)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topHunters.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border ${
                      index < 3 ? "bg-secondary/50" : "bg-card"
                    }`}
                  >
                    <div className="flex-shrink-0 w-8 flex justify-center">
                      {getRankIcon(index)}
                    </div>

                    <Avatar className="h-10 w-10">
                      <AvatarImage src={entry.user.avatarUrl || ""} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-grow">
                      <h3 className="font-semibold">
                        {entry.user.name || "Anonymous User"}
                      </h3>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {entry.weeklyUpvotes} upvotes
                        </span>
                        <span>{entry.weeklyDeals} deals</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {entry.reputationScore}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        points
                      </div>
                    </div>
                  </div>
                ))}

                {topHunters.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No rankings yet this week. Start posting deals!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="value">
          <div className="text-center py-12">
            <h3 className="text-xl font-medium mb-2">Coming Soon!</h3>
            <p className="text-muted-foreground">
              We're crunching the numbers to find the absolute best value deals.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Identify current user rank if not in view */}
      {user && userRank && userRank > 10 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg z-50">
          <div className="container max-w-4xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-bold">#{userRank}</span>
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatarUrl || ""} />
                <AvatarFallback>You</AvatarFallback>
              </Avatar>
              <span className="font-medium">You</span>
            </div>
            <Link to="/profile">
              <Button variant="outline" size="sm">
                View Stats
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default Leaderboard;
