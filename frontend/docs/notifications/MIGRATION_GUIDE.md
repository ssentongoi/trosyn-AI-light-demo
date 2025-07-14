# Notification System Migration Guide

This guide will help you migrate from the legacy notification system to the new TypeScript-based WebSocket notification system.

## Table of Contents
- [Overview](#overview)
- [Key Changes](#key-changes)
- [Migration Steps](#migration-steps)
- [Component Updates](#component-updates)
- [API Changes](#api-changes)
- [Troubleshooting](#troubleshooting)
- [Deprecation Notice](#deprecation-notice)

## Overview

The new notification system provides:
- Real-time updates via WebSocket
- Type-safe API with TypeScript
- Better error handling and reconnection logic
- Improved performance with message batching
- Consistent UI/UX across the application

## Key Changes

1. **New Package Location**
   - Old: `src/services/notification.js`
   - New: `src/services/notificationService.ts`

2. **TypeScript Support**
   - All interfaces and types are now properly typed
   - Better IDE support and code completion
   - Compile-time error checking

3. **WebSocket Integration**
   - Real-time notifications via WebSocket
   - Automatic reconnection with exponential backoff
   - Offline message queuing

## Migration Steps

### 1. Update Imports

**Before:**
```javascript
import notificationService from '../services/notification';
```

**After:**
```typescript
import { notificationService, useNotificationService } from '../services/notificationService';
```

### 2. Update Component Implementation

#### Functional Components

**Before:**
```jsx
function MyComponent() {
  const handleClick = () => {
    notification.show('Success', 'Operation completed', 'success');
  };
  
  return <button onClick={handleClick}>Show Notification</button>;
}
```

**After:**
```tsx
import { useNotificationService } from '../services/notificationService';

function MyComponent() {
  const notification = useNotificationService();
  
  const handleClick = () => {
    notification.show('Success', 'Operation completed successfully', 'success');
  };
  
  return <button onClick={handleClick}>Show Notification</button>;
}
```

### 3. Notification Center Integration

To add the notification center to your application, include the `NotificationCenter` component in your layout:

```tsx
import { NotificationCenter } from '../components/notifications/NotificationCenter';

function AppLayout() {
  return (
    <>
      {/* Your app header */}
      <header>
        <NotificationCenter />
      </header>
      
      {/* Your app content */}
      <main>{/* ... */}</main>
    </>
  );
}
```

## API Changes

### Notification Service

| Method | Old | New |
|--------|-----|-----|
| Show notification | `show(title, message, type)` | `show(title, message, type, options)` |
| Close notification | `close(id)` | `close(id)` |
| Close all | `closeAll()` | `closeAll()` |
| Mark as read | `markAsRead(id)` | `markAsRead(id)` |
| Mark all as read | `markAllAsRead()` | `markAllAsRead()` |
| Subscribe | `on(event, callback)` | `subscribe(callback)` |

### New Features

1. **Type Safety**
   ```typescript
   // Types are now enforced
   notification.show(
     'Success', 
     'Operation completed', 
     'success', // TypeScript will enforce valid types: 'success' | 'error' | 'warning' | 'info'
     {
       autoDismiss: 5000,
       data: { /* custom data */ },
       actionLabel: 'View',
       onAction: () => { /* handle action */ }
     }
   );
   ```

2. **WebSocket Integration**
   - Notifications are automatically synchronized across tabs/devices
   - Real-time updates without page refresh
   - Offline support with message queuing

## Component Updates

### NotificationBadge

```tsx
import { NotificationBadge } from '../components/notifications/NotificationBadge';

function Header() {
  return (
    <header>
      <NotificationBadge />
    </header>
  );
}
```

### Customizing Notifications

```tsx
// Show a notification with custom action
notification.show(
  'New Message', 
  'You have a new message from John', 
  'info',
  {
    actionLabel: 'Reply',
    onAction: () => {
      // Handle reply action
    },
    data: { messageId: '123' }
  }
);
```

## Troubleshooting

### Common Issues

1. **Notifications not showing up**
   - Verify WebSocket connection is established
   - Check browser console for errors
   - Ensure the notification service is properly initialized

2. **Type errors**
   - Make sure all TypeScript types are properly imported
   - Check for type mismatches in notification options

3. **WebSocket connection issues**
   - The system will automatically attempt to reconnect
   - Check network connectivity
   - Verify the WebSocket server is running

## Deprecation Notice

The legacy notification system will be removed in the next major release. Please migrate to the new system as soon as possible.

## Support

For additional help, please contact the development team or refer to the API documentation.
