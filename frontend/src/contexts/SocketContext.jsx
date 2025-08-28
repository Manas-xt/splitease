import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';

const SocketContext = createContext();

const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [joinRequestCallbacks, setJoinRequestCallbacks] = useState({});
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      const newSocket = io(import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL, {
        auth: {
          token: localStorage.getItem('token')
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
      });

      newSocket.on('connect', () => {
        console.log('Connected to socket server');
        // Join user-specific room for notifications
        const userId = user.id || user._id;
        console.log('Joining user room:', `user_${userId}`);
        newSocket.emit('join-user', userId);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from socket server');
      });

      // Listen for join request notifications
      newSocket.on('joinRequest', (data) => {
        console.log('New join request received:', data);
        toast({
          title: 'New Join Request',
          description: `${data.requester.name} wants to join "${data.groupName}"`,
        });
        
        // Call any registered callbacks for this group
        const callback = joinRequestCallbacks[data.groupId];
        if (callback) {
          callback(data);
        }
      });

      // Listen for join request responses
      newSocket.on('joinRequestResponse', (data) => {
        console.log('Join request response:', data);
        if (data.status === 'approved') {
          toast({
            title: 'Join Request Approved',
            description: `Your request to join "${data.groupName}" has been approved by ${data.reviewedBy}`,
          });
        } else {
          toast({
            title: 'Join Request Rejected',
            description: `Your request to join "${data.groupName}" was rejected by ${data.reviewedBy}`,
            variant: 'destructive',
          });
        }
      });

      // Listen for new member notifications
      newSocket.on('memberJoined', (data) => {
        console.log('New member joined:', data);
        toast({
          title: 'New Member',
          description: `${data.newMember.name} joined "${data.groupName}"`,
        });
      });

      // Listen for member removal notifications
      newSocket.on('memberRemoved', (data) => {
        console.log('Member removed:', data);
        if (data.isSelfRemoval) {
          toast({
            title: 'Left Group',
            description: `You have left "${data.groupName}"`,
          });
        } else {
          toast({
            title: 'Removed from Group',
            description: `You were removed from "${data.groupName}" by ${data.removedBy}${data.reason ? `: ${data.reason}` : ''}`,
            variant: 'destructive',
          });
        }
      });

      // Listen for member left notifications (for other members)
      newSocket.on('memberLeft', (data) => {
        console.log('Member left:', data);
        const action = data.isSelfRemoval ? 'left' : 'was removed from';
        toast({
          title: 'Member Update',
          description: `${data.leftMember.name} ${action} "${data.groupName}"`,
        });
      });

      // Listen for ownership transfer notifications
      newSocket.on('ownership-transferred', (data) => {
        console.log('Ownership transferred:', data);
        toast({
          title: 'Ownership Transferred',
          description: `${data.oldOwner} transferred ownership of "${data.groupName}" to ${data.newOwner}`,
        });
      });

      // Listen for group deletion notifications
      newSocket.on('group-deleted', (data) => {
        console.log('Group deleted:', data);
        toast({
          title: 'Group Deleted',
          description: `"${data.groupName}" was permanently deleted by ${data.deletedBy}`,
          variant: 'destructive',
        });
      });

      // Listen for leave request notifications (for admins)
      newSocket.on('leaveRequest', (data) => {
        console.log('New leave request received:', data);
        toast({
          title: 'New Leave Request',
          description: `${data.requester.name} wants to leave "${data.groupName}": ${data.reason}`,
        });
        
        // Call any registered callbacks for this group
        const callback = joinRequestCallbacks[data.groupId];
        if (callback) {
          callback(data);
        }
      });

      // Listen for leave request response notifications
      newSocket.on('leaveRequestResponse', (data) => {
        console.log('Leave request response:', data);
        if (data.approved) {
          toast({
            title: 'Leave Request Approved',
            description: `Your request to leave "${data.groupName}" has been approved by ${data.reviewedBy}`,
          });
        } else {
          toast({
            title: 'Leave Request Rejected',
            description: `Your request to leave "${data.groupName}" was rejected by ${data.reviewedBy}${data.adminNote ? `: ${data.adminNote}` : ''}`,
            variant: 'destructive',
          });
        }
      });

      // Listen for member joined via link notifications
      newSocket.on('member-joined-via-link', (data) => {
        console.log('Member joined via link:', data);
        toast({
          title: 'New Member Joined',
          description: `${data.newMember.name} joined "${data.groupName}" via invite link`,
        });
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  const joinGroup = useCallback((groupId) => {
    if (socket) {
      socket.emit('join-group', groupId);
    }
  }, [socket]);

  const leaveGroup = useCallback((groupId) => {
    if (socket) {
      socket.emit('leave-group', groupId);
    }
  }, [socket]);

  const subscribeToGroupUpdates = useCallback((groupId, callback) => {
    if (socket) {
      const eventName = `group:${groupId}:update`;
      socket.on(eventName, callback);
      return () => socket.off(eventName, callback);
    }
    // Return a no-op function if socket is not available
    return () => {};
  }, [socket]);

  const subscribeToExpenseUpdates = useCallback((groupId, callback) => {
    if (socket) {
      const eventName = `group:${groupId}:expense`;
      socket.on(eventName, callback);
      return () => socket.off(eventName, callback);
    }
    // Return a no-op function if socket is not available
    return () => {};
  }, [socket]);

  const subscribeToJoinRequests = useCallback((groupId, callback) => {
    setJoinRequestCallbacks(prev => ({
      ...prev,
      [groupId]: callback
    }));
    
    return () => {
      setJoinRequestCallbacks(prev => {
        const newCallbacks = { ...prev };
        delete newCallbacks[groupId];
        return newCallbacks;
      });
    };
  }, []);

  const value = {
    socket,
    joinGroup,
    leaveGroup,
    subscribeToGroupUpdates,
    subscribeToExpenseUpdates,
    subscribeToJoinRequests
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export { SocketProvider };

const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export { useSocket }; 