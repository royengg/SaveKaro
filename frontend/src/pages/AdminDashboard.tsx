import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("challenges");

  // Challenge Form State
  const [challengeTitle, setChallengeTitle] = useState("");
  const [challengeDesc, setChallengeDesc] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [criteria, setCriteria] = useState("{}");

  // Badge Form State
  const [badgeName, setBadgeName] = useState("");
  const [badgeSlug, setBadgeSlug] = useState("");
  const [badgeIcon, setBadgeIcon] = useState("🏆");
  const [badgeDesc, setBadgeDesc] = useState("");
  const [badgeTier, setBadgeTier] = useState("BRONZE");
  const [badgeCriteria, setBadgeCriteria] = useState(
    '{"type": "reputation", "threshold": 100}',
  );

  // Data
  const [challenges, setChallenges] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);

  useEffect(() => {
    // Basic admin check (backend will also verify)
    /*if (!user?.isAdmin) {
      toast.error("Unauthorized access");
      navigate("/");
      return;
    }*/

    fetchChallenges();
    fetchBadges();
  }, [user, navigate]);

  const fetchChallenges = async () => {
    try {
      const res = await api.getChallenges();
      if ((res as any).success) setChallenges((res as any).data);
    } catch (error) {
      toast.error("Failed to load challenges");
    }
  };

  const fetchBadges = async () => {
    try {
      const res = await api.getBadges();
      if ((res as any).success) setBadges((res as any).data);
    } catch (error) {
      toast.error("Failed to load badges");
    }
  };

  /*const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault(); // Moved to separate function to avoid collision
  };*/

  const onCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createChallenge({
        title: challengeTitle,
        description: challengeDesc,
        criteria: JSON.parse(criteria),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      toast.success("Challenge created!");
      fetchChallenges();
    } catch (error) {
      toast.error("Failed to create challenge");
    }
  };

  const handleCreateBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.request("/api/gamification/badges", {
        method: "POST",
        body: {
          name: badgeName,
          slug: badgeSlug,
          icon: badgeIcon,
          description: badgeDesc,
          tier: badgeTier,
          criteria: JSON.parse(badgeCriteria),
        },
      });
      toast.success("Badge created!");
      fetchBadges();
    } catch (error) {
      toast.error("Failed to create badge");
    }
  };

  return (
    <div className="container py-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        {/* Challenges Tab */}
        <TabsContent value="challenges">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Create Form */}
            <Card>
              <CardHeader>
                <CardTitle>Create Challenge</CardTitle>
                <CardDescription>Launch a new weekly challenge</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onCreateChallenge} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={challengeTitle}
                      onChange={(e) => setChallengeTitle(e.target.value)}
                      placeholder="e.g. Best Tech Deal Under ₹1000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={challengeDesc}
                      onChange={(e) => setChallengeDesc(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="datetime-local"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="datetime-local"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Criteria (JSON)</Label>
                    <Input
                      value={criteria}
                      onChange={(e) => setCriteria(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Create Challenge
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* List */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Active Challenges</h3>
              {challenges.length === 0 && (
                <p className="text-muted-foreground">No active challenges</p>
              )}
              {challenges.map((challenge) => (
                <Card key={challenge.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">
                        {challenge.title}
                      </CardTitle>
                      <Badge
                        variant={challenge.isActive ? "default" : "secondary"}
                      >
                        {challenge.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardDescription>
                      Ends {new Date(challenge.endDate).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{challenge.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Badges Tab */}
        <TabsContent value="badges">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Create Badge Form */}
            <Card>
              <CardHeader>
                <CardTitle>Create Badge</CardTitle>
                <CardDescription>Add a new achievement badge</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateBadge} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={badgeName}
                        onChange={(e) => setBadgeName(e.target.value)}
                        placeholder="e.g. Hot Finder"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Slug</Label>
                      <Input
                        value={badgeSlug}
                        onChange={(e) => setBadgeSlug(e.target.value)}
                        placeholder="hot-finder"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Icon (Emoji)</Label>
                      <Input
                        value={badgeIcon}
                        onChange={(e) => setBadgeIcon(e.target.value)}
                        placeholder="🔥"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tier</Label>
                      <Input
                        value={badgeTier}
                        onChange={(e) => setBadgeTier(e.target.value)}
                        placeholder="BRONZE"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={badgeDesc}
                      onChange={(e) => setBadgeDesc(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Criteria (JSON)</Label>
                    <Input
                      value={badgeCriteria}
                      onChange={(e) => setBadgeCriteria(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Create Badge
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* List */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">System Badges</h3>
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  <div className="text-3xl">{badge.icon}</div>
                  <div>
                    <h4 className="font-bold flex items-center gap-2">
                      {badge.name}
                      <Badge variant="outline" className="text-xs">
                        {badge.tier}
                      </Badge>
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {badge.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdminDashboard;
