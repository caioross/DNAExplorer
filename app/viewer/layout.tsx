import ViewerShell from "@/components/ViewerShell";

export default function ViewerLayout({ children }: { children: React.ReactNode }) {
  return <ViewerShell>{children}</ViewerShell>;
}
