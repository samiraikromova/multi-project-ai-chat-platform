import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CreditCard, Shield, Bell } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="../dashboard">
            <button className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences</p>
          </div>
        </div>

        {/* Account Section */}
        <Card className="mb-6 bg-surface border-border">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Name</label>
              <p className="text-sm text-muted-foreground mt-1">
                {userData?.name || user.user_metadata?.full_name || 'Not set'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Subscription Tier</label>
              <p className="text-sm text-accent mt-1 capitalize">
                {userData?.subscription_tier || 'Free'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Section */}
        <Card className="mb-6 bg-surface border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-accent" />
              <CardTitle>Subscription</CardTitle>
            </div>
            <CardDescription>Manage your plan and billing</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="../pricing">
              <button className="w-full px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors">
                Upgrade to Pro
              </button>
            </Link>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card className="bg-surface border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-accent" />
              <CardTitle>Security</CardTitle>
            </div>
            <CardDescription>Password and authentication settings</CardDescription>
          </CardHeader>
          <CardContent>
            <button className="px-4 py-2 bg-surface-hover hover:bg-muted rounded-lg transition-colors text-sm">
              Change Password
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}