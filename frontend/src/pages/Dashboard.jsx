import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RecentExpenses } from '@/components/RecentExpenses';
import { GroupList } from '@/components/GroupList';
import api from '@/lib/axios';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState({
    groups: [],
    recentExpenses: [],
    totalBalance: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [groupsResponse, expensesResponse] = await Promise.all([
          api.get('/api/groups'),
          api.get('/api/expenses/recent'),
        ]);

        setDashboardData({
          groups: groupsResponse.data.data || [],
          recentExpenses: expensesResponse.data.data || [],
          totalBalance: (expensesResponse.data.data || []).reduce((acc, expense) => acc + expense.amount, 0),
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [toast]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{dashboardData.totalBalance.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentExpenses expenses={dashboardData.recentExpenses} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <GroupList groups={dashboardData.groups} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 