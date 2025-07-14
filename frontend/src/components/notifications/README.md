# Notification System

A real-time notification system built with React, TypeScript, and WebSockets. The system provides a seamless way to display notifications to users with support for different types, actions, and real-time updates.

## Features

- **Real-time Notifications**: Instant delivery via WebSocket
- **Multiple Types**: Success, error, warning, and info notifications
- **Interactive**: Support for actions and callbacks
- **Responsive**: Works on all device sizes
- **Accessible**: Follows WAI-ARIA best practices
- **Type-safe**: Built with TypeScript for better developer experience
- **Offline Support**: Queues notifications when offline
- **Customizable**: Theme support and customizable components

## Components

### NotificationCenter

The main notification center component that displays a list of notifications.

```tsx
import { NotificationCenter } from './NotificationCenter';

function App() {
  return (
    <div>
      {/* Your app content */}
      <NotificationCenter />
    </div>
  );
}
```

### NotificationBadge

A badge component that shows the count of unread notifications.

```tsx
import { NotificationBadge } from './NotificationBadge';

function Header() {
  return (
    <header>
      <NotificationBadge />
    </header>
  );
}
```

## Usage

### Basic Usage

```tsx
import { useNotificationService } from '../../services/notificationService';

function MyComponent() {
  const notification = useNotificationService();
  
  const handleClick = () => {
    notification.show(
      'Success', 
      'Operation completed successfully',
      'success'
    );
  };
  
  return <button onClick={handleClick}>Show Notification</button>;
}
```

### With Actions

```tsx
notification.show(
  'New Message',
  'You have a new message from John',
  'info',
  {
    actionLabel: 'View',
    onAction: () => {
      // Navigate to message
      navigate('/messages/123');
    },
    autoDismiss: 10000 // Auto-dismiss after 10 seconds
  }
);
```

### Handling Errors

```tsx
try {
  // Some async operation
  await api.someOperation();
  notification.show('Success', 'Operation completed', 'success');
} catch (error) {
  notification.show(
    'Error',
    error.message || 'An error occurred',
    'error',
    {
      autoDismiss: false // Keep error notifications until dismissed
    }
  );
}
```

## Theming

The notification components use the application's theme. You can customize the appearance by modifying your theme:

```typescript
const theme = createTheme({
  components: {
    MuiAlert: {
      styleOverrides: {
        root: {
          marginBottom: theme.spacing(1),
        },
      },
    },
  },
  palette: {
    // Your custom palette
  },
});
```

## Best Practices

1. **Use Appropriate Types**
   - `success`: For successful operations
   - `error`: For errors that need attention
   - `warning`: For warnings
   - `info`: For general information

2. **Keep Messages Clear**
   - Be concise but descriptive
   - Use action verbs
   - Include relevant data

3. **Handle Actions**
   - Provide clear action labels
   - Keep action callbacks simple
   - Navigate to relevant screens

4. **Accessibility**
   - Use proper ARIA labels
   - Ensure sufficient color contrast
   - Support keyboard navigation

## API Reference

### NotificationService

| Method | Description | Parameters |
|--------|-------------|------------|
| `show` | Show a notification | `title: string`, `message: string`, `type?: NotificationType`, `options?: NotificationOptions` |
| `close` | Close a notification | `id: string` |
| `closeAll` | Close all notifications | - |
| `markAsRead` | Mark a notification as read | `id: string` |
| `markAllAsRead` | Mark all notifications as read | - |
| `clear` | Clear all notifications | - |
| `subscribe` | Subscribe to notification changes | `callback: (notifications: Notification[]) => void` |

### NotificationOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `autoDismiss` | `number` | `5000` | Time in milliseconds before auto-dismissing (0 = no auto-dismiss) |
| `onClick` | `() => void` | - | Callback when notification is clicked |
| `data` | `any` | - | Additional data to include with the notification |
| `actionLabel` | `string` | `'View'` | Label for the action button |
| `onAction` | `(data?: any) => void` | - | Callback when action button is clicked |

## Local Development

1. Start the development server:
   ```bash
   npm start
   ```

2. The notification system will be available at `http://localhost:3000`

## Testing

Run the test suite:

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
