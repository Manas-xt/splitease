import { format } from 'date-fns';
import { IndianRupee } from 'lucide-react';

export function RecentExpenses({ expenses }) {
  if (!expenses || expenses.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No recent expenses
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {expenses.map((expense) => (
        <div
          key={expense._id}
          className="flex items-center justify-between p-2 rounded-lg hover:bg-accent"
        >
          <div className="flex items-center space-x-4">
            <div className="p-2 rounded-full bg-primary/10">
              <IndianRupee className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">{expense.description}</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(expense.date), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium">₹{expense.amount.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">{expense.category}</p>
          </div>
        </div>
      ))}
    </div>
  );
} 