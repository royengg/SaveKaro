import TabScreen from "../../components/TabScreen";
import SubmitDealScreen from "../../features/community/SubmitDealScreen";
import { useAuth } from "../../providers/AuthProvider";
export default function SubmitTab() {
  const { user } = useAuth();
  return (
    <TabScreen>
      <SubmitDealScreen key={user?.id ?? "signed-out"} />
    </TabScreen>
  );
}
