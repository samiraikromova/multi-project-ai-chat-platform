import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Zap, DollarSign } from 'lucide-react'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Fetch user's usage data
  const { data: usageData } = await supabase
    .from('usage_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  // Calculate stats
  const currentMonthCredits = usageData?.reduce((sum, log) => sum + (log.credits_used || 0), 0) || 0
  const totalSpent = usageData?.reduce((sum, log) => sum + (log.estimated_cost || 0), 0) || 0

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard">
            <button className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Usage Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Track your AI tool usage and spending</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-surface border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Month Credits</CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMonthCredits.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">credits used</p>
            </CardContent>
          </Card>

          <Card className="bg-surface border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">across all projects</p>
            </CardContent>
          </Card>

          <Card className="bg-surface border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Daily Usage</CardTitle>
              <Zap className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(currentMonthCredits / 30)}
              </div>
              <p className="text-xs text-muted-foreground">credits per day</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Usage Table */}
        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest AI interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {usageData?.slice(0, 10).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover transition-colors">
                  <div>
                    <p className="text-sm font-medium">{log.model}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{log.credits_used} credits</p>
                    <p className="text-xs text-muted-foreground">${log.estimated_cost?.toFixed(4)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}