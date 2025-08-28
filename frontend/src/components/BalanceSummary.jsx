import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function BalanceSummary({ balances, currentUserId, members }) {
  if (!balances || !currentUserId) return null;

  const currentUserBalance = balances[currentUserId] || 0;
  
  // Find who owes the most and who is owed the most
  const sortedBalances = Object.entries(balances)
    .map(([userId, balance]) => ({ userId, balance }))
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

  const getMemberName = (userId) => {
    const member = members?.find(m => (m.user._id || m.user) === userId);
    return member?.user?.name || member?.user?.email || 'Unknown';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Balance Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current User Balance */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            {currentUserBalance > 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : currentUserBalance < 0 ? (
              <TrendingDown className="h-4 w-4 text-red-600" />
            ) : (
              <DollarSign className="h-4 w-4 text-gray-600" />
            )}
            <span className="font-medium">Your Balance</span>
          </div>
          <div className="text-right">
            <div className={`font-bold ${
              currentUserBalance > 0 ? 'text-green-600' : 
              currentUserBalance < 0 ? 'text-red-600' : 'text-gray-600'
            }`}>
              ₹{Math.abs(currentUserBalance).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              {currentUserBalance > 0 ? 'You get back' : 
               currentUserBalance < 0 ? 'You owe' : 'All settled'}
            </div>
          </div>
        </div>

        {/* Top Balances */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Group Overview</h4>
          {sortedBalances.slice(0, 3).map(({ userId, balance }) => (
            <div key={userId} className="flex items-center justify-between text-sm">
              <span className="truncate">{getMemberName(userId)}</span>
              <Badge 
                variant={balance > 0 ? 'default' : balance < 0 ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {balance > 0 ? '+' : ''}₹{balance.toFixed(2)}
              </Badge>
            </div>
          ))}
        </div>

        {/* Settlement Status */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Settlement Status</span>
            {Object.values(balances).every(balance => Math.abs(balance) < 0.01) ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                All Settled
              </Badge>
            ) : (
              <Badge variant="secondary">
                {Object.values(balances).filter(balance => Math.abs(balance) >= 0.01).length} pending
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
