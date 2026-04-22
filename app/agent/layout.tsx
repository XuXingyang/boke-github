import { Nav } from '@/components/layout/nav'

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col bg-bg-primary overflow-hidden">
      <Nav />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
