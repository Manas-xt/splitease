import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';

export function GroupList({ groups }) {
  if (!groups || groups.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No groups yet. Create one to get started!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <Link
          key={group._id}
          to={`/groups/${group._id}`}
          className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <div className="flex items-center space-x-4">
            <div className="p-2 rounded-full bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">{group.name}</p>
              <p className="text-sm text-muted-foreground">
                {group.members.length} members
              </p>
              {group.createdBy && (
                <p className="text-xs text-muted-foreground">
                  Created by {group.createdBy.name}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium">
              ₹{Math.abs(group.balance || 0).toFixed(2)}
            </p>
            <p
              className={`text-sm ${
                (group.balance || 0) > 0
                  ? 'text-green-500'
                  : (group.balance || 0) < 0
                  ? 'text-red-500'
                  : 'text-muted-foreground'
              }`}
            >
              {(group.balance || 0) > 0
                ? 'You are owed'
                : (group.balance || 0) < 0
                ? 'You owe'
                : 'Settled'}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
} 