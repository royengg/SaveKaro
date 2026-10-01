import TabScreen from "../../components/TabScreen";
import ExploreScreen from "../../features/deals/ExploreScreen";
export default function ExploreTab() {
  return (
    <TabScreen header={false}>
      <ExploreScreen />
    </TabScreen>
  );
}
