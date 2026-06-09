import { ThreePanel } from "@/components/layout/three-panel";
import { RailNav } from "@/components/layout/rail-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { MainPanel } from "@/components/layout/main-panel";
import { WorkspacePanel } from "@/components/layout/workspace-panel";

export default function Home() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <RailNav />
      <ThreePanel
        sidebar={<Sidebar />}
        main={<MainPanel />}
        workspace={<WorkspacePanel />}
      />
    </div>
  );
}
